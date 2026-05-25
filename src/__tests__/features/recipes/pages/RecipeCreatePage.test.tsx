import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RecipeCreatePage from "../../../../features/recipes/pages/RecipeCreatePage";

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

vi.mock("../../../../features/ingredients/api", () => ({
  createIngredient: vi.fn().mockResolvedValue({
    id: "ingredient-1",
    name: "ground chicken",
    category: "meat & seafood",
    defaultUnit: null,
  }),
  searchIngredients: vi.fn().mockResolvedValue([]),
}));

import { createRecipe } from "../../../../features/recipes/api";

const mockCreateRecipe = vi.mocked(createRecipe);

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/app/recipes/new"]}>
      <Routes>
        <Route path="/app/recipes/new" element={<RecipeCreatePage />} />
      </Routes>
    </MemoryRouter>
  );

describe("RecipeCreatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRecipe.mockResolvedValue("recipe-1");
  });

  it("shows a sticky save button and submits the create form", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^title$/i), "Chicken Caesar Taco Salad");

    const saveButtons = screen.getAllByRole("button", { name: "Save Recipe" });
    expect(saveButtons).toHaveLength(2);

    await user.click(saveButtons[1]);

    await waitFor(() => {
      expect(mockCreateRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Chicken Caesar Taco Salad",
        })
      );
    });
    expect(navigate).toHaveBeenCalledWith("/app/recipes/recipe-1");
  });
});
