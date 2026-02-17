import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MEAL_TYPE_OPTIONS,
  RECIPE_DETAIL_MEAL_PLANNER_STATE,
  RECIPE_DRAG_MIME_TYPE,
} from "../constants";
import type { MealPlannerDay, MealPlannerRecipeSummary, MealType } from "../types";

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
  onAssignRecipe: (recipeId: string, plannedFor: string, mealType: MealType) => Promise<void>;
};

const formatTotalMinutes = (recipe: MealPlannerRecipeSummary): string => {
  const totalMinutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  if (totalMinutes <= 0) {
    return "No time set";
  }
  return `${totalMinutes} min`;
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
  const hasSearchInput = searchInput.trim().length > 0;
  const [isTargetPopupOpen, setIsTargetPopupOpen] = useState(false);
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  const [pendingRecipeTitle, setPendingRecipeTitle] = useState("");
  const [draftDay, setDraftDay] = useState(selectedDay);
  const [draftMealType, setDraftMealType] = useState<MealType>(selectedMealType);

  const closeTargetPopup = () => {
    setIsTargetPopupOpen(false);
    setPendingRecipeId(null);
    setPendingRecipeTitle("");
    setDraftDay(selectedDay);
    setDraftMealType(selectedMealType);
  };

  const openTargetPopup = (recipe: MealPlannerRecipeSummary) => {
    setPendingRecipeId(recipe.id);
    setPendingRecipeTitle(recipe.title);
    setDraftDay(selectedDay || weekDays[0]?.dateIso || "");
    setDraftMealType(selectedMealType);
    setIsTargetPopupOpen(true);
  };

  const applyTargetSelection = async () => {
    if (!pendingRecipeId || !draftDay) {
      return;
    }

    onSelectedDayChange(draftDay);
    onSelectedMealTypeChange(draftMealType);
    await onAssignRecipe(pendingRecipeId, draftDay, draftMealType);
    closeTargetPopup();
  };

  const popupAssignmentKey =
    pendingRecipeId && draftDay ? `${pendingRecipeId}|${draftDay}|${draftMealType}` : null;

  return (
    <article className="workspace-card meal-recipe-panel">
      <header className="meal-recipe-panel__header">
        <h2>Find recipes</h2>
        <p>Drag recipes into the calendar, or use Add to plan for a day + meal popup.</p>
      </header>

      <div className="meal-recipe-panel__target-anchor">
        {isTargetPopupOpen ? (
          <section
            className="meal-target-popup"
            role="dialog"
            aria-label="Choose day and meal for recipe assignment"
          >
            <p className="meal-target-popup__title">Add to plan</p>
            <p className="meal-target-popup__recipe">{pendingRecipeTitle}</p>

            <label className="recipe-field">
              <span>Day</span>
              <select value={draftDay} onChange={(event) => setDraftDay(event.target.value)}>
                {weekDays.map((day) => (
                  <option key={day.dateIso} value={day.dateIso}>
                    {day.weekdayShort} - {day.monthDayLabel}
                  </option>
                ))}
              </select>
            </label>

            <label className="recipe-field">
              <span>Meal</span>
              <select
                value={draftMealType}
                onChange={(event) => setDraftMealType(event.target.value as MealType)}
              >
                {MEAL_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="meal-target-popup__actions">
              <button type="button" className="btn btn--ghost" onClick={closeTargetPopup}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  void applyTargetSelection();
                }}
                disabled={!draftDay || popupAssignmentKey === assigningKey}
              >
                {popupAssignmentKey === assigningKey ? "Adding..." : "Add recipe"}
              </button>
            </div>
          </section>
        ) : null}
      </div>

      <label className="recipe-search" htmlFor="meal-plan-recipe-search">
        <span className="sr-only">Search recipes</span>
        <input
          id="meal-plan-recipe-search"
          type="search"
          placeholder="Search recipes..."
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
        />
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

              return (
                <li key={recipe.id}>
                  <article
                    className="meal-recipe-card"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(RECIPE_DRAG_MIME_TYPE, recipe.id);
                      event.dataTransfer.setData("text/plain", recipe.id);
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                  >
                    <Link
                      className="meal-recipe-card__link"
                      to={`/app/recipes/${recipe.id}`}
                      state={RECIPE_DETAIL_MEAL_PLANNER_STATE}
                      draggable={false}
                    >
                      <div className="meal-recipe-card__head">
                        <h3>{recipe.title}</h3>
                        <span>{formatTotalMinutes(recipe)}</span>
                      </div>
                      {recipe.description ? <p>{recipe.description}</p> : null}
                    </Link>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => {
                        openTargetPopup(recipe);
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
    </article>
  );
}
