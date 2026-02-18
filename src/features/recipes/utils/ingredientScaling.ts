import type { RecipeFormIngredient } from "./recipeForm";

const normalizeQuantityText = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const parseQuantityNumber = (value: string): number | null => {
  const normalized = normalizeQuantityText(value);
  if (!normalized) {
    return null;
  }

  const mixedFractionMatch = normalized.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedFractionMatch) {
    const whole = Number(mixedFractionMatch[1]);
    const numerator = Number(mixedFractionMatch[2]);
    const denominator = Number(mixedFractionMatch[3]);
    if (!denominator) {
      return null;
    }
    return whole + numerator / denominator;
  }

  const fractionMatch = normalized.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (!denominator) {
      return null;
    }
    return numerator / denominator;
  }

  if (/^\d*\.?\d+$/.test(normalized)) {
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const formatDecimalQuantity = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 0.000001) {
    return String(Math.round(rounded));
  }
  return rounded.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
};

const formatFractionQuantity = (value: number): string => {
  const positive = Math.max(0, value);
  const whole = Math.floor(positive);
  const fractional = positive - whole;

  if (fractional < 0.000001) {
    return String(whole);
  }

  let bestNumerator = 0;
  let bestDenominator = 1;
  let smallestError = Number.POSITIVE_INFINITY;

  for (let denominator = 2; denominator <= 16; denominator += 1) {
    const numerator = Math.round(fractional * denominator);
    if (numerator === 0) {
      continue;
    }
    const approximation = numerator / denominator;
    const error = Math.abs(approximation - fractional);
    if (error < smallestError) {
      smallestError = error;
      bestNumerator = numerator;
      bestDenominator = denominator;
    }
  }

  if (bestNumerator === 0) {
    return formatDecimalQuantity(positive);
  }

  if (bestNumerator === bestDenominator) {
    return String(whole + 1);
  }

  if (whole === 0) {
    return `${bestNumerator}/${bestDenominator}`;
  }

  return `${whole} ${bestNumerator}/${bestDenominator}`;
};

export const scaleQuantityText = (
  quantity: string,
  fromServings: number | null,
  toServings: number | null
): string => {
  const trimmedQuantity = quantity.trim();
  if (!trimmedQuantity || !fromServings || !toServings || fromServings <= 0 || toServings <= 0) {
    return quantity;
  }

  if (fromServings === toServings) {
    return quantity;
  }

  const parsedQuantity = parseQuantityNumber(trimmedQuantity);
  if (parsedQuantity === null) {
    return quantity;
  }

  const scaledQuantity = (parsedQuantity * toServings) / fromServings;
  if (!Number.isFinite(scaledQuantity) || scaledQuantity <= 0) {
    return quantity;
  }

  return trimmedQuantity.includes("/")
    ? formatFractionQuantity(scaledQuantity)
    : formatDecimalQuantity(scaledQuantity);
};

export const scaleRecipeFormIngredientQuantities = (
  ingredients: RecipeFormIngredient[],
  fromServings: number | null,
  toServings: number | null
): RecipeFormIngredient[] =>
  ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: scaleQuantityText(ingredient.quantity, fromServings, toServings),
  }));
