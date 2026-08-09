import type { Dispatch, RefObject, SetStateAction } from "react";
import { MEAL_TYPE_OPTIONS } from "../constants";
import { parsePositiveServings } from "../hooks/useAddToPlanPopup";
import type { MealPlannerDay, MealType } from "../types";

type AddToPlanPopupProps = {
  popupRef: RefObject<HTMLElement | null>;
  placement: "above" | "below";
  maxHeightPx: number | null;
  recipeTitle: string;
  recipeServings: number | null;
  weekDays: MealPlannerDay[];
  draftDay: string;
  onDraftDayChange: Dispatch<SetStateAction<string>>;
  draftMealType: MealType;
  onDraftMealTypeChange: Dispatch<SetStateAction<MealType>>;
  draftServings: string;
  onDraftServingsChange: Dispatch<SetStateAction<string>>;
  onCancel: () => void;
  onConfirm: () => void;
  confirmDisabled: boolean;
  confirmLabel: string;
};

export default function AddToPlanPopup({
  popupRef,
  placement,
  maxHeightPx,
  recipeTitle,
  recipeServings,
  weekDays,
  draftDay,
  onDraftDayChange,
  draftMealType,
  onDraftMealTypeChange,
  draftServings,
  onDraftServingsChange,
  onCancel,
  onConfirm,
  confirmDisabled,
  confirmLabel,
}: AddToPlanPopupProps) {
  const draftServingsValue = parsePositiveServings(draftServings);

  return (
    <section
      ref={popupRef}
      className={`meal-target-popup meal-target-popup--${placement}`}
      style={maxHeightPx ? { maxHeight: `${maxHeightPx}px` } : undefined}
      role="dialog"
      aria-label="Choose day and meal for recipe assignment"
    >
      <p className="meal-target-popup__title">Add to plan</p>
      <p className="meal-target-popup__recipe">{recipeTitle}</p>

      <label className="recipe-field">
        <span>Day</span>
        <select value={draftDay} onChange={(event) => onDraftDayChange(event.target.value)}>
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
          onChange={(event) => onDraftMealTypeChange(event.target.value as MealType)}
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
              onDraftServingsChange((currentValue) => {
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
            onChange={(event) => onDraftServingsChange(event.target.value)}
          />
          <button
            type="button"
            className="btn btn--ghost servings-stepper__button"
            aria-label="Increase servings"
            onClick={() =>
              onDraftServingsChange((currentValue) => {
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
        {recipeServings ? (
          <small className="servings-stepper__hint">Recipe default: {recipeServings}</small>
        ) : null}
      </label>

      <div className="meal-target-popup__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          {confirmLabel}
        </button>
      </div>
    </section>
  );
}
