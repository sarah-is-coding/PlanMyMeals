import type { RecipeDetail, RecipeUpsertInput } from "../types";

export type RecipeFormIngredient = {
  id: string;
  ingredientName: string;
  quantity: string;
  unit: string;
  notes: string;
};

export type RecipeFormValues = {
  title: string;
  description: string;
  sourceUrl: string;
  prepMinutes: string;
  cookMinutes: string;
  servings: string;
  tags: string;
  instructions: string;
  ingredients: RecipeFormIngredient[];
};

const parseOptionalNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsedValue = Number(trimmed);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return Math.round(parsedValue);
};

const parseTags = (value: string): string[] => {
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(tags));
};

export const createEmptyIngredient = (): RecipeFormIngredient => ({
  id: crypto.randomUUID(),
  ingredientName: "",
  quantity: "",
  unit: "",
  notes: "",
});

export const createEmptyRecipeFormValues = (): RecipeFormValues => ({
  title: "",
  description: "",
  sourceUrl: "",
  prepMinutes: "",
  cookMinutes: "",
  servings: "",
  tags: "",
  instructions: "",
  ingredients: [createEmptyIngredient()],
});

export const mapRecipeDetailToFormValues = (recipe: RecipeDetail): RecipeFormValues => ({
  title: recipe.title,
  description: recipe.description ?? "",
  sourceUrl: recipe.sourceUrl ?? "",
  prepMinutes: recipe.prepMinutes ? String(recipe.prepMinutes) : "",
  cookMinutes: recipe.cookMinutes ? String(recipe.cookMinutes) : "",
  servings: recipe.servings ? String(recipe.servings) : "",
  tags: recipe.tags.join(", "),
  instructions: recipe.instructions ?? "",
  ingredients:
    recipe.ingredients.length > 0
      ? recipe.ingredients.map((ingredient) => ({
          id: ingredient.id,
          ingredientName: ingredient.ingredientName,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          notes: ingredient.notes,
        }))
      : [createEmptyIngredient()],
});

export const mapRecipeFormValuesToInput = (
  values: RecipeFormValues
): RecipeUpsertInput => ({
  title: values.title.trim(),
  description: values.description,
  sourceUrl: values.sourceUrl,
  prepMinutes: parseOptionalNumber(values.prepMinutes),
  cookMinutes: parseOptionalNumber(values.cookMinutes),
  servings: parseOptionalNumber(values.servings),
  tags: parseTags(values.tags),
  instructions: values.instructions,
  ingredients: values.ingredients.map((ingredient) => ({
    ingredientName: ingredient.ingredientName,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    notes: ingredient.notes,
  })),
});
