import type { MealPlanItem, MealType } from "../types";

const STORAGE_KEY = "planmymeals:meal-plans:week-items-cache";
const CACHE_TTL_MS = 1000 * 60 * 45;
const MAX_CACHE_ENTRIES = 12;
const VALID_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

type CachedWeekItemsEntry = {
  savedAtMs: number;
  items: MealPlanItem[];
};

type CachedWeekItemsRecord = Record<string, CachedWeekItemsEntry>;

type ParsedCachedWeekItemsRecord = Record<
  string,
  Partial<CachedWeekItemsEntry> & { items?: unknown }
>;

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

const isValidMealType = (value: string): value is MealType =>
  VALID_MEAL_TYPES.includes(value as MealType);

const isValidMealPlanItem = (value: unknown): value is MealPlanItem => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<MealPlanItem>;

  if (!candidate.id || typeof candidate.id !== "string") {
    return false;
  }

  if (candidate.recipeId !== null && typeof candidate.recipeId !== "string") {
    return false;
  }

  if (!candidate.recipeTitle || typeof candidate.recipeTitle !== "string") {
    return false;
  }

  if (!candidate.plannedFor || !isIsoDate(candidate.plannedFor)) {
    return false;
  }

  return typeof candidate.mealType === "string" && isValidMealType(candidate.mealType);
};

const sanitizeMealPlanItems = (value: unknown): MealPlanItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isValidMealPlanItem).map((item) => ({ ...item }));
};

const pruneCache = (cacheRecord: CachedWeekItemsRecord): CachedWeekItemsRecord => {
  const sortedEntries = Object.entries(cacheRecord).sort(
    (left, right) => right[1].savedAtMs - left[1].savedAtMs
  );

  return Object.fromEntries(sortedEntries.slice(0, MAX_CACHE_ENTRIES));
};

const readCacheRecord = (): CachedWeekItemsRecord => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.sessionStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsedRecord = JSON.parse(rawValue) as ParsedCachedWeekItemsRecord;
    if (!parsedRecord || typeof parsedRecord !== "object") {
      return {};
    }

    const now = Date.now();
    const nextRecord: CachedWeekItemsRecord = {};

    for (const [weekStartIso, entry] of Object.entries(parsedRecord)) {
      if (!isIsoDate(weekStartIso)) {
        continue;
      }
      if (!entry || typeof entry !== "object") {
        continue;
      }
      if (typeof entry.savedAtMs !== "number" || Number.isNaN(entry.savedAtMs)) {
        continue;
      }
      if (now - entry.savedAtMs > CACHE_TTL_MS) {
        continue;
      }

      nextRecord[weekStartIso] = {
        savedAtMs: entry.savedAtMs,
        items: sanitizeMealPlanItems(entry.items),
      };
    }

    return nextRecord;
  } catch {
    return {};
  }
};

const writeCacheRecord = (cacheRecord: CachedWeekItemsRecord): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pruneCache(cacheRecord)));
  } catch {
    // Ignore cache write failures (for example, storage limits).
  }
};

export const loadCachedMealPlanItems = (weekStartIso: string): MealPlanItem[] | null => {
  if (!isIsoDate(weekStartIso)) {
    return null;
  }

  const cacheRecord = readCacheRecord();
  const entry = cacheRecord[weekStartIso];
  if (!entry) {
    return null;
  }

  return entry.items.map((item) => ({ ...item }));
};

export const saveCachedMealPlanItems = (
  weekStartIso: string,
  mealPlanItems: MealPlanItem[]
): void => {
  if (!isIsoDate(weekStartIso)) {
    return;
  }

  const cacheRecord = readCacheRecord();
  cacheRecord[weekStartIso] = {
    savedAtMs: Date.now(),
    items: sanitizeMealPlanItems(mealPlanItems),
  };
  writeCacheRecord(cacheRecord);
};

export const clearMealPlanItemsCache = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
};
