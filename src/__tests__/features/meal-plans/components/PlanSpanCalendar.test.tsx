import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PlanSpanCalendar from "../../../../features/meal-plans/components/PlanSpanCalendar";
import type { MealPlanSpan } from "../../../../features/meal-plans/types";

// A pair of spans in known months for deterministic navigation tests
const SPANS: MealPlanSpan[] = [
  // most recent (index 0) → calendar should jump to May 2026
  { id: "plan-a", startDate: "2026-05-18", endDate: "2026-05-24" },
  { id: "plan-b", startDate: "2026-04-07", endDate: "2026-04-13" },
];

function renderCalendar(
  overrides: {
    spans?: MealPlanSpan[];
    selectedPlanId?: string | null;
    onSelectPlan?: (id: string | null) => void;
    isLoading?: boolean;
  } = {}
) {
  const onSelectPlan = overrides.onSelectPlan ?? vi.fn();
  render(
    <PlanSpanCalendar
      spans={overrides.spans ?? []}
      selectedPlanId={overrides.selectedPlanId ?? null}
      onSelectPlan={onSelectPlan}
      isLoading={overrides.isLoading ?? false}
    />
  );
  return { onSelectPlan };
}

// ── Static chrome ────────────────────────────────────────────────────────────

describe("PlanSpanCalendar — static chrome", () => {
  it("renders Monday-first weekday headers", () => {
    renderCalendar();
    for (const lbl of ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]) {
      expect(screen.getByText(lbl)).toBeInTheDocument();
    }
  });

  it("renders previous and next month navigation buttons", () => {
    renderCalendar();
    expect(screen.getByRole("button", { name: /previous month/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next month/i })).toBeInTheDocument();
  });

  it("shows the loading indicator when isLoading is true", () => {
    renderCalendar({ isLoading: true });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows 'No meal plans yet' when spans is empty and not loading", () => {
    renderCalendar({ spans: [], isLoading: false });
    expect(screen.getByText(/no meal plans yet/i)).toBeInTheDocument();
  });

  it("does not show the empty-state message when spans exist", async () => {
    renderCalendar({ spans: SPANS });
    await waitFor(() =>
      expect(screen.queryByText(/no meal plans yet/i)).not.toBeInTheDocument()
    );
  });
});

// ── Month navigation ─────────────────────────────────────────────────────────

describe("PlanSpanCalendar — month navigation", () => {
  it("auto-navigates to the most recent span month on first load", async () => {
    renderCalendar({ spans: SPANS });
    // spans[0].startDate is 2026-05-18 → should show May 2026
    await waitFor(() =>
      expect(screen.getByText(/may 2026/i)).toBeInTheDocument(),
    { timeout: 1500 });
  });

  it("navigates to the previous month when ◀ is clicked", async () => {
    renderCalendar({ spans: SPANS });
    // Wait for auto-navigation to May 2026
    await waitFor(() => screen.getByText(/may 2026/i), { timeout: 1500 });

    fireEvent.click(screen.getByRole("button", { name: /previous month/i }));
    expect(screen.getByText(/april 2026/i)).toBeInTheDocument();
  });

  it("navigates to the next month when ▶ is clicked", async () => {
    renderCalendar({ spans: SPANS });
    await waitFor(() => screen.getByText(/may 2026/i), { timeout: 1500 });

    fireEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(screen.getByText(/june 2026/i)).toBeInTheDocument();
  });

  it("wraps from January to December when navigating back", async () => {
    const jan = [{ id: "p1", startDate: "2026-01-05", endDate: "2026-01-11" }];
    renderCalendar({ spans: jan });
    await waitFor(() => screen.getByText(/january 2026/i), { timeout: 1500 });

    fireEvent.click(screen.getByRole("button", { name: /previous month/i }));
    expect(screen.getByText(/december 2025/i)).toBeInTheDocument();
  });

  it("wraps from December to January when navigating forward", async () => {
    const dec = [{ id: "p1", startDate: "2025-12-01", endDate: "2025-12-07" }];
    renderCalendar({ spans: dec });
    await waitFor(() => screen.getByText(/december 2025/i), { timeout: 1500 });

    fireEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(screen.getByText(/january 2026/i)).toBeInTheDocument();
  });
});

// ── Span rendering ───────────────────────────────────────────────────────────

describe("PlanSpanCalendar — span rendering", () => {
  it("marks cells within a span as in-span (clickable)", async () => {
    renderCalendar({ spans: SPANS });
    await waitFor(() => screen.getByText(/may 2026/i), { timeout: 1500 });

    // 2026-05-18 should be in the grid and have the in-span class
    const cell = screen.getByRole("gridcell", { name: "2026-05-18" });
    expect(cell).toHaveClass("plan-cal__day--in-span");
  });

  it("does not mark cells outside any span as in-span", async () => {
    renderCalendar({ spans: SPANS });
    await waitFor(() => screen.getByText(/may 2026/i), { timeout: 1500 });

    // 2026-05-01 is outside all spans
    const cell = screen.getByRole("gridcell", { name: "2026-05-01" });
    expect(cell).not.toHaveClass("plan-cal__day--in-span");
  });
});

// ── Selection behaviour ──────────────────────────────────────────────────────

describe("PlanSpanCalendar — selection", () => {
  it("calls onSelectPlan with the plan id when a span cell is clicked", async () => {
    const { onSelectPlan } = renderCalendar({ spans: SPANS });
    await waitFor(() => screen.getByText(/may 2026/i), { timeout: 1500 });

    fireEvent.click(screen.getByRole("gridcell", { name: "2026-05-20" }));
    expect(onSelectPlan).toHaveBeenCalledWith("plan-a");
  });

  it("calls onSelectPlan(null) when the already-selected plan is clicked", async () => {
    const { onSelectPlan } = renderCalendar({
      spans: SPANS,
      selectedPlanId: "plan-a",
    });
    await waitFor(() => screen.getByText(/may 2026/i), { timeout: 1500 });

    fireEvent.click(screen.getByRole("gridcell", { name: "2026-05-20" }));
    expect(onSelectPlan).toHaveBeenCalledWith(null);
  });

  it("does not call onSelectPlan when a non-span cell is clicked", async () => {
    const { onSelectPlan } = renderCalendar({ spans: SPANS });
    await waitFor(() => screen.getByText(/may 2026/i), { timeout: 1500 });

    fireEvent.click(screen.getByRole("gridcell", { name: "2026-05-01" }));
    expect(onSelectPlan).not.toHaveBeenCalled();
  });

  it("sets aria-selected=true on cells of the selected plan", async () => {
    renderCalendar({ spans: SPANS, selectedPlanId: "plan-a" });
    await waitFor(() => screen.getByText(/may 2026/i), { timeout: 1500 });

    const cell = screen.getByRole("gridcell", { name: "2026-05-18" });
    expect(cell).toHaveAttribute("aria-selected", "true");
  });

  it("sets aria-selected=false on cells of a non-selected plan", async () => {
    renderCalendar({ spans: SPANS, selectedPlanId: "plan-b" });
    await waitFor(() => screen.getByText(/may 2026/i), { timeout: 1500 });

    const cell = screen.getByRole("gridcell", { name: "2026-05-18" });
    expect(cell).toHaveAttribute("aria-selected", "false");
  });
});
