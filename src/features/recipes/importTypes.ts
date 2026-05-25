import type { IngredientCategory } from "../ingredients/types";

export type ImportedRecipeIngredient = {
  ingredientName: string;
  quantity: string;
  unit: string;
  notes: string;
  category: IngredientCategory | null;
};

export type ImportedRecipe = {
  title: string;
  description: string;
  sourceUrl: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  servings: number | null;
  tags: string[];
  instructions: string;
  ingredients: ImportedRecipeIngredient[];
  confidence: "high" | "medium" | "low";
  warnings: string[];
};

export type RecipeImportResult = {
  recipes: ImportedRecipe[];
  warnings: string[];
};
