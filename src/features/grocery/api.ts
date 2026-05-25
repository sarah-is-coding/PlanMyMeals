import { supabase } from "../../lib/supabaseClient";
import { scaleQuantityText } from "../recipes/utils/ingredientScaling";
import { mergeIngredients } from "./utils/groceryGeneration";
import type {
  GroceryItem,
  GroceryItemDraft,
  GroceryList,
  GroceryListSummary,
} from "./types";

// ── Internal row types ──────────────────────────────────────────────────────

type MealTypeConst = "breakfast" | "lunch" | "dinner";
const MEAL_TYPES: MealTypeConst[] = ["breakfast", "lunch", "dinner"];

type RecipeServingsRelation =
  | { servings: number | null }
  | { servings: number | null }[]
  | null;

type PlanItemRow = {
  recipe_id: string | null;
  servings_override: number | null;
  recipes: RecipeServingsRelation;
};

type RecipeIngRow = {
  recipe_id: string;
  ingredient_name: string;
  quantity: string | null;
  unit: string | null;
};

type GroceryListRow = {
  id: string;
  title: string;
  meal_plan_id: string | null;
  created_at: string;
};

type GroceryItemRow = {
  id: string;
  ingredient_name: string;
  quantity: string | null;
  unit: string | null;
  is_checked: boolean;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function getRecipeServings(rel: RecipeServingsRelation): number | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0]?.servings ?? null;
  return rel.servings;
}

function mapItemRow(row: GroceryItemRow): GroceryItem {
  return {
    id: row.id,
    ingredientName: row.ingredient_name,
    quantity: row.quantity ?? "",
    unit: row.unit ?? "",
    isChecked: row.is_checked,
  };
}

function mapListRow(row: GroceryListRow, items: GroceryItem[]): GroceryList {
  return {
    id: row.id,
    title: row.title,
    mealPlanId: row.meal_plan_id,
    createdAt: row.created_at,
    items,
  };
}

function mapSummaryRow(row: GroceryListRow): GroceryListSummary {
  return {
    id: row.id,
    title: row.title,
    mealPlanId: row.meal_plan_id,
    createdAt: row.created_at,
  };
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!user) throw new Error("You must be signed in to manage grocery lists.");
  return user.id;
}

/** Returns the meal_plan id whose start_date matches the given week ISO, or null. */
async function getPlanIdForWeek(weekStartIso: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("start_date", weekStartIso)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

// ── Grocery generation ──────────────────────────────────────────────────────

/**
 * Fetch all meals in the given plan, scale each recipe's ingredients to the
 * planned serving count, then merge duplicate ingredients.
 */
export async function buildGroceryItemsForPlan(
  planId: string
): Promise<GroceryItemDraft[]> {
  // 1. Plan items with recipe servings
  const { data: planItems, error: planErr } = await supabase
    .from("meal_plan_items")
    .select("recipe_id, servings_override, recipes(servings)")
    .eq("meal_plan_id", planId)
    .in("meal_type", MEAL_TYPES)
    .returns<PlanItemRow[]>();

  if (planErr) throw new Error(planErr.message);
  if (!planItems || planItems.length === 0) return [];

  // 2. Collect unique recipe IDs
  const recipeIds = Array.from(
    new Set(
      planItems
        .map((i) => i.recipe_id)
        .filter((id): id is string => id !== null)
    )
  );
  if (recipeIds.length === 0) return [];

  // 3. Batch-fetch all recipe ingredients
  const { data: ingRows, error: ingErr } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id, ingredient_name, quantity, unit")
    .in("recipe_id", recipeIds)
    .returns<RecipeIngRow[]>();

  if (ingErr) throw new Error(ingErr.message);

  // Group by recipe_id for fast lookup
  const ingByRecipe = new Map<string, RecipeIngRow[]>();
  for (const row of ingRows ?? []) {
    const list = ingByRecipe.get(row.recipe_id) ?? [];
    list.push(row);
    ingByRecipe.set(row.recipe_id, list);
  }

  // 4. Scale each plan item's ingredients and collect
  const scaled: { ingredientName: string; quantity: string; unit: string }[] = [];
  for (const item of planItems) {
    if (!item.recipe_id) continue;
    const ings = ingByRecipe.get(item.recipe_id) ?? [];
    if (ings.length === 0) continue;

    const recipeServings = getRecipeServings(item.recipes);
    const effectiveServings = item.servings_override ?? recipeServings;

    for (const ing of ings) {
      scaled.push({
        ingredientName: ing.ingredient_name,
        quantity: scaleQuantityText(
          ing.quantity ?? "",
          recipeServings,
          effectiveServings
        ),
        unit: ing.unit ?? "",
      });
    }
  }

  // 5. Merge + sort
  return mergeIngredients(scaled);
}

/**
 * Convenience: find the meal plan for a given week, then delegate to
 * `buildGroceryItemsForPlan`. Returns the plan id alongside items so the
 * caller can link the grocery list back to the plan.
 */
export async function buildGroceryItemsForWeek(weekStartIso: string): Promise<{
  items: GroceryItemDraft[];
  planId: string | null;
}> {
  const planId = await getPlanIdForWeek(weekStartIso);
  if (!planId) return { items: [], planId: null };
  const items = await buildGroceryItemsForPlan(planId);
  return { items, planId };
}

// ── Persistence ─────────────────────────────────────────────────────────────

export async function saveGroceryList(
  title: string,
  mealPlanId: string | null,
  items: GroceryItemDraft[]
): Promise<GroceryList> {
  const userId = await requireUserId();

  const { data: listRow, error: listErr } = await supabase
    .from("grocery_lists")
    .insert({
      user_id: userId,
      title: title.trim(),
      meal_plan_id: mealPlanId,
    })
    .select("id, title, meal_plan_id, created_at")
    .single<GroceryListRow>();

  if (listErr) throw new Error(listErr.message);

  if (items.length === 0) {
    return mapListRow(listRow, []);
  }

  const { data: itemRows, error: itemErr } = await supabase
    .from("grocery_items")
    .insert(
      items.map((item) => ({
        list_id: listRow.id,
        ingredient_name: item.ingredientName,
        quantity: item.quantity || null,
        unit: item.unit || null,
        is_checked: false,
      }))
    )
    .select("id, ingredient_name, quantity, unit, is_checked")
    .returns<GroceryItemRow[]>();

  if (itemErr) throw new Error(itemErr.message);

  return mapListRow(listRow, (itemRows ?? []).map(mapItemRow));
}

export async function getGroceryList(listId: string): Promise<GroceryList | null> {
  const { data: listRow, error: listErr } = await supabase
    .from("grocery_lists")
    .select("id, title, meal_plan_id, created_at")
    .eq("id", listId)
    .maybeSingle<GroceryListRow>();

  if (listErr) throw new Error(listErr.message);
  if (!listRow) return null;

  const { data: itemRows, error: itemErr } = await supabase
    .from("grocery_items")
    .select("id, ingredient_name, quantity, unit, is_checked")
    .eq("list_id", listId)
    .order("created_at", { ascending: true })
    .returns<GroceryItemRow[]>();

  if (itemErr) throw new Error(itemErr.message);

  return mapListRow(listRow, (itemRows ?? []).map(mapItemRow));
}

export async function listSavedGroceryLists(): Promise<GroceryListSummary[]> {
  const { data, error } = await supabase
    .from("grocery_lists")
    .select("id, title, meal_plan_id, created_at")
    .order("created_at", { ascending: false })
    .returns<GroceryListRow[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSummaryRow);
}

export async function deleteGroceryList(listId: string): Promise<void> {
  const { error } = await supabase
    .from("grocery_lists")
    .delete()
    .eq("id", listId)
    .returns<null>();

  if (error) throw new Error(error.message);
}

export async function renameGroceryList(
  listId: string,
  newName: string
): Promise<GroceryListSummary> {
  const { data, error } = await supabase
    .from("grocery_lists")
    .update({ title: newName.trim() })
    .eq("id", listId)
    .select("id, title, meal_plan_id, created_at")
    .single<GroceryListRow>();

  if (error) throw new Error(error.message);
  return mapSummaryRow(data);
}

export async function toggleGroceryItem(
  itemId: string,
  isChecked: boolean
): Promise<void> {
  const { error } = await supabase
    .from("grocery_items")
    .update({ is_checked: isChecked })
    .eq("id", itemId)
    .returns<null>();

  if (error) throw new Error(error.message);
}

export async function uncheckAllGroceryItems(listId: string): Promise<void> {
  const { error } = await supabase
    .from("grocery_items")
    .update({ is_checked: false })
    .eq("list_id", listId)
    .returns<null>();

  if (error) throw new Error(error.message);
}
