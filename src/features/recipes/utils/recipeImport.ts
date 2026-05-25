import { INGREDIENT_CATEGORIES, type IngredientCategory } from "../../ingredients/types";
import type { RecipeUpsertInput } from "../types";
import {
  createEmptyIngredient,
  type RecipeFormValues,
} from "./recipeForm";
import type { ImportedRecipe } from "../importTypes";

const normalizeNumberText = (value: number | null): string =>
  value && value > 0 ? String(value) : "";

const normalizeText = (value: string | null | undefined): string =>
  (value ?? "").trim();

export const isIngredientCategory = (
  value: string | null | undefined
): value is IngredientCategory =>
  Boolean(value && INGREDIENT_CATEGORIES.includes(value as IngredientCategory));

export const mapImportedRecipeToInput = (
  recipe: ImportedRecipe
): RecipeUpsertInput => ({
  title: normalizeText(recipe.title),
  description: normalizeText(recipe.description),
  sourceUrl: recipe.sourceUrl,
  prepMinutes: recipe.prepMinutes,
  cookMinutes: recipe.cookMinutes,
  servings: recipe.servings,
  tags: recipe.tags,
  instructions: normalizeText(recipe.instructions),
  ingredients: recipe.ingredients.map((ingredient) => ({
    ingredientId: "",
    ingredientName: normalizeText(ingredient.ingredientName),
    quantity: normalizeText(ingredient.quantity),
    unit: normalizeText(ingredient.unit),
    notes: normalizeText(ingredient.notes),
  })),
});

export const mapImportedRecipeToFormValues = (
  recipe: ImportedRecipe
): RecipeFormValues => ({
  title: normalizeText(recipe.title),
  description: normalizeText(recipe.description),
  sourceUrl: normalizeText(recipe.sourceUrl),
  prepMinutes: normalizeNumberText(recipe.prepMinutes),
  cookMinutes: normalizeNumberText(recipe.cookMinutes),
  servings: normalizeNumberText(recipe.servings),
  tags: recipe.tags.join(", "),
  instructions: normalizeText(recipe.instructions),
  ingredients:
    recipe.ingredients.length > 0
      ? recipe.ingredients.map((ingredient) => ({
          id: createEmptyIngredient().id,
          ingredientId: "",
          ingredientName: normalizeText(ingredient.ingredientName),
          quantity: normalizeText(ingredient.quantity),
          unit: normalizeText(ingredient.unit),
          notes: normalizeText(ingredient.notes),
        }))
      : [createEmptyIngredient()],
});
