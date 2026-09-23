-- Add a personal 1-5 star rating to recipes. Null means not yet rated.
alter table public.recipes
  add column if not exists rating smallint check (rating is null or rating between 1 and 5);
