import { describe, expect, it, vi } from "vitest";
import { SAMPLE_RECIPE_IMPORT_NOTES } from "./fixtures/sampleRecipeImportNotes";

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    functions: {
      invoke,
    },
  },
}));

import { extractRecipesFromText } from "../../../features/recipes/importApi";

describe("extractRecipesFromText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invoke.mockResolvedValue({
      data: {
        recipes: [],
        warnings: ["No recipes were returned."],
      },
      error: null,
    });
  });

  it("sends mixed notes and recipe links to the import-recipes function unchanged", async () => {
    await extractRecipesFromText(SAMPLE_RECIPE_IMPORT_NOTES);

    expect(invoke).toHaveBeenCalledWith("import-recipes", {
      body: { text: SAMPLE_RECIPE_IMPORT_NOTES },
    });
    expect(SAMPLE_RECIPE_IMPORT_NOTES).toContain("Chicken Caesar taco salad");
    expect(SAMPLE_RECIPE_IMPORT_NOTES).toContain(
      "https://www.allrecipes.com/recipe/269613/walking-tacos/"
    );
    expect(SAMPLE_RECIPE_IMPORT_NOTES).toContain("Beef Stew - 4 Servings");
    expect(SAMPLE_RECIPE_IMPORT_NOTES).toContain(
      "https://www.spendwithpennies.com/beef-stew-recipe/#wprm-recipe-container-140827"
    );
  });

  it("rejects empty import text before calling the function", async () => {
    await expect(extractRecipesFromText("   ")).rejects.toThrow(
      "Paste recipe notes, links, or both before importing."
    );
    expect(invoke).not.toHaveBeenCalled();
  });
});
