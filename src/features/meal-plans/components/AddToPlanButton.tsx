import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addMealPlanItem } from "../api";
import { DEFAULT_MEAL_TYPE, MEAL_TYPE_OPTIONS } from "../constants";
import { createDateFromIso, getWeekDays, getWeekStartIso } from "../dateUtils";
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

/** Standalone "Add to plan" trigger for pages outside the meal planner
 *  (e.g. the recipe detail page). Reuses the same popup used by the
 *  planner's calendar, scoped to the current week unless an initial
 *  day is given (e.g. arriving from a meal slot's "Search recipes"
 *  link), in which case it's scoped to that day's week instead. */
export default function AddToPlanButton({
  recipeId,
  recipeTitle,
  recipeServings,
  initialDay,
  initialMealType,
}: AddToPlanButtonProps) {
  const navigate = useNavigate();
  const weekStartIso = useMemo(
    () => getWeekStartIso(initialDay ? createDateFromIso(initialDay) : new Date()),
    [initialDay]
  );
  const weekDays = useMemo(() => getWeekDays(weekStartIso), [weekStartIso]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<{ plannedFor: string; mealType: MealType } | null>(null);

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
        setAddedTo({ plannedFor, mealType });
      } catch (assignError) {
        setError(
          assignError instanceof Error ? assignError.message : "Failed to add recipe to plan."
        );
      } finally {
        setIsAssigning(false);
      }
    },
  });

  return (
    <div className="add-to-plan-anchor" ref={popup.anchorRef}>
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
            Want to see it on{" "}
            {weekDays.find((day) => day.dateIso === addedTo.plannedFor)?.fullLabel ??
              addedTo.plannedFor}
            &apos;s{" "}
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
