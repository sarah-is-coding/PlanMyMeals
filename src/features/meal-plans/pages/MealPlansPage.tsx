import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import LoadingModal from "../../../components/feedback/LoadingModal";
import { useLoadingGate } from "../../../components/feedback/useLoadingGate";
import {
  applySavedMealPlan,
  clearWeekPlan,
  deleteMealPlanItem,
  listMealPlanItemsForWeek,
  moveMealPlanItem,
  updateMealPlanItemServings,
} from "../api";
import MealPlannerCalendar from "../components/MealPlannerCalendar";
import PastMealPlanPanel from "../components/PastMealPlanPanel";
import {
  createDateFromIso,
  formatWeekRangeLabel,
  getWeekDays,
  getWeekStartIso,
  shiftWeekStartIso,
} from "../dateUtils";
import type { MealPlanItem, MealType } from "../types";
import {
  loadCachedMealPlanItems,
  saveCachedMealPlanItems,
} from "../utils/mealPlanItemsCache";
import {
  loadMealPlannerViewState,
  saveMealPlannerViewState,
} from "../utils/mealPlannerViewState";

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

export default function MealPlansPage() {
  const location = useLocation();
  const jumpToDate = (location.state as { jumpToDate?: string } | null)?.jumpToDate;

  const [initialState] = useState(() => {
    if (jumpToDate && isIsoDate(jumpToDate)) {
      return { weekStartIso: getWeekStartIso(createDateFromIso(jumpToDate)) };
    }
    return loadMealPlannerViewState({ weekStartIso: getWeekStartIso(new Date()) });
  });
  const [initialCachedItems] = useState<MealPlanItem[] | null>(() =>
    loadCachedMealPlanItems(initialState.weekStartIso)
  );
  const [weekStartIso, setWeekStartIso] = useState(initialState.weekStartIso);
  const [items, setItems] = useState<MealPlanItem[]>(initialCachedItems ?? []);
  const [loadingItems, setLoadingItems] = useState(initialCachedItems === null);
  const [hasLoadedInitialItems, setHasLoadedInitialItems] = useState(initialCachedItems !== null);
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [updatingServingsItemId, setUpdatingServingsItemId] = useState<string | null>(null);

  const weekDays = useMemo(() => getWeekDays(weekStartIso), [weekStartIso]);
  const weekLabel = useMemo(() => formatWeekRangeLabel(weekStartIso), [weekStartIso]);

  const showInitialLoadingModal = useLoadingGate(
    loadingItems && !hasLoadedInitialItems,
    { showDelayMs: 0, minVisibleMs: 480 }
  );

  useEffect(() => {
    saveMealPlannerViewState({ weekStartIso });
  }, [weekStartIso]);

  useEffect(() => {
    let mounted = true;
    const cachedItems = loadCachedMealPlanItems(weekStartIso);

    setItems(cachedItems ?? []);
    if (cachedItems) {
      setHasLoadedInitialItems(true);
    }

    const run = async () => {
      setLoadingItems(true);
      setPlannerError(null);

      try {
        const nextItems = await listMealPlanItemsForWeek(weekStartIso);
        if (mounted) {
          setItems(nextItems);
          saveCachedMealPlanItems(weekStartIso, nextItems);
        }
      } catch (error) {
        if (mounted) {
          setPlannerError(error instanceof Error ? error.message : "Failed to load meal plan.");
        }
      } finally {
        if (mounted) {
          setLoadingItems(false);
          setHasLoadedInitialItems(true);
        }
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [weekStartIso]);

  const handleRemoveItem = useCallback(async (itemId: string) => {
    setRemovingItemId(itemId);
    setPlannerError(null);

    try {
      await deleteMealPlanItem(itemId);
      setItems((currentItems) => {
        const nextItems = currentItems.filter((item) => item.id !== itemId);
        saveCachedMealPlanItems(weekStartIso, nextItems);
        return nextItems;
      });
    } catch (error) {
      setPlannerError(error instanceof Error ? error.message : "Failed to remove item.");
    } finally {
      setRemovingItemId((currentId) => (currentId === itemId ? null : currentId));
    }
  }, [weekStartIso]);

  const handleMoveItem = useCallback(
    async (itemId: string, plannedFor: string, mealType: MealType) => {
      const existingItem = items.find((item) => item.id === itemId);
      if (!existingItem) {
        return;
      }
      if (existingItem.plannedFor === plannedFor && existingItem.mealType === mealType) {
        return;
      }

      setMovingItemId(itemId);
      setPlannerError(null);

      try {
        const movedItem = await moveMealPlanItem({
          itemId,
          plannedFor,
          mealType,
        });
        setItems((currentItems) => {
          const nextItems = currentItems.map((item) => (item.id === itemId ? movedItem : item));
          saveCachedMealPlanItems(weekStartIso, nextItems);
          return nextItems;
        });
      } catch (error) {
        setPlannerError(error instanceof Error ? error.message : "Failed to move recipe.");
      } finally {
        setMovingItemId((currentId) => (currentId === itemId ? null : currentId));
      }
    },
    [items, weekStartIso]
  );

  /** Unified handler for both "copy past week" and "apply saved plan".
   *  Uses applySavedMealPlan so multi-week plans are handled correctly. */
  const handleApplyPlan = useCallback(
    async (planId: string, mode: "add" | "replace") => {
      setPlannerError(null);
      if (mode === "replace") {
        await clearWeekPlan(weekStartIso);
      }
      const newItems = await applySavedMealPlan(planId, weekStartIso);
      setItems((current) => {
        const base = mode === "replace" ? [] : current;
        const next = [...base, ...newItems];
        saveCachedMealPlanItems(weekStartIso, next);
        return next;
      });
    },
    [weekStartIso]
  );

  const handleUpdateItemServings = useCallback(
    async (itemId: string, servingsOverride: number | null) => {
      const existingItem = items.find((item) => item.id === itemId);
      if (!existingItem || existingItem.servingsOverride === servingsOverride) {
        return;
      }

      setUpdatingServingsItemId(itemId);
      setPlannerError(null);

      try {
        const updatedItem = await updateMealPlanItemServings({
          itemId,
          servingsOverride,
        });
        setItems((currentItems) => {
          const nextItems = currentItems.map((item) =>
            item.id === itemId ? updatedItem : item
          );
          saveCachedMealPlanItems(weekStartIso, nextItems);
          return nextItems;
        });
      } catch (error) {
        setPlannerError(error instanceof Error ? error.message : "Failed to update servings.");
      } finally {
        setUpdatingServingsItemId((currentId) => (currentId === itemId ? null : currentId));
      }
    },
    [items, weekStartIso]
  );

  return (
    <section className="workspace-route meal-planner-route">
      <LoadingModal
        open={showInitialLoadingModal}
        title="Loading meal planner..."
        message="Preparing your calendar and saved meals."
      />
      {plannerError && (
        <p className="meal-planner-route__error error">{plannerError}</p>
      )}

      <div className="meal-planner-layout">
        <MealPlannerCalendar
          weekLabel={weekLabel}
          weekDays={weekDays}
          items={items}
          removingItemId={removingItemId}
          movingItemId={movingItemId}
          updatingServingsItemId={updatingServingsItemId}
          onShiftWeek={(weekOffset) =>
            setWeekStartIso((currentIso) => shiftWeekStartIso(currentIso, weekOffset))
          }
          onJumpToCurrentWeek={() => setWeekStartIso(getWeekStartIso(new Date()))}
          onMoveItem={handleMoveItem}
          onUpdateItemServings={handleUpdateItemServings}
          onRemoveItem={handleRemoveItem}
        />

        <div className="meal-planner-sidebar">
          <PastMealPlanPanel
            currentWeekStartIso={weekStartIso}
            currentWeekHasItems={items.length > 0}
            onJumpToWeek={setWeekStartIso}
            onApplyPlan={handleApplyPlan}
          />
        </div>
      </div>
    </section>
  );
}
