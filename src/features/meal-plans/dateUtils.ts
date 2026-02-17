import type { MealPlannerDay } from "./types";

const weekdayShortFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});
const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});
const monthDayYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function createDateFromIso(isoDate: string): Date {
  const [yearPart, monthPart, dayPart] = isoDate.split("-").map(Number);
  return new Date(yearPart, monthPart - 1, dayPart);
}

function addDays(date: Date, dayOffset: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + dayOffset);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekStartIso(referenceDate: Date = new Date()): string {
  const day = referenceDate.getDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  return toIsoDate(addDays(referenceDate, offsetToMonday));
}

export function getWeekEndIso(weekStartIso: string): string {
  return toIsoDate(addDays(createDateFromIso(weekStartIso), 6));
}

export function shiftWeekStartIso(weekStartIso: string, weekOffset: number): string {
  return toIsoDate(addDays(createDateFromIso(weekStartIso), weekOffset * 7));
}

export function getWeekDays(weekStartIso: string): MealPlannerDay[] {
  const weekStartDate = createDateFromIso(weekStartIso);

  return Array.from({ length: 7 }, (_, index) => {
    const currentDate = addDays(weekStartDate, index);
    return {
      dateIso: toIsoDate(currentDate),
      weekdayShort: weekdayShortFormatter.format(currentDate),
      monthDayLabel: monthDayFormatter.format(currentDate),
      fullLabel: fullDateFormatter.format(currentDate),
    };
  });
}

export function formatWeekRangeLabel(weekStartIso: string): string {
  const weekStartDate = createDateFromIso(weekStartIso);
  const weekEndDate = addDays(weekStartDate, 6);
  return `${monthDayYearFormatter.format(weekStartDate)} - ${monthDayYearFormatter.format(weekEndDate)}`;
}
