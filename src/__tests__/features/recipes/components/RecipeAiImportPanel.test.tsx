import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecipeAiImportPanel from "../../../../features/recipes/components/RecipeAiImportPanel";
import type { ImportedRecipe } from "../../../../features/recipes/importTypes";
import { SAMPLE_RECIPE_IMPORT_NOTES } from "../fixtures/sampleRecipeImportNotes";

vi.mock("../../../../features/recipes/importApi", () => ({
  extractRecipesFromText: vi.fn(),
}));

import { extractRecipesFromText } from "../../../../features/recipes/importApi";

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
    instructions:
      "Season and cook the ground chicken meatballs. Assemble tortillas with lettuce, dressing, parmesan, croutons, and chicken.",
    ingredients: [
      {
        ingredientName: "ground chicken",
        quantity: "",
        unit: "",
        notes: "salted and peppered",
        category: "meat & seafood",
      },
      {
        ingredientName: "tortilla",
        quantity: "",
        unit: "",
        notes: "",
        category: "bakery & bread",
      },
      {
        ingredientName: "parmesan cheese",
        quantity: "",
        unit: "",
        notes: "shredded",
        category: "dairy & eggs",
      },
    ],
    confidence: "medium",
    warnings: ["Instructions were inferred from notes."],
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
  {
    title: "Beef Stew - 4 Servings",
    description: "A scaled beef stew using the user-provided four-serving notes.",
    sourceUrl:
      "https://www.spendwithpennies.com/beef-stew-recipe/#wprm-recipe-container-140827",
    prepMinutes: null,
    cookMinutes: null,
    servings: 4,
    tags: ["dinner", "stew"],
    instructions:
      "Coat beef with flour and seasonings. Brown beef, simmer with broth, vegetables, tomato paste, and rosemary, then thicken with a slurry.",
    ingredients: [
      {
        ingredientName: "stewing beef",
        quantity: "0.8",
        unit: "lb",
        notes: "trimmed and cubed",
        category: "meat & seafood",
      },
      {
        ingredientName: "beef broth",
        quantity: "2.4",
        unit: "cups",
        notes: "",
        category: "pantry",
      },
    ],
    confidence: "high",
    warnings: [],
  },
];

describe("RecipeAiImportPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractRecipesFromText.mockResolvedValue({
      recipes: IMPORTED_RECIPES,
      warnings: ["Could not read one social/video link."],
    });
  });

  it("extracts the sample mixed notes and links and renders returned recipe drafts", async () => {
    const user = userEvent.setup();
    render(
      <RecipeAiImportPanel onUseDraft={vi.fn()} onCreateRecipes={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText(/notes and links/i), {
      target: { value: SAMPLE_RECIPE_IMPORT_NOTES },
    });
    await user.click(screen.getByRole("button", { name: /extract recipes/i }));

    await waitFor(() => {
      expect(mockExtractRecipesFromText).toHaveBeenCalledWith(
        SAMPLE_RECIPE_IMPORT_NOTES
      );
    });

    expect(await screen.findByText("Chicken Caesar taco salad")).toBeInTheDocument();
    expect(screen.getByText("Walking Tacos")).toBeInTheDocument();
    expect(screen.getByText("Beef Stew - 4 Servings")).toBeInTheDocument();
    expect(screen.getAllByText("Has source")).toHaveLength(2);
    expect(screen.getByText("Could not read one social/video link.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create selected \(3\)/i })
    ).toBeEnabled();
  });

  it("creates all selected recipe drafts from the sample import", async () => {
    const user = userEvent.setup();
    const onCreateRecipes = vi.fn().mockResolvedValue(undefined);
    render(
      <RecipeAiImportPanel onUseDraft={vi.fn()} onCreateRecipes={onCreateRecipes} />
    );

    fireEvent.change(screen.getByLabelText(/notes and links/i), {
      target: { value: SAMPLE_RECIPE_IMPORT_NOTES },
    });
    await user.click(screen.getByRole("button", { name: /extract recipes/i }));
    await screen.findByText("Walking Tacos");

    await user.click(screen.getByRole("button", { name: /create selected \(3\)/i }));

    expect(onCreateRecipes).toHaveBeenCalledWith(IMPORTED_RECIPES);
  });

  it("can load one imported recipe into the manual draft form", async () => {
    const user = userEvent.setup();
    const onUseDraft = vi.fn();
    render(
      <RecipeAiImportPanel onUseDraft={onUseDraft} onCreateRecipes={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText(/notes and links/i), {
      target: { value: SAMPLE_RECIPE_IMPORT_NOTES },
    });
    await user.click(screen.getByRole("button", { name: /extract recipes/i }));
    await screen.findByText("Chicken Caesar taco salad");

    await user.click(screen.getAllByRole("button", { name: /use as draft/i })[0]);

    expect(onUseDraft).toHaveBeenCalledWith(IMPORTED_RECIPES[0]);
  });
});
