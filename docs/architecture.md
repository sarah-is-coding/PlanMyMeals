# Architecture Notes

## Frontend Structure
- `src/app`: routing and application shell.
- `src/features`: feature modules (`auth`, `recipes`, `meal-plans`, `grocery`).
- `src/components`: shared UI components.
- `src/lib`: shared infrastructure (`supabaseClient`, db helpers, utils).
- `src/styles`: global and app-level styles.

## Backend Structure
- `supabase/schema.sql`: canonical schema and policies.
- `supabase/migrations`: migration files (when tooling is added).
- `supabase/rls`: RLS notes and policy snippets.
