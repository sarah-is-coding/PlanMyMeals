import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────
// Supabase chainable mock
// ─────────────────────────────────────────────────────────────
vi.mock("../../../lib/supabaseClient", () => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const chained = [
    "from", "select", "update", "insert", "delete",
    "upsert", "eq", "not", "ilike", "in",
    "order", "limit", "gte", "lte",
  ];

  for (const method of chained) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  builder.returns     = vi.fn().mockResolvedValue({ data: [], error: null });
  builder.single      = vi.fn().mockResolvedValue({ data: null, error: null });
  builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    }),
  };

  return { supabase: { ...builder, auth: mockAuth } };
});

import { supabase } from "../../../lib/supabaseClient";
import {
  listSavedMealPlans,
  searchSavedMealPlans,
  renameSavedMealPlan,
  deleteSavedMealPlan,
  previewSavedMealPlan,
  saveWeekPlan,
  applySavedMealPlan,
} from "../../../features/meal-plans/api";

const db = supabase as unknown as Record<string, ReturnType<typeof vi.fn>>;

function resetChain() {
  const chained = [
    "from", "select", "update", "insert", "delete",
    "upsert", "eq", "not", "ilike", "in",
    "order", "limit", "gte", "lte",
  ];
  for (const fn of chained) {
    db[fn].mockReturnValue(db);
  }
}

// ─────────────────────────────────────────────────────────────
// listSavedMealPlans
// ─────────────────────────────────────────────────────────────
describe("listSavedMealPlans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
    db.returns.mockResolvedValue({ data: [], error: null });
  });

  it("queries meal_plans table", async () => {
    await listSavedMealPlans();
    expect(db.from).toHaveBeenCalledWith("meal_plans");
  });

  it("selects the expected columns", async () => {
    await listSavedMealPlans();
    expect(db.select).toHaveBeenCalledWith("id,saved_name,start_date,end_date");
  });

  it("excludes plans where saved_name is null", async () => {
    await listSavedMealPlans();
    expect(db.not).toHaveBeenCalledWith("saved_name", "is", null);
  });

  it("orders by created_at descending", async () => {
    await listSavedMealPlans();
    expect(db.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("maps rows to SavedMealPlan objects", async () => {
    db.returns.mockResolvedValue({
      data: [
        { id: "p1", saved_name: "Healthy Week", start_date: "2026-05-18", end_date: "2026-05-24" },
      ],
      error: null,
    });
    const result = await listSavedMealPlans();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "p1",
      savedName: "Healthy Week",
      startDate: "2026-05-18",
      endDate: "2026-05-24",
    });
  });

  it("returns an empty array when there are no saved plans", async () => {
    db.returns.mockResolvedValue({ data: [], error: null });
    const result = await listSavedMealPlans();
    expect(result).toEqual([]);
  });

  it("throws when supabase returns an error", async () => {
    db.returns.mockResolvedValue({ data: null, error: { message: "DB error" } });
    await expect(listSavedMealPlans()).rejects.toThrow("DB error");
  });
});

// ─────────────────────────────────────────────────────────────
// searchSavedMealPlans
// ─────────────────────────────────────────────────────────────
describe("searchSavedMealPlans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
    db.returns.mockResolvedValue({ data: [], error: null });
  });

  it("applies ilike filter when a query is provided", async () => {
    await searchSavedMealPlans("healthy");
    expect(db.ilike).toHaveBeenCalledWith("saved_name", "%healthy%");
  });

  it("does not apply ilike when the query is empty", async () => {
    await searchSavedMealPlans("");
    expect(db.ilike).not.toHaveBeenCalled();
  });

  it("trims the query before applying ilike", async () => {
    await searchSavedMealPlans("  vegan  ");
    expect(db.ilike).toHaveBeenCalledWith("saved_name", "%vegan%");
  });

  it("returns mapped results", async () => {
    db.returns.mockResolvedValue({
      data: [
        { id: "p2", saved_name: "Vegan Week", start_date: "2026-05-11", end_date: null },
      ],
      error: null,
    });
    const result = await searchSavedMealPlans("vegan");
    expect(result[0]).toMatchObject({ id: "p2", savedName: "Vegan Week" });
  });

  it("throws when supabase returns an error", async () => {
    db.returns.mockResolvedValue({ data: null, error: { message: "Search error" } });
    await expect(searchSavedMealPlans("foo")).rejects.toThrow("Search error");
  });
});

// ─────────────────────────────────────────────────────────────
// renameSavedMealPlan
// ─────────────────────────────────────────────────────────────
describe("renameSavedMealPlan", () => {
  const updatedRow = { id: "p1", saved_name: "New Name", start_date: "2026-05-18", end_date: null };

  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
    db.single.mockResolvedValue({ data: updatedRow, error: null });
  });

  it("calls update on meal_plans", async () => {
    await renameSavedMealPlan("p1", "New Name");
    expect(db.from).toHaveBeenCalledWith("meal_plans");
    expect(db.update).toHaveBeenCalledWith({ saved_name: "New Name" });
  });

  it("filters by plan id", async () => {
    await renameSavedMealPlan("p1", "New Name");
    expect(db.eq).toHaveBeenCalledWith("id", "p1");
  });

  it("trims the new name before saving", async () => {
    await renameSavedMealPlan("p1", "  New Name  ");
    expect(db.update).toHaveBeenCalledWith({ saved_name: "New Name" });
  });

  it("returns the updated SavedMealPlan", async () => {
    const result = await renameSavedMealPlan("p1", "New Name");
    expect(result).toEqual({ id: "p1", savedName: "New Name", startDate: "2026-05-18", endDate: null });
  });

  it("throws when supabase returns an error", async () => {
    db.single.mockResolvedValue({ data: null, error: { message: "Conflict" } });
    await expect(renameSavedMealPlan("p1", "Taken")).rejects.toThrow("Conflict");
  });
});

// ─────────────────────────────────────────────────────────────
// deleteSavedMealPlan
// ─────────────────────────────────────────────────────────────
describe("deleteSavedMealPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
    db.returns.mockResolvedValue({ data: null, error: null });
  });

  it("calls delete on meal_plans filtered by id", async () => {
    await deleteSavedMealPlan("p1");
    expect(db.from).toHaveBeenCalledWith("meal_plans");
    expect(db.delete).toHaveBeenCalled();
    expect(db.eq).toHaveBeenCalledWith("id", "p1");
  });

  it("resolves without throwing on success", async () => {
    await expect(deleteSavedMealPlan("p1")).resolves.toBeUndefined();
  });

  it("throws when supabase returns an error", async () => {
    db.returns.mockResolvedValue({ data: null, error: { message: "Delete failed" } });
    await expect(deleteSavedMealPlan("p1")).rejects.toThrow("Delete failed");
  });
});

// ─────────────────────────────────────────────────────────────
// previewSavedMealPlan
// ─────────────────────────────────────────────────────────────
describe("previewSavedMealPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
    db.returns.mockResolvedValue({ data: [], error: null });
  });

  it("queries meal_plan_items filtered by plan id", async () => {
    await previewSavedMealPlan("p1");
    expect(db.from).toHaveBeenCalledWith("meal_plan_items");
    expect(db.eq).toHaveBeenCalledWith("meal_plan_id", "p1");
  });

  it("returns an empty array for a plan with no items", async () => {
    const result = await previewSavedMealPlan("p1");
    expect(result).toEqual([]);
  });

  it("groups recipe titles by date", async () => {
    db.returns.mockResolvedValue({
      data: [
        { planned_for: "2026-05-18", recipes: { title: "Pasta", servings: 4 } },
        { planned_for: "2026-05-18", recipes: { title: "Salad", servings: 2 } },
        { planned_for: "2026-05-19", recipes: { title: "Soup", servings: 4 } },
      ],
      error: null,
    });

    const result = await previewSavedMealPlan("p1");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ dateIso: "2026-05-18", recipes: ["Pasta", "Salad"] });
    expect(result[1]).toEqual({ dateIso: "2026-05-19", recipes: ["Soup"] });
  });

  it("throws when supabase returns an error", async () => {
    db.returns.mockResolvedValue({ data: null, error: { message: "Preview failed" } });
    await expect(previewSavedMealPlan("p1")).rejects.toThrow("Preview failed");
  });
});

// ─────────────────────────────────────────────────────────────
// saveWeekPlan
// ─────────────────────────────────────────────────────────────
describe("saveWeekPlan", () => {
  const existingPlanRow = { id: "plan-id", end_date: "2026-05-24" };
  const savedRow = { id: "plan-id", saved_name: "My Plan", start_date: "2026-05-18", end_date: "2026-05-24" };

  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
    // getMealPlanForWeek: maybeSingle returns the existing plan
    db.maybeSingle.mockResolvedValue({ data: existingPlanRow, error: null });
    // update + single returns the saved row
    db.single.mockResolvedValue({ data: savedRow, error: null });
  });

  it("updates the plan with the trimmed saved_name", async () => {
    await saveWeekPlan("2026-05-18", "  My Plan  ");
    expect(db.update).toHaveBeenCalledWith({ saved_name: "My Plan" });
  });

  it("filters the update by the resolved plan id", async () => {
    await saveWeekPlan("2026-05-18", "My Plan");
    expect(db.eq).toHaveBeenCalledWith("id", "plan-id");
  });

  it("returns a mapped SavedMealPlan", async () => {
    const result = await saveWeekPlan("2026-05-18", "My Plan");
    expect(result).toEqual({
      id: "plan-id",
      savedName: "My Plan",
      startDate: "2026-05-18",
      endDate: "2026-05-24",
    });
  });

  it("throws when the update returns an error", async () => {
    db.single.mockResolvedValue({ data: null, error: { message: "Name taken" } });
    await expect(saveWeekPlan("2026-05-18", "My Plan")).rejects.toThrow("Name taken");
  });
});

// ─────────────────────────────────────────────────────────────
// applySavedMealPlan
// ─────────────────────────────────────────────────────────────
describe("applySavedMealPlan", () => {
  // We set up three sequential single() calls:
  //   1. fetch saved plan's start_date
  //   2. getMealPlanForWeek (maybeSingle) for target week — returns null (plan doesn't exist yet)
  //   3. requireUserId auth.getUser
  //   4. insert meal_plan record for target week (single)
  // And two returns() calls:
  //   1. fetch all items for the saved plan
  //   2. insert items

  const savedPlanRow = { start_date: "2026-05-18" };
  const existingItems = [
    {
      recipe_id: "r1",
      planned_for: "2026-05-18",
      meal_type: "dinner",
      servings_override: null,
    },
    {
      recipe_id: "r2",
      planned_for: "2026-05-19",
      meal_type: "lunch",
      servings_override: 2,
    },
  ];
  const insertedItems = [
    {
      id: "i1",
      recipe_id: "r1",
      planned_for: "2026-05-25",
      meal_type: "dinner",
      servings_override: null,
      recipes: { title: "Pasta", servings: 4 },
    },
    {
      id: "i2",
      recipe_id: "r2",
      planned_for: "2026-05-26",
      meal_type: "lunch",
      servings_override: 2,
      recipes: { title: "Salad", servings: 2 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();

    // 1st single(): fetch saved plan start_date
    // 2nd single(): insert new target meal plan record
    db.single
      .mockResolvedValueOnce({ data: savedPlanRow, error: null })
      .mockResolvedValueOnce({ data: { id: "target-plan-id", end_date: "2026-05-31" }, error: null });

    // maybeSingle: getMealPlanForWeek for target week → null (no existing plan)
    db.maybeSingle.mockResolvedValue({ data: null, error: null });

    // 1st returns(): fetch saved plan items
    // 2nd returns(): insert items
    db.returns
      .mockResolvedValueOnce({ data: existingItems, error: null })
      .mockResolvedValueOnce({ data: insertedItems, error: null });
  });

  it("fetches the saved plan's start_date", async () => {
    await applySavedMealPlan("saved-plan-id", "2026-05-25");
    expect(db.from).toHaveBeenCalledWith("meal_plans");
    expect(db.eq).toHaveBeenCalledWith("id", "saved-plan-id");
  });

  it("fetches all items for the saved plan", async () => {
    await applySavedMealPlan("saved-plan-id", "2026-05-25");
    expect(db.from).toHaveBeenCalledWith("meal_plan_items");
    expect(db.eq).toHaveBeenCalledWith("meal_plan_id", "saved-plan-id");
  });

  it("inserts items shifted to the target week", async () => {
    await applySavedMealPlan("saved-plan-id", "2026-05-25");
    // db.insert is called twice: first to create the target meal-plan record (object arg),
    // then to insert the items (array arg).  Find the array-argument call.
    type ItemInsert = { planned_for: string; recipe_id: string | null; meal_type: string };
    const itemsCall = (db.insert.mock.calls as unknown[][]).find((args) =>
      Array.isArray(args[0])
    ) as [ItemInsert[]] | undefined;
    expect(itemsCall).toBeDefined();
    const inserts = itemsCall![0];
    // day 0 from 2026-05-18 = Mon May 18 → target Mon May 25
    expect(inserts[0].planned_for).toBe("2026-05-25");
    // day 1 from 2026-05-18 = Tue May 19 → target Tue May 26
    expect(inserts[1].planned_for).toBe("2026-05-26");
  });

  it("returns only items landing in the target week", async () => {
    const result = await applySavedMealPlan("saved-plan-id", "2026-05-25");
    // Both inserted items land in the 2026-05-25 week (Mon-Sun May 25-31)
    expect(result).toHaveLength(2);
    expect(result[0].recipeTitle).toBe("Pasta");
    expect(result[1].recipeTitle).toBe("Salad");
  });

  it("returns an empty array when the saved plan has no items", async () => {
    db.returns.mockReset();
    db.returns
      .mockResolvedValueOnce({ data: [], error: null })  // no items
      .mockResolvedValueOnce({ data: [], error: null });
    const result = await applySavedMealPlan("saved-plan-id", "2026-05-25");
    expect(result).toEqual([]);
  });

  it("throws when fetching the saved plan fails", async () => {
    db.single.mockReset();
    db.single.mockResolvedValueOnce({ data: null, error: { message: "Not found" } });
    await expect(applySavedMealPlan("saved-plan-id", "2026-05-25")).rejects.toThrow("Not found");
  });
});
