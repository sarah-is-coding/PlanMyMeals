import { supabase } from "../../lib/supabaseClient";
import type {
  RecipeDetail,
  RecipeIngredient,
  RecipeListFilters,
  RecipeSummary,
  RecipeUpsertInput,
} from "./types";

type RecipeSummaryRow = {
  id: string;
  title: string;
  description: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  tags: string[] | null;
  source_url: string | null;
  created_at: string;
};

type RecipeDetailRow = {
  id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number | null;
  tags: string[] | null;
  instructions: string | null;
  created_at: string;
};

type RecipeIngredientRow = {
  id: string;
  ingredient_name: string;
  quantity: string | null;
  unit: string | null;
  notes: string | null;
};

type RecipeIdRow = {
  id: string;
};

const mapRecipeSummaryRow = (row: RecipeSummaryRow): RecipeSummary => ({
  id: row.id,
  title: row.title,
  description: row.description,
  prepMinutes: row.prep_minutes,
  cookMinutes: row.cook_minutes,
  tags: row.tags ?? [],
  hasSource: Boolean(row.source_url),
  createdAt: row.created_at,
});

const mapRecipeIngredientRow = (row: RecipeIngredientRow): RecipeIngredient => ({
  id: row.id,
  ingredientName: row.ingredient_name,
  quantity: row.quantity ?? "",
  unit: row.unit ?? "",
  notes: row.notes ?? "",
});

const mapRecipeDetail = (row: RecipeDetailRow, ingredients: RecipeIngredient[]): RecipeDetail => ({
  id: row.id,
  title: row.title,
  description: row.description,
  sourceUrl: row.source_url,
  prepMinutes: row.prep_minutes,
  cookMinutes: row.cook_minutes,
  servings: row.servings,
  tags: row.tags ?? [],
  instructions: row.instructions,
  createdAt: row.created_at,
  ingredients,
});

const cleanText = (value: string | null | undefined): string | null => {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
};

const getRecipePayload = (input: RecipeUpsertInput, userId: string) => ({
  user_id: userId,
  title: input.title.trim(),
  description: cleanText(input.description),
  source_url: cleanText(input.sourceUrl),
  prep_minutes: input.prepMinutes,
  cook_minutes: input.cookMinutes,
  servings: input.servings,
  tags: input.tags,
  instructions: cleanText(input.instructions),
});

const getIngredientPayload = (recipeId: string, input: RecipeUpsertInput) =>
  input.ingredients
    .map((ingredient) => ({
      recipe_id: recipeId,
      ingredient_name: ingredient.ingredientName.trim(),
      quantity: cleanText(ingredient.quantity),
      unit: cleanText(ingredient.unit),
      notes: cleanText(ingredient.notes),
    }))
    .filter((ingredient) => ingredient.ingredient_name.length > 0);

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error("You must be signed in to manage recipes.");
  }

  return user.id;
}

type RecipeListPageInput = {
  page: number;
  pageSize: number;
};

type RecipeListPageResult = {
  recipes: RecipeSummary[];
  totalCount: number;
};

export async function listRecipes(
  searchTerm: string,
  filters: RecipeListFilters,
  pagination: RecipeListPageInput
): Promise<RecipeListPageResult> {
  const safePage = Math.max(1, Math.floor(pagination.page));
  const safePageSize = Math.max(1, Math.floor(pagination.pageSize));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let query = supabase
    .from("recipes")
    .select("id,title,description,prep_minutes,cook_minutes,tags,source_url,created_at", {
      count: "exact",
    })
    .range(from, to);

  const trimmedSearch = searchTerm.trim();
  if (trimmedSearch) {
    query = query.ilike("title", `%${trimmedSearch}%`);
  }

  const tag = filters.tag.trim();
  if (tag) {
    query = query.contains("tags", [tag]);
  }

  if (filters.onlyWithSource) {
    query = query.not("source_url", "is", null);
  }

  switch (filters.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "title_asc":
      query = query.order("title", { ascending: true });
      break;
    case "title_desc":
      query = query.order("title", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, error, count } = await query.returns<RecipeSummaryRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    recipes: (data ?? []).map(mapRecipeSummaryRow),
    totalCount: count ?? 0,
  };
}

export async function getRecipeById(recipeId: string): Promise<RecipeDetail | null> {
  const { data: recipeRow, error: recipeError } = await supabase
    .from("recipes")
    .select(
      "id,title,description,source_url,prep_minutes,cook_minutes,servings,tags,instructions,created_at"
    )
    .eq("id", recipeId)
    .maybeSingle<RecipeDetailRow>();

  if (recipeError) {
    throw new Error(recipeError.message);
  }

  if (!recipeRow) {
    return null;
  }

  const { data: ingredientRows, error: ingredientError } = await supabase
    .from("recipe_ingredients")
    .select("id,ingredient_name,quantity,unit,notes")
    .eq("recipe_id", recipeId)
    .order("created_at", { ascending: true })
    .returns<RecipeIngredientRow[]>();

  if (ingredientError) {
    throw new Error(ingredientError.message);
  }

  return mapRecipeDetail(recipeRow, (ingredientRows ?? []).map(mapRecipeIngredientRow));
}

export async function createRecipe(input: RecipeUpsertInput): Promise<string> {
  if (!input.title.trim()) {
    throw new Error("Title is required.");
  }

  const userId = await requireUserId();
  const { data: recipeRow, error: recipeError } = await supabase
    .from("recipes")
    .insert(getRecipePayload(input, userId))
    .select("id")
    .single<RecipeIdRow>();

  if (recipeError) {
    throw new Error(recipeError.message);
  }

  const ingredientPayload = getIngredientPayload(recipeRow.id, input);
  if (ingredientPayload.length > 0) {
    const { error: ingredientError } = await supabase
      .from("recipe_ingredients")
      .insert(ingredientPayload);

    if (ingredientError) {
      throw new Error(ingredientError.message);
    }
  }

  return recipeRow.id;
}

export async function updateRecipe(recipeId: string, input: RecipeUpsertInput): Promise<void> {
  if (!input.title.trim()) {
    throw new Error("Title is required.");
  }

  const userId = await requireUserId();
  const { error: recipeError } = await supabase
    .from("recipes")
    .update(getRecipePayload(input, userId))
    .eq("id", recipeId);

  if (recipeError) {
    throw new Error(recipeError.message);
  }

  const { error: deleteIngredientsError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", recipeId);

  if (deleteIngredientsError) {
    throw new Error(deleteIngredientsError.message);
  }

  const ingredientPayload = getIngredientPayload(recipeId, input);
  if (ingredientPayload.length === 0) {
    return;
  }

  const { error: ingredientError } = await supabase
    .from("recipe_ingredients")
    .insert(ingredientPayload);

  if (ingredientError) {
    throw new Error(ingredientError.message);
  }
}
