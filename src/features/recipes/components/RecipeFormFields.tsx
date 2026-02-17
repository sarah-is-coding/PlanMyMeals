import type {
  RecipeFormIngredient,
  RecipeFormValues,
} from "../utils/recipeForm";

type RecipeFieldName = Exclude<keyof RecipeFormValues, "ingredients">;
type RecipeIngredientFieldName = Exclude<keyof RecipeFormIngredient, "id">;

type RecipeFormFieldsProps = {
  values: RecipeFormValues;
  readOnly: boolean;
  onFieldChange: (field: RecipeFieldName, value: string) => void;
  onIngredientChange: (
    ingredientId: string,
    field: RecipeIngredientFieldName,
    value: string
  ) => void;
  onAddIngredient: () => void;
  onRemoveIngredient: (ingredientId: string) => void;
};

export default function RecipeFormFields({
  values,
  readOnly,
  onFieldChange,
  onIngredientChange,
  onAddIngredient,
  onRemoveIngredient,
}: RecipeFormFieldsProps) {
  return (
    <>
      <div className="recipe-form__grid">
        <label className="recipe-field recipe-field--full">
          <span>Title</span>
          <input
            type="text"
            value={values.title}
            onChange={(event) => onFieldChange("title", event.target.value)}
            readOnly={readOnly}
            required
          />
        </label>

        <label className="recipe-field recipe-field--full">
          <span>Description</span>
          <textarea
            value={values.description}
            onChange={(event) => onFieldChange("description", event.target.value)}
            readOnly={readOnly}
            rows={3}
          />
        </label>

        <label className="recipe-field">
          <span>Prep (minutes)</span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={values.prepMinutes}
            onChange={(event) => onFieldChange("prepMinutes", event.target.value)}
            readOnly={readOnly}
          />
        </label>

        <label className="recipe-field">
          <span>Cook (minutes)</span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={values.cookMinutes}
            onChange={(event) => onFieldChange("cookMinutes", event.target.value)}
            readOnly={readOnly}
          />
        </label>

        <label className="recipe-field">
          <span>Servings</span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={values.servings}
            onChange={(event) => onFieldChange("servings", event.target.value)}
            readOnly={readOnly}
          />
        </label>

        <label className="recipe-field recipe-field--full">
          <span>Source URL</span>
          <input
            type="url"
            placeholder="https://example.com/recipe"
            value={values.sourceUrl}
            onChange={(event) => onFieldChange("sourceUrl", event.target.value)}
            readOnly={readOnly}
          />
        </label>

        <label className="recipe-field recipe-field--full">
          <span>Tags (comma separated)</span>
          <input
            type="text"
            placeholder="high-protein, quick, kid-friendly"
            value={values.tags}
            onChange={(event) => onFieldChange("tags", event.target.value)}
            readOnly={readOnly}
          />
        </label>

        <label className="recipe-field recipe-field--full">
          <span>Instructions</span>
          <textarea
            value={values.instructions}
            onChange={(event) => onFieldChange("instructions", event.target.value)}
            readOnly={readOnly}
            rows={8}
          />
        </label>
      </div>

      <section className="recipe-ingredients">
        <div className="recipe-ingredients__header">
          <h2>Ingredients</h2>
          {!readOnly ? (
            <button type="button" className="btn btn--ghost" onClick={onAddIngredient}>
              Add ingredient
            </button>
          ) : null}
        </div>

        <div className="recipe-ingredients__list">
          {values.ingredients.map((ingredient) => (
            <article className="recipe-ingredient-card" key={ingredient.id}>
              <div className="recipe-ingredient-card__grid">
                <label className="recipe-field recipe-field--full">
                  <span>Ingredient</span>
                  <input
                    type="text"
                    value={ingredient.ingredientName}
                    onChange={(event) =>
                      onIngredientChange(
                        ingredient.id,
                        "ingredientName",
                        event.target.value
                      )
                    }
                    readOnly={readOnly}
                  />
                </label>

                <label className="recipe-field">
                  <span>Quantity</span>
                  <input
                    type="text"
                    value={ingredient.quantity}
                    onChange={(event) =>
                      onIngredientChange(ingredient.id, "quantity", event.target.value)
                    }
                    readOnly={readOnly}
                  />
                </label>

                <label className="recipe-field">
                  <span>Unit</span>
                  <input
                    type="text"
                    value={ingredient.unit}
                    onChange={(event) =>
                      onIngredientChange(ingredient.id, "unit", event.target.value)
                    }
                    readOnly={readOnly}
                  />
                </label>

                <label className="recipe-field recipe-field--full">
                  <span>Notes</span>
                  <input
                    type="text"
                    value={ingredient.notes}
                    onChange={(event) =>
                      onIngredientChange(ingredient.id, "notes", event.target.value)
                    }
                    readOnly={readOnly}
                  />
                </label>
              </div>

              {!readOnly && values.ingredients.length > 1 ? (
                <button
                  type="button"
                  className="btn btn--ghost recipe-ingredient-card__remove"
                  onClick={() => onRemoveIngredient(ingredient.id)}
                >
                  Remove
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
