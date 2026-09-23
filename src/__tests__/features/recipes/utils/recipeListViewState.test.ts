import {
  createDefaultRecipeListFilters,
  loadRecipeListViewState,
  saveRecipeListViewState,
} from "../../../../features/recipes/utils/recipeListViewState";

describe("recipeListViewState minRating", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("defaults minRating to 0", () => {
    expect(createDefaultRecipeListFilters().minRating).toBe(0);
  });

  it("round-trips a valid minRating value", () => {
    saveRecipeListViewState({
      searchInput: "",
      filters: { ...createDefaultRecipeListFilters(), minRating: 4 },
      currentPage: 1,
    });

    expect(loadRecipeListViewState().filters.minRating).toBe(4);
  });

  it("clamps an out-of-range or invalid minRating back to 0", () => {
    window.sessionStorage.setItem(
      "planmymeals:recipes:list-view",
      JSON.stringify({
        searchInput: "",
        filters: { ...createDefaultRecipeListFilters(), minRating: 9 },
        currentPage: 1,
      })
    );
    expect(loadRecipeListViewState().filters.minRating).toBe(0);

    window.sessionStorage.setItem(
      "planmymeals:recipes:list-view",
      JSON.stringify({
        searchInput: "",
        filters: { ...createDefaultRecipeListFilters(), minRating: "not-a-number" },
        currentPage: 1,
      })
    );
    expect(loadRecipeListViewState().filters.minRating).toBe(0);
  });
});
