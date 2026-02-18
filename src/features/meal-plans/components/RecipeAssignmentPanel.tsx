import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const parsePositiveServings = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
};

const getServingsOverride = (
  selectedServings: number | null,
  recipeServings: number | null
): number | null => {
  if (recipeServings === null) {
    return selectedServings;
  }
  if (selectedServings === null || selectedServings === recipeServings) {
    return null;
  }
  return selectedServings;
};

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
  const [isTargetPopupOpen, setIsTargetPopupOpen] = useState(false);
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  const [pendingRecipeTitle, setPendingRecipeTitle] = useState("");
  const [pendingRecipeServings, setPendingRecipeServings] = useState<number | null>(null);
  const [draftDay, setDraftDay] = useState(selectedDay);
  const [draftMealType, setDraftMealType] = useState<MealType>(selectedMealType);
  const [draftServings, setDraftServings] = useState("");
  const [popupPlacement, setPopupPlacement] = useState<"above" | "below">("above");
  const [popupMaxHeightPx, setPopupMaxHeightPx] = useState<number | null>(null);
  const targetAnchorRef = useRef<HTMLDivElement | null>(null);
  const targetPopupRef = useRef<HTMLElement | null>(null);

  const updateTargetPopupLayout = useCallback(() => {
    if (!isTargetPopupOpen || !targetAnchorRef.current || !targetPopupRef.current) {
      return;
    }

    const popupGapPx = 8;
    const viewportPaddingPx = 8;
    const anchorRect = targetAnchorRef.current.getBoundingClientRect();
    const popupHeight = targetPopupRef.current.offsetHeight;
    const spaceAbove = anchorRect.top - viewportPaddingPx;
    const spaceBelow = window.innerHeight - anchorRect.bottom - viewportPaddingPx;

    const nextPlacement =
      spaceAbove >= popupHeight + popupGapPx
        ? "above"
        : spaceBelow >= popupHeight + popupGapPx
          ? "below"
          : spaceBelow > spaceAbove
            ? "below"
            : "above";

    const availableSpace = nextPlacement === "above" ? spaceAbove : spaceBelow;
    const nextMaxHeight = Math.max(0, Math.floor(availableSpace - popupGapPx));

    setPopupPlacement(nextPlacement);
    setPopupMaxHeightPx(nextMaxHeight > 0 ? nextMaxHeight : null);
  }, [isTargetPopupOpen]);

  const closeTargetPopup = () => {
    setIsTargetPopupOpen(false);
    setPendingRecipeId(null);
    setPendingRecipeTitle("");
    setPendingRecipeServings(null);
    setDraftDay(selectedDay);
    setDraftMealType(selectedMealType);
    setDraftServings("");
    setPopupMaxHeightPx(null);
  };

  const openTargetPopup = (recipe: MealPlannerRecipeSummary) => {
    setPendingRecipeId(recipe.id);
    setPendingRecipeTitle(recipe.title);
    setPendingRecipeServings(recipe.servings);
    setDraftDay(selectedDay || weekDays[0]?.dateIso || "");
    setDraftMealType(selectedMealType);
    setDraftServings(recipe.servings ? String(recipe.servings) : "");
    setPopupPlacement("above");
    setPopupMaxHeightPx(null);
    setIsTargetPopupOpen(true);
  };

  const applyTargetSelection = async () => {
    if (!pendingRecipeId || !draftDay) {
      return;
    }

    const selectedServings = parsePositiveServings(draftServings);
    const servingsOverride = getServingsOverride(selectedServings, pendingRecipeServings);

    onSelectedDayChange(draftDay);
    onSelectedMealTypeChange(draftMealType);
    await onAssignRecipe(pendingRecipeId, draftDay, draftMealType, servingsOverride);
    closeTargetPopup();
  };

  const draftServingsValue = parsePositiveServings(draftServings);
  const draftServingsOverride = getServingsOverride(draftServingsValue, pendingRecipeServings);
  const popupAssignmentKey =
    pendingRecipeId && draftDay
      ? `${pendingRecipeId}|${draftDay}|${draftMealType}|${draftServingsOverride ?? "base"}`
      : null;

  const openRecipeDetail = (recipeId: string) => {
    navigate(`/app/recipes/${recipeId}`, {
      state: RECIPE_DETAIL_MEAL_PLANNER_STATE,
    });
  };

  useEffect(() => {
    if (!isTargetPopupOpen) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      updateTargetPopupLayout();
    });

    const handleViewportChange = () => {
      updateTargetPopupLayout();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isTargetPopupOpen, pendingRecipeTitle, updateTargetPopupLayout]);

  return (
    <article className="workspace-card meal-recipe-panel">
      <header className="meal-recipe-panel__header">
        <h2>Find recipes</h2>
      </header>

      <div className="meal-recipe-panel__target-anchor" ref={targetAnchorRef}>
        {isTargetPopupOpen ? (
          <section
            ref={targetPopupRef}
            className={`meal-target-popup meal-target-popup--${popupPlacement}`}
            style={popupMaxHeightPx ? { maxHeight: `${popupMaxHeightPx}px` } : undefined}
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

            <label className="recipe-field">
              <span>Servings</span>
              <div className="servings-stepper servings-stepper--compact">
                <button
                  type="button"
                  className="btn btn--ghost servings-stepper__button"
                  aria-label="Decrease servings"
                  onClick={() =>
                    setDraftServings((currentValue) => {
                      const parsed = parsePositiveServings(currentValue);
                      if (parsed === null || parsed <= 1) {
                        return currentValue;
                      }
                      return String(parsed - 1);
                    })
                  }
                  disabled={!draftServingsValue || draftServingsValue <= 1}
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={draftServings}
                  onChange={(event) => setDraftServings(event.target.value)}
                />
                <button
                  type="button"
                  className="btn btn--ghost servings-stepper__button"
                  aria-label="Increase servings"
                  onClick={() =>
                    setDraftServings((currentValue) => {
                      const parsed = parsePositiveServings(currentValue);
                      if (parsed === null) {
                        return "1";
                      }
                      return String(parsed + 1);
                    })
                  }
                >
                  +
                </button>
              </div>
              {pendingRecipeServings ? (
                <small className="servings-stepper__hint">
                  Recipe default: {pendingRecipeServings}
                </small>
              ) : null}
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
