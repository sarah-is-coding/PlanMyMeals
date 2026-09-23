import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RecipesPage from "../../../../features/recipes/pages/RecipesPage";

vi.mock("../../../../features/recipes/api", () => ({
  listRecipes: vi.fn(),
}));

import { listRecipes } from "../../../../features/recipes/api";

const mockListRecipes = vi.mocked(listRecipes);

const recipes = [
  {
    id: "recipe-1",
    title: "Chicken Caesar Taco Salad",
    description: "Weeknight favorite.",
    prepMinutes: 10,
    cookMinutes: 15,
    tags: [],
    hasSource: false,
    rating: 4,
    createdAt: "2026-05-25T00:00:00Z",
  },
  {
    id: "recipe-2",
    title: "Unrated Soup",
    description: null,
    prepMinutes: null,
    cookMinutes: null,
    tags: [],
    hasSource: false,
    rating: null,
    createdAt: "2026-05-24T00:00:00Z",
  },
];

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/app/recipes"]}>
      <RecipesPage />
    </MemoryRouter>
  );

describe("RecipesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mockListRecipes.mockResolvedValue({ recipes, totalCount: recipes.length });
  });

  it("renders recipe cards and shows the rating only for rated recipes", async () => {
    renderPage();

    await screen.findByText("Chicken Caesar Taco Salad");
    expect(screen.getByText("Unrated Soup")).toBeInTheDocument();

    expect(
      screen.getByRole("img", { name: "Rated 4 out of 5 stars" })
    ).toBeInTheDocument();
  });

  it("re-queries with the selected minimum rating filter", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Chicken Caesar Taco Salad");
    await user.click(screen.getByRole("button", { name: "Filters" }));
    await user.selectOptions(screen.getByLabelText("Minimum rating"), "4");

    await waitFor(() => {
      expect(mockListRecipes).toHaveBeenLastCalledWith(
        "",
        expect.objectContaining({ minRating: 4 }),
        expect.objectContaining({ page: 1 })
      );
    });
  });
});
