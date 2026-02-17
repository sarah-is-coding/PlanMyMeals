import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listRecipes } from "../api";
import type { RecipeListFilters, RecipeSummary } from "../types";
import {
  clearRecipeListViewState,
  createDefaultRecipeListFilters,
  loadRecipeListViewState,
  saveRecipeListViewState,
} from "../utils/recipeListViewState";

const RECIPES_PER_PAGE = 12;

const formatTotalMinutes = (recipe: RecipeSummary): string => {
  const totalMinutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  if (totalMinutes <= 0) {
    return "No time set";
  }
  return `${totalMinutes} min total`;
};

export default function RecipesPage() {
  const [initialState] = useState(loadRecipeListViewState);
  const [searchInput, setSearchInput] = useState(initialState.searchInput);
  const [searchTerm, setSearchTerm] = useState(initialState.searchInput.trim());
  const [filters, setFilters] = useState<RecipeListFilters>(initialState.filters);
  const [currentPage, setCurrentPage] = useState(initialState.currentPage);
  const [showFilters, setShowFilters] = useState(false);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const debounceId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 220);

    return () => window.clearTimeout(debounceId);
  }, [searchInput]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { recipes: nextRecipes, totalCount: nextTotalCount } = await listRecipes(
          searchTerm,
          filters,
          {
            page: currentPage,
            pageSize: RECIPES_PER_PAGE,
          }
        );
        if (mounted) {
          setRecipes(nextRecipes);
          setTotalCount(nextTotalCount);
        }
      } catch (fetchError) {
        if (mounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load recipes."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [searchTerm, filters, currentPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / RECIPES_PER_PAGE));
  const pageStartIndex = totalCount === 0 ? 0 : (currentPage - 1) * RECIPES_PER_PAGE + 1;
  const pageEndIndex = Math.min(currentPage * RECIPES_PER_PAGE, totalCount);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const persistListState = () => {
    saveRecipeListViewState({
      searchInput,
      filters,
      currentPage,
    });
  };

  return (
    <section className="workspace-route recipe-route">
      <article className="workspace-card recipe-shell">
        <h1>Recipes</h1>

        <div className="recipe-toolbar">
          <label className="recipe-search" htmlFor="recipe-search-input">
            <span className="sr-only">Search recipes</span>
            <input
              id="recipe-search-input"
              type="search"
              placeholder="Search recipes..."
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setCurrentPage(1);
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setShowFilters((currentState) => !currentState)}
            aria-expanded={showFilters}
            aria-controls="recipe-filters-panel"
          >
            Filters
          </button>
          <Link
            className="btn btn--primary"
            to="/app/recipes/new"
            state={{ prefillTitle: searchInput.trim() }}
            onClick={() => clearRecipeListViewState()}
          >
            Add Recipe
          </Link>
        </div>

        {showFilters ? (
          <section id="recipe-filters-panel" className="recipe-filters" aria-label="Recipe filters">
            <label className="recipe-field">
              <span>Sort</span>
              <select
                value={filters.sort}
                onChange={(event) => {
                  setFilters((previousFilters) => ({
                    ...previousFilters,
                    sort: event.target.value as RecipeListFilters["sort"],
                  }));
                  setCurrentPage(1);
                }}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title_asc">Title A-Z</option>
                <option value="title_desc">Title Z-A</option>
              </select>
            </label>

            <label className="recipe-field">
              <span>Tag</span>
              <input
                type="text"
                placeholder="weeknight"
                value={filters.tag}
                onChange={(event) => {
                  setFilters((previousFilters) => ({
                    ...previousFilters,
                    tag: event.target.value,
                  }));
                  setCurrentPage(1);
                }}
              />
            </label>

            <label className="recipe-checkbox">
              <input
                type="checkbox"
                checked={filters.onlyWithSource}
                onChange={(event) => {
                  setFilters((previousFilters) => ({
                    ...previousFilters,
                    onlyWithSource: event.target.checked,
                  }));
                  setCurrentPage(1);
                }}
              />
              <span>Only recipes with source URL</span>
            </label>

            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setFilters(createDefaultRecipeListFilters());
                setCurrentPage(1);
              }}
            >
              Reset filters
            </button>
          </section>
        ) : null}

        {error ? <p className="error">{error}</p> : null}
      </article>

      <section aria-live="polite" aria-busy={loading}>
        {loading ? (
          <article className="workspace-card">
            <p>Loading recipes...</p>
          </article>
        ) : recipes.length === 0 ? (
          <article className="workspace-card">
            <h2>No recipes found</h2>
            <p>Try a different search or add your first recipe.</p>
          </article>
        ) : (
          <>
            <ul className="recipe-list">
              {recipes.map((recipe) => (
                <li key={recipe.id}>
                  <Link
                    className="recipe-card"
                    to={`/app/recipes/${recipe.id}`}
                    onClick={persistListState}
                  >
                    <div className="recipe-card__head">
                      <h2>{recipe.title}</h2>
                      <span>{formatTotalMinutes(recipe)}</span>
                    </div>
                    {recipe.description ? <p>{recipe.description}</p> : null}
                    <div className="recipe-card__meta">
                      {recipe.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="recipe-tag">
                          {tag}
                        </span>
                      ))}
                      {recipe.hasSource ? (
                        <span className="recipe-tag recipe-tag--source">Has source</span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {totalPages > 1 ? (
              <nav className="recipe-pagination" aria-label="Recipe result pages">
                <p className="recipe-pagination__summary">
                  Showing {pageStartIndex}-{pageEndIndex} of {totalCount}
                </p>
                <div className="recipe-pagination__controls">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="recipe-pagination__count">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </section>
  );
}
