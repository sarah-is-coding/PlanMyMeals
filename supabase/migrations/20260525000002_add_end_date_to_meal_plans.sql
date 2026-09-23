-- Add end_date to meal_plans so plan length is no longer implicitly 1 week.
-- All existing plans and new plans created by the current UI still default to
-- start_date + 6 days (7-day week).  When the UI grows support for longer or
-- shorter plans the app can simply write a different end_date on insert.

ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS end_date date;

-- Backfill every existing weekly plan (start_date IS NOT NULL → end = start + 6)
UPDATE public.meal_plans
SET end_date = start_date + INTERVAL '6 days'
WHERE start_date IS NOT NULL
  AND end_date IS NULL;
