-- Add composite unique constraint to prevent duplicate product codes within same set
-- This prevents race conditions during concurrent product code generation

-- Drop the existing product_code unique constraint if it exists
ALTER TABLE fafa_products DROP CONSTRAINT IF EXISTS fafa_products_product_code_key;

-- Add composite unique constraint on (set_id, product_code)
-- This ensures product codes are unique within each set, not globally
ALTER TABLE fafa_products ADD CONSTRAINT fafa_products_set_id_product_code_unique
  UNIQUE (set_id, product_code);

-- Add index for faster lookups on product_code alone (since we removed the unique constraint)
CREATE INDEX IF NOT EXISTS idx_fafa_products_product_code ON fafa_products(product_code);
