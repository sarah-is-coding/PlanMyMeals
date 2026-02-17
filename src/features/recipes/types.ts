export type RecipeSortOption = "newest" | "oldest" | "title_asc" | "title_desc";

export type RecipeListFilters = {
  sort: RecipeSortOption;
  tag: string;
  maxTotalMinutes: string;
  onlyWithSource: boolean;
};

export type RecipeSummary = {
  id: string;
  title: string;
  description: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  tags: string[];
  hasSource: boolean;
  createdAt: string;
};

export type RecipeIngredient = {
  id: string;
  ingredientName: string;
  quantity: string;
  unit: string;
  notes: string;
};

export type RecipeDetail = {
  id: string;
  title: string;
  description: string | null;
  sourceUrl: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  servings: number | null;
  tags: string[];
  instructions: string | null;
  createdAt: string;
  ingredients: RecipeIngredient[];
};

export type RecipeIngredientInput = {
  ingredientName: string;
  quantity: string | null;
  unit: string | null;
  notes: string | null;
};

export type RecipeUpsertInput = {
  title: string;
  description: string | null;
  sourceUrl: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  servings: number | null;
  tags: string[];
  instructions: string | null;
  ingredients: RecipeIngredientInput[];
};
