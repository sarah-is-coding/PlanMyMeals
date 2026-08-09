import { useCallback, useEffect, useRef, useState } from "react";
import type { MealPlannerDay, MealType } from "../types";

export type AddToPlanTargetRecipe = {
  id: string;
  title: string;
  servings: number | null;
};

export function parsePositiveServings(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
}

export function getServingsOverride(
  selectedServings: number | null,
  recipeServings: number | null
): number | null {
  if (recipeServings === null) {
    return selectedServings;
  }
  if (selectedServings === null || selectedServings === recipeServings) {
    return null;
  }
  return selectedServings;
}

type UseAddToPlanPopupOptions = {
  weekDays: MealPlannerDay[];
  defaultDay: string;
  defaultMealType: MealType;
  onAssignRecipe: (
    recipeId: string,
    plannedFor: string,
    mealType: MealType,
    servingsOverride: number | null
  ) => Promise<void>;
};

/** Shared open/close + day-meal-servings draft state and viewport-aware
 *  positioning for the "Add to plan" popup, used from both the meal
 *  planner's recipe search results and standalone recipe pages. */
export function useAddToPlanPopup({
  weekDays,
  defaultDay,
  defaultMealType,
  onAssignRecipe,
}: UseAddToPlanPopupOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  const [pendingRecipeTitle, setPendingRecipeTitle] = useState("");
  const [pendingRecipeServings, setPendingRecipeServings] = useState<number | null>(null);
  const [draftDay, setDraftDay] = useState(defaultDay);
  const [draftMealType, setDraftMealType] = useState<MealType>(defaultMealType);
  const [draftServings, setDraftServings] = useState("");
  const [popupPlacement, setPopupPlacement] = useState<"above" | "below">("above");
  const [popupMaxHeightPx, setPopupMaxHeightPx] = useState<number | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLElement | null>(null);

  const updateLayout = useCallback(() => {
    if (!isOpen || !anchorRef.current || !popupRef.current) {
      return;
    }

    const popupGapPx = 8;
    const viewportPaddingPx = 8;
    const anchorRect = anchorRef.current.getBoundingClientRect();
    const popupHeight = popupRef.current.offsetHeight;
    const spaceAbove = anchorRect.top - viewportPaddingPx;
    const spaceBelow = window.innerHeight - anchorRect.bottom - viewportPaddingPx;

    const nextPlacement =
      spaceAbove >= popupHeight + popupGapPx
        ? "above"
        : spaceBelow >= popupHeight + popupGapPx
          ? "below"
          : spaceBelow > spaceAbove
            ? "below"
            : "above";

    const availableSpace = nextPlacement === "above" ? spaceAbove : spaceBelow;
    const nextMaxHeight = Math.max(0, Math.floor(availableSpace - popupGapPx));

    setPopupPlacement(nextPlacement);
    setPopupMaxHeightPx(nextMaxHeight > 0 ? nextMaxHeight : null);
  }, [isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    setPendingRecipeId(null);
    setPendingRecipeTitle("");
    setPendingRecipeServings(null);
    setDraftDay(defaultDay);
    setDraftMealType(defaultMealType);
    setDraftServings("");
    setPopupMaxHeightPx(null);
  }, [defaultDay, defaultMealType]);

  const open = useCallback(
    (recipe: AddToPlanTargetRecipe) => {
      setPendingRecipeId(recipe.id);
      setPendingRecipeTitle(recipe.title);
      setPendingRecipeServings(recipe.servings);
      setDraftDay(defaultDay || weekDays[0]?.dateIso || "");
      setDraftMealType(defaultMealType);
      setDraftServings(recipe.servings ? String(recipe.servings) : "");
      setPopupPlacement("above");
      setPopupMaxHeightPx(null);
      setIsOpen(true);
    },
    [defaultDay, defaultMealType, weekDays]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      updateLayout();
    });

    const handleViewportChange = () => {
      updateLayout();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, pendingRecipeTitle, updateLayout]);

  const draftServingsValue = parsePositiveServings(draftServings);
  const draftServingsOverride = getServingsOverride(draftServingsValue, pendingRecipeServings);
  const assignmentKey =
    pendingRecipeId && draftDay
      ? `${pendingRecipeId}|${draftDay}|${draftMealType}|${draftServingsOverride ?? "base"}`
      : null;

  const confirm = useCallback(async () => {
    if (!pendingRecipeId || !draftDay) {
      return;
    }

    await onAssignRecipe(pendingRecipeId, draftDay, draftMealType, draftServingsOverride);
    close();
  }, [close, draftDay, draftMealType, draftServingsOverride, onAssignRecipe, pendingRecipeId]);

  return {
    anchorRef,
    popupRef,
    isOpen,
    pendingRecipeId,
    pendingRecipeTitle,
    pendingRecipeServings,
    draftDay,
    setDraftDay,
    draftMealType,
    setDraftMealType,
    draftServings,
    setDraftServings,
    popupPlacement,
    popupMaxHeightPx,
    assignmentKey,
    open,
    close,
    confirm,
  };
}
