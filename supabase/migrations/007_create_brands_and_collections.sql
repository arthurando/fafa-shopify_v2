-- Create fafa_brands table for storing custom._brands values
CREATE TABLE IF NOT EXISTS fafa_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create fafa_collections table for storing Shopify collection titles
CREATE TABLE IF NOT EXISTS fafa_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for alphabetical sorting
CREATE INDEX idx_fafa_brands_name ON fafa_brands (name);
CREATE INDEX idx_fafa_collections_title ON fafa_collections (title);
