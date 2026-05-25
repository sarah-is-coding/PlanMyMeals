import { useMemo, useState } from "react";
import { extractRecipesFromText } from "../importApi";
import type { ImportedRecipe } from "../importTypes";

type RecipeAiImportPanelProps = {
  onUseDraft: (recipe: ImportedRecipe) => void;
  onCreateRecipes: (recipes: ImportedRecipe[]) => Promise<void>;
};

const getTotalMinutes = (recipe: ImportedRecipe): string => {
  const totalMinutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  return totalMinutes > 0 ? `${totalMinutes} min` : "No time";
};

export default function RecipeAiImportPanel({
  onUseDraft,
  onCreateRecipes,
}: RecipeAiImportPanelProps) {
  const [importText, setImportText] = useState("");
  const [recipes, setRecipes] = useState<ImportedRecipe[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [warnings, setWarnings] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRecipes = useMemo(
    () => recipes.filter((_, index) => selectedIndexes.has(index)),
    [recipes, selectedIndexes]
  );

  const handleExtract = async () => {
    setExtracting(true);
    setError(null);
    setWarnings([]);

    try {
      const result = await extractRecipesFromText(importText);
      setRecipes(result.recipes);
      setWarnings(result.warnings);
      setSelectedIndexes(new Set(result.recipes.map((_, index) => index)));
      if (result.recipes.length === 0) {
        setError("No recipes were found. Add a title, ingredients, or a recipe URL.");
      }
    } catch (extractError) {
      setError(
        extractError instanceof Error
          ? extractError.message
          : "Failed to import recipes."
      );
    } finally {
      setExtracting(false);
    }
  };

  const toggleSelected = (index: number) => {
    setSelectedIndexes((previousIndexes) => {
      const nextIndexes = new Set(previousIndexes);
      if (nextIndexes.has(index)) {
        nextIndexes.delete(index);
      } else {
        nextIndexes.add(index);
      }
      return nextIndexes;
    });
  };

  const handleCreateSelected = async () => {
    if (selectedRecipes.length === 0) {
      setError("Select at least one imported recipe first.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await onCreateRecipes(selectedRecipes);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create imported recipes."
      );
      setCreating(false);
    }
  };

  return (
    <article className="workspace-card recipe-import">
      <div className="recipe-import__header">
        <div>
          <h2>AI Import</h2>
          <p>Paste notes, recipe links, or a mixed list to extract recipe drafts.</p>
        </div>
        <span className="recipe-import__model">Gemini Flash-Lite</span>
      </div>

      <label className="recipe-field">
        <span>Notes and links</span>
        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          rows={8}
          placeholder="Chicken Caesar taco salad&#10;ground chicken meatball&#10;https://example.com/recipe"
        />
      </label>

      <div className="recipe-import__actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleExtract}
          disabled={extracting || creating || !importText.trim()}
        >
          {extracting ? "Extracting..." : "Extract recipes"}
        </button>
        {recipes.length > 0 ? (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleCreateSelected}
            disabled={creating || selectedRecipes.length === 0}
          >
            {creating ? "Creating..." : `Create selected (${selectedRecipes.length})`}
          </button>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}

      {warnings.length > 0 ? (
        <ul className="recipe-import__warnings" aria-label="Import warnings">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {recipes.length > 0 ? (
        <div className="recipe-import__results">
          {recipes.map((recipe, index) => (
            <article className="recipe-import-card" key={`${recipe.title}-${index}`}>
              <label className="recipe-checkbox recipe-import-card__select">
                <input
                  type="checkbox"
                  checked={selectedIndexes.has(index)}
                  onChange={() => toggleSelected(index)}
                />
                <span>Select</span>
              </label>
              <div className="recipe-import-card__body">
                <div className="recipe-import-card__head">
                  <h3>{recipe.title}</h3>
                  <span>{recipe.confidence}</span>
                </div>
                {recipe.description ? <p>{recipe.description}</p> : null}
                <div className="recipe-card__meta">
                  <span className="recipe-tag">{getTotalMinutes(recipe)}</span>
                  {recipe.servings ? (
                    <span className="recipe-tag">{recipe.servings} servings</span>
                  ) : null}
                  <span className="recipe-tag">
                    {recipe.ingredients.length} ingredients
                  </span>
                  {recipe.sourceUrl ? (
                    <span className="recipe-tag recipe-tag--source">Has source</span>
                  ) : null}
                </div>
                {recipe.warnings.length > 0 ? (
                  <p className="recipe-import-card__warning">
                    {recipe.warnings.join(" ")}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => onUseDraft(recipe)}
                disabled={creating}
              >
                Use as draft
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </article>
  );
}
