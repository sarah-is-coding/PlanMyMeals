import { useMemo, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  MEAL_PLAN_ITEM_DRAG_MIME_TYPE,
  MEAL_TYPE_OPTIONS,
  RECIPE_DETAIL_MEAL_PLANNER_STATE,
  RECIPE_DRAG_MIME_TYPE,
} from "../constants";
import type { MealPlanItem, MealPlannerDay, MealType } from "../types";

type MealPlannerCalendarProps = {
  weekLabel: string;
  weekDays: MealPlannerDay[];
  items: MealPlanItem[];
  removingItemId: string | null;
  movingItemId: string | null;
  updatingServingsItemId: string | null;
  onShiftWeek: (weekOffset: number) => void;
  onJumpToCurrentWeek: () => void;
  onAssignRecipe: (
    recipeId: string,
    plannedFor: string,
    mealType: MealType,
    servingsOverride: number | null
  ) => Promise<void>;
  onMoveItem: (itemId: string, plannedFor: string, mealType: MealType) => Promise<void>;
  onUpdateItemServings: (itemId: string, servingsOverride: number | null) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
};

function getSlotKey(dayIso: string, mealType: MealType): string {
  return `${dayIso}:${mealType}`;
}

function getServingsOverride(
  nextEffectiveServings: number,
  recipeServings: number | null
): number | null {
  if (recipeServings !== null && nextEffectiveServings === recipeServings) {
    return null;
  }
  return nextEffectiveServings;
}

export default function MealPlannerCalendar({
  weekLabel,
  weekDays,
  items,
  removingItemId,
  movingItemId,
  updatingServingsItemId,
  onShiftWeek,
  onJumpToCurrentWeek,
  onAssignRecipe,
  onMoveItem,
  onUpdateItemServings,
  onRemoveItem,
}: MealPlannerCalendarProps) {
  const navigate = useNavigate();
  const [dragOverSlotKey, setDragOverSlotKey] = useState<string | null>(null);

  const slotMap = useMemo(() => {
    const map = new Map<string, MealPlanItem[]>();

    for (const item of items) {
      const slotKey = getSlotKey(item.plannedFor, item.mealType);
      const slotItems = map.get(slotKey);
      if (slotItems) {
        slotItems.push(item);
      } else {
        map.set(slotKey, [item]);
      }
    }

    return map;
  }, [items]);

  const onDropToSlot = (event: DragEvent<HTMLElement>, dayIso: string, mealType: MealType) => {
    event.preventDefault();
    setDragOverSlotKey(null);

    let mealPlanItemId = event.dataTransfer.getData(MEAL_PLAN_ITEM_DRAG_MIME_TYPE);
    if (!mealPlanItemId) {
      const plainTextPayload = event.dataTransfer.getData("text/plain");
      if (plainTextPayload.startsWith("meal-plan-item:")) {
        mealPlanItemId = plainTextPayload.replace("meal-plan-item:", "");
      }
    }
    if (mealPlanItemId) {
      void onMoveItem(mealPlanItemId, dayIso, mealType);
      return;
    }

    const recipeId =
      event.dataTransfer.getData(RECIPE_DRAG_MIME_TYPE) ||
      event.dataTransfer.getData("text/plain");

    if (!recipeId) {
      return;
    }

    void onAssignRecipe(recipeId, dayIso, mealType, null);
  };

  const openRecipeDetail = (item: MealPlanItem) => {
    if (!item.recipeId) {
      return;
    }

    navigate(`/app/recipes/${item.recipeId}`, {
      state: {
        ...RECIPE_DETAIL_MEAL_PLANNER_STATE,
        mealPlanItemId: item.id,
        initialServings: item.effectiveServings,
      },
    });
  };

  return (
    <article className="workspace-card meal-calendar">
      <header className="meal-calendar__header">
        <div>
          <h1>Meal Planner</h1>
          <p>{weekLabel}</p>
        </div>
        <div className="meal-calendar__actions">
          <button type="button" className="btn btn--ghost" onClick={() => onShiftWeek(-1)}>
            Previous week
          </button>
          <button type="button" className="btn btn--ghost" onClick={onJumpToCurrentWeek}>
            Current week
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => onShiftWeek(1)}>
            Next week
          </button>
        </div>
      </header>

      <div className="meal-calendar__grid">
        {weekDays.map((day) => (
          <section key={day.dateIso} className="meal-day">
            <header className="meal-day__header">
              <h2>{day.weekdayShort}</h2>
              <span>{day.monthDayLabel}</span>
            </header>

            <div className="meal-day__slots">
              {MEAL_TYPE_OPTIONS.map((option) => {
                const slotKey = getSlotKey(day.dateIso, option.value);
                const slotItems = slotMap.get(slotKey) ?? [];
                const isDropTarget = dragOverSlotKey === slotKey;

                return (
                  <section
                    key={slotKey}
                    className={`meal-slot${isDropTarget ? " meal-slot--active" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      const dragTypes = Array.from(event.dataTransfer.types);
                      const isMealPlanItemDrag = dragTypes.includes(
                        MEAL_PLAN_ITEM_DRAG_MIME_TYPE
                      );
                      const plainTextPayload = event.dataTransfer.getData("text/plain");
                      const isMealPlanItemTextFallback =
                        plainTextPayload.startsWith("meal-plan-item:");
                      event.dataTransfer.dropEffect = isMealPlanItemDrag ? "move" : "copy";
                      if (isMealPlanItemTextFallback) {
                        event.dataTransfer.dropEffect = "move";
                      }
                    }}
                    onDragEnter={() => setDragOverSlotKey(slotKey)}
                    onDragLeave={() => setDragOverSlotKey((current) => (current === slotKey ? null : current))}
                    onDrop={(event) => onDropToSlot(event, day.dateIso, option.value)}
                    aria-label={`${option.label} on ${day.fullLabel}`}
                  >
                    <div className="meal-slot__title">{option.label}</div>
                    {slotItems.length === 0 ? (
                      <p className="meal-slot__empty">Drop recipe here</p>
                    ) : (
                      <ul className="meal-slot__items">
                        {slotItems.map((item) => (
                          <li
                            key={item.id}
                            className={`meal-chip${item.recipeId ? " meal-chip--clickable" : ""}${movingItemId === item.id ? " meal-chip--moving" : ""}`}
                            onClick={() => openRecipeDetail(item)}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) {
                                return;
                              }
                              if (!item.recipeId) {
                                return;
                              }
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openRecipeDetail(item);
                              }
                            }}
                            role={item.recipeId ? "link" : undefined}
                            tabIndex={item.recipeId ? 0 : undefined}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData(MEAL_PLAN_ITEM_DRAG_MIME_TYPE, item.id);
                              event.dataTransfer.setData("text/plain", `meal-plan-item:${item.id}`);
                              event.dataTransfer.effectAllowed = "copyMove";
                            }}
                          >
                            <span>{item.recipeTitle}</span>
                            <div className="meal-chip__servings">
                              <span>Servings</span>
                              <div className="servings-stepper servings-stepper--compact">
                                <button
                                  type="button"
                                  className="btn btn--ghost servings-stepper__button"
                                  aria-label={`Decrease servings for ${item.recipeTitle}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (
                                      updatingServingsItemId === item.id ||
                                      movingItemId === item.id ||
                                      removingItemId === item.id ||
                                      !item.effectiveServings ||
                                      item.effectiveServings <= 1
                                    ) {
                                      return;
                                    }
                                    const nextEffectiveServings = item.effectiveServings - 1;
                                    void onUpdateItemServings(
                                      item.id,
                                      getServingsOverride(
                                        nextEffectiveServings,
                                        item.recipeServings
                                      )
                                    );
                                  }}
                                  disabled={
                                    updatingServingsItemId === item.id ||
                                    movingItemId === item.id ||
                                    removingItemId === item.id ||
                                    !item.effectiveServings ||
                                    item.effectiveServings <= 1
                                  }
                                >
                                  -
                                </button>
                                <span className="servings-stepper__value">
                                  {item.effectiveServings ?? "-"}
                                </span>
                                <button
                                  type="button"
                                  className="btn btn--ghost servings-stepper__button"
                                  aria-label={`Increase servings for ${item.recipeTitle}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (
                                      updatingServingsItemId === item.id ||
                                      movingItemId === item.id ||
                                      removingItemId === item.id
                                    ) {
                                      return;
                                    }
                                    const nextEffectiveServings = Math.max(
                                      1,
                                      (item.effectiveServings ?? 0) + 1
                                    );
                                    void onUpdateItemServings(
                                      item.id,
                                      getServingsOverride(
                                        nextEffectiveServings,
                                        item.recipeServings
                                      )
                                    );
                                  }}
                                  disabled={
                                    updatingServingsItemId === item.id ||
                                    movingItemId === item.id ||
                                    removingItemId === item.id
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="meal-chip__remove"
                              onClick={(event) => {
                                event.stopPropagation();
                                void onRemoveItem(item.id);
                              }}
                              disabled={
                                removingItemId === item.id ||
                                movingItemId === item.id ||
                                updatingServingsItemId === item.id
                              }
                              aria-label={`Remove ${item.recipeTitle}`}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
