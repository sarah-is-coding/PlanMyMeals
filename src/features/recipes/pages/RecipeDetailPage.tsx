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

type RecipeFieldName = Exclude<keyof RecipeFormValues, "ingredients">;
type RecipeIngredientFieldName = "ingredientName" | "quantity" | "unit" | "notes";
type RecipeDetailLocationState = {
  from?: "meal-planner";
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
          setLoading(false);
          return;
        }

        const nextValues = mapRecipeDetailToFormValues(recipe);
        setFormValues(nextValues);
        setSnapshot(nextValues);
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
  }, [recipeId]);

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
    }
    setEditing(false);
    setError(null);
    setMessage(null);
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
      await updateRecipe(recipeId, mapRecipeFormValuesToInput(formValues));
      setSnapshot(formValues);
      setEditing(false);
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
        <article className="workspace-card">
          <h1>Recipe not found</h1>
          <p>This recipe may have been removed or you might not have access.</p>
          <Link className="btn btn--ghost" to={backTo}>
            {backLabel}
          </Link>
        </article>
      </section>
    );
  }

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

          <div className="recipe-form__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        <RecipeReadArticle values={formValues} />
      )}
    </section>
  );
}
