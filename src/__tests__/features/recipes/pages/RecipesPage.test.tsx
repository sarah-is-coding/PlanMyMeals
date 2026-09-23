import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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

function RecipeDetailLocationProbe() {
  const location = useLocation();
  return <p>state: {JSON.stringify(location.state)}</p>;
}

const renderPageWithMealSlot = () =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/app/recipes",
          state: { mealSlot: { date: "2026-01-05", mealType: "dinner" } },
        },
      ]}
    >
      <Routes>
        <Route path="/app/recipes" element={<RecipesPage />} />
        <Route path="/app/recipes/:recipeId" element={<RecipeDetailLocationProbe />} />
      </Routes>
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

  it("shows a banner and forwards the meal slot when arriving from a meal slot search link", async () => {
    const expectedDateLabel = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(2026, 0, 5));

    const user = userEvent.setup();
    renderPageWithMealSlot();

    await screen.findByText("Chicken Caesar Taco Salad");
    expect(screen.getByText(`${expectedDateLabel} · Dinner`)).toBeInTheDocument();

    await user.click(screen.getByText("Chicken Caesar Taco Salad"));

    expect(
      await screen.findByText(
        `state: ${JSON.stringify({
          from: "meal-planner",
          mealSlot: { date: "2026-01-05", mealType: "dinner" },
        })}`
      )
    ).toBeInTheDocument();
  });

  it("clears the meal slot banner without leaving the search page when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderPageWithMealSlot();

    await screen.findByText("Chicken Caesar Taco Salad");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Picking a recipe for", { exact: false })).not.toBeInTheDocument();
    expect(screen.getByText("Chicken Caesar Taco Salad")).toBeInTheDocument();
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
