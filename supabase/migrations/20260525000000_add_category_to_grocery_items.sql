-- Add ingredient category to grocery_items so saved lists can be
-- displayed grouped by aisle (produce, dairy & eggs, pantry, etc.)
alter table public.grocery_items
  add column if not exists category text;
