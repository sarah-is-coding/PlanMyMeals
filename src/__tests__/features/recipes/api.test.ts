import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../../features/ingredients/api", () => ({
  createIngredient: vi.fn().mockResolvedValue({
    id: "ingredient-1",
    name: "ground chicken",
    category: "meat & seafood",
    defaultUnit: null,
  }),
}));

vi.mock("../../../lib/supabaseClient", () => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const chained = [
    "from",
    "insert",
    "select",
    "eq",
    "delete",
    "update",
    "range",
    "order",
    "gte",
  ];

  for (const method of chained) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  builder.single = vi.fn().mockResolvedValue({
    data: { id: "recipe-1" },
    error: null,
  });

  builder.returns = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });

  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    }),
  };

  return { supabase: { ...builder, auth: mockAuth } };
});

import { supabase } from "../../../lib/supabaseClient";
import { createRecipe, deleteRecipe, listRecipes, rateRecipe } from "../../../features/recipes/api";

const db = supabase as unknown as Record<string, ReturnType<typeof vi.fn>>;

const CHAINED_METHODS = [
  "from",
  "insert",
  "select",
  "eq",
  "delete",
  "update",
  "range",
  "order",
  "gte",
];

const defaultFilters = {
  sort: "newest" as const,
  tag: "",
  onlyWithSource: false,
  minRating: 0,
};

const recipeInput = {
  title: "Chicken Caesar Taco Salad",
  description: null,
  sourceUrl: null,
  prepMinutes: null,
  cookMinutes: null,
  servings: null,
  tags: [],
  instructions: null,
  ingredients: [],
};

describe("recipe api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const method of CHAINED_METHODS) {
      db[method].mockReturnValue(db);
    }
    db.single.mockResolvedValue({
      data: { id: "recipe-1" },
      error: null,
    });
    db.returns.mockResolvedValue({ data: [], error: null, count: 0 });
  });

  it("returns a friendly error when a recipe title already exists", async () => {
    db.single.mockResolvedValueOnce({
      data: null,
      error: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "recipes_user_id_title_key"',
      },
    });

    await expect(createRecipe(recipeInput)).rejects.toThrow(
      "A recipe with that title already exists. Rename it and try again."
    );
  });

  it("deletes a recipe by id", async () => {
    db.eq.mockResolvedValueOnce({ data: null, error: null });

    await deleteRecipe("recipe-1");

    expect(db.from).toHaveBeenCalledWith("recipes");
    expect(db.delete).toHaveBeenCalled();
    expect(db.eq).toHaveBeenCalledWith("id", "recipe-1");
  });

  it("throws when deleting a recipe fails", async () => {
    db.eq.mockResolvedValueOnce({
      data: null,
      error: { message: "Recipe not found" },
    });

    await expect(deleteRecipe("recipe-1")).rejects.toThrow("Recipe not found");
  });

  it("sets a recipe's rating", async () => {
    db.eq.mockResolvedValueOnce({ data: null, error: null });

    await rateRecipe("recipe-1", 4);

    expect(db.from).toHaveBeenCalledWith("recipes");
    expect(db.update).toHaveBeenCalledWith({ rating: 4 });
    expect(db.eq).toHaveBeenCalledWith("id", "recipe-1");
  });

  it("throws when rating a recipe fails", async () => {
    db.eq.mockResolvedValueOnce({
      data: null,
      error: { message: "Recipe not found" },
    });

    await expect(rateRecipe("recipe-1", 4)).rejects.toThrow("Recipe not found");
  });

  it("applies a minimum rating filter when set", async () => {
    await listRecipes("", { ...defaultFilters, minRating: 3 }, { page: 1, pageSize: 12 });

    expect(db.gte).toHaveBeenCalledWith("rating", 3);
  });

  it("does not apply a rating filter when minRating is 0", async () => {
    await listRecipes("", { ...defaultFilters, minRating: 0 }, { page: 1, pageSize: 12 });

    expect(db.gte).not.toHaveBeenCalled();
  });
});
