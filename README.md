# PlanMyMeals
Simple personal meal planner with a mobile-friendly web experience that lets you import or manually add recipes, build and save meal plans, and generate grocery lists. It also supports automated meal plan suggestions based on your preferences, calorie goals, or dietary targets. Optimized for Supabase's free tier with minimal storage usage, allowing the app to scale to tens of thousands of lightweight, text-based recipes before any upgrades are needed. Keeping the backend lightweight also makes it feasible to cover hosting costs with non-intrusive ads rather than subscriptions.

## Core Features
- Recipe import and manual recipe entry
- Meal plan creation and saved weekly plans
- Automated meal plan suggestions based on preferences, calorie goals, or dietary targets
- Grocery list generation from planned meals

## Running Locally (Contributors)
- Create a Supabase project (free tier)
- Copy your project's URL + anon/public key into `.env` (reference `.env.example`)
- Apply `supabase/schema.sql` to seed the database
- Run the app

## Project Structure
- `src/app`: app shell, routes, and top-level pages
- `src/components`: shared UI components
- `src/features`: feature modules (`auth`, `recipes`, `meal-plans`, `grocery`)
- `src/lib`: shared clients/helpers (`supabaseClient`, `db`, `utils`)
- `src/styles`: global and app styles
- `supabase`: schema, migrations, and RLS notes
- `docs`: architecture notes and user flows

## Tech Stack
- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS
- Auth/DB: Supabase (PostgreSQL + RLS)
- Client: Supabase JS (browser-side)
- Dev: Vite, ESLint, Prettier
- Hosting: Netlify for the web app; Supabase for backend
- PWA: Web app manifest (service worker optional later)

## Database Structure (Supabase)
- `profiles`: user_id (pk, references auth.users), display_name; keeps everything scoped per user while staying lightweight.
- `recipes`: id, user_id, title, description, source_url, prep_minutes, cook_minutes, servings, tags (text[]), instructions (text); text-first to minimize storage.
- `recipe_ingredients`: id, recipe_id, ingredient_name, quantity, unit, notes; no global ingredient catalog to avoid bloat.
- `meal_plans`: id, user_id, title, start_date, notes; container for saved plans.
- `meal_plan_items`: id, meal_plan_id, recipe_id, planned_for (date), meal_type (breakfast/lunch/dinner/other), notes.
- `grocery_lists`: id, user_id, meal_plan_id (nullable), title, created_at; can be generated from a plan or ad hoc.
- `grocery_items`: id, list_id, ingredient_name, quantity, unit, is_checked; keeps lists editable on mobile.
