import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMealPlanItem,
  deleteMealPlanItem,
  listMealPlanItemsForWeek,
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

export default function MealPlansPage() {
  const [weekStartIso, setWeekStartIso] = useState(() => getWeekStartIso(new Date()));
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [recipes, setRecipes] = useState<MealPlannerRecipeSummary[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const weekDays = useMemo(() => getWeekDays(weekStartIso), [weekStartIso]);
  const weekLabel = useMemo(() => formatWeekRangeLabel(weekStartIso), [weekStartIso]);

  const [selectedDay, setSelectedDay] = useState(() => weekDays[0]?.dateIso ?? "");
  const [selectedMealType, setSelectedMealType] = useState<MealType>(DEFAULT_MEAL_TYPE);
  const [assigningKey, setAssigningKey] = useState<string | null>(null);

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

  return (
    <section className="workspace-route meal-planner-route">
      {plannerError ? <p className="error">{plannerError}</p> : null}

      <div className="meal-planner-layout">
        <MealPlannerCalendar
          weekLabel={weekLabel}
          weekDays={weekDays}
          items={items}
          loading={loadingItems}
          removingItemId={removingItemId}
          onShiftWeek={(weekOffset) =>
            setWeekStartIso((currentIso) => shiftWeekStartIso(currentIso, weekOffset))
          }
          onJumpToCurrentWeek={() => setWeekStartIso(getWeekStartIso(new Date()))}
          onAssignRecipe={handleAssignRecipe}
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
