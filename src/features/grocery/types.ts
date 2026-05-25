export type GroceryItem = {
  id: string;
  ingredientName: string;
  quantity: string;
  unit: string;
  isChecked: boolean;
};

export type GroceryList = {
  id: string;
  title: string;
  mealPlanId: string | null;
  createdAt: string;
  items: GroceryItem[];
};

export type GroceryListSummary = {
  id: string;
  title: string;
  mealPlanId: string | null;
  createdAt: string;
};

/** A not-yet-saved ingredient entry produced by the generation step. */
export type GroceryItemDraft = {
  ingredientName: string;
  quantity: string;
  unit: string;
};

/** Which meal plan the grocery page is currently pointed at. */
export type GrocerySource =
  | { kind: "week"; weekStartIso: string }
  | {
      kind: "saved_plan";
      planId: string;
      planLabel: string;
      startDate: string;
      endDate: string | null;
    };
