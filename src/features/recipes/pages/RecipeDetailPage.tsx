import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import LoadingModal from "../../../components/feedback/LoadingModal";
import AddToPlanButton from "../../meal-plans/components/AddToPlanButton";
import type { MealType } from "../../meal-plans/types";
import RecipeFormFields from "../components/RecipeFormFields";
import RecipeReadArticle from "../components/RecipeReadArticle";
import StarRating from "../components/StarRating";
import { deleteRecipe, getRecipeById, rateRecipe, updateRecipe } from "../api";
import {
  createEmptyIngredient,
  mapRecipeDetailToFormValues,
  mapRecipeFormValuesToInput,
  type RecipeFormValues,
} from "../utils/recipeForm";
import { scaleRecipeFormIngredientQuantities } from "../utils/ingredientScaling";

type RecipeFieldName = Exclude<keyof RecipeFormValues, "ingredients">;
type RecipeIngredientFieldName = "quantity" | "unit" | "notes";
type RecipeDetailLocationState = {
  from?: "meal-planner";
  mealPlanItemId?: string;
  initialServings?: number | null;
  mealSlot?: { date: string; mealType: MealType };
};

const parseServingsValue = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = typeof value === "number" ? String(value) : value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
};

export default function RecipeDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { recipeId } = useParams();
  const locationState = (location.state ?? null) as RecipeDetailLocationState | null;
  const isFromMealPlanner = locationState?.from === "meal-planner";
  const backTo = isFromMealPlanner ? "/app/meal-plans" : "/app/recipes";
  const backLabel = isFromMealPlanner ? "Back to Meal Planner" : "Back to Recipes";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<RecipeFormValues | null>(null);
  const [snapshot, setSnapshot] = useState<RecipeFormValues | null>(null);
  const [viewServings, setViewServings] = useState<number | null>(null);
  const [editScaleBaseServings, setEditScaleBaseServings] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [savingRating, setSavingRating] = useState(false);

  useEffect(() => {
    if (!recipeId) {
      setError("Recipe id is missing.");
      setLoading(false);
      return;
    }

    let mounted = true;

    const run = async () => {
      setLoading(true);
      setError(null);
      setMessage(null);
      setEditing(false);

      try {
        const recipe = await getRecipeById(recipeId);
        if (!mounted) {
          return;
        }

        if (!recipe) {
          setFormValues(null);
          setSnapshot(null);
          setViewServings(null);
          setEditScaleBaseServings(null);
          setRating(null);
          setLoading(false);
          return;
        }

        const nextValues = mapRecipeDetailToFormValues(recipe);
        const recipeBaseServings = parseServingsValue(nextValues.servings);
        const initialServingsFromMealPlan = parseServingsValue(locationState?.initialServings);

        setFormValues(nextValues);
        setSnapshot(nextValues);
        setViewServings(initialServingsFromMealPlan ?? recipeBaseServings);
        setEditScaleBaseServings(recipeBaseServings);
        setRating(recipe.rating);
      } catch (fetchError) {
        if (mounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load recipe."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [location.key, locationState?.initialServings, recipeId]);

  const handleFieldChange = (field: RecipeFieldName, value: string) => {
    setFormValues((previousValues) =>
      previousValues ? { ...previousValues, [field]: value } : previousValues
    );
  };

  const handleIngredientChange = (
    ingredientId: string,
    field: RecipeIngredientFieldName,
    value: string
  ) => {
    setFormValues((previousValues) =>
      previousValues
        ? {
            ...previousValues,
            ingredients: previousValues.ingredients.map((ingredient) =>
              ingredient.id === ingredientId
                ? { ...ingredient, [field]: value }
                : ingredient
            ),
          }
        : previousValues
    );
  };

  const handleIngredientSelect = (
    rowId: string,
    ingredientId: string,
    name: string
  ) => {
    setFormValues((previousValues) =>
      previousValues
        ? {
            ...previousValues,
            ingredients: previousValues.ingredients.map((ingredient) =>
              ingredient.id === rowId
                ? { ...ingredient, ingredientId, ingredientName: name }
                : ingredient
            ),
          }
        : previousValues
    );
  };

  const handleAddIngredient = () => {
    setFormValues((previousValues) =>
      previousValues
        ? {
            ...previousValues,
            ingredients: [...previousValues.ingredients, createEmptyIngredient()],
          }
        : previousValues
    );
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    setFormValues((previousValues) =>
      previousValues
        ? {
            ...previousValues,
            ingredients: previousValues.ingredients.filter(
              (ingredient) => ingredient.id !== ingredientId
            ),
          }
        : previousValues
    );
  };

  const handleCancelEdit = () => {
    if (snapshot) {
      setFormValues(snapshot);
      setEditScaleBaseServings(parseServingsValue(snapshot.servings));
    }
    setEditing(false);
    setError(null);
    setMessage(null);
  };

  const handleScaleIngredientsForServings = () => {
    if (!formValues) {
      return;
    }

    const nextServings = parseServingsValue(formValues.servings);
    if (!nextServings) {
      setError("Enter a valid servings value before scaling ingredients.");
      return;
    }

    const currentScaleBaseServings = editScaleBaseServings;
    if (!currentScaleBaseServings) {
      setError("Set base servings first before scaling ingredient quantities.");
      return;
    }

    if (nextServings === currentScaleBaseServings) {
      setMessage("Ingredients already match the current servings value.");
      setError(null);
      return;
    }

    setFormValues((previousValues) =>
      previousValues
        ? {
            ...previousValues,
            ingredients: scaleRecipeFormIngredientQuantities(
              previousValues.ingredients,
              currentScaleBaseServings,
              nextServings
            ),
          }
        : previousValues
    );
    setEditScaleBaseServings(nextServings);
    setError(null);
    setMessage(
      `Scaled ingredient quantities from ${currentScaleBaseServings} to ${nextServings} servings.`
    );
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || !recipeId || !formValues) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const previousSnapshotServings = parseServingsValue(snapshot?.servings ?? null);
      await updateRecipe(recipeId, mapRecipeFormValuesToInput(formValues));
      setSnapshot(formValues);
      setEditing(false);
      const nextRecipeBaseServings = parseServingsValue(formValues.servings);
      setEditScaleBaseServings(nextRecipeBaseServings);
      setViewServings((currentViewServings) => {
        if (
          currentViewServings === null ||
          currentViewServings === previousSnapshotServings
        ) {
          return nextRecipeBaseServings;
        }
        return currentViewServings;
      });
      setMessage("Recipe saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save recipe."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRateChange = async (nextRating: number | null) => {
    if (!recipeId) {
      return;
    }

    setSavingRating(true);
    setError(null);

    try {
      await rateRecipe(recipeId, nextRating);
      setRating(nextRating);
    } catch (rateError) {
      setError(
        rateError instanceof Error ? rateError.message : "Failed to update rating."
      );
    } finally {
      setSavingRating(false);
    }
  };

  const handleDelete = async () => {
    if (!recipeId) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteRecipe(recipeId);
      navigate("/app/recipes");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete recipe."
      );
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <section className="workspace-route recipe-route">
        <LoadingModal
          open
          title="Loading recipe..."
          message="Pulling in your recipe details."
        />
      </section>
    );
  }

  if (!formValues) {
    return (
      <section className="workspace-route recipe-route">
        <article className="workspace-card recipe-empty-state">
          <h1>Recipe not found</h1>
          <p>This recipe may have been removed or you might not have access.</p>
          <Link className="btn btn--ghost" to={backTo}>
            {backLabel}
          </Link>
        </article>
      </section>
    );
  }

  const recipeBaseServings = parseServingsValue(formValues.servings);
  const canScaleInEditMode = Boolean(
    editing &&
      recipeBaseServings &&
      editScaleBaseServings &&
      recipeBaseServings !== editScaleBaseServings
  );

  return (
    <section
      className={`workspace-route recipe-route${editing ? " recipe-route--sticky-actions" : ""}`}
    >
      <article className="workspace-card">
        <div className="recipe-page-header">
          <div className="recipe-page-header__title">
            <h1>{formValues.title || "Recipe Details"}</h1>
            {!editing ? (
              <StarRating
                value={rating}
                onChange={handleRateChange}
                disabled={savingRating}
                label="Rate this recipe"
              />
            ) : null}
          </div>
          <div className="recipe-page-header__actions">
            <Link className="btn btn--ghost" to={backTo}>
              {backLabel}
            </Link>
            {!editing && recipeId ? (
              <AddToPlanButton
                recipeId={recipeId}
                recipeTitle={formValues.title}
                recipeServings={recipeBaseServings}
                initialDay={locationState?.mealSlot?.date}
                initialMealType={locationState?.mealSlot?.mealType}
              />
            ) : null}
            {!editing && !confirmingDelete ? (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  setEditing(true);
                  setEditScaleBaseServings(parseServingsValue(formValues.servings));
                  setError(null);
                  setMessage(null);
                }}
              >
                Edit
              </button>
            ) : null}
            {editing ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </button>
            ) : null}
            {!editing && confirmingDelete ? (
              <>
                <span className="recipe-page-header__confirm-label">Delete this recipe?</span>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Confirm delete"}
                </button>
              </>
            ) : null}
            {!editing && !confirmingDelete ? (
              <button
                type="button"
                className="btn btn--ghost btn--danger-ghost"
                onClick={() => {
                  setConfirmingDelete(true);
                  setError(null);
                  setMessage(null);
                }}
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>
        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="message">{message}</p> : null}
      </article>

      {editing ? (
        <form
          id="recipe-edit-form"
          className="workspace-card recipe-form"
          onSubmit={handleSave}
        >
          <RecipeFormFields
            values={formValues}
            readOnly={false}
            onFieldChange={handleFieldChange}
            onIngredientChange={handleIngredientChange}
            onIngredientSelect={handleIngredientSelect}
            onAddIngredient={handleAddIngredient}
            onRemoveIngredient={handleRemoveIngredient}
          />
          <section className="recipe-scale-tools">
            <h2>Ingredient scaling</h2>
            <p>
              Current ingredient quantities are based on{" "}
              {editScaleBaseServings ?? "unknown"} servings.
            </p>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleScaleIngredientsForServings}
              disabled={saving || !canScaleInEditMode}
            >
              {canScaleInEditMode
                ? `Scale ingredients to ${recipeBaseServings} servings`
                : "Adjust servings to enable scaling"}
            </button>
          </section>

          <div className="recipe-form__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        <RecipeReadArticle
          values={formValues}
          baseServings={recipeBaseServings}
          viewServings={viewServings}
          onViewServingsChange={setViewServings}
        />
      )}
      {editing ? (
        <div className="recipe-sticky-actions" aria-label="Recipe edit actions">
          <button
            type="submit"
            form="recipe-edit-form"
            className="btn btn--primary"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
