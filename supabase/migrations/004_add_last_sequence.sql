-- Add last_sequence counter to product sets so deletions don't reset numbering
ALTER TABLE fafa_product_sets ADD COLUMN IF NOT EXISTS last_sequence integer NOT NULL DEFAULT 0;

-- Backfill: set last_sequence to the highest existing number for each set
UPDATE fafa_product_sets ps
SET last_sequence = COALESCE(
  (SELECT MAX(
    CAST(REGEXP_REPLACE(p.product_code, '^' || ps.prefix, '') AS integer)
  )
  FROM fafa_products p
  WHERE p.set_id = ps.id),
  0
);
