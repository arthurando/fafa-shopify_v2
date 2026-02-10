-- Add cost (COGS) to product sets
ALTER TABLE fafa_product_sets ADD COLUMN IF NOT EXISTS cost numeric;
