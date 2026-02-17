import { supabase } from "../../lib/supabaseClient";
import { getWeekEndIso } from "./dateUtils";
import type {
  AddMealPlanItemInput,
  MealPlanItem,
  MealPlannerRecipeSummary,
  MealType,
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
};

type RecipeTitleRelation = { title: string } | Array<{ title: string }> | null;

type MealPlanItemRow = {
  id: string;
  recipe_id: string | null;
  planned_for: string;
  meal_type: MealType | "other";
  recipes: RecipeTitleRelation;
};

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

function getRecipeTitle(relation: RecipeTitleRelation): string {
  if (Array.isArray(relation)) {
    return relation[0]?.title ?? "Untitled recipe";
  }
  return relation?.title ?? "Untitled recipe";
}

function mapRecipeSearchRow(row: RecipeSearchRow): MealPlannerRecipeSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
  };
}

function mapMealPlanItemRow(row: MealPlanItemRow): MealPlanItem {
  if (!MEAL_TYPES.includes(row.meal_type as MealType)) {
    throw new Error("Unsupported meal type on meal plan item.");
  }
  const mealType = row.meal_type as MealType;

  return {
    id: row.id,
    recipeId: row.recipe_id,
    recipeTitle: getRecipeTitle(row.recipes),
    plannedFor: row.planned_for,
    mealType,
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
    .select("id,title,description,prep_minutes,cook_minutes")
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
    .select("id,recipe_id,planned_for,meal_type,recipes(title)")
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
    })
    .select("id,recipe_id,planned_for,meal_type,recipes(title)")
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
