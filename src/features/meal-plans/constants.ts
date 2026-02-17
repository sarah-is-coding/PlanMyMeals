import type { MealType } from "./types";

export const RECIPE_DRAG_MIME_TYPE = "application/x-planmymeals-recipe-id";

export const MEAL_TYPE_OPTIONS: Array<{ value: MealType; label: string }> = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
];

export const DEFAULT_MEAL_TYPE: MealType = "dinner";

export const RECIPE_DETAIL_MEAL_PLANNER_STATE = {
  from: "meal-planner" as const,
};
