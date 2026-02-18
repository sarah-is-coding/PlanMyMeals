-- Extensions
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Recipes
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  source_url text,
  prep_minutes int,
  cook_minutes int,
  servings int,
  tags text[],
  instructions text,
  created_at timestamptz default now(),
  unique (user_id, title)
);
alter table public.recipes enable row level security;

-- Recipe ingredients
create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes on delete cascade,
  ingredient_name text not null,
  quantity text,
  unit text,
  notes text,
  created_at timestamptz default now()
);
alter table public.recipe_ingredients enable row level security;

-- Meal plans
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  start_date date,
  notes text,
  created_at timestamptz default now(),
  unique (user_id, title)
);
alter table public.meal_plans enable row level security;

-- Meal plan items
create table if not exists public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans on delete cascade,
  recipe_id uuid references public.recipes on delete set null,
  planned_for date not null,
  meal_type text check (meal_type in ('breakfast','lunch','dinner','other')),
  servings_override int check (servings_override is null or servings_override > 0),
  notes text,
  created_at timestamptz default now()
);
alter table public.meal_plan_items enable row level security;

-- Grocery lists
create table if not exists public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  meal_plan_id uuid references public.meal_plans on delete set null,
  title text not null,
  created_at timestamptz default now()
);
alter table public.grocery_lists enable row level security;

-- Grocery items
create table if not exists public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.grocery_lists on delete cascade,
  ingredient_name text not null,
  quantity text,
  unit text,
  is_checked boolean default false,
  created_at timestamptz default now()
);
alter table public.grocery_items enable row level security;

-- Simple per-user RLS policy helper
do $$
begin
  perform 1 from pg_roles where rolname = 'authenticated';
end$$;

create policy "Users manage own profiles" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own recipes" on public.recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Inherit recipe access via recipe_id" on public.recipe_ingredients
  for all using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));

create policy "Users manage own meal plans" on public.meal_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Inherit plan access via meal_plan_id" on public.meal_plan_items
  for all using (exists (select 1 from public.meal_plans m where m.id = meal_plan_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.meal_plans m where m.id = meal_plan_id and m.user_id = auth.uid()));

create policy "Users manage own lists" on public.grocery_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Inherit list access via list_id" on public.grocery_items
  for all using (exists (select 1 from public.grocery_lists g where g.id = list_id and g.user_id = auth.uid()))
  with check (exists (select 1 from public.grocery_lists g where g.id = list_id and g.user_id = auth.uid()));

-- Helpful indexes
create index if not exists recipes_user_id_idx on public.recipes (user_id);
create index if not exists meal_plans_user_id_idx on public.meal_plans (user_id);
create index if not exists grocery_lists_user_id_idx on public.grocery_lists (user_id);
create index if not exists recipe_ingredients_recipe_id_idx on public.recipe_ingredients (recipe_id);
create index if not exists meal_plan_items_meal_plan_id_idx on public.meal_plan_items (meal_plan_id);
create index if not exists meal_plan_items_recipe_id_idx on public.meal_plan_items (recipe_id);
create index if not exists grocery_items_list_id_idx on public.grocery_items (list_id);
create index if not exists grocery_lists_meal_plan_id_idx on public.grocery_lists (meal_plan_id);
