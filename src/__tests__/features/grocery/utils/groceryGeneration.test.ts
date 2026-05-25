import { describe, expect, it } from "vitest";
import { mergeIngredients } from "../../../../features/grocery/utils/groceryGeneration";

describe("mergeIngredients", () => {
  it("returns an empty array for empty input", () => {
    expect(mergeIngredients([])).toEqual([]);
  });

  it("passes a single ingredient through unchanged", () => {
    const result = mergeIngredients([
      { ingredientName: "butter", quantity: "2", unit: "tbsp" },
    ]);
    expect(result).toEqual([
      { ingredientName: "butter", quantity: "2", unit: "tbsp" },
    ]);
  });

  it("sums numeric quantities for the same ingredient and unit", () => {
    const result = mergeIngredients([
      { ingredientName: "flour", quantity: "1", unit: "cup" },
      { ingredientName: "flour", quantity: "2", unit: "cup" },
    ]);
    expect(result).toEqual([
      { ingredientName: "flour", quantity: "3", unit: "cup" },
    ]);
  });

  it("treats different units as separate entries", () => {
    const result = mergeIngredients([
      { ingredientName: "milk", quantity: "1", unit: "cup" },
      { ingredientName: "milk", quantity: "2", unit: "tbsp" },
    ]);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.unit === "cup")?.quantity).toBe("1");
    expect(result.find((r) => r.unit === "tbsp")?.quantity).toBe("2");
  });

  it("de-dupes case-insensitively on name and unit", () => {
    const result = mergeIngredients([
      { ingredientName: "Salt", quantity: "1", unit: "tsp" },
      { ingredientName: "salt", quantity: "0.5", unit: "TSP" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe("1.5");
    // Preserves the casing of the first occurrence
    expect(result[0].ingredientName).toBe("Salt");
  });

  it("handles non-parseable quantities (e.g. 'to taste') without crashing", () => {
    const result = mergeIngredients([
      { ingredientName: "pepper", quantity: "to taste", unit: "" },
      { ingredientName: "pepper", quantity: "to taste", unit: "" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe("to taste");
  });

  it("handles fractions", () => {
    const result = mergeIngredients([
      { ingredientName: "sugar", quantity: "1/2", unit: "cup" },
      { ingredientName: "sugar", quantity: "1/4", unit: "cup" },
    ]);
    expect(result).toHaveLength(1);
    // 0.5 + 0.25 = 0.75
    expect(result[0].quantity).toBe("0.75");
  });

  it("handles mixed fractions", () => {
    const result = mergeIngredients([
      { ingredientName: "oats", quantity: "1 1/2", unit: "cup" },
      { ingredientName: "oats", quantity: "1", unit: "cup" },
    ]);
    expect(result).toHaveLength(1);
    // 1.5 + 1 = 2.5
    expect(result[0].quantity).toBe("2.5");
  });

  it("sorts results alphabetically by ingredient name", () => {
    const result = mergeIngredients([
      { ingredientName: "zucchini", quantity: "1", unit: "" },
      { ingredientName: "apple", quantity: "2", unit: "" },
      { ingredientName: "mango", quantity: "3", unit: "" },
    ]);
    expect(result.map((r) => r.ingredientName)).toEqual([
      "apple",
      "mango",
      "zucchini",
    ]);
  });

  it("skips entries with empty ingredient names", () => {
    const result = mergeIngredients([
      { ingredientName: "", quantity: "1", unit: "cup" },
      { ingredientName: "   ", quantity: "2", unit: "cup" },
      { ingredientName: "rice", quantity: "1", unit: "cup" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].ingredientName).toBe("rice");
  });

  it("handles empty quantity strings", () => {
    const result = mergeIngredients([
      { ingredientName: "garlic", quantity: "", unit: "cloves" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe("");
  });

  it("sums a decimal and an integer quantity", () => {
    const result = mergeIngredients([
      { ingredientName: "oil", quantity: "0.5", unit: "cup" },
      { ingredientName: "oil", quantity: "1", unit: "cup" },
    ]);
    expect(result[0].quantity).toBe("1.5");
  });

  it("produces a whole number when sum is exact", () => {
    const result = mergeIngredients([
      { ingredientName: "eggs", quantity: "3", unit: "" },
      { ingredientName: "eggs", quantity: "3", unit: "" },
    ]);
    expect(result[0].quantity).toBe("6");
  });
});
