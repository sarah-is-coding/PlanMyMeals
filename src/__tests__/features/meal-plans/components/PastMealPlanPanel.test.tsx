import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PastMealPlanPanel from "../../../../features/meal-plans/components/PastMealPlanPanel";

// ── Mock the API module ──────────────────────────────────────
vi.mock("../../../../features/meal-plans/api", () => ({
  previewMealPlanWeek: vi.fn(),
  previewSavedMealPlan: vi.fn(),
  saveWeekPlan: vi.fn(),
  searchSavedMealPlans: vi.fn(),
}));

import {
  previewMealPlanWeek,
  previewSavedMealPlan,
  saveWeekPlan,
  searchSavedMealPlans,
} from "../../../../features/meal-plans/api";

const CURRENT_WEEK = "2026-05-25";

function renderPanel(
  overrides: {
    currentWeekHasItems?: boolean;
    onCopyToCurrentWeek?: () => Promise<void>;
    onApplySavedPlan?: () => Promise<void>;
  } = {}
) {
  const onJumpToWeek = vi.fn();
  const onCopyToCurrentWeek = overrides.onCopyToCurrentWeek ?? vi.fn().mockResolvedValue(undefined);
  const onApplySavedPlan = overrides.onApplySavedPlan ?? vi.fn().mockResolvedValue(undefined);

  render(
    <MemoryRouter>
      <PastMealPlanPanel
        currentWeekStartIso={CURRENT_WEEK}
        currentWeekHasItems={overrides.currentWeekHasItems ?? false}
        onJumpToWeek={onJumpToWeek}
        onCopyToCurrentWeek={onCopyToCurrentWeek}
        onApplySavedPlan={onApplySavedPlan}
      />
    </MemoryRouter>
  );
  return { onJumpToWeek, onCopyToCurrentWeek, onApplySavedPlan };
}

describe("PastMealPlanPanel — toggle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a collapsed panel by default", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /browse plans/i })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("expands and shows tabs on click", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /browse plans/i }));
    expect(screen.getByRole("tab", { name: /past weeks/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /saved plans/i })).toBeInTheDocument();
  });

  it("collapses again on second click", () => {
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
    vi.mocked(previewMealPlanWeek).mockResolvedValue([]);
  });

  it("is the default active tab after opening", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /browse plans/i }));
    expect(screen.getByRole("tab", { name: /past weeks/i })).toHaveAttribute("aria-selected", "true");
  });

  it("shows the date picker", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /browse plans/i }));
    expect(screen.getByLabelText(/pick any date/i)).toBeInTheDocument();
  });

  it("shows 'No meals saved' when the preview returns empty", async () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /browse plans/i }));
    fireEvent.change(screen.getByLabelText(/pick any date/i), { target: { value: "2026-05-18" } });
    await waitFor(() =>
      expect(screen.getByText(/no meals saved for this week/i)).toBeInTheDocument(),
    { timeout: 1500 });
  });

  it("shows 'Save as template' when preview has items", async () => {
    vi.mocked(previewMealPlanWeek).mockResolvedValue([
      { dateIso: "2026-05-18", recipes: ["Pasta"] },
    ]);
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /browse plans/i }));
    fireEvent.change(screen.getByLabelText(/pick any date/i), { target: { value: "2026-05-18" } });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save as template/i })).toBeInTheDocument(),
    { timeout: 1500 });
  });

  it("shows save-name input after clicking 'Save as template'", async () => {
    vi.mocked(previewMealPlanWeek).mockResolvedValue([
      { dateIso: "2026-05-18", recipes: ["Pasta"] },
    ]);
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /browse plans/i }));
    fireEvent.change(screen.getByLabelText(/pick any date/i), { target: { value: "2026-05-18" } });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save as template/i })).toBeInTheDocument(),
    { timeout: 1500 });

    fireEvent.click(screen.getByRole("button", { name: /save as template/i }));
    expect(screen.getByPlaceholderText(/template name/i)).toBeInTheDocument();
  });

  it("calls saveWeekPlan and shows confirmation after saving", async () => {
    vi.mocked(previewMealPlanWeek).mockResolvedValue([
      { dateIso: "2026-05-18", recipes: ["Pasta"] },
    ]);
    vi.mocked(saveWeekPlan).mockResolvedValue({
      id: "p1", savedName: "My Plan", startDate: "2026-05-18", endDate: "2026-05-24",
    });

    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /browse plans/i }));
    fireEvent.change(screen.getByLabelText(/pick any date/i), { target: { value: "2026-05-18" } });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save as template/i })).toBeInTheDocument(),
    { timeout: 1500 });

    fireEvent.click(screen.getByRole("button", { name: /save as template/i }));
    fireEvent.change(screen.getByPlaceholderText(/template name/i), { target: { value: "My Plan" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(screen.getByText(/saved as "my plan"/i)).toBeInTheDocument(),
    { timeout: 1500 });
    expect(saveWeekPlan).toHaveBeenCalledWith("2026-05-18", "My Plan");
  });
});

describe("PastMealPlanPanel — Saved plans tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      { id: "p1", savedName: "Healthy Week", startDate: "2026-05-18", endDate: "2026-05-24" },
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

  it("expands a plan to show preview on click", async () => {
    vi.mocked(searchSavedMealPlans).mockResolvedValue([
      { id: "p1", savedName: "Healthy Week", startDate: "2026-05-18", endDate: "2026-05-24" },
    ]);
    vi.mocked(previewSavedMealPlan).mockResolvedValue([
      { dateIso: "2026-05-18", recipes: ["Pasta"] },
    ]);

    openSavedTab();
    await waitFor(() => expect(screen.getByText("Healthy Week")).toBeInTheDocument(), { timeout: 1500 });

    fireEvent.click(screen.getByText("Healthy Week").closest("button")!);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /apply to current week/i })).toBeInTheDocument(),
    { timeout: 1500 });
  });

  it("calls onApplySavedPlan when Apply is clicked", async () => {
    vi.mocked(searchSavedMealPlans).mockResolvedValue([
      { id: "p1", savedName: "Healthy Week", startDate: "2026-05-18", endDate: "2026-05-24" },
    ]);
    vi.mocked(previewSavedMealPlan).mockResolvedValue([
      { dateIso: "2026-05-18", recipes: ["Pasta"] },
    ]);
    const onApplySavedPlan = vi.fn().mockResolvedValue(undefined);

    renderPanel({ onApplySavedPlan });
    fireEvent.click(screen.getByRole("button", { name: /browse plans/i }));
    fireEvent.click(screen.getByRole("tab", { name: /saved plans/i }));

    await waitFor(() => expect(screen.getByText("Healthy Week")).toBeInTheDocument(), { timeout: 1500 });
    fireEvent.click(screen.getByText("Healthy Week").closest("button")!);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /apply to current week/i })).toBeInTheDocument(),
    { timeout: 1500 });

    fireEvent.click(screen.getByRole("button", { name: /apply to current week/i }));
    await waitFor(() =>
      expect(onApplySavedPlan).toHaveBeenCalledWith("p1", "add"),
    { timeout: 1500 });
  });
});
