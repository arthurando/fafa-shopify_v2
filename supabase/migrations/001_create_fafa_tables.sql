-- fafa_product_sets
CREATE TABLE IF NOT EXISTS fafa_product_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  prefix TEXT NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- fafa_products
CREATE TABLE IF NOT EXISTS fafa_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES fafa_product_sets(id),
  product_code TEXT NOT NULL UNIQUE,
  shopify_product_id TEXT,
  description_custom TEXT,
  has_video BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- fafa_app_settings
CREATE TABLE IF NOT EXISTS fafa_app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed universal description
INSERT INTO fafa_app_settings (key, value)
VALUES ('universal_product_description', '歡迎選購！如有任何查詢，歡迎隨時聯繫我們。')
ON CONFLICT (key) DO NOTHING;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fafa_product_sets_updated_at
  BEFORE UPDATE ON fafa_product_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER fafa_products_updated_at
  BEFORE UPDATE ON fafa_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER fafa_app_settings_updated_at
  BEFORE UPDATE ON fafa_app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fafa_products_set_id ON fafa_products(set_id);
CREATE INDEX IF NOT EXISTS idx_fafa_products_code ON fafa_products(product_code);
CREATE INDEX IF NOT EXISTS idx_fafa_products_status ON fafa_products(status);
