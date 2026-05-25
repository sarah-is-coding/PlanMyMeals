import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PastMealPlanPanel from "../../../../features/meal-plans/components/PastMealPlanPanel";

// ── Mock the API module ──────────────────────────────────────
vi.mock("../../../../features/meal-plans/api", () => ({
  listMealPlanSpans: vi.fn(),
  previewSavedMealPlan: vi.fn(),
  savePlanById: vi.fn(),
  searchSavedMealPlans: vi.fn(),
}));

// Mock PlanSpanCalendar so we can trigger plan selection without
// needing to simulate full calendar rendering and date math.
vi.mock("../../../../features/meal-plans/components/PlanSpanCalendar", () => ({
  default: ({
    onSelectPlan,
    selectedPlanId,
  }: {
    spans: unknown[];
    selectedPlanId: string | null;
    onSelectPlan: (id: string | null) => void;
    isLoading: boolean;
  }) => (
    <div data-testid="plan-span-calendar">
      <button type="button" onClick={() => onSelectPlan("plan-1")}>
        Select Plan 1
      </button>
      {selectedPlanId && (
        <button type="button" onClick={() => onSelectPlan(null)}>
          Deselect
        </button>
      )}
    </div>
  ),
}));

import {
  listMealPlanSpans,
  previewSavedMealPlan,
  savePlanById,
  searchSavedMealPlans,
} from "../../../../features/meal-plans/api";

const CURRENT_WEEK = "2026-05-25";

const SPANS = [
  { id: "plan-1", startDate: "2026-05-18", endDate: "2026-05-24" },
];

function renderPanel(
  overrides: {
    currentWeekHasItems?: boolean;
    onApplyPlan?: () => Promise<void>;
  } = {}
) {
  const onJumpToWeek = vi.fn();
  const onApplyPlan = overrides.onApplyPlan ?? vi.fn().mockResolvedValue(undefined);

  render(
    <MemoryRouter>
      <PastMealPlanPanel
        currentWeekStartIso={CURRENT_WEEK}
        currentWeekHasItems={overrides.currentWeekHasItems ?? false}
        onJumpToWeek={onJumpToWeek}
        onApplyPlan={onApplyPlan}
      />
    </MemoryRouter>
  );
  return { onJumpToWeek, onApplyPlan };
}

describe("PastMealPlanPanel — toggle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a collapsed panel by default", () => {
    vi.mocked(listMealPlanSpans).mockResolvedValue([]);
    renderPanel();
    expect(screen.getByRole("button", { name: /browse plans/i })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("expands and shows both tabs on click", async () => {
    vi.mocked(listMealPlanSpans).mockResolvedValue([]);
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /browse plans/i }));
    expect(screen.getByRole("tab", { name: /past weeks/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /saved plans/i })).toBeInTheDocument();
  });

  it("collapses again on second click", () => {
    vi.mocked(listMealPlanSpans).mockResolvedValue([]);
    renderPanel();
    const toggle = screen.getByRole("button", { name: /browse plans/i });
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });
});

describe("PastMealPlanPanel — Past weeks tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listMealPlanSpans).mockResolvedValue(SPANS);
    vi.mocked(previewSavedMealPlan).mockResolvedValue([]);
  });

  function openPastTab() {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /browse plans/i }));
    // Past weeks is the default tab
  }

  it("is the default active tab", () => {
    openPastTab();
    expect(screen.getByRole("tab", { name: /past weeks/i })).toHaveAttribute("aria-selected", "true");
  });

  it("renders the PlanSpanCalendar", () => {
    openPastTab();
    expect(screen.getByTestId("plan-span-calendar")).toBeInTheDocument();
  });

  it("shows 'No meals in this plan' when preview is empty after selecting", async () => {
    openPastTab();
    fireEvent.click(screen.getByRole("button", { name: /select plan 1/i }));
    await waitFor(() =>
      expect(screen.getByText(/no meals in this plan/i)).toBeInTheDocument(),
    { timeout: 1500 });
  });

  it("shows meal preview rows when a plan has items", async () => {
    vi.mocked(previewSavedMealPlan).mockResolvedValue([
      { dateIso: "2026-05-18", recipes: ["Pasta"] },
    ]);
    openPastTab();
    fireEvent.click(screen.getByRole("button", { name: /select plan 1/i }));
    await waitFor(() =>
      expect(screen.getByText(/Pasta/)).toBeInTheDocument(),
    { timeout: 1500 });
  });

  it("shows 'Copy to current week' when plan has items", async () => {
    vi.mocked(previewSavedMealPlan).mockResolvedValue([
      { dateIso: "2026-05-18", recipes: ["Pasta"] },
    ]);
    openPastTab();
    fireEvent.click(screen.getByRole("button", { name: /select plan 1/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /copy to current week/i })).toBeInTheDocument(),
    { timeout: 1500 });
  });

  it("calls onApplyPlan with 'add' when Copy is clicked and current week is empty", async () => {
    vi.mocked(previewSavedMealPlan).mockResolvedValue([
      { dateIso: "2026-05-18", recipes: ["Pasta"] },
    ]);
    const onApplyPlan = vi.fn().mockResolvedValue(undefined);
    renderPanel({ onApplyPlan });
    fireEvent.click(screen.getByRole("button", { name: /browse plans/i }));
    fireEvent.click(screen.getByRole("button", { name: /select plan 1/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /copy to current week/i })).toBeInTheDocument(),
    { timeout: 1500 });
    fireEvent.click(screen.getByRole("button", { name: /copy to current week/i }));
    await waitFor(() =>
      expect(onApplyPlan).toHaveBeenCalledWith("plan-1", "add"),
    { timeout: 1500 });
  });

  it("shows confirm dialog when current week has items and Copy is clicked", async () => {
    vi.mocked(previewSavedMealPlan).mockResolvedValue([
      { dateIso: "2026-05-18", recipes: ["Pasta"] },
    ]);
    renderPanel({ currentWeekHasItems: true });
    fireEvent.click(screen.getByRole("button", { name: /browse plans/i }));
    fireEvent.click(screen.getByRole("button", { name: /select plan 1/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /copy to current week/i })).toBeInTheDocument(),
    { timeout: 1500 });
    fireEvent.click(screen.getByRole("button", { name: /copy to current week/i }));
    expect(screen.getByRole("button", { name: /replace existing/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add on top/i })).toBeInTheDocument();
  });

  it("shows Save-as-template input and calls savePlanById", async () => {
    vi.mocked(previewSavedMealPlan).mockResolvedValue([
      { dateIso: "2026-05-18", recipes: ["Pasta"] },
    ]);
    vi.mocked(savePlanById).mockResolvedValue({
      id: "plan-1", savedName: "My Plan", startDate: "2026-05-18", endDate: "2026-05-24",
    });

    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /browse plans/i }));
    fireEvent.click(screen.getByRole("button", { name: /select plan 1/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save as meal plan/i })).toBeInTheDocument(),
    { timeout: 1500 });

    fireEvent.click(screen.getByRole("button", { name: /save as meal plan/i }));
    fireEvent.change(screen.getByPlaceholderText(/meal plan name/i), {
      target: { value: "My Plan" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(screen.getByText(/saved as "my plan"/i)).toBeInTheDocument(),
    { timeout: 1500 });
    expect(savePlanById).toHaveBeenCalledWith("plan-1", "My Plan");
  });
});

describe("PastMealPlanPanel — Saved plans tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listMealPlanSpans).mockResolvedValue([]);
    vi.mocked(searchSavedMealPlans).mockResolvedValue([]);
  });

  function openSavedTab() {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /browse plans/i }));
    fireEvent.click(screen.getByRole("tab", { name: /saved plans/i }));
  }

  it("switches to the saved plans tab", () => {
    openSavedTab();
    expect(screen.getByRole("tab", { name: /saved plans/i })).toHaveAttribute("aria-selected", "true");
  });

  it("shows search input on saved plans tab", () => {
    openSavedTab();
    expect(screen.getByPlaceholderText(/search saved plans/i)).toBeInTheDocument();
  });

  it("shows 'No saved plans yet' when the list is empty", async () => {
    openSavedTab();
    await waitFor(() =>
      expect(screen.getByText(/no saved plans yet/i)).toBeInTheDocument(),
    { timeout: 1500 });
  });

  it("renders plan names returned by searchSavedMealPlans", async () => {
    vi.mocked(searchSavedMealPlans).mockResolvedValue([
      { id: "sp1", savedName: "Healthy Week", startDate: "2026-05-18", endDate: "2026-05-24" },
    ]);
    openSavedTab();
    await waitFor(() =>
      expect(screen.getByText("Healthy Week")).toBeInTheDocument(),
    { timeout: 1500 });
  });

  it("filters by search input value", async () => {
    openSavedTab();
    fireEvent.change(screen.getByPlaceholderText(/search saved plans/i), {
      target: { value: "vegan" },
    });
    await waitFor(() =>
      expect(searchSavedMealPlans).toHaveBeenCalledWith("vegan"),
    { timeout: 1500 });
  });

  it("calls onApplyPlan when Apply is clicked on a saved plan", async () => {
    vi.mocked(searchSavedMealPlans).mockResolvedValue([
      { id: "sp1", savedName: "Healthy Week", startDate: "2026-05-18", endDate: "2026-05-24" },
    ]);
    vi.mocked(previewSavedMealPlan).mockResolvedValue([
      { dateIso: "2026-05-18", recipes: ["Pasta"] },
    ]);
    const onApplyPlan = vi.fn().mockResolvedValue(undefined);
    renderPanel({ onApplyPlan });
    fireEvent.click(screen.getByRole("button", { name: /browse plans/i }));
    fireEvent.click(screen.getByRole("tab", { name: /saved plans/i }));

    await waitFor(() => expect(screen.getByText("Healthy Week")).toBeInTheDocument(), { timeout: 1500 });
    fireEvent.click(screen.getByText("Healthy Week").closest("button")!);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /apply to current week/i })).toBeInTheDocument(),
    { timeout: 1500 });

    fireEvent.click(screen.getByRole("button", { name: /apply to current week/i }));
    await waitFor(() =>
      expect(onApplyPlan).toHaveBeenCalledWith("sp1", "add"),
    { timeout: 1500 });
  });
});
