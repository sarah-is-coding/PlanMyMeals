import { describe, expect, it } from "vitest";
import {
  groupItemsByCategory,
  mergeIngredients,
} from "../../../../features/grocery/utils/groceryGeneration";
import type { IngredientCategory } from "../../../../features/ingredients/types";

// Helper: build a scaled ingredient with category defaulting to null
function ing(
  ingredientName: string,
  quantity: string,
  unit: string,
  category: IngredientCategory | null = null
) {
  return { ingredientName, quantity, unit, category };
}

describe("mergeIngredients", () => {
  it("returns an empty array for empty input", () => {
    expect(mergeIngredients([])).toEqual([]);
  });

  it("passes a single ingredient through unchanged", () => {
    const result = mergeIngredients([ing("butter", "2", "tbsp", "dairy & eggs")]);
    expect(result).toEqual([
      { ingredientName: "butter", quantity: "2", unit: "tbsp", category: "dairy & eggs" },
    ]);
  });

  it("sums numeric quantities for the same ingredient and unit", () => {
    const result = mergeIngredients([
      ing("flour", "1", "cup", "pantry"),
      ing("flour", "2", "cup", "pantry"),
    ]);
    expect(result).toEqual([
      { ingredientName: "flour", quantity: "3", unit: "cup", category: "pantry" },
    ]);
  });

  it("treats different units as separate entries", () => {
    const result = mergeIngredients([
      ing("milk", "1", "cup", "dairy & eggs"),
      ing("milk", "2", "tbsp", "dairy & eggs"),
    ]);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.unit === "cup")?.quantity).toBe("1");
    expect(result.find((r) => r.unit === "tbsp")?.quantity).toBe("2");
  });

  it("de-dupes case-insensitively on name and unit", () => {
    const result = mergeIngredients([
      ing("Salt", "1", "tsp"),
      ing("salt", "0.5", "TSP"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe("1.5");
    // Preserves the casing of the first occurrence
    expect(result[0].ingredientName).toBe("Salt");
  });

  it("handles non-parseable quantities (e.g. 'to taste') without crashing", () => {
    const result = mergeIngredients([
      ing("pepper", "to taste", ""),
      ing("pepper", "to taste", ""),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe("to taste");
  });

  it("handles fractions", () => {
    const result = mergeIngredients([
      ing("sugar", "1/2", "cup", "pantry"),
      ing("sugar", "1/4", "cup", "pantry"),
    ]);
    expect(result).toHaveLength(1);
    // 0.5 + 0.25 = 0.75
    expect(result[0].quantity).toBe("0.75");
  });

  it("handles mixed fractions", () => {
    const result = mergeIngredients([
      ing("oats", "1 1/2", "cup", "pantry"),
      ing("oats", "1", "cup", "pantry"),
    ]);
    expect(result).toHaveLength(1);
    // 1.5 + 1 = 2.5
    expect(result[0].quantity).toBe("2.5");
  });

  it("sorts by category order then alphabetically within a category", () => {
    const result = mergeIngredients([
      ing("zucchini", "1", "", "produce"),
      ing("butter", "2", "tbsp", "dairy & eggs"),
      ing("apple", "3", "", "produce"),
      ing("flour", "1", "cup", "pantry"),
    ]);
    // produce < dairy & eggs is wrong — produce(0) < dairy & eggs(2) < pantry(6)
    // within produce: apple < zucchini
    expect(result.map((r) => r.ingredientName)).toEqual([
      "apple",
      "zucchini",
      "butter",
      "flour",
    ]);
  });

  it("sorts items with null category into 'other' at the end", () => {
    const result = mergeIngredients([
      ing("mystery thing", "1", ""),         // null → other
      ing("apple", "1", "", "produce"),       // produce = index 0
    ]);
    expect(result[0].ingredientName).toBe("apple");
    expect(result[1].ingredientName).toBe("mystery thing");
  });

  it("skips entries with empty ingredient names", () => {
    const result = mergeIngredients([
      ing("", "1", "cup"),
      ing("   ", "2", "cup"),
      ing("rice", "1", "cup", "pantry"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].ingredientName).toBe("rice");
  });

  it("handles empty quantity strings", () => {
    const result = mergeIngredients([ing("garlic", "", "cloves")]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe("");
  });

  it("sums a decimal and an integer quantity", () => {
    const result = mergeIngredients([
      ing("oil", "0.5", "cup"),
      ing("oil", "1", "cup"),
    ]);
    expect(result[0].quantity).toBe("1.5");
  });

  it("produces a whole number when sum is exact", () => {
    const result = mergeIngredients([
      ing("eggs", "3", ""),
      ing("eggs", "3", ""),
    ]);
    expect(result[0].quantity).toBe("6");
  });
});

describe("groupItemsByCategory", () => {
  it("returns an empty array for empty input", () => {
    expect(groupItemsByCategory([])).toEqual([]);
  });

  it("groups items by category and uses the display label", () => {
    const items = [
      { category: "produce" as IngredientCategory, ingredientName: "apple" },
      { category: "pantry" as IngredientCategory, ingredientName: "flour" },
      { category: "produce" as IngredientCategory, ingredientName: "carrot" },
    ];
    const groups = groupItemsByCategory(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe("Produce");
    expect(groups[0].items.map((i) => i.ingredientName)).toEqual(["apple", "carrot"]);
    expect(groups[1].label).toBe("Pantry");
  });

  it("places null-category items in 'Other'", () => {
    const items = [{ category: null, ingredientName: "mystery" }];
    const groups = groupItemsByCategory(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Other");
  });

  it("preserves canonical category order across groups", () => {
    const items = [
      { category: "frozen" as IngredientCategory, ingredientName: "peas" },
      { category: "produce" as IngredientCategory, ingredientName: "onion" },
      { category: "dairy & eggs" as IngredientCategory, ingredientName: "milk" },
    ];
    const groups = groupItemsByCategory(items);
    expect(groups.map((g) => g.label)).toEqual(["Produce", "Dairy & Eggs", "Frozen"]);
  });

  it("omits categories that have no items", () => {
    const items = [{ category: "beverages" as IngredientCategory, ingredientName: "oj" }];
    const groups = groupItemsByCategory(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Beverages");
  });
});
