import { supabase } from "../../lib/supabaseClient";
import type { RecipeImportResult } from "./importTypes";

type ImportRecipesResponse = RecipeImportResult & {
  error?: string;
};

export async function extractRecipesFromText(text: string): Promise<RecipeImportResult> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Paste recipe notes, links, or both before importing.");
  }

  const { data, error } = await supabase.functions.invoke<ImportRecipesResponse>(
    "import-recipes",
    {
      body: { text: trimmedText },
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("The recipe importer did not return a response.");
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return {
    recipes: data.recipes ?? [],
    warnings: data.warnings ?? [],
  };
}
