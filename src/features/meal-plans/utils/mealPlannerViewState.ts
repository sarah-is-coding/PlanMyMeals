const STORAGE_KEY = "planmymeals:meal-plans:view-state";

export type MealPlannerViewState = {
  weekStartIso: string;
};

type ParsedMealPlannerViewState = Partial<MealPlannerViewState>;

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

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

    return { weekStartIso: nextWeekStartIso };
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
