import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import SavedMealPlansPage from "../../../../features/meal-plans/pages/SavedMealPlansPage";

vi.mock("../../../../features/meal-plans/api", () => ({
  listSavedMealPlans: vi.fn(),
  renameSavedMealPlan: vi.fn(),
  deleteSavedMealPlan: vi.fn(),
}));

import {
  listSavedMealPlans,
  renameSavedMealPlan,
  deleteSavedMealPlan,
} from "../../../../features/meal-plans/api";

const PLANS = [
  { id: "p1", savedName: "Healthy Week", startDate: "2026-05-18", endDate: "2026-05-24" },
  { id: "p2", savedName: "Vegan Week", startDate: "2026-05-11", endDate: "2026-05-17" },
];

function renderPage() {
  render(
    <MemoryRouter>
      <SavedMealPlansPage />
    </MemoryRouter>
  );
}

describe("SavedMealPlansPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listSavedMealPlans).mockResolvedValue(PLANS);
  });

  it("renders the page heading", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /saved meal plans/i })).toBeInTheDocument(),
    { timeout: 1500 });
  });

  it("shows a link back to meal plans", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /← meal plans/i })).toBeInTheDocument();
  });

  it("shows loading text initially", () => {
    vi.mocked(listSavedMealPlans).mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders saved plan names after loading", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Healthy Week")).toBeInTheDocument(), { timeout: 1500 });
    expect(screen.getByText("Vegan Week")).toBeInTheDocument();
  });

  it("shows empty state when there are no saved plans", async () => {
    vi.mocked(listSavedMealPlans).mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/haven't saved any meal plans/i)).toBeInTheDocument(),
    { timeout: 1500 });
  });

  it("shows an error message when loading fails", async () => {
    vi.mocked(listSavedMealPlans).mockRejectedValue(new Error("Network error"));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Network error")).toBeInTheDocument(),
    { timeout: 1500 });
  });

  // ── Rename ────────────────────────────────────────────────────────
  describe("rename", () => {
    it("shows a rename input when Rename is clicked", async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText("Healthy Week")).toBeInTheDocument(), { timeout: 1500 });

      const renameButtons = screen.getAllByRole("button", { name: /rename/i });
      fireEvent.click(renameButtons[0]);

      expect(screen.getByDisplayValue("Healthy Week")).toBeInTheDocument();
    });

    it("calls renameSavedMealPlan and updates the list", async () => {
      vi.mocked(renameSavedMealPlan).mockResolvedValue({
        id: "p1", savedName: "Super Week", startDate: "2026-05-18", endDate: "2026-05-24",
      });

      renderPage();
      await waitFor(() => expect(screen.getByText("Healthy Week")).toBeInTheDocument(), { timeout: 1500 });

      fireEvent.click(screen.getAllByRole("button", { name: /rename/i })[0]);
      const input = screen.getByDisplayValue("Healthy Week");
      fireEvent.change(input, { target: { value: "Super Week" } });
      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

      await waitFor(() =>
        expect(screen.getByText("Super Week")).toBeInTheDocument(),
      { timeout: 1500 });
      expect(renameSavedMealPlan).toHaveBeenCalledWith("p1", "Super Week");
    });

    it("cancels rename on Escape key", async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText("Healthy Week")).toBeInTheDocument(), { timeout: 1500 });

      fireEvent.click(screen.getAllByRole("button", { name: /rename/i })[0]);
      const input = screen.getByDisplayValue("Healthy Week");
      fireEvent.keyDown(input, { key: "Escape" });

      expect(screen.queryByDisplayValue("Healthy Week")).not.toBeInTheDocument();
      expect(screen.getByText("Healthy Week")).toBeInTheDocument();
    });
  });

  // ── Delete ────────────────────────────────────────────────────────
  describe("delete", () => {
    it("shows confirmation buttons after clicking Delete", async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText("Healthy Week")).toBeInTheDocument(), { timeout: 1500 });

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByRole("button", { name: /confirm delete/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("cancels deletion when Cancel is clicked", async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText("Healthy Week")).toBeInTheDocument(), { timeout: 1500 });

      fireEvent.click(screen.getAllByRole("button", { name: /delete/i })[0]);
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(screen.queryByRole("button", { name: /confirm delete/i })).not.toBeInTheDocument();
    });

    it("calls deleteSavedMealPlan and removes the plan from the list", async () => {
      vi.mocked(deleteSavedMealPlan).mockResolvedValue(undefined);

      renderPage();
      await waitFor(() => expect(screen.getByText("Healthy Week")).toBeInTheDocument(), { timeout: 1500 });

      fireEvent.click(screen.getAllByRole("button", { name: /delete/i })[0]);
      fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }));

      await waitFor(() =>
        expect(screen.queryByText("Healthy Week")).not.toBeInTheDocument(),
      { timeout: 1500 });
      expect(deleteSavedMealPlan).toHaveBeenCalledWith("p1");
    });
  });
});
