import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGroceryItemsForPlan,
  buildGroceryItemsForWeek,
  deleteGroceryList,
  listSavedGroceryLists,
  renameGroceryList,
  saveGroceryList,
  toggleGroceryItem,
  uncheckAllGroceryItems,
} from "../../../features/grocery/api";

// ── Supabase mock ──────────────────────────────────────────────────────────

vi.mock("../../../lib/supabaseClient", () => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const chained = [
    "from", "select", "insert", "update", "delete", "eq", "in",
    "order", "limit", "not", "maybeSingle",
  ];

  for (const method of chained) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  builder.single       = vi.fn().mockResolvedValue({ data: null, error: null });
  builder.maybeSingle  = vi.fn().mockResolvedValue({ data: null, error: null });
  builder.returns      = vi.fn().mockResolvedValue({ data: [],  error: null });

  // auth stub
  const auth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    }),
  };

  return { supabase: { ...builder, auth } };
});

import { supabase } from "../../../lib/supabaseClient";

const builder = supabase as unknown as Record<string, ReturnType<typeof vi.fn>> & {
  auth: { getUser: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();

  // Re-wire chained methods after clearAllMocks
  const chained = [
    "from", "select", "insert", "update", "delete", "eq", "in",
    "order", "limit", "not", "maybeSingle",
  ];
  for (const method of chained) {
    builder[method].mockReturnValue(builder);
  }

  builder.single.mockResolvedValue({ data: null, error: null });
  builder.maybeSingle.mockResolvedValue({ data: null, error: null });
  builder.returns.mockResolvedValue({ data: [], error: null });
  builder.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  });
});

// ── buildGroceryItemsForPlan ───────────────────────────────────────────────

describe("buildGroceryItemsForPlan", () => {
  it("returns empty array when the plan has no items", async () => {
    builder.returns.mockResolvedValueOnce({ data: [], error: null }); // plan items
    const result = await buildGroceryItemsForPlan("plan-1");
    expect(result).toEqual([]);
  });

  it("returns empty array when items have no recipe_ids", async () => {
    builder.returns.mockResolvedValueOnce({
      data: [{ recipe_id: null, servings_override: null, recipes: null }],
      error: null,
    }); // plan items
    const result = await buildGroceryItemsForPlan("plan-1");
    expect(result).toEqual([]);
  });

  it("fetches, scales, and merges ingredients from plan items", async () => {
    // Plan items: one recipe, 2 servings (recipe default is 4)
    builder.returns
      .mockResolvedValueOnce({
        data: [
          {
            recipe_id: "recipe-1",
            servings_override: 2,
            recipes: { servings: 4 },
          },
        ],
        error: null,
      })
      // Recipe ingredients (with category via ingredients FK)
      .mockResolvedValueOnce({
        data: [
          { recipe_id: "recipe-1", ingredient_name: "flour", quantity: "2", unit: "cup", ingredients: { category: "pantry" } },
          { recipe_id: "recipe-1", ingredient_name: "eggs", quantity: "4", unit: "", ingredients: { category: "dairy & eggs" } },
        ],
        error: null,
      });

    const result = await buildGroceryItemsForPlan("plan-1");
    // Sorted by category: dairy & eggs(2) < pantry(6)
    // Scaled to 2/4 = 0.5x: flour 2→1 cup, eggs 4→2
    expect(result).toEqual([
      { ingredientName: "eggs",  quantity: "2", unit: "", category: "dairy & eggs" },
      { ingredientName: "flour", quantity: "1", unit: "cup", category: "pantry" },
    ]);
  });

  it("merges the same ingredient across multiple plan items", async () => {
    // Two plan items using the same recipe (different servings)
    builder.returns
      .mockResolvedValueOnce({
        data: [
          { recipe_id: "recipe-1", servings_override: 2, recipes: { servings: 4 } },
          { recipe_id: "recipe-1", servings_override: 4, recipes: { servings: 4 } },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          { recipe_id: "recipe-1", ingredient_name: "butter", quantity: "4", unit: "tbsp", ingredients: { category: "dairy & eggs" } },
        ],
        error: null,
      });

    const result = await buildGroceryItemsForPlan("plan-1");
    // 4 × 0.5 + 4 × 1 = 2 + 4 = 6
    expect(result).toEqual([
      { ingredientName: "butter", quantity: "6", unit: "tbsp", category: "dairy & eggs" },
    ]);
  });

  it("throws when the plan items query fails", async () => {
    builder.returns.mockResolvedValueOnce({
      data: null,
      error: { message: "DB error" },
    });
    await expect(buildGroceryItemsForPlan("plan-1")).rejects.toThrow("DB error");
  });
});

// ── buildGroceryItemsForWeek ──────────────────────────────────────────────

describe("buildGroceryItemsForWeek", () => {
  it("returns empty items and null planId when no plan exists for the week", async () => {
    builder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const result = await buildGroceryItemsForWeek("2026-05-19");
    expect(result).toEqual({ items: [], planId: null });
  });

  it("delegates to buildGroceryItemsForPlan when a plan exists", async () => {
    builder.maybeSingle.mockResolvedValueOnce({
      data: { id: "plan-42" },
      error: null,
    });
    // buildGroceryItemsForPlan: plan items
    builder.returns
      .mockResolvedValueOnce({ data: [], error: null });

    const result = await buildGroceryItemsForWeek("2026-05-19");
    expect(result).toEqual({ items: [], planId: "plan-42" });
    expect(builder.eq).toHaveBeenCalledWith("start_date", "2026-05-19");
  });
});

// ── saveGroceryList ───────────────────────────────────────────────────────

describe("saveGroceryList", () => {
  it("inserts the list header and items, returns mapped GroceryList", async () => {
    const fakeListRow = {
      id: "list-1",
      title: "My List",
      meal_plan_id: "plan-1",
      created_at: "2026-05-25T00:00:00Z",
    };
    builder.single.mockResolvedValueOnce({ data: fakeListRow, error: null });

    const fakeItemRows = [
      { id: "item-1", ingredient_name: "salt", quantity: "1", unit: "tsp", is_checked: false, category: "pantry" },
    ];
    builder.returns.mockResolvedValueOnce({ data: fakeItemRows, error: null });

    const result = await saveGroceryList("My List", "plan-1", [
      { ingredientName: "salt", quantity: "1", unit: "tsp", category: "pantry" },
    ]);

    expect(result.id).toBe("list-1");
    expect(result.title).toBe("My List");
    expect(result.mealPlanId).toBe("plan-1");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      ingredientName: "salt",
      quantity: "1",
      unit: "tsp",
      isChecked: false,
      category: "pantry",
    });
  });

  it("returns empty items array when no items are passed", async () => {
    const fakeListRow = {
      id: "list-2",
      title: "Empty",
      meal_plan_id: null,
      created_at: "2026-05-25T00:00:00Z",
    };
    builder.single.mockResolvedValueOnce({ data: fakeListRow, error: null });

    const result = await saveGroceryList("Empty", null, []);
    expect(result.items).toEqual([]);
  });

});

// ── listSavedGroceryLists ─────────────────────────────────────────────────

describe("listSavedGroceryLists", () => {
  it("maps rows to GroceryListSummary", async () => {
    builder.returns.mockResolvedValueOnce({
      data: [
        { id: "l1", title: "Week 1", meal_plan_id: "p1", created_at: "2026-01-01T00:00:00Z" },
        { id: "l2", title: "Week 2", meal_plan_id: null, created_at: "2026-01-08T00:00:00Z" },
      ],
      error: null,
    });

    const result = await listSavedGroceryLists();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "l1", title: "Week 1", mealPlanId: "p1" });
    expect(result[1]).toMatchObject({ id: "l2", title: "Week 2", mealPlanId: null });
  });

  it("returns empty array when no lists exist", async () => {
    builder.returns.mockResolvedValueOnce({ data: [], error: null });
    const result = await listSavedGroceryLists();
    expect(result).toEqual([]);
  });
});

// ── deleteGroceryList ─────────────────────────────────────────────────────

describe("deleteGroceryList", () => {
  it("calls delete with the correct id", async () => {
    builder.returns.mockResolvedValueOnce({ data: null, error: null });
    await deleteGroceryList("list-99");
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", "list-99");
  });

  it("throws on error", async () => {
    builder.returns.mockResolvedValueOnce({ data: null, error: { message: "fail" } });
    await expect(deleteGroceryList("list-99")).rejects.toThrow("fail");
  });
});

// ── renameGroceryList ─────────────────────────────────────────────────────

describe("renameGroceryList", () => {
  it("updates the title and returns the updated summary", async () => {
    builder.single.mockResolvedValueOnce({
      data: {
        id: "list-1",
        title: "New Name",
        meal_plan_id: null,
        created_at: "2026-05-25T00:00:00Z",
      },
      error: null,
    });

    const result = await renameGroceryList("list-1", "New Name");
    expect(result.title).toBe("New Name");
    expect(builder.update).toHaveBeenCalledWith({ title: "New Name" });
  });
});

// ── toggleGroceryItem ─────────────────────────────────────────────────────

describe("toggleGroceryItem", () => {
  it("calls update with the correct is_checked value", async () => {
    builder.returns.mockResolvedValueOnce({ data: null, error: null });
    await toggleGroceryItem("item-1", true);
    expect(builder.update).toHaveBeenCalledWith({ is_checked: true });
    expect(builder.eq).toHaveBeenCalledWith("id", "item-1");
  });
});

// ── uncheckAllGroceryItems ────────────────────────────────────────────────

describe("uncheckAllGroceryItems", () => {
  it("updates is_checked to false for the whole list", async () => {
    builder.returns.mockResolvedValueOnce({ data: null, error: null });
    await uncheckAllGroceryItems("list-1");
    expect(builder.update).toHaveBeenCalledWith({ is_checked: false });
    expect(builder.eq).toHaveBeenCalledWith("list_id", "list-1");
  });
});
