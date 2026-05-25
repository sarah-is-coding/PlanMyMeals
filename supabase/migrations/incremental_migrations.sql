-- ============================================================
-- Canonical ingredients table
-- ============================================================
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text check (category in (
    'produce',
    'meat & seafood',
    'dairy & eggs',
    'bakery & bread',
    'pantry',
    'frozen',
    'beverages',
    'other'
  )),
  default_unit text,
  created_at timestamptz default now()
);

alter table public.ingredients enable row level security;

-- Any authenticated user can read the shared ingredient list
create policy "Authenticated users can read ingredients"
  on public.ingredients for select
  using (auth.role() = 'authenticated');

-- Any authenticated user can add new canonical ingredients
create policy "Authenticated users can insert ingredients"
  on public.ingredients for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- Backfill: create canonical entries from existing recipe_ingredients
-- ============================================================
insert into public.ingredients (name)
select distinct lower(trim(ingredient_name))
from public.recipe_ingredients
where trim(ingredient_name) <> ''
on conflict (name) do nothing;

-- ============================================================
-- Alter recipe_ingredients: add ingredient_id FK + quantity_numeric
-- ============================================================

-- Add ingredient_id nullable first so backfill can run
alter table public.recipe_ingredients
  add column if not exists ingredient_id uuid references public.ingredients on delete restrict;

-- Link existing rows to the canonical entries we just created
update public.recipe_ingredients ri
set ingredient_id = i.id
from public.ingredients i
where lower(trim(ri.ingredient_name)) = i.name;

-- Now enforce NOT NULL
alter table public.recipe_ingredients
  alter column ingredient_id set not null;

-- Parallel numeric quantity column (NULL = unparseable / "to taste" / freeform)
alter table public.recipe_ingredients
  add column if not exists quantity_numeric numeric
    check (quantity_numeric is null or quantity_numeric > 0);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists ingredients_name_idx
  on public.ingredients (name);

create index if not exists recipe_ingredients_ingredient_id_idx
  on public.recipe_ingredients (ingredient_id);
