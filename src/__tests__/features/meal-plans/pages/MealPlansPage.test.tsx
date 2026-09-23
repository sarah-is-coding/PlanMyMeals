import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MealPlansPage from "../../../../features/meal-plans/pages/MealPlansPage";
import { createDateFromIso, getWeekStartIso } from "../../../../features/meal-plans/dateUtils";

vi.mock("../../../../features/meal-plans/api", () => ({
  listMealPlanItemsForWeek: vi.fn().mockResolvedValue([]),
  applySavedMealPlan: vi.fn(),
  clearWeekPlan: vi.fn(),
  deleteMealPlanItem: vi.fn(),
  moveMealPlanItem: vi.fn(),
  updateMealPlanItemServings: vi.fn(),
  listMealPlanSpans: vi.fn().mockResolvedValue([]),
  previewSavedMealPlan: vi.fn(),
  savePlanById: vi.fn(),
  searchSavedMealPlans: vi.fn().mockResolvedValue([]),
}));

import { listMealPlanItemsForWeek } from "../../../../features/meal-plans/api";

const mockListMealPlanItemsForWeek = vi.mocked(listMealPlanItemsForWeek);

const renderPage = (initialEntries: Parameters<typeof MemoryRouter>[0]["initialEntries"]) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <MealPlansPage />
    </MemoryRouter>
  );

describe("MealPlansPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mockListMealPlanItemsForWeek.mockResolvedValue([]);
  });

  it("jumps to the week containing an incoming jumpToDate", async () => {
    const jumpToDate = "2026-03-18";
    const expectedWeekStartIso = getWeekStartIso(createDateFromIso(jumpToDate));

    renderPage([{ pathname: "/app/meal-plans", state: { jumpToDate } }]);

    await waitFor(() => {
      expect(mockListMealPlanItemsForWeek).toHaveBeenCalledWith(expectedWeekStartIso);
    });
  });

  it("falls back to the current week when there is no jumpToDate", async () => {
    const expectedWeekStartIso = getWeekStartIso(new Date());

    renderPage(["/app/meal-plans"]);

    await waitFor(() => {
      expect(mockListMealPlanItemsForWeek).toHaveBeenCalledWith(expectedWeekStartIso);
    });
  });
});
