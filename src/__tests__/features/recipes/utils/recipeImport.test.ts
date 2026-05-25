import { describe, expect, it } from "vitest";
import { mapImportedRecipeToInput } from "../../../../features/recipes/utils/recipeImport";
import type { ImportedRecipe } from "../../../../features/recipes/importTypes";

const importedRecipe: ImportedRecipe = {
  title: "Chicken Caesar taco salad",
  description: "A quick taco salad from notes.",
  sourceUrl: null,
  prepMinutes: 10,
  cookMinutes: 15,
  servings: 4,
  tags: ["dinner", "quick"],
  instructions: "Season chicken. Assemble salad.",
  ingredients: [
    {
      ingredientName: "ground chicken",
      quantity: "1",
      unit: "lb",
      notes: "salted and peppered",
      category: "meat & seafood",
    },
  ],
  confidence: "medium",
  warnings: [],
};

describe("recipe import mapping", () => {
  it("maps imported recipe JSON to a recipe create input", () => {
    expect(mapImportedRecipeToInput(importedRecipe)).toEqual({
      title: "Chicken Caesar taco salad",
      description: "A quick taco salad from notes.",
      sourceUrl: null,
      prepMinutes: 10,
      cookMinutes: 15,
      servings: 4,
      tags: ["dinner", "quick"],
      instructions: "Season chicken. Assemble salad.",
      ingredients: [
        {
          ingredientId: "",
          ingredientName: "ground chicken",
          quantity: "1",
          unit: "lb",
          notes: "salted and peppered",
        },
      ],
    });
  });

});
