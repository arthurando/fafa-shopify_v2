-- Phase F: Inventory Management
-- Create inventory cache table for fast reads

CREATE TABLE fafa_inventory_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES fafa_products(id) ON DELETE CASCADE,
  variant_id TEXT,
  shopify_inventory_item_id BIGINT NOT NULL,
  available INTEGER NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure each product+variant combination is unique
  CONSTRAINT unique_product_variant UNIQUE (product_id, variant_id)
);

-- Indexes for fast queries
CREATE INDEX idx_inventory_product_id ON fafa_inventory_cache(product_id);
CREATE INDEX idx_inventory_available ON fafa_inventory_cache(available);

-- Insert default low stock threshold setting
INSERT INTO fafa_app_settings (setting_key, setting_value)
VALUES ('low_stock_threshold', '3')
ON CONFLICT (setting_key) DO NOTHING;
