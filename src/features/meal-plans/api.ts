import { supabase } from "../../lib/supabaseClient";
import { getWeekEndIso } from "./dateUtils";
import type {
  AddMealPlanItemInput,
  MealPlanItem,
  MealPlannerRecipeSummary,
  MoveMealPlanItemInput,
  MealType,
  UpdateMealPlanItemServingsInput,
} from "./types";

type MealPlanRow = {
  id: string;
};

type RecipeSearchRow = {
  id: string;
  title: string;
  description: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number | null;
};

type RecipeRelationRow = {
  title: string;
  servings: number | null;
};

type RecipeRelation = RecipeRelationRow | RecipeRelationRow[] | null;

type MealPlanItemRow = {
  id: string;
  recipe_id: string | null;
  planned_for: string;
  meal_type: MealType | "other";
  servings_override: number | null;
  recipes: RecipeRelation;
};

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

function getRecipeRelationValue(relation: RecipeRelation): RecipeRelationRow | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }
  return relation;
}

function getRecipeTitle(relation: RecipeRelation): string {
  return getRecipeRelationValue(relation)?.title ?? "Untitled recipe";
}

function getRecipeServings(relation: RecipeRelation): number | null {
  return getRecipeRelationValue(relation)?.servings ?? null;
}

function mapRecipeSearchRow(row: RecipeSearchRow): MealPlannerRecipeSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
    servings: row.servings,
  };
}

function mapMealPlanItemRow(row: MealPlanItemRow): MealPlanItem {
  if (!MEAL_TYPES.includes(row.meal_type as MealType)) {
    throw new Error("Unsupported meal type on meal plan item.");
  }
  const mealType = row.meal_type as MealType;
  const recipeServings = getRecipeServings(row.recipes);
  const servingsOverride = row.servings_override;
  const effectiveServings = servingsOverride ?? recipeServings;

  return {
    id: row.id,
    recipeId: row.recipe_id,
    recipeTitle: getRecipeTitle(row.recipes),
    plannedFor: row.planned_for,
    mealType,
    servingsOverride,
    recipeServings,
    effectiveServings,
  };
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error("You must be signed in to manage meal plans.");
  }

  return user.id;
}

async function getMealPlanIdForWeek(weekStartIso: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("start_date", weekStartIso)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<MealPlanRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}

async function ensureMealPlanIdForWeek(weekStartIso: string): Promise<string> {
  const existingId = await getMealPlanIdForWeek(weekStartIso);
  if (existingId) {
    return existingId;
  }

  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("meal_plans")
    .insert({
      user_id: userId,
      title: `Week of ${weekStartIso}`,
      start_date: weekStartIso,
    })
    .select("id")
    .single<MealPlanRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data.id;
}

export async function searchPlannerRecipes(
  searchTerm: string,
  limit: number = 12
): Promise<MealPlannerRecipeSummary[]> {
  const safeLimit = Math.max(1, Math.min(24, Math.floor(limit)));
  let query = supabase
    .from("recipes")
    .select("id,title,description,prep_minutes,cook_minutes,servings")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  const trimmedTerm = searchTerm.trim();
  if (trimmedTerm) {
    query = query.ilike("title", `%${trimmedTerm}%`);
  }

  const { data, error } = await query.returns<RecipeSearchRow[]>();
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRecipeSearchRow);
}

export async function listMealPlanItemsForWeek(weekStartIso: string): Promise<MealPlanItem[]> {
  const mealPlanId = await getMealPlanIdForWeek(weekStartIso);
  if (!mealPlanId) {
    return [];
  }

  const weekEndIso = getWeekEndIso(weekStartIso);
  const { data, error } = await supabase
    .from("meal_plan_items")
    .select("id,recipe_id,planned_for,meal_type,servings_override,recipes(title,servings)")
    .eq("meal_plan_id", mealPlanId)
    .gte("planned_for", weekStartIso)
    .lte("planned_for", weekEndIso)
    .in("meal_type", MEAL_TYPES)
    .order("planned_for", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<MealPlanItemRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapMealPlanItemRow);
}

export async function addMealPlanItem(input: AddMealPlanItemInput): Promise<MealPlanItem> {
  const mealPlanId = await ensureMealPlanIdForWeek(input.weekStartIso);
  const { data, error } = await supabase
    .from("meal_plan_items")
    .insert({
      meal_plan_id: mealPlanId,
      recipe_id: input.recipeId,
      planned_for: input.plannedFor,
      meal_type: input.mealType,
      servings_override: input.servingsOverride,
    })
    .select("id,recipe_id,planned_for,meal_type,servings_override,recipes(title,servings)")
    .single<MealPlanItemRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapMealPlanItemRow(data);
}

export async function deleteMealPlanItem(itemId: string): Promise<void> {
  const { error } = await supabase.from("meal_plan_items").delete().eq("id", itemId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function moveMealPlanItem(input: MoveMealPlanItemInput): Promise<MealPlanItem> {
  const { data, error } = await supabase
    .from("meal_plan_items")
    .update({
      planned_for: input.plannedFor,
      meal_type: input.mealType,
    })
    .eq("id", input.itemId)
    .select("id,recipe_id,planned_for,meal_type,servings_override,recipes(title,servings)")
    .single<MealPlanItemRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapMealPlanItemRow(data);
}

export async function updateMealPlanItemServings(
  input: UpdateMealPlanItemServingsInput
): Promise<MealPlanItem> {
  const { data, error } = await supabase
    .from("meal_plan_items")
    .update({
      servings_override: input.servingsOverride,
    })
    .eq("id", input.itemId)
    .select("id,recipe_id,planned_for,meal_type,servings_override,recipes(title,servings)")
    .single<MealPlanItemRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapMealPlanItemRow(data);
}
