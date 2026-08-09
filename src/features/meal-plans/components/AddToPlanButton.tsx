import { useMemo, useState } from "react";
import { addMealPlanItem } from "../api";
import { DEFAULT_MEAL_TYPE } from "../constants";
import { getWeekDays, getWeekStartIso } from "../dateUtils";
import { useAddToPlanPopup } from "../hooks/useAddToPlanPopup";
import AddToPlanPopup from "./AddToPlanPopup";

type AddToPlanButtonProps = {
  recipeId: string;
  recipeTitle: string;
  recipeServings: number | null;
};

/** Standalone "Add to plan" trigger for pages outside the meal planner
 *  (e.g. the recipe detail page). Reuses the same popup used by the
 *  planner's recipe search results, scoped to the current week. */
export default function AddToPlanButton({
  recipeId,
  recipeTitle,
  recipeServings,
}: AddToPlanButtonProps) {
  const weekStartIso = useMemo(() => getWeekStartIso(new Date()), []);
  const weekDays = useMemo(() => getWeekDays(weekStartIso), [weekStartIso]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [status, setStatus] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const popup = useAddToPlanPopup({
    weekDays,
    defaultDay: weekDays[0]?.dateIso ?? "",
    defaultMealType: DEFAULT_MEAL_TYPE,
    onAssignRecipe: async (assignedRecipeId, plannedFor, mealType, servingsOverride) => {
      setIsAssigning(true);
      setStatus(null);
      try {
        await addMealPlanItem({
          weekStartIso,
          plannedFor,
          mealType,
          recipeId: assignedRecipeId,
          servingsOverride,
        });
        setStatus({ kind: "success", text: "Added to your meal plan." });
      } catch (error) {
        setStatus({
          kind: "error",
          text: error instanceof Error ? error.message : "Failed to add recipe to plan.",
        });
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
      {status ? (
        <p className={status.kind === "error" ? "error" : "message"}>{status.text}</p>
      ) : null}
    </div>
  );
}
