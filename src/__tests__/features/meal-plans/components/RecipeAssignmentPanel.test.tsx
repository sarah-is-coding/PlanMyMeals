import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import RecipeAssignmentPanel from "../../../../features/meal-plans/components/RecipeAssignmentPanel";
import type { MealPlannerDay, MealPlannerRecipeSummary, MealType } from "../../../../features/meal-plans/types";

const WEEK_DAYS: MealPlannerDay[] = [
  { dateIso: "2026-05-25", weekdayShort: "Mon", monthDayLabel: "May 25", fullLabel: "Monday, May 25" },
];

const RECIPES: MealPlannerRecipeSummary[] = [
  { id: "r1", title: "Pasta Bake", description: null, prepMinutes: 10, cookMinutes: 30, servings: 4 },
];

function renderPanel(overrides: { searchInput?: string; recipes?: MealPlannerRecipeSummary[] } = {}) {
  const onSearchInputChange = vi.fn();
  const onAssignRecipe = vi.fn().mockResolvedValue(undefined);

  render(
    <MemoryRouter>
      <RecipeAssignmentPanel
        recipes={overrides.recipes ?? []}
        searchInput={overrides.searchInput ?? ""}
        loading={false}
        error={null}
        selectedDay="2026-05-25"
        selectedMealType={"dinner" as MealType}
        weekDays={WEEK_DAYS}
        assigningKey={null}
        onSearchInputChange={onSearchInputChange}
        onSelectedDayChange={vi.fn()}
        onSelectedMealTypeChange={vi.fn()}
        onAssignRecipe={onAssignRecipe}
      />
    </MemoryRouter>
  );

  return { onSearchInputChange };
}

describe("RecipeAssignmentPanel — clear search button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show the clear button when search is empty", () => {
    renderPanel({ searchInput: "" });
    expect(screen.queryByRole("button", { name: /clear recipe search/i })).not.toBeInTheDocument();
  });

  it("shows the clear button when search has a value", () => {
    renderPanel({ searchInput: "pasta" });
    expect(screen.getByRole("button", { name: /clear recipe search/i })).toBeInTheDocument();
  });

  it("calls onSearchInputChange with empty string when clear is clicked", () => {
    const { onSearchInputChange } = renderPanel({ searchInput: "pasta" });
    fireEvent.click(screen.getByRole("button", { name: /clear recipe search/i }));
    expect(onSearchInputChange).toHaveBeenCalledWith("");
  });
});
