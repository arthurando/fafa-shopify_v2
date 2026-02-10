-- Migration 014: Enhanced Pricing Fields
-- Add shipping cost, customs cost, and exchange rate to product sets

ALTER TABLE fafa_product_sets
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS customs_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 1;

-- Add default exchange rate setting
INSERT INTO fafa_app_settings (key, value)
VALUES ('default_exchange_rate', '1')
ON CONFLICT (key) DO NOTHING;
