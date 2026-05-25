import { Link, useNavigate } from "react-router-dom";
import { createRecipe } from "../api";
import RecipeAiImportPanel from "../components/RecipeAiImportPanel";
import { extractRecipesFromText } from "../importApi";
import type { ImportedRecipe } from "../importTypes";
import { mapImportedRecipeToInput } from "../utils/recipeImport";

export default function RecipeImportPage() {
  const navigate = useNavigate();

  const handleUseImportedDraft = (recipe: ImportedRecipe) => {
    navigate("/app/recipes/new", { state: { importedRecipe: recipe } });
  };

  const handleCreateImportedRecipes = async (recipes: ImportedRecipe[]) => {
    const recipeIds = [];
    for (const recipe of recipes) {
      const recipeId = await createRecipe(mapImportedRecipeToInput(recipe));
      recipeIds.push(recipeId);
    }

    navigate(
      recipeIds.length === 1 ? `/app/recipes/${recipeIds[0]}` : "/app/recipes"
    );
  };

  return (
    <section className="workspace-route recipe-route">
      <article className="workspace-card">
        <div className="recipe-page-header">
          <h1>Import Recipe</h1>
          <Link className="btn btn--ghost" to="/app/recipes">
            Back to Recipes
          </Link>
        </div>
        <p>Extract recipe drafts from notes, links, or both.</p>
      </article>

      <RecipeAiImportPanel
        runRequest={extractRecipesFromText}
        onUseDraft={handleUseImportedDraft}
        onCreateRecipes={handleCreateImportedRecipes}
      />
    </section>
  );
}
