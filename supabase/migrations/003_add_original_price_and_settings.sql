-- Add original_price (compare_at_price) to fafa_product_sets
ALTER TABLE fafa_product_sets ADD COLUMN IF NOT EXISTS original_price numeric;

-- Seed new settings for Shopify defaults
INSERT INTO fafa_app_settings (key, value) VALUES
  ('product_type', '一般商品'),
  ('vendor', 'Spa - Fafa'),
  ('collection', '【直播2月10日】馬年賀年花花開好運'),
  ('metafield_brands', ''),
  ('metafield_estimate_arrival', ''),
  ('metafield_cutoff', '')
ON CONFLICT (key) DO NOTHING;
