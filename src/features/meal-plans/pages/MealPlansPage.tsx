import { useCallback, useEffect, useMemo, useState } from "react";
import LoadingModal from "../../../components/feedback/LoadingModal";
import { useLoadingGate } from "../../../components/feedback/useLoadingGate";
import {
  addMealPlanItem,
  deleteMealPlanItem,
  listMealPlanItemsForWeek,
  moveMealPlanItem,
  searchPlannerRecipes,
} from "../api";
import MealPlannerCalendar from "../components/MealPlannerCalendar";
import RecipeAssignmentPanel from "../components/RecipeAssignmentPanel";
import { DEFAULT_MEAL_TYPE } from "../constants";
import {
  formatWeekRangeLabel,
  getWeekDays,
  getWeekStartIso,
  shiftWeekStartIso,
} from "../dateUtils";
import type { MealPlanItem, MealPlannerRecipeSummary, MealType } from "../types";
import {
  loadMealPlannerViewState,
  saveMealPlannerViewState,
} from "../utils/mealPlannerViewState";

export default function MealPlansPage() {
  const [initialState] = useState(() => {
    const defaultWeekStartIso = getWeekStartIso(new Date());
    return loadMealPlannerViewState({
      weekStartIso: defaultWeekStartIso,
      searchInput: "",
      selectedDay: defaultWeekStartIso,
      selectedMealType: DEFAULT_MEAL_TYPE,
    });
  });
  const [weekStartIso, setWeekStartIso] = useState(initialState.weekStartIso);
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [hasLoadedInitialItems, setHasLoadedInitialItems] = useState(false);
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState(initialState.searchInput);
  const [searchTerm, setSearchTerm] = useState(initialState.searchInput.trim());
  const [recipes, setRecipes] = useState<MealPlannerRecipeSummary[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const weekDays = useMemo(() => getWeekDays(weekStartIso), [weekStartIso]);
  const weekLabel = useMemo(() => formatWeekRangeLabel(weekStartIso), [weekStartIso]);

  const [selectedDay, setSelectedDay] = useState(initialState.selectedDay);
  const [selectedMealType, setSelectedMealType] = useState<MealType>(
    initialState.selectedMealType
  );
  const [assigningKey, setAssigningKey] = useState<string | null>(null);
  const showInitialLoadingModal = useLoadingGate(
    loadingItems && !hasLoadedInitialItems,
    { showDelayMs: 0, minVisibleMs: 480 }
  );

  useEffect(() => {
    const currentWeekDates = new Set(weekDays.map((day) => day.dateIso));
    if (!currentWeekDates.has(selectedDay)) {
      setSelectedDay(weekDays[0]?.dateIso ?? "");
    }
  }, [selectedDay, weekDays]);

  useEffect(() => {
    const debounceId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 220);

    return () => window.clearTimeout(debounceId);
  }, [searchInput]);

  useEffect(() => {
    saveMealPlannerViewState({
      weekStartIso,
      searchInput,
      selectedDay,
      selectedMealType,
    });
  }, [weekStartIso, searchInput, selectedDay, selectedMealType]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoadingItems(true);
      setPlannerError(null);

      try {
        const nextItems = await listMealPlanItemsForWeek(weekStartIso);
        if (mounted) {
          setItems(nextItems);
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

  useEffect(() => {
    let mounted = true;
    if (!searchTerm) {
      setRecipes([]);
      setSearchError(null);
      setLoadingRecipes(false);
      return () => {
        mounted = false;
      };
    }

    const run = async () => {
      setLoadingRecipes(true);
      setSearchError(null);

      try {
        const nextRecipes = await searchPlannerRecipes(searchTerm);
        if (mounted) {
          setRecipes(nextRecipes);
        }
      } catch (error) {
        if (mounted) {
          setSearchError(error instanceof Error ? error.message : "Failed to search recipes.");
        }
      } finally {
        if (mounted) {
          setLoadingRecipes(false);
        }
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [searchTerm]);

  const handleAssignRecipe = useCallback(
    async (recipeId: string, plannedFor: string, mealType: MealType) => {
      if (!plannedFor) {
        return;
      }

      const nextAssigningKey = `${recipeId}|${plannedFor}|${mealType}`;
      setAssigningKey(nextAssigningKey);
      setPlannerError(null);

      try {
        const addedItem = await addMealPlanItem({
          weekStartIso,
          plannedFor,
          mealType,
          recipeId,
        });
        setItems((currentItems) => [...currentItems, addedItem]);
      } catch (error) {
        setPlannerError(error instanceof Error ? error.message : "Failed to add recipe.");
      } finally {
        setAssigningKey((currentKey) => (currentKey === nextAssigningKey ? null : currentKey));
      }
    },
    [weekStartIso]
  );

  const handleRemoveItem = useCallback(async (itemId: string) => {
    setRemovingItemId(itemId);
    setPlannerError(null);

    try {
      await deleteMealPlanItem(itemId);
      setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
    } catch (error) {
      setPlannerError(error instanceof Error ? error.message : "Failed to remove item.");
    } finally {
      setRemovingItemId((currentId) => (currentId === itemId ? null : currentId));
    }
  }, []);

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
        setItems((currentItems) =>
          currentItems.map((item) => (item.id === itemId ? movedItem : item))
        );
      } catch (error) {
        setPlannerError(error instanceof Error ? error.message : "Failed to move recipe.");
      } finally {
        setMovingItemId((currentId) => (currentId === itemId ? null : currentId));
      }
    },
    [items]
  );

  return (
    <section className="workspace-route meal-planner-route">
      <LoadingModal
        open={showInitialLoadingModal}
        title="Loading meal planner..."
        message="Preparing your calendar and saved meals."
      />
      {plannerError ? <p className="error">{plannerError}</p> : null}

      <div className="meal-planner-layout">
        <MealPlannerCalendar
          weekLabel={weekLabel}
          weekDays={weekDays}
          items={items}
          removingItemId={removingItemId}
          movingItemId={movingItemId}
          onShiftWeek={(weekOffset) =>
            setWeekStartIso((currentIso) => shiftWeekStartIso(currentIso, weekOffset))
          }
          onJumpToCurrentWeek={() => setWeekStartIso(getWeekStartIso(new Date()))}
          onAssignRecipe={handleAssignRecipe}
          onMoveItem={handleMoveItem}
          onRemoveItem={handleRemoveItem}
        />

        <RecipeAssignmentPanel
          recipes={recipes}
          searchInput={searchInput}
          loading={loadingRecipes}
          error={searchError}
          selectedDay={selectedDay}
          selectedMealType={selectedMealType}
          weekDays={weekDays}
          assigningKey={assigningKey}
          onSearchInputChange={setSearchInput}
          onSelectedDayChange={setSelectedDay}
          onSelectedMealTypeChange={setSelectedMealType}
          onAssignRecipe={handleAssignRecipe}
        />
      </div>
    </section>
  );
}
