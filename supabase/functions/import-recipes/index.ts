const GEMINI_MODEL = "gemini-2.5-flash-lite";
const MAX_INPUT_CHARS = 120_000;
const MAX_URLS = 24;
const MAX_SOURCE_CHARS = 18_000;
const GEMINI_MAX_ATTEMPTS = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SourceContent = {
  url: string;
  title: string;
  text: string;
  warning: string | null;
};

type RequestMode = "import" | "generate";

const recipeSchema = {
  type: "OBJECT",
  properties: {
    recipes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          sourceUrl: { type: "STRING", nullable: true },
          prepMinutes: { type: "INTEGER", nullable: true },
          cookMinutes: { type: "INTEGER", nullable: true },
          servings: { type: "INTEGER", nullable: true },
          tags: { type: "ARRAY", items: { type: "STRING" } },
          instructions: { type: "STRING" },
          ingredients: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                ingredientName: { type: "STRING" },
                quantity: { type: "STRING" },
                unit: { type: "STRING" },
                notes: { type: "STRING" },
                category: {
                  type: "STRING",
                  enum: [
                    "produce",
                    "meat & seafood",
                    "dairy & eggs",
                    "bakery & bread",
                    "pantry",
                    "frozen",
                    "beverages",
                    "other",
                  ],
                },
              },
              required: ["ingredientName", "quantity", "unit", "notes", "category"],
            },
          },
          confidence: { type: "STRING", enum: ["high", "medium", "low"] },
          warnings: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: [
          "title",
          "description",
          "sourceUrl",
          "prepMinutes",
          "cookMinutes",
          "servings",
          "tags",
          "instructions",
          "ingredients",
          "confidence",
          "warnings",
        ],
      },
    },
    warnings: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["recipes", "warnings"],
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const extractUrls = (text: string): string[] => {
  const matches = text.match(/https?:\/\/[^\s<>"')]+/gi) ?? [];
  return Array.from(new Set(matches.map((url) => url.replace(/[.,;!?]+$/, "")))).slice(
    0,
    MAX_URLS
  );
};

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "-")
    .replace(/&deg;/gi, " degrees ");

const stripHtml = (html: string): string =>
  decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );

const extractTitle = (html: string): string => {
  const ogTitle = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  )?.[1];
  const title = ogTitle ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  return decodeHtmlEntities(title.replace(/\s+/g, " ").trim());
};

const extractJsonLdRecipes = (html: string): string => {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1].trim())
    .filter((block) => /"@type"\s*:\s*"Recipe"|"@type"\s*:\s*\[[^\]]*"Recipe"/i.test(block));

  return blocks.join("\n").slice(0, MAX_SOURCE_CHARS);
};

const fetchSource = async (url: string): Promise<SourceContent> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "PlanMyMeals recipe importer",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return {
        url,
        title: "",
        text: "",
        warning: `Could not read ${url} (${response.status}).`,
      };
    }

    const html = (await response.text()).slice(0, 800_000);
    const jsonLd = extractJsonLdRecipes(html);
    const pageText = stripHtml(html).slice(0, MAX_SOURCE_CHARS);
    const text = [jsonLd ? `Recipe structured data:\n${jsonLd}` : "", pageText]
      .filter(Boolean)
      .join("\n\n");

    return {
      url,
      title: extractTitle(html),
      text: text.slice(0, MAX_SOURCE_CHARS),
      warning: text ? null : `No readable recipe text found at ${url}.`,
    };
  } catch {
    return {
      url,
      title: "",
      text: "",
      warning: `Could not read ${url}.`,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const recipeOutputRules = `
Rules:
- Do not invent exact quantities, times, or servings when extracting from a source. Use null or empty strings when missing.
- Preserve user modifications from notes over website defaults.
- Keep instructions text-first and compact. Format instructions as newline-separated numbered steps: "1. ...\n2. ...\n3. ...". Do not return all steps in one paragraph.
- Instructions must be fully self-contained. Never write "according to the source recipe", "follow the source recipe", "see source", "as directed", "per package", or any wording that requires opening the URL.
- If a source step references another recipe, package, video, or external page, rewrite it into direct cooking instructions using the available text. If details are unavailable, state the missing detail plainly in warnings instead of referencing the source.
- Include ingredient details directly in the steps when needed. A user must be able to cook from the saved recipe without visiting sourceUrl.
- Split ingredients into ingredientName, quantity, unit, and notes.
- Assign a category to every ingredient — never leave it blank. Choose the most fitting one: "produce" (vegetables, fruit, fresh herbs, garlic, onion); "meat & seafood" (meat, poultry, fish, shellfish); "dairy & eggs" (milk, cream, cheese, butter, yogurt, eggs); "bakery & bread" (bread, tortillas, rolls, wraps); "pantry" (canned goods, dried pasta, rice, grains, flour, sugar, spices, oils, vinegar, sauces, condiments, nuts, seeds); "frozen" (frozen vegetables, frozen protein, ice cream); "beverages" (juice, broth, stock, wine, beer, water, non-dairy milk); "other" only if nothing else fits.
- Add warnings for inaccessible URLs, missing details, social/video links that could not be read, or low-confidence extraction.
`;

const buildImportPrompt = (notes: string, sources: SourceContent[]): string => {
  const sourceText = sources
    .map(
      (source, index) => `
SOURCE ${index + 1}
URL: ${source.url}
TITLE: ${source.title || "unknown"}
TEXT:
${source.text || source.warning || "No readable text."}`
    )
    .join("\n\n");

  return `
You are extracting personal recipes for PlanMyMeals.

Return concise JSON matching the provided schema. Extract every distinct recipe from the notes and fetched sources. A heading followed by a URL belongs to the same recipe when they are adjacent. Notes after a URL should modify that recipe when clearly related.

${recipeOutputRules}
- Use sourceUrl for the most relevant URL for each recipe.

USER NOTES:
${notes.slice(0, MAX_INPUT_CHARS)}

FETCHED SOURCES:
${sourceText}
`;
};

const buildGeneratePrompt = (requestText: string): string => `
You are generating personal recipe drafts for PlanMyMeals.

Return concise JSON matching the provided schema. Generate every distinct recipe requested by the user. If the user asks for multiple recipes, return multiple objects in recipes.

Generation rules:
- Generate complete, cookable recipes with realistic ingredients, quantities, timings, servings, and instructions.
- Use sourceUrl: null for generated recipes.
- Respect requested ingredients, dislikes, cuisine, diet, equipment, budget, prep time, servings, and number of recipes.
- If the user gives vague constraints, make reasonable practical choices and add a short warning explaining assumptions.
${recipeOutputRules}

USER REQUEST:
${requestText.slice(0, MAX_INPUT_CHARS)}
`;

const parseGeminiJson = (text: string): unknown => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse(fenced ?? trimmed);
};

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const getRetryDelay = (attempt: number, retryAfterHeader: string | null): number => {
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : Number.NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1_000, 30_000);
  }

  const baseDelay = Math.min(2 ** attempt * 1_000, 10_000);
  const jitter = Math.floor(Math.random() * 350);
  return baseDelay + jitter;
};

const shouldRetryGeminiRequest = (status: number): boolean =>
  status === 429 || status === 500 || status === 502 || status === 503 || status === 504;

const callGeminiWithBackoff = async (
  prompt: string,
  apiKey: string
): Promise<Response> => {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 32_000,
            responseMimeType: "application/json",
            responseSchema: recipeSchema,
          },
        }),
      }
    );

    if (!shouldRetryGeminiRequest(response.status) || attempt === GEMINI_MAX_ATTEMPTS - 1) {
      return response;
    }

    lastResponse = response;
    await response.body?.cancel();
    await sleep(getRetryDelay(attempt, response.headers.get("retry-after")));
  }

  if (!lastResponse) {
    throw new Error("Gemini request failed before a response was returned.");
  }

  return lastResponse;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Use POST to import recipes." }, 405);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "Missing GEMINI_API_KEY for recipe import." }, 500);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ error: "You must be signed in to import recipes." }, 401);
  }

  const body = await request.json().catch(() => null) as {
    mode?: RequestMode;
    text?: string;
  } | null;
  const mode = body?.mode === "generate" ? "generate" : "import";
  const text = body?.text?.trim() ?? "";
  if (!text) {
    return jsonResponse(
      {
        error:
          mode === "generate"
            ? "Describe the recipe or recipes you want to generate."
            : "Paste recipe notes, links, or both.",
      },
      400
    );
  }

  const urls = mode === "import" ? extractUrls(text) : [];
  const sources = mode === "import" ? await Promise.all(urls.map(fetchSource)) : [];
  const sourceWarnings = sources
    .map((source) => source.warning)
    .filter((warning): warning is string => Boolean(warning));

  const prompt =
    mode === "generate" ? buildGeneratePrompt(text) : buildImportPrompt(text, sources);
  const geminiResponse = await callGeminiWithBackoff(prompt, apiKey);

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    const friendlyRateLimitMessage =
      geminiResponse.status === 429
        ? "Gemini is rate limited right now. Wait a minute and try the import again."
        : null;
    return jsonResponse(
      {
        error:
          friendlyRateLimitMessage ??
          `Gemini recipe extraction failed: ${errorText.slice(0, 400)}`,
      },
      502
    );
  }

  const geminiJson = await geminiResponse.json();
  const responseText = geminiJson.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();

  if (!responseText) {
    return jsonResponse({ error: "Gemini returned an empty recipe import." }, 502);
  }

  try {
    const parsed = parseGeminiJson(responseText) as {
      recipes?: unknown[];
      warnings?: string[];
    };
    return jsonResponse({
      recipes: parsed.recipes ?? [],
      warnings: [...sourceWarnings, ...(parsed.warnings ?? [])],
    });
  } catch {
    return jsonResponse({ error: "Gemini returned invalid JSON." }, 502);
  }
});
