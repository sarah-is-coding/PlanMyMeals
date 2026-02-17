import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import RecipeFormFields from "../components/RecipeFormFields";
import { createRecipe } from "../api";
import {
  createEmptyIngredient,
  createEmptyRecipeFormValues,
  mapRecipeFormValuesToInput,
  type RecipeFormValues,
} from "../utils/recipeForm";

type RecipeFieldName = Exclude<keyof RecipeFormValues, "ingredients">;
type RecipeIngredientFieldName = "ingredientName" | "quantity" | "unit" | "notes";

export default function RecipeCreatePage() {
  const navigate = useNavigate();
  const [values, setValues] = useState(createEmptyRecipeFormValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = (field: RecipeFieldName, value: string) => {
    setValues((previousValues) => ({ ...previousValues, [field]: value }));
  };

  const handleIngredientChange = (
    ingredientId: string,
    field: RecipeIngredientFieldName,
    value: string
  ) => {
    setValues((previousValues) => ({
      ...previousValues,
      ingredients: previousValues.ingredients.map((ingredient) =>
        ingredient.id === ingredientId ? { ...ingredient, [field]: value } : ingredient
      ),
    }));
  };

  const handleAddIngredient = () => {
    setValues((previousValues) => ({
      ...previousValues,
      ingredients: [...previousValues.ingredients, createEmptyIngredient()],
    }));
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    setValues((previousValues) => ({
      ...previousValues,
      ingredients: previousValues.ingredients.filter(
        (ingredient) => ingredient.id !== ingredientId
      ),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const recipeId = await createRecipe(mapRecipeFormValuesToInput(values));
      navigate(`/app/recipes/${recipeId}`);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to create recipe."
      );
      setSaving(false);
    }
  };

  return (
    <section className="workspace-route recipe-route">
      <article className="workspace-card">
        <div className="recipe-page-header">
          <h1>Add Recipe</h1>
          <Link className="btn btn--ghost" to="/app/recipes">
            Back to Recipes
          </Link>
        </div>
        <p>Create a text-first recipe that stays lightweight and easy to edit.</p>
        {error ? <p className="error">{error}</p> : null}
      </article>

      <form className="workspace-card recipe-form" onSubmit={handleSubmit}>
        <RecipeFormFields
          values={values}
          readOnly={false}
          onFieldChange={handleFieldChange}
          onIngredientChange={handleIngredientChange}
          onAddIngredient={handleAddIngredient}
          onRemoveIngredient={handleRemoveIngredient}
        />

        <div className="recipe-form__actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Saving..." : "Save Recipe"}
          </button>
          <Link className="btn btn--ghost" to="/app/recipes">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
