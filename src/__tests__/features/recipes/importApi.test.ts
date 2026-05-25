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

import {
  extractRecipesFromText,
  generateRecipesFromPrompt,
} from "../../../features/recipes/importApi";

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
      body: { mode: "import", text: SAMPLE_RECIPE_IMPORT_NOTES },
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

describe("generateRecipesFromPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invoke.mockResolvedValue({
      data: {
        recipes: [],
        warnings: [],
      },
      error: null,
    });
  });

  it("sends generation requests to the import-recipes function in generate mode", async () => {
    const prompt = "Generate 2 quick vegetarian dinners with chickpeas.";

    await generateRecipesFromPrompt(prompt);

    expect(invoke).toHaveBeenCalledWith("import-recipes", {
      body: { mode: "generate", text: prompt },
    });
  });

  it("rejects empty generation prompts before calling the function", async () => {
    await expect(generateRecipesFromPrompt("   ")).rejects.toThrow(
      "Describe the recipe or recipes you want to generate."
    );
    expect(invoke).not.toHaveBeenCalled();
  });
});
