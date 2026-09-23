import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AddToPlanButton from "../../../../features/meal-plans/components/AddToPlanButton";
import { toIsoDate } from "../../../../features/meal-plans/dateUtils";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("../../../../features/meal-plans/api", () => ({
  addMealPlanItem: vi.fn(),
}));

import { addMealPlanItem } from "../../../../features/meal-plans/api";

const mockAddMealPlanItem = vi.mocked(addMealPlanItem);

const renderButton = (props: Partial<React.ComponentProps<typeof AddToPlanButton>> = {}) =>
  render(
    <MemoryRouter>
      <AddToPlanButton
        recipeId="recipe-1"
        recipeTitle="Pasta Bake"
        recipeServings={4}
        {...props}
      />
    </MemoryRouter>
  );

describe("AddToPlanButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the popup with the recipe name and week days on click", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Add to Plan" }));

    expect(
      screen.getByRole("dialog", { name: "Choose day and meal for recipe assignment" })
    ).toBeInTheDocument();
    expect(screen.getByText("Pasta Bake")).toBeInTheDocument();
    expect(screen.getByLabelText("Day").querySelectorAll("option")).toHaveLength(7);
  });

  it("assigns the recipe and offers to view it on the meal plan", async () => {
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
    renderButton();

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

    expect(
      screen.queryByRole("dialog", { name: "Choose day and meal for recipe assignment" })
    ).not.toBeInTheDocument();

    const confirmDialog = await screen.findByRole("dialog", { name: "Recipe added to plan" });
    expect(confirmDialog).toHaveTextContent("Added to your meal plan.");

    await user.click(screen.getByRole("button", { name: "View meal plan" }));

    expect(navigate).toHaveBeenCalledWith("/app/meal-plans", {
      state: { jumpToDate: expectedDay },
    });
    expect(screen.queryByRole("dialog", { name: "Recipe added to plan" })).not.toBeInTheDocument();
  });

  it("dismisses the added-to-plan confirmation without navigating", async () => {
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
    renderButton();

    await user.click(screen.getByRole("button", { name: "Add to Plan" }));
    await user.click(screen.getByRole("button", { name: "Add recipe" }));

    await screen.findByRole("dialog", { name: "Recipe added to plan" });
    await user.click(screen.getByRole("button", { name: "Stay here" }));

    expect(screen.queryByRole("dialog", { name: "Recipe added to plan" })).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("preselects an initial day/meal outside the current week", async () => {
    const farFutureDate = new Date();
    farFutureDate.setDate(farFutureDate.getDate() + 30);
    const initialDay = toIsoDate(farFutureDate);

    const user = userEvent.setup();
    renderButton({ initialDay, initialMealType: "breakfast" });

    await user.click(screen.getByRole("button", { name: "Add to Plan" }));

    const daySelect = screen.getByLabelText("Day") as HTMLSelectElement;
    expect(daySelect.value).toBe(initialDay);
    expect(
      Array.from(daySelect.querySelectorAll("option")).map((option) => option.value)
    ).toContain(initialDay);
    expect((screen.getByLabelText("Meal") as HTMLSelectElement).value).toBe("breakfast");
  });

  it("shows an error message when assignment fails", async () => {
    mockAddMealPlanItem.mockRejectedValue(new Error("Failed to add recipe to plan."));

    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Add to Plan" }));
    await user.click(screen.getByRole("button", { name: "Add recipe" }));

    expect(await screen.findByText("Failed to add recipe to plan.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Recipe added to plan" })).not.toBeInTheDocument();
  });
});
