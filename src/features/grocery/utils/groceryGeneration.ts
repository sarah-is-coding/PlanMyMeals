import {
  INGREDIENT_CATEGORIES,
  type IngredientCategory,
} from "../../ingredients/types";
import { parseQuantityNumber } from "../../recipes/utils/ingredientScaling";
import type { GroceryItemDraft } from "../types";

type ScaledIngredient = {
  ingredientName: string;
  quantity: string;
  unit: string;
  category: IngredientCategory | null;
};

/** Display label for each ingredient category. */
const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  produce: "Produce",
  "meat & seafood": "Meat & Seafood",
  "dairy & eggs": "Dairy & Eggs",
  "bakery & bread": "Bakery & Bread",
  pantry: "Pantry",
  frozen: "Frozen",
  beverages: "Beverages",
  other: "Other",
};

/** The sort-order index for each category. */
const CATEGORY_ORDER = new Map<IngredientCategory, number>(
  INGREDIENT_CATEGORIES.map((cat, i) => [cat, i])
);

/** Format a merged numeric quantity back to a display string. */
function formatMergedQuantity(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 0.000001) {
    return String(Math.round(rounded));
  }
  // e.g. 1.5 → "1.5", 0.75 → "0.75"
  return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Merge a flat list of (possibly duplicated) scaled ingredients into a
 * de-duped grocery list, sorted by ingredient category then alphabetically.
 *
 * Grouping key: lower-cased ingredient name + lower-cased unit.
 * If both entries have parseable quantities they are summed; otherwise
 * the first parseable quantity (or freeform text) is kept.
 */
export function mergeIngredients(ingredients: ScaledIngredient[]): GroceryItemDraft[] {
  type Bucket = {
    ingredientName: string;
    unit: string;
    numericTotal: number | null;
    fallbackQuantity: string;
    category: IngredientCategory | null;
  };

  const buckets = new Map<string, Bucket>();

  for (const ing of ingredients) {
    const nameTrimmed = ing.ingredientName.trim();
    const unitTrimmed = ing.unit.trim();
    if (!nameTrimmed) continue;

    const key = `${nameTrimmed.toLowerCase()}|${unitTrimmed.toLowerCase()}`;
    const rawQty = ing.quantity.trim();
    const qty = rawQty ? parseQuantityNumber(rawQty) : null;

    const existing = buckets.get(key);
    if (existing) {
      if (qty !== null && existing.numericTotal !== null) {
        existing.numericTotal += qty;
      } else if (qty !== null && existing.numericTotal === null) {
        // Upgrade: earlier bucket was non-numeric, this one is — start fresh
        existing.numericTotal = qty;
        existing.fallbackQuantity = "";
      } else if (!existing.fallbackQuantity && rawQty) {
        existing.fallbackQuantity = rawQty;
      }
    } else {
      buckets.set(key, {
        ingredientName: nameTrimmed,
        unit: unitTrimmed,
        numericTotal: qty,
        fallbackQuantity: qty === null ? rawQty : "",
        category: ing.category,
      });
    }
  }

  return Array.from(buckets.values())
    .map(({ ingredientName, unit, numericTotal, fallbackQuantity, category }) => ({
      ingredientName,
      unit,
      quantity:
        numericTotal !== null
          ? formatMergedQuantity(numericTotal)
          : fallbackQuantity,
      category,
    }))
    .sort((a, b) => {
      const catA = CATEGORY_ORDER.get(a.category ?? "other") ?? INGREDIENT_CATEGORIES.length;
      const catB = CATEGORY_ORDER.get(b.category ?? "other") ?? INGREDIENT_CATEGORIES.length;
      if (catA !== catB) return catA - catB;
      return a.ingredientName.localeCompare(b.ingredientName);
    });
}

/**
 * Group a list of items by their `category` field, preserving the canonical
 * category display order. Items with `null` category fall into "Other".
 * Categories that have no items are omitted.
 */
export function groupItemsByCategory<
  T extends { category: IngredientCategory | null }
>(items: T[]): Array<{ label: string; items: T[] }> {
  const grouped = new Map<IngredientCategory, T[]>();
  for (const item of items) {
    const cat: IngredientCategory = item.category ?? "other";
    const group = grouped.get(cat) ?? [];
    group.push(item);
    grouped.set(cat, group);
  }
  return INGREDIENT_CATEGORIES.filter((cat) => grouped.has(cat)).map((cat) => ({
    label: CATEGORY_LABELS[cat],
    items: grouped.get(cat)!,
  }));
}
