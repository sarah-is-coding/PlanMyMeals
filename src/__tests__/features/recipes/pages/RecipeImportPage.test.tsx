import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RecipeImportPage from "../../../../features/recipes/pages/RecipeImportPage";
import type { ImportedRecipe } from "../../../../features/recipes/importTypes";
import { SAMPLE_RECIPE_IMPORT_NOTES } from "../fixtures/sampleRecipeImportNotes";

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
  createRecipe: vi.fn(),
}));

vi.mock("../../../../features/recipes/importApi", () => ({
  extractRecipesFromText: vi.fn(),
}));

import { createRecipe } from "../../../../features/recipes/api";
import { extractRecipesFromText } from "../../../../features/recipes/importApi";

const mockCreateRecipe = vi.mocked(createRecipe);
const mockExtractRecipesFromText = vi.mocked(extractRecipesFromText);

const IMPORTED_RECIPES: ImportedRecipe[] = [
  {
    title: "Chicken Caesar taco salad",
    description: "A taco salad draft extracted from loose notes.",
    sourceUrl: null,
    prepMinutes: 15,
    cookMinutes: 15,
    servings: null,
    tags: ["dinner", "salad"],
    instructions: "Assemble tortillas with lettuce, dressing, parmesan, and chicken.",
    ingredients: [
      {
        ingredientName: "ground chicken",
        quantity: "",
        unit: "",
        notes: "salted and peppered",
        category: "meat & seafood",
      },
    ],
    confidence: "medium",
    warnings: [],
  },
  {
    title: "Walking Tacos",
    description: "Recipe extracted from the linked Allrecipes page.",
    sourceUrl: "https://www.allrecipes.com/recipe/269613/walking-tacos/",
    prepMinutes: 10,
    cookMinutes: 15,
    servings: 8,
    tags: ["dinner", "tacos"],
    instructions: "Prepare taco meat and assemble in chip bags with toppings.",
    ingredients: [
      {
        ingredientName: "ground beef",
        quantity: "1",
        unit: "lb",
        notes: "",
        category: "meat & seafood",
      },
    ],
    confidence: "high",
    warnings: [],
  },
];

describe("RecipeImportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractRecipesFromText.mockResolvedValue({
      recipes: IMPORTED_RECIPES,
      warnings: [],
    });
    mockCreateRecipe
      .mockResolvedValueOnce("recipe-1")
      .mockResolvedValueOnce("recipe-2");
  });

  it("creates selected imported recipes after extraction", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RecipeImportPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/notes and links/i), {
      target: { value: SAMPLE_RECIPE_IMPORT_NOTES },
    });
    await user.click(screen.getByRole("button", { name: /extract recipes/i }));
    await screen.findByText("Walking Tacos");

    await user.click(screen.getByRole("button", { name: /create selected \(2\)/i }));

    await waitFor(() => {
      expect(mockCreateRecipe).toHaveBeenCalledTimes(2);
    });
    expect(mockCreateRecipe).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        title: "Chicken Caesar taco salad",
        ingredients: [
          expect.objectContaining({
            ingredientName: "ground chicken",
            notes: "salted and peppered",
          }),
        ],
      })
    );
    expect(mockCreateRecipe).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        title: "Walking Tacos",
        sourceUrl: "https://www.allrecipes.com/recipe/269613/walking-tacos/",
      })
    );
    expect(navigate).toHaveBeenCalledWith("/app/recipes");
  });
});
