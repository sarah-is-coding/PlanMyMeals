import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import LoadingModal from "../../../components/feedback/LoadingModal";
import RecipeFormFields from "../components/RecipeFormFields";
import RecipeReadArticle from "../components/RecipeReadArticle";
import { getRecipeById, updateRecipe } from "../api";
import {
  createEmptyIngredient,
  mapRecipeDetailToFormValues,
  mapRecipeFormValuesToInput,
  type RecipeFormValues,
} from "../utils/recipeForm";
import { scaleRecipeFormIngredientQuantities } from "../utils/ingredientScaling";

type RecipeFieldName = Exclude<keyof RecipeFormValues, "ingredients">;
type RecipeIngredientFieldName = "ingredientName" | "quantity" | "unit" | "notes";
type RecipeDetailLocationState = {
  from?: "meal-planner";
  mealPlanItemId?: string;
  initialServings?: number | null;
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
    <section className="workspace-route recipe-route">
      <article className="workspace-card">
        <div className="recipe-page-header">
          <h1>{formValues.title || "Recipe Details"}</h1>
          <div className="recipe-page-header__actions">
            <Link className="btn btn--ghost" to={backTo}>
              {backLabel}
            </Link>
            {!editing ? (
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
            ) : (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="message">{message}</p> : null}
      </article>

      {editing ? (
        <form className="workspace-card recipe-form" onSubmit={handleSave}>
          <RecipeFormFields
            values={formValues}
            readOnly={false}
            onFieldChange={handleFieldChange}
            onIngredientChange={handleIngredientChange}
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
    </section>
  );
}
