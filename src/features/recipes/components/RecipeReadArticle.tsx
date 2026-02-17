import type { RecipeFormValues } from "../utils/recipeForm";

type RecipeReadArticleProps = {
  values: RecipeFormValues;
};

const parseTags = (value: string): string[] =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

const parseMinutes = (value: string): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
};

const formatIngredientLine = (
  quantity: string,
  unit: string,
  ingredientName: string
): string => {
  const chunks = [quantity.trim(), unit.trim(), ingredientName.trim()].filter(
    (value) => value.length > 0
  );

  return chunks.length > 0 ? chunks.join(" ") : "Unnamed ingredient";
};

export default function RecipeReadArticle({ values }: RecipeReadArticleProps) {
  const prepMinutes = parseMinutes(values.prepMinutes);
  const cookMinutes = parseMinutes(values.cookMinutes);
  const totalMinutes =
    prepMinutes || cookMinutes ? (prepMinutes ?? 0) + (cookMinutes ?? 0) : null;
  const servings = parseMinutes(values.servings);
  const hasMeta = Boolean(prepMinutes || cookMinutes || totalMinutes || servings);
  const tags = parseTags(values.tags);
  const ingredients = values.ingredients.filter(
    (ingredient) =>
      ingredient.ingredientName.trim() ||
      ingredient.quantity.trim() ||
      ingredient.unit.trim() ||
      ingredient.notes.trim()
  );

  return (
    <article className="workspace-card recipe-read">
      {values.description ? <p className="recipe-read__lede">{values.description}</p> : null}

      {hasMeta ? (
        <section className="recipe-read__meta" aria-label="Recipe details">
          {prepMinutes ? (
            <div>
              <dt>Prep</dt>
              <dd>{prepMinutes} min</dd>
            </div>
          ) : null}
          {cookMinutes ? (
            <div>
              <dt>Cook</dt>
              <dd>{cookMinutes} min</dd>
            </div>
          ) : null}
          {totalMinutes ? (
            <div>
              <dt>Total</dt>
              <dd>{totalMinutes} min</dd>
            </div>
          ) : null}
          {servings ? (
            <div>
              <dt>Servings</dt>
              <dd>{servings}</dd>
            </div>
          ) : null}
        </section>
      ) : null}

      {tags.length > 0 ? (
        <section className="recipe-read__section">
          <h2>Tags</h2>
          <div className="recipe-card__meta">
            {tags.map((tag) => (
              <span key={tag} className="recipe-tag">
                {tag}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {values.sourceUrl.trim() ? (
        <section className="recipe-read__section">
          <h2>Source</h2>
          <p>
            <a
              className="recipe-read__link"
              href={values.sourceUrl.trim()}
              target="_blank"
              rel="noreferrer"
            >
              {values.sourceUrl.trim()}
            </a>
          </p>
        </section>
      ) : null}

      <section className="recipe-read__section">
        <h2>Ingredients</h2>
        {ingredients.length === 0 ? (
          <p>No ingredients added yet.</p>
        ) : (
          <ul className="recipe-read__ingredients">
            {ingredients.map((ingredient) => (
              <li key={ingredient.id}>
                <p>{formatIngredientLine(ingredient.quantity, ingredient.unit, ingredient.ingredientName)}</p>
                {ingredient.notes.trim() ? (
                  <p className="recipe-read__note">{ingredient.notes.trim()}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="recipe-read__section">
        <h2>Instructions</h2>
        {values.instructions.trim() ? (
          <p className="recipe-read__instructions">{values.instructions.trim()}</p>
        ) : (
          <p>No instructions added yet.</p>
        )}
      </section>
    </article>
  );
}
