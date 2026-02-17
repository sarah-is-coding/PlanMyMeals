import type { MealType } from "../types";

const STORAGE_KEY = "planmymeals:meal-plans:view-state";

const VALID_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

export type MealPlannerViewState = {
  weekStartIso: string;
  searchInput: string;
  selectedDay: string;
  selectedMealType: MealType;
};

type ParsedMealPlannerViewState = Partial<MealPlannerViewState> & {
  selectedMealType?: string;
};

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

const sanitizeMealType = (value: string | undefined, fallback: MealType): MealType => {
  if (!value) {
    return fallback;
  }
  return VALID_MEAL_TYPES.includes(value as MealType) ? (value as MealType) : fallback;
};

export const loadMealPlannerViewState = (
  fallback: MealPlannerViewState
): MealPlannerViewState => {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const savedState = window.sessionStorage.getItem(STORAGE_KEY);
    if (!savedState) {
      return fallback;
    }

    const parsedState = JSON.parse(savedState) as ParsedMealPlannerViewState;
    const nextWeekStartIso = isIsoDate(parsedState.weekStartIso ?? "")
      ? parsedState.weekStartIso!
      : fallback.weekStartIso;
    const nextSelectedDay = isIsoDate(parsedState.selectedDay ?? "")
      ? parsedState.selectedDay!
      : fallback.selectedDay;

    return {
      weekStartIso: nextWeekStartIso,
      searchInput: (parsedState.searchInput ?? fallback.searchInput).trimStart(),
      selectedDay: nextSelectedDay,
      selectedMealType: sanitizeMealType(
        parsedState.selectedMealType,
        fallback.selectedMealType
      ),
    };
  } catch {
    return fallback;
  }
};

export const saveMealPlannerViewState = (state: MealPlannerViewState): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
