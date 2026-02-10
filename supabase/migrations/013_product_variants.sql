-- Phase C: Two-Level Variants (Color × Size)

-- Variant options (reusable color/size options)
CREATE TABLE fafa_variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_type TEXT NOT NULL CHECK (option_type IN ('color', 'size')),
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (option_type, name)
);

CREATE INDEX idx_fafa_variant_options_type_order ON fafa_variant_options (option_type, display_order);

-- Product variants (one row per color×size combination)
CREATE TABLE fafa_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES fafa_products(id) ON DELETE CASCADE,
  color TEXT,
  size TEXT,
  shopify_variant_id TEXT,
  sku TEXT,
  price_override NUMERIC(10, 2),
  inventory_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, color, size)
);

CREATE INDEX idx_fafa_product_variants_product_id ON fafa_product_variants (product_id);
CREATE INDEX idx_fafa_product_variants_shopify_id ON fafa_product_variants (shopify_variant_id);

-- Add has_variants flag to products
ALTER TABLE fafa_products
  ADD COLUMN has_variants BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_fafa_products_has_variants ON fafa_products (has_variants);
