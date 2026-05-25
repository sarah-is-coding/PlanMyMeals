# PlanMyMeals — Claude Agent Guidelines

## Stack

- **Frontend**: React 19 + TypeScript (strict), Vite, React Router v7
- **Backend**: Supabase (Postgres + Auth + RLS)
- **Styling**: Plain CSS with CSS variables (no Tailwind in components)
- **Testing**: Vitest + React Testing Library + jsdom

---

## Testing — Non-Negotiable Rules

### Always run tests after implementation

After every code change — no exceptions:

```bash
npm test
```

All tests must pass before considering a task done. If a test fails,
fix the code or the test (see below for which) before finishing.

### Never leave a regression

If your change causes a previously passing test to fail, you have
introduced a regression. Fix it. Do not disable, skip, or delete a test
just to make the suite green — that hides real breakage.

### New feature → new tests

Every new function, component, or API call needs a test. Minimum bar:

- **Pure utility functions**: cover the happy path, null/empty inputs,
  and at least one edge case.
- **API functions** (Supabase calls): mock the client, assert the right
  table/columns/filters are called, and assert the mapped return value.
- **React components**: render check, the main user interaction, and any
  prop-controlled states (e.g. `readOnly`).
- **End-to-end component flows**: for multi-step UI (e.g. the ingredient
  combobox search → add new → pick category flow) write at least one test
  that walks the complete journey.

### Intentional behavior change → update the test

If you deliberately change how something works, update the test to match
the new intended behavior and leave a comment explaining why the behavior
changed. Do not just delete the failing assertion.

---

## Test File Locations

```
src/
  __tests__/
    features/
      ingredients/
        api.test.ts          ← searchIngredients, createIngredient
      recipes/
        utils/
          ingredientScaling.test.ts
          recipeForm.test.ts
        components/
          IngredientNameCombobox.test.tsx
    setup.ts                 ← @testing-library/jest-dom import
```

Mirror the `src/features/` structure under `src/__tests__/features/`.

---

## Testing Conventions

### Mocking Supabase

Supabase uses a fluent chainable builder. Use the chainable builder
pattern — every method returns the builder itself, terminal methods
(`.returns()`, `.single()`, `.maybeSingle()`) return a Promise:

```ts
vi.mock("../../../lib/supabaseClient", () => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const chained = ["from", "select", "upsert", "insert", "update",
                   "delete", "ilike", "eq", "order", "limit", "not",
                   "in", "contains", "gte", "lte", "range"];

  for (const method of chained) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  builder.returns      = vi.fn().mockResolvedValue({ data: [], error: null });
  builder.single       = vi.fn().mockResolvedValue({ data: null, error: null });
  builder.maybeSingle  = vi.fn().mockResolvedValue({ data: null, error: null });

  return { supabase: builder };
});
```

Reset with `vi.clearAllMocks()` in `beforeEach` and re-apply
`.mockReturnValue(builder)` on each chained method — `clearAllMocks`
wipes the return values.

### Mocking feature API modules in component tests

Mock the whole module so component tests never touch the network:

```ts
vi.mock("../../../../features/ingredients/api", () => ({
  searchIngredients: vi.fn(),
  createIngredient:  vi.fn(),
}));
```

Then configure return values per-test with `vi.mocked(fn).mockResolvedValue(...)`.

### Debounced components

Do NOT use `vi.useFakeTimers()` with `waitFor` — fake timers block
`waitFor`'s internal polling and cause timeouts. Instead:

- Use `userEvent.setup()` (no `advanceTimers` option)
- Use `waitFor(() => ..., { timeout: 1500 })` — enough to outlast the
  280 ms debounce since mocked API calls resolve instantly
- For direct keydown testing (bypassing focus uncertainty), use
  `fireEvent.keyDown(element, { key: '...' })` instead of
  `user.keyboard(...)`

### Test scripts

| Command | When to use |
|---|---|
| `npm test` | Before finishing any task; must pass |
| `npm run test:watch` | During active development |

---

## Supabase / Database

- Schema lives in `supabase/migrations/schema.sql`
- One-time incremental changes go in a new SQL file named
  `YYYYMMDDHHMMSS_short_description.sql` — **not** appended to the
  schema file
- Run migrations via the Supabase Dashboard SQL Editor or
  `supabase db push` (requires `supabase link` first)
- RLS is enabled on every table. New tables need policies before the
  app can read or write them

## Feature Structure

```
src/features/<feature>/
  types.ts       ← TypeScript types only, no logic
  api.ts         ← All Supabase calls for this feature
  components/    ← UI components
  pages/         ← Route-level page components
  utils/         ← Pure helper functions (easiest to test)
  README.md
```

## CSS

- Use existing CSS variables from `src/styles/global.css`
  (`--color-brand`, `--alpha-brand-20`, `--color-muted-soft`, etc.)
- Add component styles to `src/styles/app.css` with a BEM-style class
  prefix matching the component name (e.g. `.ingredient-combobox__*`)
- No inline styles; no Tailwind utility classes in component files

## Code Style

- TypeScript strict mode — no `any`, no unused variables
- Prefer explicit `type` imports (`import type { ... }`)
- API layer maps snake_case DB rows to camelCase TypeScript types
- Form state uses string fields for all inputs (numbers are strings
  until parsed on submit)
