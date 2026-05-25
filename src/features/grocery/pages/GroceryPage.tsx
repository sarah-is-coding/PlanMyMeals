import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  buildGroceryItemsForPlan,
  buildGroceryItemsForWeek,
  saveGroceryList,
  toggleGroceryItem,
} from "../api";
import GroceryPlanBrowser from "../components/GroceryPlanBrowser";
import type { GroceryItemDraft, GroceryList, GrocerySource } from "../types";
import { formatDateRange, formatWeekRangeLabel, getWeekStartIso, shiftWeekStartIso } from "../../meal-plans/dateUtils";
import type { SavedMealPlan } from "../../meal-plans/types";

export default function GroceryPage() {
  const currentWeekStartIso = useMemo(() => getWeekStartIso(new Date()), []);

  // ── Source (which plan to generate from) ─────────────────────────────────
  const [source, setSource] = useState<GrocerySource>({
    kind: "week",
    weekStartIso: currentWeekStartIso,
  });

  // ── Generation state ──────────────────────────────────────────────────────
  const [draftItems, setDraftItems] = useState<GroceryItemDraft[] | null>(null);
  const [draftMealPlanId, setDraftMealPlanId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Local checkbox state for unsaved draft list (index-keyed)
  const [localChecked, setLocalChecked] = useState(new Set<number>());

  // ── Saved list state ───────────────────────────────────────────────────────
  const [savedList, setSavedList] = useState<GroceryList | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // ── Save form ─────────────────────────────────────────────────────────────
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);

  // ── Derived values ────────────────────────────────────────────────────────
  const isOnCurrentWeek =
    source.kind === "week" && source.weekStartIso === currentWeekStartIso;

  const sourceLabel = useMemo(() => {
    if (source.kind === "week") return formatWeekRangeLabel(source.weekStartIso);
    return source.planLabel;
  }, [source]);

  const sourceDateRange = useMemo(() => {
    if (source.kind === "week") return null;
    return formatDateRange(
      source.startDate,
      source.endDate ?? source.startDate
    );
  }, [source]);

  const defaultSaveTitle = useMemo(() => {
    if (source.kind === "week") {
      return `Grocery – ${formatWeekRangeLabel(source.weekStartIso)}`;
    }
    return `Grocery – ${source.planLabel}`;
  }, [source]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function clearList() {
    setDraftItems(null);
    setDraftMealPlanId(null);
    setSavedList(null);
    setLocalChecked(new Set());
    setShowSaveForm(false);
    setGenerateError(null);
  }

  const handleSelectWeek = (weekStartIso: string) => {
    setSource({ kind: "week", weekStartIso });
    clearList();
  };

  const handleSelectSavedPlan = (plan: SavedMealPlan) => {
    setSource({
      kind: "saved_plan",
      planId: plan.id,
      planLabel: plan.savedName,
      startDate: plan.startDate,
      endDate: plan.endDate,
    });
    clearList();
  };

  const handleShiftWeek = (offset: number) => {
    if (source.kind !== "week") return;
    setSource((prev) => {
      if (prev.kind !== "week") return prev;
      return {
        kind: "week",
        weekStartIso: shiftWeekStartIso(prev.weekStartIso, offset),
      };
    });
    clearList();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    setDraftItems(null);
    setSavedList(null);
    setLocalChecked(new Set());
    setShowSaveForm(false);

    try {
      if (source.kind === "week") {
        const { items, planId } = await buildGroceryItemsForWeek(
          source.weekStartIso
        );
        setDraftItems(items);
        setDraftMealPlanId(planId);
      } else {
        const items = await buildGroceryItemsForPlan(source.planId);
        setDraftItems(items);
        setDraftMealPlanId(source.planId);
      }
    } catch (e) {
      setGenerateError(
        e instanceof Error ? e.message : "Failed to generate grocery list."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenSaveForm = () => {
    setSaveTitle(defaultSaveTitle);
    setShowSaveForm(true);
    // Focus the input after render
    window.setTimeout(() => saveInputRef.current?.focus(), 0);
  };

  const handleSave = async () => {
    if (!draftItems || !saveTitle.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const list = await saveGroceryList(
        saveTitle.trim(),
        draftMealPlanId,
        draftItems
      );
      setSavedList(list);
      setDraftItems(null);
      setShowSaveForm(false);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Failed to save grocery list."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSavedItem = async (
    itemId: string,
    isChecked: boolean
  ) => {
    setTogglingId(itemId);
    setToggleError(null);
    try {
      await toggleGroceryItem(itemId, isChecked);
      setSavedList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId ? { ...item, isChecked } : item
          ),
        };
      });
    } catch (e) {
      setToggleError(
        e instanceof Error ? e.message : "Failed to update item."
      );
    } finally {
      setTogglingId((id) => (id === itemId ? null : id));
    }
  };

  const handleLocalToggle = (idx: number) => {
    setLocalChecked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  // ── Display items: DB-backed when saved, local-state when draft ────────────
  const hasList = savedList !== null || draftItems !== null;

  const displayItems = savedList
    ? savedList.items
    : (draftItems ?? []).map((item, idx) => ({
        id: String(idx),
        ...item,
        isChecked: localChecked.has(idx),
      }));

  const checkedCount = displayItems.filter((i) => i.isChecked).length;
  const totalCount = displayItems.length;

  return (
    <section className="workspace-route grocery-route">
      {/* Header */}
      <article className="workspace-card grocery-route__header">
        <div className="grocery-route__title-row">
          <h1>Grocery Lists</h1>
          <Link
            to="/app/saved-grocery-lists"
            className="grocery-route__manage-link"
          >
            Manage saved lists →
          </Link>
        </div>
      </article>

      <div className="grocery-layout">
        {/* ── Left/top: source selector ── */}
        <div className="grocery-source">
          <article className="workspace-card grocery-source__card">
            <h2 className="grocery-source__heading">Plan</h2>

            {source.kind === "week" ? (
              <div className="grocery-source__week-nav">
                <button
                  type="button"
                  className="btn btn--ghost grocery-source__nav-btn"
                  onClick={() => handleShiftWeek(-1)}
                  aria-label="Previous week"
                >
                  ←
                </button>
                <span className="grocery-source__week-label">
                  {sourceLabel}
                </span>
                <button
                  type="button"
                  className="btn btn--ghost grocery-source__nav-btn"
                  onClick={() => handleShiftWeek(1)}
                  aria-label="Next week"
                >
                  →
                </button>
                {!isOnCurrentWeek && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => handleSelectWeek(currentWeekStartIso)}
                  >
                    This week
                  </button>
                )}
              </div>
            ) : (
              <div className="grocery-source__plan-info">
                <p className="grocery-source__plan-name">{sourceLabel}</p>
                {sourceDateRange && (
                  <p className="grocery-source__plan-range">
                    {sourceDateRange}
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => handleSelectWeek(currentWeekStartIso)}
                >
                  ← Back to weeks
                </button>
              </div>
            )}

            <GroceryPlanBrowser
              onSelectWeek={handleSelectWeek}
              onSelectSavedPlan={handleSelectSavedPlan}
            />

            <button
              type="button"
              className="btn btn--primary"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? "Building…" : "Build Grocery List"}
            </button>

            {generateError && (
              <p className="error grocery-route__error">{generateError}</p>
            )}
          </article>
        </div>

        {/* ── Right/main: grocery list ── */}
        <div className="grocery-list-area">
          {!hasList && !generating && (
            <article className="workspace-card grocery-empty-state">
              <p>
                Select a week or saved plan above, then click{" "}
                <strong>Build Grocery List</strong> to generate your shopping
                list.
              </p>
            </article>
          )}

          {hasList && (
            <article className="workspace-card grocery-list">
              <div className="grocery-list__header">
                <div className="grocery-list__title-group">
                  <h2 className="grocery-list__title">
                    {savedList
                      ? savedList.title
                      : `Grocery List · ${sourceLabel}`}
                  </h2>
                  {totalCount > 0 && (
                    <span className="grocery-list__count">
                      {checkedCount}/{totalCount} checked
                    </span>
                  )}
                </div>

                <div className="grocery-list__actions">
                  {!savedList &&
                    draftItems !== null &&
                    draftItems.length > 0 &&
                    !showSaveForm && (
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={handleOpenSaveForm}
                      >
                        Save list…
                      </button>
                    )}
                  {savedList && (
                    <Link
                      to="/app/saved-grocery-lists"
                      className="btn btn--ghost"
                    >
                      Manage saved lists
                    </Link>
                  )}
                </div>
              </div>

              {showSaveForm && (
                <div className="grocery-save-form">
                  <input
                    ref={saveInputRef}
                    type="text"
                    className="grocery-save-form__input"
                    placeholder="List name"
                    value={saveTitle}
                    maxLength={80}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSave();
                      if (e.key === "Escape") setShowSaveForm(false);
                    }}
                  />
                  <div className="grocery-save-form__actions">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setShowSaveForm(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => void handleSave()}
                      disabled={saving || !saveTitle.trim()}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                  {saveError && <p className="error">{saveError}</p>}
                </div>
              )}

              {savedList && (
                <p className="grocery-list__saved-badge">
                  ✓ Saved — you can find this list under{" "}
                  <Link
                    to="/app/saved-grocery-lists"
                    className="grocery-list__saved-link"
                  >
                    Manage saved lists
                  </Link>
                  .
                </p>
              )}

              {toggleError && <p className="error">{toggleError}</p>}

              {displayItems.length === 0 ? (
                <p className="grocery-list__empty">
                  No ingredients found for this plan. Make sure your recipes
                  have ingredients added.
                </p>
              ) : (
                <ul className="grocery-item-list" aria-label="Grocery items">
                  {displayItems.map((item, idx) => {
                    const isDB = savedList !== null;
                    return (
                      <li
                        key={item.id}
                        className={`grocery-item${
                          item.isChecked ? " grocery-item--checked" : ""
                        }`}
                      >
                        <label className="grocery-item__label">
                          <input
                            type="checkbox"
                            className="grocery-item__checkbox"
                            checked={item.isChecked}
                            disabled={
                              isDB ? togglingId === item.id : false
                            }
                            onChange={(e) => {
                              if (isDB) {
                                void handleToggleSavedItem(
                                  item.id,
                                  e.target.checked
                                );
                              } else {
                                handleLocalToggle(idx);
                              }
                            }}
                          />
                          <span className="grocery-item__name">
                            {item.ingredientName}
                          </span>
                          {(item.quantity || item.unit) && (
                            <span className="grocery-item__amount">
                              {[item.quantity, item.unit]
                                .filter(Boolean)
                                .join(" ")}
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
