-- Add hangtag_keys column to fafa_products table
ALTER TABLE fafa_products
ADD COLUMN IF NOT EXISTS hangtag_keys TEXT[] DEFAULT '{}';

COMMENT ON COLUMN fafa_products.hangtag_keys IS 'R2 object keys for hangtag photos stored in stt-hangtag bucket';
