import {
  parseQuantityNumber,
  scaleQuantityText,
  scaleRecipeFormIngredientQuantities,
} from "../../../../features/recipes/utils/ingredientScaling";

// ─────────────────────────────────────────────────────────────
// parseQuantityNumber
// ─────────────────────────────────────────────────────────────
describe("parseQuantityNumber", () => {
  it("parses plain integers", () => {
    expect(parseQuantityNumber("2")).toBe(2);
    expect(parseQuantityNumber("10")).toBe(10);
  });

  it("parses decimal values", () => {
    expect(parseQuantityNumber("1.5")).toBe(1.5);
    expect(parseQuantityNumber("0.25")).toBe(0.25);
  });

  it("parses simple fractions", () => {
    expect(parseQuantityNumber("1/2")).toBe(0.5);
    expect(parseQuantityNumber("3/4")).toBeCloseTo(0.75);
    expect(parseQuantityNumber("1/4")).toBe(0.25);
  });

  it("parses mixed numbers", () => {
    expect(parseQuantityNumber("1 1/2")).toBe(1.5);
    expect(parseQuantityNumber("2 1/4")).toBe(2.25);
    expect(parseQuantityNumber("3 3/4")).toBeCloseTo(3.75);
  });

  it("returns null for empty string", () => {
    expect(parseQuantityNumber("")).toBeNull();
    expect(parseQuantityNumber("   ")).toBeNull();
  });

  it("returns null for freeform text", () => {
    expect(parseQuantityNumber("to taste")).toBeNull();
    expect(parseQuantityNumber("a handful")).toBeNull();
    expect(parseQuantityNumber("pinch")).toBeNull();
  });

  it("returns null for zero denominator", () => {
    expect(parseQuantityNumber("1/0")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// scaleQuantityText
// ─────────────────────────────────────────────────────────────
describe("scaleQuantityText", () => {
  it("scales a simple number up", () => {
    expect(scaleQuantityText("1", 2, 4)).toBe("2");
    expect(scaleQuantityText("2", 4, 8)).toBe("4");
  });

  it("scales a simple number down", () => {
    expect(scaleQuantityText("2", 4, 2)).toBe("1");
  });

  it("returns the original when from and to servings are equal", () => {
    expect(scaleQuantityText("1", 4, 4)).toBe("1");
  });

  it("returns the original when quantity is freeform text", () => {
    expect(scaleQuantityText("to taste", 2, 4)).toBe("to taste");
    expect(scaleQuantityText("a handful", 2, 4)).toBe("a handful");
  });

  it("returns the original when servings are null", () => {
    expect(scaleQuantityText("2", null, 4)).toBe("2");
    expect(scaleQuantityText("2", 2, null)).toBe("2");
    expect(scaleQuantityText("2", null, null)).toBe("2");
  });

  it("returns the original when quantity is empty", () => {
    expect(scaleQuantityText("", 2, 4)).toBe("");
  });

  it("preserves fraction format when the result is not a whole number", () => {
    // 1/4 × (3/1) = 3/4 — result is fractional, so stays in fraction format
    const result = scaleQuantityText("1/4", 1, 3);
    expect(result).toContain("/");
    expect(result).toBe("3/4");
  });

  it("returns a whole number string when a fraction scales to a whole", () => {
    // 1/2 × (4/2) = 1 — result is a whole number, no slash needed
    const result = scaleQuantityText("1/2", 2, 4);
    expect(result).toBe("1");
  });

  it("uses decimal format when the original uses a decimal", () => {
    const result = scaleQuantityText("1.5", 2, 4);
    expect(result).not.toContain("/");
    expect(result).toBe("3");
  });

  it("scales a decimal correctly", () => {
    expect(scaleQuantityText("0.5", 1, 2)).toBe("1");
    expect(scaleQuantityText("1.5", 2, 4)).toBe("3");
  });
});

// ─────────────────────────────────────────────────────────────
// scaleRecipeFormIngredientQuantities
// ─────────────────────────────────────────────────────────────
describe("scaleRecipeFormIngredientQuantities", () => {
  const baseIngredients = [
    {
      id: "row-1",
      ingredientId: "canonical-1",
      ingredientName: "chicken breast",
      quantity: "2",
      unit: "lbs",
      notes: "",
    },
    {
      id: "row-2",
      ingredientId: "canonical-2",
      ingredientName: "olive oil",
      quantity: "to taste",
      unit: "",
      notes: "extra virgin",
    },
  ];

  it("scales numeric quantities across all ingredients", () => {
    const result = scaleRecipeFormIngredientQuantities(baseIngredients, 2, 4);
    expect(result[0].quantity).toBe("4");
  });

  it("leaves freeform quantities unchanged", () => {
    const result = scaleRecipeFormIngredientQuantities(baseIngredients, 2, 4);
    expect(result[1].quantity).toBe("to taste");
  });

  it("preserves all other fields including ingredientId", () => {
    const result = scaleRecipeFormIngredientQuantities(baseIngredients, 2, 4);
    expect(result[0].ingredientId).toBe("canonical-1");
    expect(result[0].unit).toBe("lbs");
    expect(result[1].notes).toBe("extra virgin");
  });

  it("returns a new array without mutating the original", () => {
    const result = scaleRecipeFormIngredientQuantities(baseIngredients, 2, 4);
    expect(result).not.toBe(baseIngredients);
    expect(baseIngredients[0].quantity).toBe("2");
  });
});
