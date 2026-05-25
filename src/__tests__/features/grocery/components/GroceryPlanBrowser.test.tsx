import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroceryPlanBrowser from "../../../../features/grocery/components/GroceryPlanBrowser";
import type { SavedMealPlan } from "../../../../features/meal-plans/types";

// ── Mock the meal-plans API ──────────────────────────────────────────────────

vi.mock("../../../../features/meal-plans/api", () => ({
  listMealPlanSpans: vi.fn().mockResolvedValue([]),
  searchSavedMealPlans: vi.fn().mockResolvedValue([]),
}));

import {
  listMealPlanSpans,
  searchSavedMealPlans,
} from "../../../../features/meal-plans/api";

const mockListSpans = vi.mocked(listMealPlanSpans);
const mockSearch = vi.mocked(searchSavedMealPlans);

// Enough headroom for the 220 ms saved-plans debounce (mock resolves instantly)
const AFTER_DEBOUNCE = { timeout: 1500 };

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SAVED_PLAN: SavedMealPlan = {
  id: "plan-saved-1",
  savedName: "Summer Meals",
  startDate: "2026-06-01",
  endDate: "2026-06-07",
};

const SPAN = {
  id: "plan-span-1",
  startDate: "2026-05-19",
  endDate: "2026-05-25",
};

// ── Helper ────────────────────────────────────────────────────────────────────

function setup({
  onSelectWeek = vi.fn(),
  onSelectSavedPlan = vi.fn(),
} = {}) {
  const user = userEvent.setup();
  render(
    <GroceryPlanBrowser
      onSelectWeek={onSelectWeek}
      onSelectSavedPlan={onSelectSavedPlan}
    />
  );
  return { user, onSelectWeek, onSelectSavedPlan };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GroceryPlanBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListSpans.mockResolvedValue([]);
    mockSearch.mockResolvedValue([]);
  });

  // ── Default state ──────────────────────────────────────────────────────────

  it("is open by default — both tabs are visible without any user interaction", () => {
    setup();
    expect(screen.getByRole("tab", { name: "Past weeks" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Saved plans" })).toBeInTheDocument();
  });

  it("toggle button shows the collapse chevron when open by default", () => {
    setup();
    const toggle = screen.getByRole("button", { name: /browse plans/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  // ── Saved-plans tab: row click ────────────────────────────────────────────

  describe("Saved plans tab", () => {
    async function openSavedTab(
      user: ReturnType<typeof userEvent.setup>,
      plans: SavedMealPlan[] = [SAVED_PLAN]
    ) {
      mockSearch.mockResolvedValue(plans);
      await user.click(screen.getByRole("tab", { name: "Saved plans" }));
      // Wait for the debounced search to resolve and the rows to render
      await waitFor(
        () => expect(screen.getByText(SAVED_PLAN.savedName)).toBeInTheDocument(),
        AFTER_DEBOUNCE
      );
    }

    it("calls onSelectSavedPlan with the plan when a row is clicked", async () => {
      const onSelectSavedPlan = vi.fn();
      const { user } = setup({ onSelectSavedPlan });
      await openSavedTab(user);

      await user.click(screen.getByText(SAVED_PLAN.savedName).closest("button")!);

      expect(onSelectSavedPlan).toHaveBeenCalledOnce();
      expect(onSelectSavedPlan).toHaveBeenCalledWith(SAVED_PLAN);
    });

    it("keeps the panel open after clicking a row", async () => {
      const { user } = setup();
      await openSavedTab(user);

      await user.click(screen.getByText(SAVED_PLAN.savedName).closest("button")!);

      // Tabs are still visible — panel has not collapsed
      expect(screen.getByRole("tab", { name: "Past weeks" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Saved plans" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /browse plans/i })
      ).toHaveAttribute("aria-expanded", "true");
    });

    it("does not close the panel even after multiple row clicks", async () => {
      const plans: SavedMealPlan[] = [
        SAVED_PLAN,
        { id: "plan-2", savedName: "Winter Soups", startDate: "2026-12-01", endDate: null },
      ];
      mockSearch.mockResolvedValue(plans);
      const { user } = setup();
      await user.click(screen.getByRole("tab", { name: "Saved plans" }));
      await waitFor(
        () => expect(screen.getByText("Summer Meals")).toBeInTheDocument(),
        AFTER_DEBOUNCE
      );

      await user.click(screen.getByText("Summer Meals").closest("button")!);
      await user.click(screen.getByText("Winter Soups").closest("button")!);

      expect(screen.getByRole("tab", { name: "Saved plans" })).toBeInTheDocument();
    });
  });

  // ── Past-weeks tab: calendar span click ──────────────────────────────────

  describe("Past weeks tab (calendar)", () => {
    beforeEach(() => {
      mockListSpans.mockResolvedValue([SPAN]);
    });

    it("calls onSelectWeek with the span's startDate when a calendar cell is clicked", async () => {
      const onSelectWeek = vi.fn();
      setup({ onSelectWeek });

      // Wait for the calendar to load the span and auto-navigate to May 2026
      await waitFor(
        () =>
          expect(
            screen.getByRole("gridcell", { name: SPAN.startDate })
          ).toBeInTheDocument(),
        AFTER_DEBOUNCE
      );

      await userEvent.click(
        screen.getByRole("gridcell", { name: SPAN.startDate })
      );

      expect(onSelectWeek).toHaveBeenCalledOnce();
      expect(onSelectWeek).toHaveBeenCalledWith(SPAN.startDate);
    });

    it("keeps the panel open after clicking a calendar span", async () => {
      const { user } = setup();

      await waitFor(
        () =>
          expect(
            screen.getByRole("gridcell", { name: SPAN.startDate })
          ).toBeInTheDocument(),
        AFTER_DEBOUNCE
      );

      await user.click(screen.getByRole("gridcell", { name: SPAN.startDate }));

      expect(screen.getByRole("tab", { name: "Past weeks" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /browse plans/i })
      ).toHaveAttribute("aria-expanded", "true");
    });
  });

  // ── Toggle still works ────────────────────────────────────────────────────

  it("can still be manually collapsed via the toggle button", async () => {
    const { user } = setup();
    // Tabs visible initially (open by default)
    expect(screen.getByRole("tab", { name: "Past weeks" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /browse plans/i }));

    expect(screen.queryByRole("tab", { name: "Past weeks" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /browse plans/i })
    ).toHaveAttribute("aria-expanded", "false");
  });
});
