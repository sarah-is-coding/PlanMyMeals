import type { RecipeListFilters, RecipeSortOption } from "../types";

const STORAGE_KEY = "planmymeals:recipes:list-view";

const VALID_SORT_OPTIONS: RecipeSortOption[] = [
  "newest",
  "oldest",
  "title_asc",
  "title_desc",
];

type RecipeListViewState = {
  searchInput: string;
  filters: RecipeListFilters;
};

type PartialRecipeListFilters = Partial<RecipeListFilters> & {
  sort?: string;
};

const isValidSortOption = (value: string): value is RecipeSortOption =>
  VALID_SORT_OPTIONS.includes(value as RecipeSortOption);

export const createDefaultRecipeListFilters = (): RecipeListFilters => ({
  sort: "newest",
  tag: "",
  maxTotalMinutes: "",
  onlyWithSource: false,
});

const sanitizeFilters = (filters: PartialRecipeListFilters | undefined): RecipeListFilters => ({
  sort: isValidSortOption(filters?.sort ?? "") ? filters!.sort! : "newest",
  tag: (filters?.tag ?? "").trim(),
  maxTotalMinutes: String(filters?.maxTotalMinutes ?? "").trim(),
  onlyWithSource: Boolean(filters?.onlyWithSource),
});

export const loadRecipeListViewState = (): RecipeListViewState => {
  if (typeof window === "undefined") {
    return {
      searchInput: "",
      filters: createDefaultRecipeListFilters(),
    };
  }

  try {
    const savedState = window.sessionStorage.getItem(STORAGE_KEY);
    if (!savedState) {
      return {
        searchInput: "",
        filters: createDefaultRecipeListFilters(),
      };
    }

    const parsedState = JSON.parse(savedState) as {
      searchInput?: string;
      filters?: PartialRecipeListFilters;
    };

    return {
      searchInput: (parsedState.searchInput ?? "").trimStart(),
      filters: sanitizeFilters(parsedState.filters),
    };
  } catch {
    return {
      searchInput: "",
      filters: createDefaultRecipeListFilters(),
    };
  }
};

export const saveRecipeListViewState = (state: RecipeListViewState): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
