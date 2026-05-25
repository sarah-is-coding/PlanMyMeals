import { useEffect, useState } from "react";
import { previewMealPlanWeek } from "../api";
import { formatWeekRangeLabel, getWeekDays, getWeekStartIso } from "../dateUtils";
import type { MealPlanDayPreview } from "../types";

type Props = {
  currentWeekStartIso: string;
  onJumpToWeek: (weekStartIso: string) => void;
  onCopyToCurrentWeek: (sourceWeekStartIso: string) => Promise<void>;
};

export default function PastMealPlanPanel({
  currentWeekStartIso,
  onJumpToWeek,
  onCopyToCurrentWeek,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickedDate, setPickedDate] = useState("");
  const [previewWeekStart, setPreviewWeekStart] = useState<string | null>(null);
  const [preview, setPreview] = useState<MealPlanDayPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  useEffect(() => {
    if (!pickedDate) {
      setPreviewWeekStart(null);
      setPreview([]);
      setIsEmpty(false);
      return;
    }

    // Parse the date input value (YYYY-MM-DD) as local time to avoid UTC drift
    const [year, month, day] = pickedDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekStart = getWeekStartIso(date);
    setPreviewWeekStart(weekStart);
    setCopyDone(false);

    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      setIsEmpty(false);
      try {
        const items = await previewMealPlanWeek(weekStart);
        if (mounted) {
          setPreview(items);
          setIsEmpty(items.length === 0);
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Failed to load plan.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [pickedDate]);

  const weekDays = previewWeekStart ? getWeekDays(previewWeekStart) : [];
  const weekLabel = previewWeekStart ? formatWeekRangeLabel(previewWeekStart) : null;
  const isCurrentWeek = previewWeekStart === currentWeekStartIso;
  const previewByDate = new Map(preview.map((p) => [p.dateIso, p.recipes]));

  return (
    <article className="workspace-card past-plan-panel">
      <button
        type="button"
        className="past-plan-panel__toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="past-plan-panel__toggle-label">Browse past weeks</span>
        <span className="past-plan-panel__chevron" aria-hidden="true">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div className="past-plan-panel__body">
          <label className="recipe-field">
            <span>Pick any date in that week</span>
            <input
              type="date"
              value={pickedDate}
              onChange={(event) => setPickedDate(event.target.value)}
            />
          </label>

          {weekLabel && !loading && (
            <p className="past-plan-panel__week-label">
              {weekLabel}
              {isCurrentWeek && (
                <span className="past-plan-panel__current-badge">current</span>
              )}
            </p>
          )}

          {error && <p className="error">{error}</p>}
          {loading && <p className="past-plan-panel__status">Loading…</p>}

          {!loading && previewWeekStart && (
            <>
              {isEmpty ? (
                <p className="past-plan-panel__status">No meals saved for this week.</p>
              ) : (
                <div className="past-plan-panel__preview">
                  {weekDays.map((day) => {
                    const recipes = previewByDate.get(day.dateIso) ?? [];
                    return (
                      <div key={day.dateIso} className="past-plan-panel__day">
                        <span className="past-plan-panel__day-label">
                          {day.weekdayShort} {day.monthDayLabel}
                        </span>
                        {recipes.length === 0 ? (
                          <span className="past-plan-panel__day-empty">—</span>
                        ) : (
                          <span className="past-plan-panel__day-recipes">
                            {recipes.join(" · ")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="past-plan-panel__actions">
                {!isCurrentWeek && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      if (previewWeekStart) onJumpToWeek(previewWeekStart);
                    }}
                  >
                    View week ↗
                  </button>
                )}
                {!isEmpty && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={copying || copyDone}
                    onClick={() => {
                      if (!previewWeekStart) return;
                      setCopying(true);
                      setCopyDone(false);
                      onCopyToCurrentWeek(previewWeekStart)
                        .then(() => setCopyDone(true))
                        .catch(() => {/* parent surfaces the error */})
                        .finally(() => setCopying(false));
                    }}
                  >
                    {copying
                      ? "Copying…"
                      : copyDone
                        ? "✓ Copied to current week"
                        : "Copy to current week"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </article>
  );
}
