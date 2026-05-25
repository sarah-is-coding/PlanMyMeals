import { parseQuantityNumber } from "../../recipes/utils/ingredientScaling";
import type { GroceryItemDraft } from "../types";

type ScaledIngredient = {
  ingredientName: string;
  quantity: string;
  unit: string;
};

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
 * de-duped, sorted grocery list.
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
      });
    }
  }

  return Array.from(buckets.values())
    .map(({ ingredientName, unit, numericTotal, fallbackQuantity }) => ({
      ingredientName,
      unit,
      quantity:
        numericTotal !== null
          ? formatMergedQuantity(numericTotal)
          : fallbackQuantity,
    }))
    .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
}
