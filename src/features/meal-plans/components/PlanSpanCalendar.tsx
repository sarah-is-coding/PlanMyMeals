import { useEffect, useMemo, useRef, useState } from "react";
import { toIsoDate } from "../dateUtils";
import type { MealPlanSpan } from "../types";

// ── Colour palette ────────────────────────────────────────────────────────
// Each plan gets a stable colour derived from its UUID.

const PALETTE = [
  { bg: "rgba(20,184,166,0.20)",  sel: "rgba(20,184,166,0.42)" },  // teal
  { bg: "rgba(249,115,22,0.20)",  sel: "rgba(249,115,22,0.42)" },  // orange
  { bg: "rgba(59,130,246,0.20)",  sel: "rgba(59,130,246,0.42)" },  // blue
  { bg: "rgba(139,92,246,0.20)",  sel: "rgba(139,92,246,0.42)" },  // purple
  { bg: "rgba(16,185,129,0.20)",  sel: "rgba(16,185,129,0.42)" },  // green
  { bg: "rgba(244,63,94,0.20)",   sel: "rgba(244,63,94,0.42)" },   // rose
];

function colorForPlan(planId: string) {
  let h = 0;
  for (let i = 0; i < planId.length; i++) {
    h = (h * 31 + planId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
}

// ── Local-time date helpers ───────────────────────────────────────────────

function isoToLocal(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDaysLocal(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

/** Monday-first day-of-week: 0 = Mon … 6 = Sun */
function monFirstDow(date: Date): number {
  return (date.getDay() + 6) % 7;
}

// ── Month grid builder ────────────────────────────────────────────────────

type DayCell = {
  dateIso: string;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  planId: string | null;
  /** Round the left edge of the band (span start, or first day of week). */
  bandLeft: boolean;
  /** Round the right edge of the band (span end, or last day of week). */
  bandRight: boolean;
};

function buildMonthCells(
  year: number,
  month: number, // 0-indexed
  spans: MealPlanSpan[],
  todayIso: string
): DayCell[] {
  // Build a map dateIso → first matching span (handles rare overlap; newest span wins
  // since spans are ordered desc by start_date).
  const dateToSpan = new Map<string, MealPlanSpan>();
  for (let i = spans.length - 1; i >= 0; i--) {
    const span = spans[i];
    let d = isoToLocal(span.startDate);
    const end = isoToLocal(span.endDate);
    while (d <= end) {
      dateToSpan.set(toIsoDate(d), span);
      d = addDaysLocal(d, 1);
    }
  }

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Pad to Monday of the first week and Sunday of the last week
  const calStart = addDaysLocal(firstOfMonth, -monFirstDow(firstOfMonth));
  const calEnd = addDaysLocal(lastOfMonth, 6 - monFirstDow(lastOfMonth));

  const cells: DayCell[] = [];
  let d = new Date(calStart);
  while (d <= calEnd) {
    const iso = toIsoDate(d);
    const span = dateToSpan.get(iso) ?? null;
    const dow = monFirstDow(d); // 0 = Mon, 6 = Sun

    let bandLeft = false;
    let bandRight = false;
    if (span) {
      bandLeft = iso === span.startDate || dow === 0;
      bandRight = iso === span.endDate || dow === 6;
    }

    cells.push({
      dateIso: iso,
      dayNum: d.getDate(),
      isCurrentMonth: d.getMonth() === month,
      isToday: iso === todayIso,
      planId: span?.id ?? null,
      bandLeft,
      bandRight,
    });

    d = addDaysLocal(d, 1);
  }

  return cells;
}

// ── Component ─────────────────────────────────────────────────────────────

type Props = {
  spans: MealPlanSpan[];
  selectedPlanId: string | null;
  onSelectPlan: (planId: string | null) => void;
  isLoading: boolean;
};

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const monthYearFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export default function PlanSpanCalendar({
  spans,
  selectedPlanId,
  onSelectPlan,
  isLoading,
}: Props) {
  const todayIso = toIsoDate(new Date());
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const autoNavigatedRef = useRef(false);

  // On first spans load, jump to the month of the most recent plan
  useEffect(() => {
    if (autoNavigatedRef.current || spans.length === 0) return;
    autoNavigatedRef.current = true;
    const [y, m] = spans[0].startDate.split("-").map(Number);
    setViewYear(y);
    setViewMonth(m - 1); // 0-indexed
  }, [spans]);

  const monthLabel = useMemo(
    () => monthYearFmt.format(new Date(viewYear, viewMonth)),
    [viewYear, viewMonth]
  );

  const cells = useMemo(
    () => buildMonthCells(viewYear, viewMonth, spans, todayIso),
    [viewYear, viewMonth, spans, todayIso]
  );

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else { setViewMonth((m) => m - 1); }
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else { setViewMonth((m) => m + 1); }
  };

  return (
    <div className="plan-cal">
      <div className="plan-cal__header">
        <button
          type="button"
          className="plan-cal__nav"
          onClick={prevMonth}
          aria-label="Previous month"
        >
          ◀
        </button>
        <span className="plan-cal__month-label">{monthLabel}</span>
        <button
          type="button"
          className="plan-cal__nav"
          onClick={nextMonth}
          aria-label="Next month"
        >
          ▶
        </button>
      </div>

      <div className="plan-cal__weekdays" aria-hidden="true">
        {WEEKDAY_LABELS.map((lbl) => (
          <span key={lbl} className="plan-cal__weekday">{lbl}</span>
        ))}
      </div>

      <div className="plan-cal__grid" role="grid" aria-label={monthLabel}>
        {cells.map((cell) => {
          const colors = cell.planId ? colorForPlan(cell.planId) : null;
          const isSelected = cell.planId !== null && cell.planId === selectedPlanId;
          const bandColor = colors
            ? isSelected ? colors.sel : colors.bg
            : "transparent";

          const cls = [
            "plan-cal__day",
            !cell.isCurrentMonth && "plan-cal__day--other-month",
            cell.isToday       && "plan-cal__day--today",
            cell.planId        && "plan-cal__day--in-span",
            isSelected         && "plan-cal__day--selected",
            cell.bandLeft      && "plan-cal__day--band-left",
            cell.bandRight     && "plan-cal__day--band-right",
          ].filter(Boolean).join(" ");

          return (
            <div
              key={cell.dateIso}
              role="gridcell"
              className={cls}
              onClick={() => {
                if (!cell.planId) return;
                onSelectPlan(cell.planId === selectedPlanId ? null : cell.planId);
              }}
              aria-label={cell.dateIso}
              aria-selected={isSelected}
            >
              <span
                className="plan-cal__day-band"
                style={{ background: bandColor }}
                aria-hidden="true"
              />
              <span className="plan-cal__day-num">{cell.dayNum}</span>
            </div>
          );
        })}
      </div>

      {isLoading && <p className="plan-cal__status">Loading…</p>}
      {!isLoading && spans.length === 0 && (
        <p className="plan-cal__status">
          No meal plans yet — add meals to see them here.
        </p>
      )}
    </div>
  );
}
