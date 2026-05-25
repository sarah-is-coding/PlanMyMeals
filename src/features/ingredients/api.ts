import { supabase } from "../../lib/supabaseClient";
import type { Ingredient, IngredientCategory } from "./types";

type IngredientRow = {
  id: string;
  name: string;
  category: string | null;
  default_unit: string | null;
};

const mapIngredientRow = (row: IngredientRow): Ingredient => ({
  id: row.id,
  name: row.name,
  category: row.category as Ingredient["category"],
  defaultUnit: row.default_unit,
});

export async function searchIngredients(
  term: string,
  limit = 8
): Promise<Ingredient[]> {
  const trimmed = term.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }

  const { data, error } = await supabase
    .from("ingredients")
    .select("id,name,category,default_unit")
    .ilike("name", `%${trimmed}%`)
    .order("name", { ascending: true })
    .limit(limit)
    .returns<IngredientRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapIngredientRow);
}

// Upsert so concurrent inserts of the same name don't throw —
// we just get back the existing canonical record.
export async function createIngredient(
  name: string,
  category: IngredientCategory = "other"
): Promise<Ingredient> {
  const normalized = name.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Ingredient name is required.");
  }

  const { data, error } = await supabase
    .from("ingredients")
    .upsert({ name: normalized, category }, { onConflict: "name" })
    .select("id,name,category,default_unit")
    .single<IngredientRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapIngredientRow(data);
}
