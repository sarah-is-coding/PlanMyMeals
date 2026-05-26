import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteGroceryList,
  getGroceryList,
  listSavedGroceryLists,
  renameGroceryList,
  toggleGroceryItem,
  uncheckAllGroceryItems,
} from "../api";
import type { GroceryList, GroceryListSummary } from "../types";

type EditState = { id: string; value: string } | null;

export default function SavedGroceryListsPage() {
  // ── List of summaries ───────────────────────────────────────────────────
  const [lists, setLists] = useState<GroceryListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Expanded (view) state ───────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedList, setExpandedList] = useState<GroceryList | null>(null);
  const [loadingExpanded, setLoadingExpanded] = useState(false);
  const [expandError, setExpandError] = useState<string | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [uncheckingId, setUncheckingId] = useState<string | null>(null);

  // ── Rename state ────────────────────────────────────────────────────────
  const [editState, setEditState] = useState<EditState>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // ── Delete state ────────────────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Load summaries ──────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError(null);
    listSavedGroceryLists()
      .then((data) => {
        if (mounted) setLists(data);
      })
      .catch((e) => {
        if (mounted)
          setLoadError(
            e instanceof Error ? e.message : "Failed to load lists."
          );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // ── Load expanded list when expanded id changes ──────────────────────────
  useEffect(() => {
    if (!expandedId) {
      setExpandedList(null);
      return;
    }
    let mounted = true;
    setLoadingExpanded(true);
    setExpandError(null);
    getGroceryList(expandedId)
      .then((list) => {
        if (mounted) setExpandedList(list);
      })
      .catch((e) => {
        if (mounted)
          setExpandError(
            e instanceof Error ? e.message : "Failed to load list."
          );
      })
      .finally(() => {
        if (mounted) setLoadingExpanded(false);
      });
    return () => {
      mounted = false;
    };
  }, [expandedId]);

  // Focus rename input when it appears
  useEffect(() => {
    if (editState) editInputRef.current?.focus();
  }, [editState]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setToggleError(null);
  };

  const handleToggleItem = async (itemId: string, isChecked: boolean) => {
    setTogglingItemId(itemId);
    setToggleError(null);
    try {
      await toggleGroceryItem(itemId, isChecked);
      setExpandedList((prev) => {
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
      setTogglingItemId((id) => (id === itemId ? null : id));
    }
  };

  const handleUncheckAll = async (listId: string) => {
    setUncheckingId(listId);
    try {
      await uncheckAllGroceryItems(listId);
      setExpandedList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) => ({ ...item, isChecked: false })),
        };
      });
    } catch (e) {
      setToggleError(
        e instanceof Error ? e.message : "Failed to reset list."
      );
    } finally {
      setUncheckingId(null);
    }
  };

  const startRename = (list: GroceryListSummary) => {
    setEditState({ id: list.id, value: list.title });
    setRenameError(null);
  };

  const commitRename = () => {
    if (!editState || !editState.value.trim()) return;
    setRenaming(true);
    setRenameError(null);
    renameGroceryList(editState.id, editState.value.trim())
      .then((updated) => {
        setLists((prev) =>
          prev.map((l) => (l.id === updated.id ? updated : l))
        );
        setEditState(null);
        // Update expanded list title if it's the one being renamed
        setExpandedList((prev) => {
          if (!prev || prev.id !== updated.id) return prev;
          return { ...prev, title: updated.title };
        });
      })
      .catch((e) =>
        setRenameError(
          e instanceof Error ? e.message : "Failed to rename."
        )
      )
      .finally(() => setRenaming(false));
  };

  const cancelRename = () => {
    setEditState(null);
    setRenameError(null);
  };

  const handleDelete = (id: string) => {
    setDeleting(true);
    setDeleteError(null);
    deleteGroceryList(id)
      .then(() => {
        setLists((prev) => prev.filter((l) => l.id !== id));
        setConfirmDeleteId(null);
        if (expandedId === id) {
          setExpandedId(null);
          setExpandedList(null);
        }
      })
      .catch((e) =>
        setDeleteError(
          e instanceof Error ? e.message : "Failed to delete list."
        )
      )
      .finally(() => setDeleting(false));
  };

  // ── Helpers ─────────────────────────────────────────────────────────────
  const formatDate = (isoTimestamp: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(isoTimestamp));
  };

  return (
    <section className="workspace-route saved-plans-route">
      <div className="saved-plans-header">
        <Link to="/app/grocery" className="saved-plans-back">
          ← Grocery Lists
        </Link>
        <h1 className="saved-plans-title">Saved Grocery Lists</h1>
      </div>

      {loadError && <p className="error">{loadError}</p>}
      {loading && <p className="saved-plans-empty">Loading…</p>}

      {!loading && lists.length === 0 && !loadError && (
        <div className="saved-plans-empty">
          <p>You haven't saved any grocery lists yet.</p>
          <p className="saved-plans-empty__hint">
            Open the <strong>Grocery Lists</strong> page, build a list, and
            click <em>Save list…</em> to bookmark it here.
          </p>
        </div>
      )}

      {lists.length > 0 && (
        <>
          {deleteError && <p className="error">{deleteError}</p>}
          <ul className="saved-plans-list">
            {lists.map((list) => {
              const isEditing = editState?.id === list.id;
              const isConfirmingDelete = confirmDeleteId === list.id;
              const isExpanded = expandedId === list.id;

              const checkedCount =
                expandedList?.id === list.id
                  ? expandedList.items.filter((i) => i.isChecked).length
                  : 0;
              const totalCount =
                expandedList?.id === list.id ? expandedList.items.length : 0;

              return (
                <li
                  key={list.id}
                  className="saved-grocery-list__item workspace-card"
                >
                  {/* ── Header row ── */}
                  <div className="saved-grocery-list__header">
                    <div className="saved-plans-list__main">
                      {isEditing ? (
                        <div className="saved-plans-list__rename">
                          <input
                            ref={editInputRef}
                            type="text"
                            className="saved-plans-list__rename-input"
                            value={editState.value}
                            maxLength={80}
                            onChange={(e) =>
                              setEditState({
                                id: list.id,
                                value: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename();
                              if (e.key === "Escape") cancelRename();
                            }}
                          />
                          <div className="saved-plans-list__rename-actions">
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={cancelRename}
                              disabled={renaming}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn--primary"
                              onClick={commitRename}
                              disabled={
                                renaming || !editState.value.trim()
                              }
                            >
                              {renaming ? "Saving…" : "Save"}
                            </button>
                          </div>
                          {renameError && (
                            <p className="error">{renameError}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="saved-plans-list__name">
                            {list.title}
                          </span>
                          <span className="saved-plans-list__range">
                            {formatDate(list.createdAt)}
                          </span>
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="saved-grocery-list__actions">
                        <button
                          type="button"
                          className="btn btn--ghost saved-grocery-list__expand-btn"
                          onClick={() => handleToggleExpand(list.id)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? "Hide list ▲" : "View list ▼"}
                        </button>

                        {isConfirmingDelete ? (
                          <>
                            <span className="saved-plans-list__confirm-label">
                              Delete?
                            </span>
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={deleting}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn--danger"
                              onClick={() => handleDelete(list.id)}
                              disabled={deleting}
                            >
                              {deleting ? "Deleting…" : "Confirm delete"}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={() => startRename(list)}
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--danger-ghost"
                              onClick={() => {
                                setConfirmDeleteId(list.id);
                                setDeleteError(null);
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Expanded checklist ── */}
                  {isExpanded && (
                    <div className="saved-grocery-list__detail">
                      {expandError && (
                        <p className="error">{expandError}</p>
                      )}
                      {loadingExpanded && (
                        <p className="saved-plans-empty">Loading…</p>
                      )}

                      {!loadingExpanded && expandedList && (
                        <>
                          <div className="saved-grocery-list__detail-header">
                            <span className="saved-grocery-list__progress">
                              {checkedCount}/{totalCount} checked
                            </span>
                            {checkedCount > 0 && (
                              <button
                                type="button"
                                className="btn btn--ghost saved-grocery-list__uncheck-btn"
                                onClick={() =>
                                  void handleUncheckAll(list.id)
                                }
                                disabled={uncheckingId === list.id}
                              >
                                {uncheckingId === list.id
                                  ? "Resetting…"
                                  : "Uncheck all"}
                              </button>
                            )}
                          </div>

                          {toggleError && (
                            <p className="error">{toggleError}</p>
                          )}

                          {expandedList.items.length === 0 ? (
                            <p className="saved-plans-empty">
                              This list has no items.
                            </p>
                          ) : (
                            <ul
                              className="grocery-item-list"
                              aria-label="Grocery items"
                            >
                              {expandedList.items.map((item) => (
                                <li
                                  key={item.id}
                                  className={`grocery-item${
                                    item.isChecked
                                      ? " grocery-item--checked"
                                      : ""
                                  }`}
                                >
                                  <label className="grocery-item__label">
                                    <input
                                      type="checkbox"
                                      className="grocery-item__checkbox"
                                      checked={item.isChecked}
                                      disabled={togglingItemId === item.id}
                                      onChange={(e) =>
                                        void handleToggleItem(
                                          item.id,
                                          e.target.checked
                                        )
                                      }
                                    />
                                    <span className="grocery-item__name">
                                      {item.ingredientName}
                                    </span>
                                    {(item.quantity || item.unit) && (
                                      <span className="grocery-item__amount">
                                        {[item.quantity, item.unit]
                                          .filter(Boolean)
                                          .join(" ")}
                                      </span>
                                    )}
                                  </label>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
