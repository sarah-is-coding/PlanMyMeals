import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddToPlanButton from "../../../../features/meal-plans/components/AddToPlanButton";

vi.mock("../../../../features/meal-plans/api", () => ({
  addMealPlanItem: vi.fn(),
}));

import { addMealPlanItem } from "../../../../features/meal-plans/api";

const mockAddMealPlanItem = vi.mocked(addMealPlanItem);

describe("AddToPlanButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the popup with the recipe name and week days on click", async () => {
    const user = userEvent.setup();
    render(<AddToPlanButton recipeId="recipe-1" recipeTitle="Pasta Bake" recipeServings={4} />);

    await user.click(screen.getByRole("button", { name: "Add to Plan" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Pasta Bake")).toBeInTheDocument();
    expect(screen.getByLabelText("Day").querySelectorAll("option")).toHaveLength(7);
  });

  it("assigns the recipe to the selected day and meal and shows a success message", async () => {
    mockAddMealPlanItem.mockResolvedValue({
      id: "item-1",
      recipeId: "recipe-1",
      recipeTitle: "Pasta Bake",
      plannedFor: "2026-01-01",
      mealType: "lunch",
      servingsOverride: null,
      recipeServings: 4,
      effectiveServings: 4,
    });

    const user = userEvent.setup();
    render(<AddToPlanButton recipeId="recipe-1" recipeTitle="Pasta Bake" recipeServings={4} />);

    await user.click(screen.getByRole("button", { name: "Add to Plan" }));

    const daySelect = screen.getByLabelText("Day") as HTMLSelectElement;
    const expectedDay = daySelect.value;

    await user.selectOptions(screen.getByLabelText("Meal"), "lunch");
    await user.click(screen.getByRole("button", { name: "Add recipe" }));

    await waitFor(() => {
      expect(mockAddMealPlanItem).toHaveBeenCalledWith(
        expect.objectContaining({
          plannedFor: expectedDay,
          mealType: "lunch",
          recipeId: "recipe-1",
          servingsOverride: null,
        })
      );
    });

    expect(await screen.findByText("Added to your meal plan.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows an error message when assignment fails", async () => {
    mockAddMealPlanItem.mockRejectedValue(new Error("Failed to add recipe to plan."));

    const user = userEvent.setup();
    render(<AddToPlanButton recipeId="recipe-1" recipeTitle="Pasta Bake" recipeServings={4} />);

    await user.click(screen.getByRole("button", { name: "Add to Plan" }));
    await user.click(screen.getByRole("button", { name: "Add recipe" }));

    expect(await screen.findByText("Failed to add recipe to plan.")).toBeInTheDocument();
  });
});
