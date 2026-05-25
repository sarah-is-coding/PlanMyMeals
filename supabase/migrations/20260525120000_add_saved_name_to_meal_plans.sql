-- Add saved_name column so users can bookmark/name any meal plan as a reusable template.
-- saved_name is null for regular auto-created weekly plans; non-null means the user saved it.

alter table public.meal_plans
  add column if not exists saved_name text;

-- A user may not have two saved plans with the same name.
alter table public.meal_plans
  add constraint meal_plans_user_saved_name_unique
  unique (user_id, saved_name);

-- Efficient lookup when listing a user's saved plans.
create index if not exists meal_plans_user_saved_idx
  on public.meal_plans (user_id)
  where saved_name is not null;
