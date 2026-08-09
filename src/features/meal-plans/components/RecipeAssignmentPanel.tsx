import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RECIPE_DETAIL_MEAL_PLANNER_STATE, RECIPE_DRAG_MIME_TYPE } from "../constants";
import { useAddToPlanPopup } from "../hooks/useAddToPlanPopup";
import type { MealPlannerDay, MealPlannerRecipeSummary, MealType } from "../types";
import AddToPlanPopup from "./AddToPlanPopup";

type RecipeAssignmentPanelProps = {
  recipes: MealPlannerRecipeSummary[];
  searchInput: string;
  loading: boolean;
  error: string | null;
  selectedDay: string;
  selectedMealType: MealType;
  weekDays: MealPlannerDay[];
  assigningKey: string | null;
  onSearchInputChange: (value: string) => void;
  onSelectedDayChange: (value: string) => void;
  onSelectedMealTypeChange: (value: MealType) => void;
  onAssignRecipe: (
    recipeId: string,
    plannedFor: string,
    mealType: MealType,
    servingsOverride: number | null
  ) => Promise<void>;
};

const formatTotalMinutes = (recipe: MealPlannerRecipeSummary): string => {
  const totalMinutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  if (totalMinutes <= 0) {
    return "No time set";
  }
  return `${totalMinutes} min`;
};

const DESCRIPTION_PREVIEW_MAX_CHARS = 72;

const formatDescriptionPreview = (description: string | null): string | null => {
  const normalized = (description ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length <= DESCRIPTION_PREVIEW_MAX_CHARS) {
    return normalized;
  }

  return `${normalized.slice(0, DESCRIPTION_PREVIEW_MAX_CHARS).trimEnd()}...`;
};

export default function RecipeAssignmentPanel({
  recipes,
  searchInput,
  loading,
  error,
  selectedDay,
  selectedMealType,
  weekDays,
  assigningKey,
  onSearchInputChange,
  onSelectedDayChange,
  onSelectedMealTypeChange,
  onAssignRecipe,
}: RecipeAssignmentPanelProps) {
  const navigate = useNavigate();
  const hasSearchInput = searchInput.trim().length > 0;
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const popup = useAddToPlanPopup({
    weekDays,
    defaultDay: selectedDay,
    defaultMealType: selectedMealType,
    onAssignRecipe: async (recipeId, plannedFor, mealType, servingsOverride) => {
      onSelectedDayChange(plannedFor);
      onSelectedMealTypeChange(mealType);
      await onAssignRecipe(recipeId, plannedFor, mealType, servingsOverride);
    },
  });

  const openRecipeDetail = (recipeId: string) => {
    navigate(`/app/recipes/${recipeId}`, {
      state: RECIPE_DETAIL_MEAL_PLANNER_STATE,
    });
  };

  return (
    <article className="workspace-card meal-recipe-panel">
      <button
        type="button"
        className="past-plan-panel__toggle"
        onClick={() => setIsPanelOpen((prev) => !prev)}
        aria-expanded={isPanelOpen}
      >
        <span className="past-plan-panel__toggle-label">Find recipes</span>
        <span className="past-plan-panel__chevron" aria-hidden="true">
          {isPanelOpen ? "▲" : "▼"}
        </span>
      </button>

      {isPanelOpen && (
        <>
        <div className="meal-recipe-panel__target-anchor" ref={popup.anchorRef}>
        {popup.isOpen ? (
          <AddToPlanPopup
            popupRef={popup.popupRef}
            placement={popup.popupPlacement}
            maxHeightPx={popup.popupMaxHeightPx}
            recipeTitle={popup.pendingRecipeTitle}
            recipeServings={popup.pendingRecipeServings}
            weekDays={weekDays}
            draftDay={popup.draftDay}
            onDraftDayChange={popup.setDraftDay}
            draftMealType={popup.draftMealType}
            onDraftMealTypeChange={popup.setDraftMealType}
            draftServings={popup.draftServings}
            onDraftServingsChange={popup.setDraftServings}
            onCancel={popup.close}
            onConfirm={() => {
              void popup.confirm();
            }}
            confirmDisabled={!popup.draftDay || popup.assignmentKey === assigningKey}
            confirmLabel={popup.assignmentKey === assigningKey ? "Adding..." : "Add recipe"}
          />
        ) : null}
      </div>

      <label className="recipe-search" htmlFor="meal-plan-recipe-search">
        <span className="sr-only">Search recipes</span>
        <input
          ref={searchInputRef}
          id="meal-plan-recipe-search"
          type="search"
          placeholder="Search recipes..."
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
        />
        {searchInput && (
          <button
            type="button"
            className="recipe-search__clear"
            aria-label="Clear recipe search"
            onClick={() => {
              onSearchInputChange("");
              searchInputRef.current?.focus();
            }}
          >
            &times;
          </button>
        )}
      </label>

      {error ? <p className="error">{error}</p> : null}

      <section className="meal-recipe-results" aria-live="polite" aria-busy={loading}>
        {!hasSearchInput ? (
          <p>Start typing to search your recipes.</p>
        ) : loading ? (
          <p>Loading recipes...</p>
        ) : recipes.length === 0 ? (
          <p>No recipes found. Try a different search term.</p>
        ) : (
          <ul className="meal-recipe-list">
            {recipes.map((recipe) => {
              const isRecipeAssigning =
                assigningKey !== null && assigningKey.startsWith(`${recipe.id}|`);
              const descriptionPreview = formatDescriptionPreview(recipe.description);

              return (
                <li key={recipe.id}>
                  <article
                    className="meal-recipe-card meal-recipe-card--clickable"
                    draggable
                    onClick={() => openRecipeDetail(recipe.id)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) {
                        return;
                      }
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openRecipeDetail(recipe.id);
                      }
                    }}
                    role="link"
                    tabIndex={0}
                    onDragStart={(event) => {
                      event.dataTransfer.setData(RECIPE_DRAG_MIME_TYPE, recipe.id);
                      event.dataTransfer.setData("text/plain", recipe.id);
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                  >
                    <div className="meal-recipe-card__head">
                      <h3>{recipe.title}</h3>
                      <span>
                        {formatTotalMinutes(recipe)}
                        {recipe.servings ? ` • ${recipe.servings} servings` : ""}
                      </span>
                    </div>
                    {descriptionPreview ? (
                      <p className="meal-recipe-card__description">{descriptionPreview}</p>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        popup.open(recipe);
                      }}
                      disabled={!weekDays[0] || isRecipeAssigning}
                    >
                      {isRecipeAssigning ? "Adding..." : "Add to plan"}
                    </button>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>
        </>
      )}
    </article>
  );
}
