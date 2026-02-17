import { useMemo, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  MEAL_TYPE_OPTIONS,
  RECIPE_DETAIL_MEAL_PLANNER_STATE,
  RECIPE_DRAG_MIME_TYPE,
} from "../constants";
import type { MealPlanItem, MealPlannerDay, MealType } from "../types";

type MealPlannerCalendarProps = {
  weekLabel: string;
  weekDays: MealPlannerDay[];
  items: MealPlanItem[];
  loading: boolean;
  removingItemId: string | null;
  onShiftWeek: (weekOffset: number) => void;
  onJumpToCurrentWeek: () => void;
  onAssignRecipe: (recipeId: string, plannedFor: string, mealType: MealType) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
};

function getSlotKey(dayIso: string, mealType: MealType): string {
  return `${dayIso}:${mealType}`;
}

export default function MealPlannerCalendar({
  weekLabel,
  weekDays,
  items,
  loading,
  removingItemId,
  onShiftWeek,
  onJumpToCurrentWeek,
  onAssignRecipe,
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

  const onDropRecipe = (event: DragEvent<HTMLElement>, dayIso: string, mealType: MealType) => {
    event.preventDefault();
    setDragOverSlotKey(null);

    const recipeId =
      event.dataTransfer.getData(RECIPE_DRAG_MIME_TYPE) ||
      event.dataTransfer.getData("text/plain");

    if (!recipeId) {
      return;
    }

    void onAssignRecipe(recipeId, dayIso, mealType);
  };

  const openRecipeDetail = (recipeId: string | null) => {
    if (!recipeId) {
      return;
    }

    navigate(`/app/recipes/${recipeId}`, {
      state: RECIPE_DETAIL_MEAL_PLANNER_STATE,
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

      {loading ? <p>Loading calendar...</p> : null}

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
                      event.dataTransfer.dropEffect = "copy";
                    }}
                    onDragEnter={() => setDragOverSlotKey(slotKey)}
                    onDragLeave={() => setDragOverSlotKey((current) => (current === slotKey ? null : current))}
                    onDrop={(event) => onDropRecipe(event, day.dateIso, option.value)}
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
                            className={`meal-chip${item.recipeId ? " meal-chip--clickable" : ""}`}
                            onClick={() => openRecipeDetail(item.recipeId)}
                            onKeyDown={(event) => {
                              if (!item.recipeId) {
                                return;
                              }
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openRecipeDetail(item.recipeId);
                              }
                            }}
                            role={item.recipeId ? "link" : undefined}
                            tabIndex={item.recipeId ? 0 : undefined}
                          >
                            <span>{item.recipeTitle}</span>
                            <button
                              type="button"
                              className="meal-chip__remove"
                              onClick={(event) => {
                                event.stopPropagation();
                                void onRemoveItem(item.id);
                              }}
                              disabled={removingItemId === item.id}
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
