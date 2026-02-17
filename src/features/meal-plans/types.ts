export type MealType = "breakfast" | "lunch" | "dinner";

export type MealPlannerDay = {
  dateIso: string;
  weekdayShort: string;
  monthDayLabel: string;
  fullLabel: string;
};

export type MealPlannerRecipeSummary = {
  id: string;
  title: string;
  description: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
};

export type MealPlanItem = {
  id: string;
  recipeId: string | null;
  recipeTitle: string;
  plannedFor: string;
  mealType: MealType;
};

export type AddMealPlanItemInput = {
  weekStartIso: string;
  plannedFor: string;
  mealType: MealType;
  recipeId: string;
};

export type MoveMealPlanItemInput = {
  itemId: string;
  plannedFor: string;
  mealType: MealType;
};
