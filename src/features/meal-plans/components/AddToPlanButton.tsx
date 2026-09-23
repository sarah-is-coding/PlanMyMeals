import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addMealPlanItem } from "../api";
import { DEFAULT_MEAL_TYPE, MEAL_TYPE_OPTIONS } from "../constants";
import {
  createDateFromIso,
  formatWeekRangeLabel,
  getWeekDays,
  getWeekStartIso,
  shiftWeekStartIso,
} from "../dateUtils";
import { useAddToPlanPopup } from "../hooks/useAddToPlanPopup";
import type { MealType } from "../types";
import AddToPlanPopup from "./AddToPlanPopup";

type AddToPlanButtonProps = {
  recipeId: string;
  recipeTitle: string;
  recipeServings: number | null;
  initialDay?: string;
  initialMealType?: MealType;
};

const getDefaultWeekStartIso = (initialDay?: string): string =>
  initialDay
    ? getWeekStartIso(createDateFromIso(initialDay))
    : shiftWeekStartIso(getWeekStartIso(new Date()), 1);

/** Standalone "Add to plan" trigger for pages outside the meal planner
 *  (e.g. the recipe detail page). Reuses the same popup used by the
 *  planner's calendar, and lets you step to other weeks just like the
 *  planner does. Scoped to the given day's week when arriving from a
 *  meal slot's "Search recipes" link; otherwise defaults to *next*
 *  week, since the current week is often already planned. */
export default function AddToPlanButton({
  recipeId,
  recipeTitle,
  recipeServings,
  initialDay,
  initialMealType,
}: AddToPlanButtonProps) {
  const navigate = useNavigate();
  const [weekStartIso, setWeekStartIso] = useState(() => getDefaultWeekStartIso(initialDay));
  const weekDays = getWeekDays(weekStartIso);
  const weekLabel = formatWeekRangeLabel(weekStartIso);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<{
    plannedFor: string;
    mealType: MealType;
    dayLabel: string;
  } | null>(null);

  const popup = useAddToPlanPopup({
    weekDays,
    defaultDay: initialDay ?? weekDays[0]?.dateIso ?? "",
    defaultMealType: initialMealType ?? DEFAULT_MEAL_TYPE,
    onAssignRecipe: async (assignedRecipeId, plannedFor, mealType, servingsOverride) => {
      setIsAssigning(true);
      setError(null);
      setAddedTo(null);
      try {
        await addMealPlanItem({
          weekStartIso,
          plannedFor,
          mealType,
          recipeId: assignedRecipeId,
          servingsOverride,
        });
        const dayLabel =
          weekDays.find((day) => day.dateIso === plannedFor)?.fullLabel ?? plannedFor;
        setAddedTo({ plannedFor, mealType, dayLabel });
      } catch (assignError) {
        setError(
          assignError instanceof Error ? assignError.message : "Failed to add recipe to plan."
        );
      } finally {
        setIsAssigning(false);
      }
    },
  });

  const shiftWeek = (nextWeekStartIso: string) => {
    const dayIndex = weekDays.findIndex((day) => day.dateIso === popup.draftDay);
    const nextWeekDays = getWeekDays(nextWeekStartIso);
    const nextDay = nextWeekDays[dayIndex >= 0 ? dayIndex : 0];
    setWeekStartIso(nextWeekStartIso);
    if (nextDay) {
      popup.setDraftDay(nextDay.dateIso);
    }
  };

  const handleClose = () => {
    popup.close();
    setWeekStartIso(getDefaultWeekStartIso(initialDay));
  };

  return (
    <div className="add-to-plan-anchor" ref={popup.anchorRef}>
      {popup.isOpen ? (
        <AddToPlanPopup
          popupRef={popup.popupRef}
          placement={popup.popupPlacement}
          maxHeightPx={popup.popupMaxHeightPx}
          recipeTitle={popup.pendingRecipeTitle}
          recipeServings={popup.pendingRecipeServings}
          weekLabel={weekLabel}
          weekDays={weekDays}
          onShiftWeek={(weekOffset) => shiftWeek(shiftWeekStartIso(weekStartIso, weekOffset))}
          onJumpToCurrentWeek={() => shiftWeek(getWeekStartIso(new Date()))}
          draftDay={popup.draftDay}
          onDraftDayChange={popup.setDraftDay}
          draftMealType={popup.draftMealType}
          onDraftMealTypeChange={popup.setDraftMealType}
          draftServings={popup.draftServings}
          onDraftServingsChange={popup.setDraftServings}
          onCancel={handleClose}
          onConfirm={() => {
            void popup.confirm();
          }}
          confirmDisabled={!popup.draftDay || isAssigning}
          confirmLabel={isAssigning ? "Adding..." : "Add recipe"}
        />
      ) : null}

      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => popup.open({ id: recipeId, title: recipeTitle, servings: recipeServings })}
        disabled={!weekDays[0]}
      >
        Add to Plan
      </button>
      {error ? <p className="error">{error}</p> : null}
      {addedTo ? (
        <section
          className="meal-target-popup meal-target-popup--below"
          role="dialog"
          aria-label="Recipe added to plan"
        >
          <p className="meal-target-popup__title">Added to your meal plan.</p>
          <p className="meal-target-popup__recipe">
            Want to see it on {addedTo.dayLabel}&apos;s{" "}
            {MEAL_TYPE_OPTIONS.find((option) => option.value === addedTo.mealType)?.label ??
              addedTo.mealType}
            ?
          </p>
          <div className="meal-target-popup__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setAddedTo(null)}>
              Stay here
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                navigate("/app/meal-plans", { state: { jumpToDate: addedTo.plannedFor } });
                setAddedTo(null);
              }}
            >
              View meal plan
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
