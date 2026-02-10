# Hangtag Photos Setup Instructions

Phase D: Hangtag Photos (R2 Storage) has been implemented. To complete the setup, you need to perform the following manual steps:

## 1. Create R2 Bucket

1. Go to Cloudflare Dashboard → R2
2. Create a new bucket named: `stt-hangtag`
3. Configure the bucket settings (same as your existing `sttvideo` bucket)

## 2. Update Vercel Environment Variables

Add the following environment variable to your Vercel project:

```
R2_HANGTAG_BUCKET_NAME=stt-hangtag
```

Steps:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - Name: `R2_HANGTAG_BUCKET_NAME`
   - Value: `stt-hangtag`
   - Environment: Production, Preview, Development (check all)
3. Click "Save"

## 3. Apply Database Migration

Run the Supabase migration to add the `hangtag_keys` column:

```bash
cd C:\Users\user\Claude Project\projects\fafa-shopify
supabase db push
```

Or manually execute the migration file:
- `supabase/migrations/011_hangtag_photos.sql`

## 4. Redeploy Vercel

After adding the environment variable, trigger a new deployment:

```bash
vercel --prod
```

Or push to GitHub to trigger auto-deployment.

## Implementation Summary

### What Was Implemented

1. **Database Migration** (`011_hangtag_photos.sql`):
   - Added `hangtag_keys TEXT[]` column to `fafa_products` table
   - Stores R2 object keys for hangtag photos in stt-hangtag bucket

2. **R2 Library Updates** (`src/lib/r2.ts`):
   - All functions now accept optional `bucket` parameter
   - Defaults to `R2_BUCKET_NAME` if not provided
   - Allows override for hangtag uploads

3. **Create Page** (`src/app/page.tsx`):
   - New file input section labeled "吊牌 (Hangtag)"
   - Purple accent color (purple-600) to distinguish from main photos
   - Multiple photo upload support with preview grid
   - Hangtag photos sent in FormData as `hangtag_photos` field

4. **Create API** (`src/app/api/products/create/route.ts`):
   - Extracts hangtag photos from FormData
   - Uploads to R2 stt-hangtag bucket with key pattern: `{productCode}/hangtag_{index}.jpg`
   - Saves keys array to database `hangtag_keys` column

5. **Hangtag API Routes** (`src/app/api/products/[id]/hangtag/route.ts`):
   - GET: List hangtag photo keys for product
   - POST: Upload additional hangtag photos (append to array)
   - DELETE: Remove specific hangtag photo (requires `key` query param)

6. **Edit Page** (`src/app/products/[id]/page.tsx`):
   - Display existing hangtag photos (horizontal scroll)
   - Upload new hangtag photos
   - Delete existing hangtag photos
   - Purple theme for hangtag section

7. **R2 Image Serving** (`src/app/api/r2/route.ts`):
   - GET endpoint for serving images from any R2 bucket
   - Query params: `key` (required), `bucket` (optional)
   - Example: `/api/r2?key=HA001/hangtag_1.jpg&bucket=stt-hangtag`

### Key Patterns Used

- **Immutability**: Always create new arrays with spread operator `[...existing, newItem]`
- **Mobile-first**: Horizontal scroll for photo grids, 44px+ touch targets
- **TypeScript**: Proper types for all functions
- **Purple theme**: All hangtag UI uses purple-600/purple-700 to distinguish from blue main photos

### Verification Steps

1. Create a new product with hangtag photos → stored in stt-hangtag bucket
2. Edit page shows hangtag photos separately from main photos
3. Can add/delete hangtag photos from edit page
4. Hangtag photos display with purple border and delete buttons

## Notes

- Hangtag photos are stored separately from main product photos
- Uses separate R2 bucket for better organization
- Purple color scheme distinguishes hangtag photos from main photos throughout UI
- All operations follow immutable patterns (no array mutations)
