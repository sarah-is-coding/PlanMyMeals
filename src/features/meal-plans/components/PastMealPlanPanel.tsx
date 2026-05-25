import { useEffect, useRef, useState } from "react";
import {
  previewMealPlanWeek,
  previewSavedMealPlan,
  saveWeekPlan,
  searchSavedMealPlans,
} from "../api";
import { formatWeekRangeLabel, getWeekDays, getWeekStartIso } from "../dateUtils";
import type { MealPlanDayPreview, SavedMealPlan } from "../types";

type CopyMode = "add" | "replace";
type PanelTab = "past" | "saved";

type Props = {
  currentWeekStartIso: string;
  currentWeekHasItems: boolean;
  onJumpToWeek: (weekStartIso: string) => void;
  onCopyToCurrentWeek: (sourceWeekStartIso: string, mode: CopyMode) => Promise<void>;
  onApplySavedPlan: (planId: string, mode: CopyMode) => Promise<void>;
};

// ── Past-weeks tab ────────────────────────────────────────────────────────

function PastWeeksTab({
  currentWeekStartIso,
  currentWeekHasItems,
  onJumpToWeek,
  onCopyToCurrentWeek,
}: Omit<Props, "onApplySavedPlan">) {
  const [pickedDate, setPickedDate] = useState("");
  const [previewWeekStart, setPreviewWeekStart] = useState<string | null>(null);
  const [preview, setPreview] = useState<MealPlanDayPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Save-plan state
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pickedDate) {
      setPreviewWeekStart(null);
      setPreview([]);
      setIsEmpty(false);
      return;
    }

    const [year, month, day] = pickedDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekStart = getWeekStartIso(date);
    setPreviewWeekStart(weekStart);
    setCopyDone(false);
    setShowConfirm(false);
    setShowSaveInput(false);
    setSaveError(null);
    setSavedLabel(null);

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
        if (mounted) setError(e instanceof Error ? e.message : "Failed to load plan.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => { mounted = false; };
  }, [pickedDate]);

  useEffect(() => {
    if (showSaveInput) saveInputRef.current?.focus();
  }, [showSaveInput]);

  const weekDays = previewWeekStart ? getWeekDays(previewWeekStart) : [];
  const weekLabel = previewWeekStart ? formatWeekRangeLabel(previewWeekStart) : null;
  const isCurrentWeek = previewWeekStart === currentWeekStartIso;
  const previewByDate = new Map(preview.map((p) => [p.dateIso, p.recipes]));

  const executeCopy = (mode: CopyMode) => {
    if (!previewWeekStart) return;
    setShowConfirm(false);
    setCopying(true);
    setCopyDone(false);
    onCopyToCurrentWeek(previewWeekStart, mode)
      .then(() => setCopyDone(true))
      .catch(() => { /* parent surfaces the error */ })
      .finally(() => setCopying(false));
  };

  const handleCopyClick = () => {
    if (!previewWeekStart || isEmpty) return;
    if (currentWeekHasItems) {
      setShowConfirm(true);
    } else {
      executeCopy("add");
    }
  };

  const handleSaveSubmit = () => {
    if (!previewWeekStart || !saveName.trim()) return;
    setSaving(true);
    setSaveError(null);
    saveWeekPlan(previewWeekStart, saveName.trim())
      .then((saved) => {
        setSavedLabel(`Saved as "${saved.savedName}"`);
        setShowSaveInput(false);
        setSaveName("");
      })
      .catch((e) => setSaveError(e instanceof Error ? e.message : "Failed to save plan."))
      .finally(() => setSaving(false));
  };

  return (
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

          {/* Save-as-template flow */}
          {!isEmpty && !showSaveInput && !savedLabel && (
            <button
              type="button"
              className="btn btn--ghost past-plan-panel__save-btn"
              onClick={() => setShowSaveInput(true)}
            >
              Save as template…
            </button>
          )}
          {!isEmpty && savedLabel && (
            <p className="past-plan-panel__save-done">✓ {savedLabel}</p>
          )}
          {showSaveInput && (
            <div className="past-plan-panel__save-form">
              <input
                ref={saveInputRef}
                type="text"
                className="past-plan-panel__save-input"
                placeholder="Template name"
                value={saveName}
                maxLength={80}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveSubmit();
                  if (e.key === "Escape") { setShowSaveInput(false); setSaveName(""); }
                }}
              />
              <div className="past-plan-panel__actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => { setShowSaveInput(false); setSaveName(""); }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={saving || !saveName.trim()}
                  onClick={handleSaveSubmit}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
              {saveError && <p className="error">{saveError}</p>}
            </div>
          )}

          {/* Copy-to-current-week flow */}
          {showConfirm && (
            <div className="past-plan-panel__confirm">
              <p className="past-plan-panel__confirm-label">
                Current week already has meals. What would you like to do?
              </p>
              <div className="past-plan-panel__actions">
                <button type="button" className="btn btn--ghost" onClick={() => executeCopy("add")}>
                  Add on top
                </button>
                <button type="button" className="btn btn--primary" onClick={() => executeCopy("replace")}>
                  Replace existing
                </button>
              </div>
            </div>
          )}

          {!showConfirm && (
            <div className="past-plan-panel__actions">
              {!isCurrentWeek && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => { if (previewWeekStart) onJumpToWeek(previewWeekStart); }}
                >
                  View week ↗
                </button>
              )}
              {!isEmpty && (
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={copying || copyDone}
                  onClick={handleCopyClick}
                >
                  {copying ? "Copying…" : copyDone ? "✓ Copied" : "Copy to current week"}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Saved-plans tab ───────────────────────────────────────────────────────

function SavedPlansTab({
  currentWeekHasItems,
  onApplySavedPlan,
}: {
  currentWeekHasItems: boolean;
  onApplySavedPlan: (planId: string, mode: CopyMode) => Promise<void>;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<SavedMealPlan[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<SavedMealPlan | null>(null);
  const [preview, setPreview] = useState<MealPlanDayPreview[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [applying, setApplying] = useState(false);
  const [applyDone, setApplyDone] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Debounced search
  useEffect(() => {
    setLoadingList(true);
    setListError(null);
    const id = window.setTimeout(async () => {
      try {
        const data = await searchSavedMealPlans(searchInput);
        setResults(data);
      } catch (e) {
        setListError(e instanceof Error ? e.message : "Failed to load saved plans.");
      } finally {
        setLoadingList(false);
      }
    }, 220);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  // Load preview when a plan is selected
  useEffect(() => {
    if (!selectedPlan) {
      setPreview([]);
      return;
    }
    let mounted = true;
    setLoadingPreview(true);
    setPreviewError(null);
    setApplyDone(false);
    setShowConfirm(false);
    previewSavedMealPlan(selectedPlan.id)
      .then((items) => { if (mounted) setPreview(items); })
      .catch((e) => { if (mounted) setPreviewError(e instanceof Error ? e.message : "Failed to load preview."); })
      .finally(() => { if (mounted) setLoadingPreview(false); });
    return () => { mounted = false; };
  }, [selectedPlan]);

  const executeApply = (mode: CopyMode) => {
    if (!selectedPlan) return;
    setShowConfirm(false);
    setApplying(true);
    setApplyDone(false);
    onApplySavedPlan(selectedPlan.id, mode)
      .then(() => setApplyDone(true))
      .catch(() => { /* parent surfaces error */ })
      .finally(() => setApplying(false));
  };

  const handleApplyClick = () => {
    if (!selectedPlan) return;
    if (currentWeekHasItems) {
      setShowConfirm(true);
    } else {
      executeApply("add");
    }
  };

  const handleSelectPlan = (plan: SavedMealPlan) => {
    setSelectedPlan((prev) => (prev?.id === plan.id ? null : plan));
    setApplyDone(false);
    setShowConfirm(false);
  };

  // Date-range display for a saved plan preview
  const previewDays = selectedPlan
    ? (() => {
        const sorted = preview.map((p) => p.dateIso).sort();
        return sorted;
      })()
    : [];

  const previewByDate = new Map(preview.map((p) => [p.dateIso, p.recipes]));

  return (
    <div className="past-plan-panel__body">
      <div className="past-plan-panel__search-row">
        <input
          type="search"
          className="past-plan-panel__search-input"
          placeholder="Search saved plans…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {listError && <p className="error">{listError}</p>}
      {loadingList && <p className="past-plan-panel__status">Loading…</p>}

      {!loadingList && results.length === 0 && (
        <p className="past-plan-panel__status">
          {searchInput.trim() ? "No saved plans match." : "No saved plans yet."}
        </p>
      )}

      {results.length > 0 && (
        <ul className="saved-plan-list">
          {results.map((plan) => {
            const isSelected = selectedPlan?.id === plan.id;
            return (
              <li key={plan.id} className="saved-plan-list__item">
                <button
                  type="button"
                  className={`saved-plan-list__btn${isSelected ? " saved-plan-list__btn--active" : ""}`}
                  onClick={() => handleSelectPlan(plan)}
                  aria-expanded={isSelected}
                >
                  <span className="saved-plan-list__name">{plan.savedName}</span>
                  <span className="saved-plan-list__range">
                    {formatWeekRangeLabel(plan.startDate)}
                  </span>
                  <span className="saved-plan-list__chevron" aria-hidden="true">
                    {isSelected ? "▲" : "▼"}
                  </span>
                </button>

                {isSelected && (
                  <div className="saved-plan-list__detail">
                    {previewError && <p className="error">{previewError}</p>}
                    {loadingPreview && <p className="past-plan-panel__status">Loading preview…</p>}

                    {!loadingPreview && preview.length === 0 && !previewError && (
                      <p className="past-plan-panel__status">No meals in this plan.</p>
                    )}

                    {!loadingPreview && preview.length > 0 && (
                      <div className="past-plan-panel__preview past-plan-panel__preview--compact">
                        {previewDays.map((dateIso) => {
                          const recipes = previewByDate.get(dateIso) ?? [];
                          // Show weekday name derived from the saved date
                          const [y, m, d] = dateIso.split("-").map(Number);
                          const dayLabel = new Intl.DateTimeFormat("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          }).format(new Date(y, m - 1, d));
                          return (
                            <div key={dateIso} className="past-plan-panel__day">
                              <span className="past-plan-panel__day-label">{dayLabel}</span>
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

                    {showConfirm && (
                      <div className="past-plan-panel__confirm">
                        <p className="past-plan-panel__confirm-label">
                          Current week already has meals. What would you like to do?
                        </p>
                        <div className="past-plan-panel__actions">
                          <button type="button" className="btn btn--ghost" onClick={() => executeApply("add")}>
                            Add on top
                          </button>
                          <button type="button" className="btn btn--primary" onClick={() => executeApply("replace")}>
                            Replace existing
                          </button>
                        </div>
                      </div>
                    )}

                    {!showConfirm && (
                      <div className="past-plan-panel__actions">
                        <button
                          type="button"
                          className="btn btn--primary"
                          disabled={applying || applyDone}
                          onClick={handleApplyClick}
                        >
                          {applying
                            ? "Applying…"
                            : applyDone
                              ? "✓ Applied"
                              : "Apply to current week"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────

export default function PastMealPlanPanel({
  currentWeekStartIso,
  currentWeekHasItems,
  onJumpToWeek,
  onCopyToCurrentWeek,
  onApplySavedPlan,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>("past");

  return (
    <article className="workspace-card past-plan-panel">
      <button
        type="button"
        className="past-plan-panel__toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="past-plan-panel__toggle-label">Browse plans</span>
        <span className="past-plan-panel__chevron" aria-hidden="true">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="past-plan-panel__tabs" role="tablist">
            <button
              role="tab"
              type="button"
              aria-selected={activeTab === "past"}
              className={`past-plan-panel__tab${activeTab === "past" ? " past-plan-panel__tab--active" : ""}`}
              onClick={() => setActiveTab("past")}
            >
              Past weeks
            </button>
            <button
              role="tab"
              type="button"
              aria-selected={activeTab === "saved"}
              className={`past-plan-panel__tab${activeTab === "saved" ? " past-plan-panel__tab--active" : ""}`}
              onClick={() => setActiveTab("saved")}
            >
              Saved plans
            </button>
          </div>

          {activeTab === "past" ? (
            <PastWeeksTab
              currentWeekStartIso={currentWeekStartIso}
              currentWeekHasItems={currentWeekHasItems}
              onJumpToWeek={onJumpToWeek}
              onCopyToCurrentWeek={onCopyToCurrentWeek}
            />
          ) : (
            <SavedPlansTab
              currentWeekHasItems={currentWeekHasItems}
              onApplySavedPlan={onApplySavedPlan}
            />
          )}
        </>
      )}
    </article>
  );
}
