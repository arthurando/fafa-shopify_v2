# Fafa Shopify - Product Creation App

Mobile-first Next.js app for quickly creating Shopify products from a phone.

## Stack

- **Framework:** Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
- **Database:** Supabase (project ref: `kzmxikzjnumwbbiwgvfu`)
- **Shopify:** REST Admin API (2024-01) - direct API calls, not MCP
- **Storage:** Cloudflare R2 (bucket: `sttvideo`) via @aws-sdk/client-s3
- **Hosting:** Vercel (auto-deploy from GitHub)

## Deployment

- **GitHub:** `arthurando/fafa-shopify` (private)
- **Vercel Project:** `prj_EtuCaePU0db71xsnYIaHoom56Q8b`
- **Production URL:** `https://fafa-shopify-arthurs-projects-7ad87361.vercel.app`
- **Shopify Location ID:** `78369227006`

## Design

- **Mobile-first responsive UI** - all interfaces must be responsive
- Bottom navigation with 4 tabs: Create, Products, Sets, Settings
- Touch targets minimum 44px, `text-base` for all inputs
- `max-w-lg` container with `px-4` padding

## Shopify Product Defaults

- **Status:** Draft
- **Inventory Policy:** DENY (stop selling when out of stock)
- **Inventory Management:** Shopify
- **Inventory on hand:** 1 unit at location 78369227006
- **Cost per item:** From set's cost field
- **URL Handle:** Product code lowercase (e.g., `ha001`)
- **Title format:** `馬年賀年花【CODE】`
- **Metafields:** `custom.stt_code`, `custom._brands`, `custom.estimate_arrival`, `custom._cutoff`

## Supabase Table Naming Convention

**CRITICAL: All tables MUST use the `fafa_` prefix to prevent cross-project confusion.**

See `~/.claude/CLAUDE.md` section "Supabase Table Naming Conventions" for full guidelines.

**Rules for this project:**
- ✓ Correct: `fafa_product_sets`, `fafa_products`, `fafa_app_settings`
- ✗ Wrong: `product_sets`, `products`, `settings` (too vague, could conflict with other projects)

**Before creating ANY new table:**
1. Verify it uses the `fafa_` prefix
2. Ensure the name is descriptive enough to distinguish from other projects
3. Document the table in the Database Tables section below

---

## Database Tables

**Supabase Project:** `kzmxikzjnumwbbiwgvfu`

### Core Product Tables

- **`fafa_product_sets`** - Product set configuration
  - Fields: prefix, price, original_price, cost, last_sequence
  - Purpose: Manages product set templates and pricing

- **`fafa_products`** - Product records
  - Fields: set_id (FK), product_code, shopify_product_id
  - Purpose: Individual products created from sets

- **`fafa_product_variants`** - Product variant combinations
  - Purpose: Tracks variant SKUs and combinations (color/size options)

- **`fafa_variant_options`** - Variant options (color/size)
  - Purpose: Individual variant option values (e.g., "Red", "Blue", "M", "L")

### Configuration & Reference Tables

- **`fafa_app_settings`** - App settings (key-value)
  - Fields: product_type, vendor, collection, metafields, description
  - Purpose: Global app configuration

- **`fafa_brands`** - Brand data
  - Purpose: Brand reference data for product organization

- **`fafa_collections`** - Collection data
  - Purpose: Shopify collection mapping and management

- **`fafa_users`** - User authentication
  - Purpose: User accounts and authentication management

### Operational Tables

- **`fafa_inventory_cache`** - Inventory tracking
  - Purpose: Cache of product inventory levels for performance

## Key Patterns

- **Atomic sequence:** `increment_set_sequence()` Postgres function prevents race conditions
- **Never reuse codes:** Deletion doesn't reset sequence
- **Prefix rename:** Updates product codes in DB + Shopify title + handle + stt_code metafield
- **Price sync:** Changing set price/original_price syncs to all Shopify products in set

## Migrations

Located in `supabase/migrations/` (001-006), applied via `supabase db push`
