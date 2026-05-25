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
      body: { mode: "import", text: trimmedText },
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

export async function generateRecipesFromPrompt(
  prompt: string
): Promise<RecipeImportResult> {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new Error("Describe the recipe or recipes you want to generate.");
  }

  const { data, error } = await supabase.functions.invoke<ImportRecipesResponse>(
    "import-recipes",
    {
      body: { mode: "generate", text: trimmedPrompt },
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("The recipe generator did not return a response.");
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return {
    recipes: data.recipes ?? [],
    warnings: data.warnings ?? [],
  };
}
