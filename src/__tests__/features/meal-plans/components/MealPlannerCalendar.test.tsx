import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import MealPlannerCalendar from "../../../../features/meal-plans/components/MealPlannerCalendar";
import type { MealPlannerDay } from "../../../../features/meal-plans/types";

const weekDays: MealPlannerDay[] = [
  {
    dateIso: "2026-01-05",
    weekdayShort: "Mon",
    monthDayLabel: "Jan 5",
    fullLabel: "Monday, January 5",
  },
  {
    dateIso: "2026-01-06",
    weekdayShort: "Tue",
    monthDayLabel: "Jan 6",
    fullLabel: "Tuesday, January 6",
  },
];

const noop = async () => {};

function LocationProbe() {
  const location = useLocation();
  return <p>state: {JSON.stringify(location.state)}</p>;
}

const renderCalendar = () =>
  render(
    <MemoryRouter initialEntries={["/app/meal-plans"]}>
      <Routes>
        <Route
          path="/app/meal-plans"
          element={
            <MealPlannerCalendar
              weekLabel="Jan 5 - Jan 11, 2026"
              weekDays={weekDays}
              items={[]}
              removingItemId={null}
              movingItemId={null}
              updatingServingsItemId={null}
              onShiftWeek={() => {}}
              onJumpToCurrentWeek={() => {}}
              onMoveItem={noop}
              onUpdateItemServings={noop}
              onRemoveItem={noop}
            />
          }
        />
        <Route path="/app/recipes" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );

describe("MealPlannerCalendar", () => {
  it("shows a Search recipes link on every slot", () => {
    renderCalendar();

    const dinnerSlot = screen.getByRole("region", { name: "Dinner on Monday, January 5" });
    expect(within(dinnerSlot).getByRole("link", { name: "Search recipes" })).toBeInTheDocument();

    const breakfastSlot = screen.getByRole("region", { name: "Breakfast on Tuesday, January 6" });
    expect(
      within(breakfastSlot).getByRole("link", { name: "Search recipes" })
    ).toBeInTheDocument();
  });

  it("navigates to the recipe search page carrying the slot's date and meal type", async () => {
    const user = userEvent.setup();
    renderCalendar();

    const dinnerSlot = screen.getByRole("region", { name: "Dinner on Monday, January 5" });
    await user.click(within(dinnerSlot).getByRole("link", { name: "Search recipes" }));

    expect(
      await screen.findByText(
        `state: ${JSON.stringify({ mealSlot: { date: "2026-01-05", mealType: "dinner" } })}`
      )
    ).toBeInTheDocument();
  });
});
