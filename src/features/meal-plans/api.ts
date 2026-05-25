import { supabase } from "../../lib/supabaseClient";
import { getWeekEndIso, toIsoDate } from "./dateUtils";
import type {
  AddMealPlanItemInput,
  MealPlanDayPreview,
  MealPlanItem,
  MealPlannerRecipeSummary,
  MoveMealPlanItemInput,
  MealType,
  UpdateMealPlanItemServingsInput,
} from "./types";

type MealPlanRow = {
  id: string;
  end_date: string | null;
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

async function getMealPlanForWeek(weekStartIso: string): Promise<MealPlanRow | null> {
  const { data, error } = await supabase
    .from("meal_plans")
    .select("id,end_date")
    .eq("start_date", weekStartIso)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<MealPlanRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

async function ensureMealPlanIdForWeek(weekStartIso: string): Promise<string> {
  const existing = await getMealPlanForWeek(weekStartIso);
  if (existing) {
    return existing.id;
  }

  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("meal_plans")
    .insert({
      user_id: userId,
      title: `Week of ${weekStartIso}`,
      start_date: weekStartIso,
      end_date: getWeekEndIso(weekStartIso), // 7-day default; update when UI supports custom lengths
    })
    .select("id,end_date")
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
  const plan = await getMealPlanForWeek(weekStartIso);
  if (!plan) {
    return [];
  }

  // Use the plan's stored end_date; fall back to computed +6 for legacy rows
  // that pre-date the end_date column.
  const endIso = plan.end_date ?? getWeekEndIso(weekStartIso);
  const { data, error } = await supabase
    .from("meal_plan_items")
    .select("id,recipe_id,planned_for,meal_type,servings_override,recipes(title,servings)")
    .eq("meal_plan_id", plan.id)
    .gte("planned_for", weekStartIso)
    .lte("planned_for", endIso)
    .in("meal_type", MEAL_TYPES)
    .order("planned_for", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<MealPlanItemRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapMealPlanItemRow);
}

export async function clearWeekPlan(weekStartIso: string): Promise<void> {
  const plan = await getMealPlanForWeek(weekStartIso);
  if (!plan) return;

  const endIso = plan.end_date ?? getWeekEndIso(weekStartIso);
  const { error } = await supabase
    .from("meal_plan_items")
    .delete()
    .eq("meal_plan_id", plan.id)
    .gte("planned_for", weekStartIso)
    .lte("planned_for", endIso);

  if (error) throw new Error(error.message);
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

type PreviewItemRow = {
  planned_for: string;
  recipes: RecipeRelation;
};

export async function previewMealPlanWeek(weekStartIso: string): Promise<MealPlanDayPreview[]> {
  const plan = await getMealPlanForWeek(weekStartIso);
  if (!plan) {
    return [];
  }

  const endIso = plan.end_date ?? getWeekEndIso(weekStartIso);
  const { data, error } = await supabase
    .from("meal_plan_items")
    .select("planned_for,recipes(title)")
    .eq("meal_plan_id", plan.id)
    .gte("planned_for", weekStartIso)
    .lte("planned_for", endIso)
    .order("planned_for", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<PreviewItemRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  // Group recipe titles by date
  const byDate = new Map<string, string[]>();
  for (const row of data ?? []) {
    const title = getRecipeTitle(row.recipes);
    const list = byDate.get(row.planned_for) ?? [];
    list.push(title);
    byDate.set(row.planned_for, list);
  }

  return Array.from(byDate.entries()).map(([dateIso, recipes]) => ({ dateIso, recipes }));
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

// ── Copy a whole week's plan to another week ───────────────────────────────
// Shifts each item by the same weekday index so Mon→Mon, Tue→Tue, etc.
// Adds on top of any existing items in the target week (no items are removed).

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  // Local-time Date constructor so DST doesn't shift the day
  return toIsoDate(new Date(y, m - 1, d + days));
}

function daysBetweenIso(startIso: string, endIso: string): number {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round(
    (new Date(ey, em - 1, ed).getTime() - new Date(sy, sm - 1, sd).getTime()) / msPerDay
  );
}

type CopyItemInsert = {
  meal_plan_id: string;
  recipe_id: string | null;
  planned_for: string;
  meal_type: MealType;
  servings_override: number | null;
};

export async function copyWeekPlan(
  sourceWeekStartIso: string,
  targetWeekStartIso: string
): Promise<MealPlanItem[]> {
  const sourceItems = await listMealPlanItemsForWeek(sourceWeekStartIso);
  if (sourceItems.length === 0) {
    return [];
  }

  const targetMealPlanId = await ensureMealPlanIdForWeek(targetWeekStartIso);

  const inserts: CopyItemInsert[] = sourceItems.map((item) => {
    const dayIndex = daysBetweenIso(sourceWeekStartIso, item.plannedFor);
    return {
      meal_plan_id: targetMealPlanId,
      recipe_id: item.recipeId,
      planned_for: addDaysIso(targetWeekStartIso, dayIndex),
      meal_type: item.mealType,
      servings_override: item.servingsOverride,
    };
  });

  const { data, error } = await supabase
    .from("meal_plan_items")
    .insert(inserts)
    .select("id,recipe_id,planned_for,meal_type,servings_override,recipes(title,servings)")
    .returns<MealPlanItemRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapMealPlanItemRow);
}
