-- Backfill category on grocery_items rows that were saved before the
-- category column was added. Matches on normalised ingredient name so
-- any item whose name exists in the ingredients catalogue gets its
-- category filled in. Items with no matching ingredient stay NULL
-- (displayed as "Other" in the UI).
UPDATE public.grocery_items gi
SET category = i.category
FROM public.ingredients i
WHERE lower(trim(gi.ingredient_name)) = i.name
  AND gi.category IS NULL;
