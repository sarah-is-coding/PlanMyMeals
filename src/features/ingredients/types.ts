export type IngredientCategory =
  | "produce"
  | "meat & seafood"
  | "dairy & eggs"
  | "bakery & bread"
  | "pantry"
  | "frozen"
  | "beverages"
  | "other";

export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  "produce",
  "meat & seafood",
  "dairy & eggs",
  "bakery & bread",
  "pantry",
  "frozen",
  "beverages",
  "other",
];

export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory | null;
  defaultUnit: string | null;
};
