import { FunctionsHttpError } from "@supabase/functions-js";
import { supabase } from "../../lib/supabaseClient";
import type { RecipeImportResult } from "./importTypes";

type ImportRecipesResponse = RecipeImportResult & {
  error?: string;
};

/**
 * When an edge function returns a non-2xx status, Supabase wraps it in a
 * FunctionsHttpError whose `.message` is always the generic
 * "Edge Function returned a non-2xx status code" string.  The real message
 * from the function body is in `.context` (the raw Response).  This helper
 * pulls that out so the UI can show something meaningful.
 */
async function resolveEdgeFunctionError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string };
      if (body?.error) {
        return new Error(body.error);
      }
    } catch {
      // Body wasn't JSON — fall through to the generic message.
    }
  }
  return error instanceof Error
    ? error
    : new Error("An unexpected error occurred.");
}

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
    throw await resolveEdgeFunctionError(error);
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
    throw await resolveEdgeFunctionError(error);
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
