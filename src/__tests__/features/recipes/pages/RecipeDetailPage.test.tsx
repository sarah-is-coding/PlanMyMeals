import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RecipeDetailPage from "../../../../features/recipes/pages/RecipeDetailPage";

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

vi.mock("../../../../features/recipes/api", () => ({
  getRecipeById: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
}));

vi.mock("../../../../features/ingredients/api", () => ({
  createIngredient: vi.fn().mockResolvedValue({
    id: "ingredient-1",
    name: "ground chicken",
    category: "meat & seafood",
    defaultUnit: null,
  }),
  searchIngredients: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../../../features/meal-plans/api", () => ({
  addMealPlanItem: vi.fn(),
}));

import { deleteRecipe, getRecipeById, updateRecipe } from "../../../../features/recipes/api";
import { addMealPlanItem } from "../../../../features/meal-plans/api";

const mockGetRecipeById = vi.mocked(getRecipeById);
const mockUpdateRecipe = vi.mocked(updateRecipe);
const mockDeleteRecipe = vi.mocked(deleteRecipe);
const mockAddMealPlanItem = vi.mocked(addMealPlanItem);

const recipe = {
  id: "recipe-1",
  title: "Chicken Caesar Taco Salad",
  description: null,
  sourceUrl: null,
  prepMinutes: null,
  cookMinutes: null,
  servings: 4,
  tags: [],
  instructions: "1. Cook chicken.",
  createdAt: "2026-05-25T00:00:00Z",
  ingredients: [
    {
      id: "row-1",
      ingredientId: "ingredient-1",
      ingredientName: "ground chicken",
      quantity: "1",
      unit: "lb",
      notes: "",
    },
  ],
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/app/recipes/recipe-1"]}>
      <Routes>
        <Route path="/app/recipes/:recipeId" element={<RecipeDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

describe("RecipeDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRecipeById.mockResolvedValue(recipe);
    mockUpdateRecipe.mockResolvedValue(undefined);
    mockDeleteRecipe.mockResolvedValue(undefined);
  });

  it("adds the recipe to the meal plan from the detail page", async () => {
    mockAddMealPlanItem.mockResolvedValue({
      id: "item-1",
      recipeId: "recipe-1",
      recipeTitle: "Chicken Caesar Taco Salad",
      plannedFor: "2026-01-01",
      mealType: "dinner",
      servingsOverride: null,
      recipeServings: 4,
      effectiveServings: 4,
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Chicken Caesar Taco Salad");
    await user.click(screen.getByRole("button", { name: "Add to Plan" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("Chicken Caesar Taco Salad").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Add recipe" }));

    await waitFor(() => {
      expect(mockAddMealPlanItem).toHaveBeenCalledWith(
        expect.objectContaining({ recipeId: "recipe-1", mealType: "dinner", servingsOverride: null })
      );
    });
    expect(await screen.findByText("Added to your meal plan.")).toBeInTheDocument();
  });

  it("shows a sticky save button while editing and submits the edit form", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Chicken Caesar Taco Salad");
    await user.click(screen.getByRole("button", { name: "Edit" }));

    const saveButtons = screen.getAllByRole("button", { name: "Save Changes" });
    expect(saveButtons).toHaveLength(2);

    await user.click(saveButtons[1]);

    await waitFor(() => {
      expect(mockUpdateRecipe).toHaveBeenCalledWith(
        "recipe-1",
        expect.objectContaining({
          title: "Chicken Caesar Taco Salad",
        })
      );
    });
  });

  it("deletes the recipe after confirmation and navigates back to the list", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Chicken Caesar Taco Salad");
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByText("Delete this recipe?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => {
      expect(mockDeleteRecipe).toHaveBeenCalledWith("recipe-1");
    });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/app/recipes");
    });
  });

  it("cancels the delete confirmation without deleting", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Chicken Caesar Taco Salad");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Delete this recipe?")).not.toBeInTheDocument();
    expect(mockDeleteRecipe).not.toHaveBeenCalled();
  });

  it("shows an error message when deleting fails", async () => {
    mockDeleteRecipe.mockRejectedValue(new Error("Failed to delete recipe."));
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Chicken Caesar Taco Salad");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(await screen.findByText("Failed to delete recipe.")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
