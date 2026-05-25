import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RecipeGeneratePage from "../../../../features/recipes/pages/RecipeGeneratePage";
import type { ImportedRecipe } from "../../../../features/recipes/importTypes";

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
  generateRecipesFromPrompt: vi.fn(),
}));

import { createRecipe } from "../../../../features/recipes/api";
import { generateRecipesFromPrompt } from "../../../../features/recipes/importApi";

const mockCreateRecipe = vi.mocked(createRecipe);
const mockGenerateRecipesFromPrompt = vi.mocked(generateRecipesFromPrompt);

const GENERATED_RECIPES: ImportedRecipe[] = [
  {
    title: "Chickpea Naan Wraps",
    description: "A quick vegetarian wrap with spiced chickpeas.",
    sourceUrl: null,
    prepMinutes: 10,
    cookMinutes: 15,
    servings: 4,
    tags: ["vegetarian", "quick"],
    instructions: "1. Cook chickpeas.\n2. Assemble wraps.",
    ingredients: [
      {
        ingredientName: "chickpeas",
        quantity: "2",
        unit: "cups",
        notes: "drained",
        category: "pantry",
      },
    ],
    confidence: "high",
    warnings: [],
  },
  {
    title: "Lemony Chickpea Rice Bowls",
    description: "A bright rice bowl with vegetables and chickpeas.",
    sourceUrl: null,
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 4,
    tags: ["vegetarian", "dinner"],
    instructions: "1. Cook rice.\n2. Top with chickpeas and vegetables.",
    ingredients: [
      {
        ingredientName: "rice",
        quantity: "1",
        unit: "cup",
        notes: "",
        category: "pantry",
      },
    ],
    confidence: "high",
    warnings: [],
  },
];

describe("RecipeGeneratePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateRecipesFromPrompt.mockResolvedValue({
      recipes: GENERATED_RECIPES,
      warnings: [],
    });
    mockCreateRecipe
      .mockResolvedValueOnce("recipe-1")
      .mockResolvedValueOnce("recipe-2");
  });

  it("generates and creates selected recipes", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RecipeGeneratePage />
      </MemoryRouter>
    );

    const prompt = "Generate 2 quick vegetarian dinners with chickpeas.";
    fireEvent.change(screen.getByLabelText(/recipe request/i), {
      target: { value: prompt },
    });
    await user.click(screen.getByRole("button", { name: /generate recipes/i }));
    await screen.findByText("Chickpea Naan Wraps");

    expect(mockGenerateRecipesFromPrompt).toHaveBeenCalledWith(prompt);

    await user.click(screen.getByRole("button", { name: /create selected \(2\)/i }));

    await waitFor(() => {
      expect(mockCreateRecipe).toHaveBeenCalledTimes(2);
    });
    expect(mockCreateRecipe).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ title: "Chickpea Naan Wraps" })
    );
    expect(mockCreateRecipe).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ title: "Lemony Chickpea Rice Bowls" })
    );
    expect(navigate).toHaveBeenCalledWith("/app/recipes");
  });
});
