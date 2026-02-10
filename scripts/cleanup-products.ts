import { createClient } from '@supabase/supabase-js'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN!
const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN!
const apiVersion = '2024-01'

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

async function shopifyFetch(path: string, options: RequestInit = {}) {
  const url = `https://${shopifyDomain}/admin/api/${apiVersion}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': shopifyToken,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`Shopify API error ${res.status}: ${errorBody}`)
  }

  return res.json()
}

async function archiveShopifyProduct(productId: string) {
  const numericId = Number(productId)
  await shopifyFetch(`/products/${numericId}.json`, {
    method: 'PUT',
    body: JSON.stringify({
      product: {
        id: numericId,
        status: 'archived',
      },
    }),
  })
}

async function deleteVideoFromR2(productCode: string) {
  const client = getR2Client()
  const key = `${productCode}.mp4`

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      })
    )
    console.log(`  ✓ Deleted video: ${key}`)
  } catch (err) {
    console.log(`  ⚠ Video not found or error: ${key}`)
  }
}

async function main() {
  console.log('🗑️  Starting cleanup...\n')

  // 1. Get all products
  const { data: products, error: fetchError } = await supabase
    .from('fafa_products')
    .select('id, product_code, shopify_product_id, has_video, set_id')
    .order('created_at', { ascending: true })

  if (fetchError) {
    console.error('❌ Error fetching products:', fetchError)
    process.exit(1)
  }

  if (!products || products.length === 0) {
    console.log('ℹ️  No products to delete')
    return
  }

  console.log(`Found ${products.length} products to delete:\n`)

  // 2. Delete each product
  for (const product of products) {
    console.log(`Deleting ${product.product_code}...`)

    // Archive from Shopify
    if (product.shopify_product_id) {
      try {
        await archiveShopifyProduct(product.shopify_product_id)
        console.log(`  ✓ Archived in Shopify`)
      } catch (err) {
        console.log(`  ⚠ Shopify archive failed:`, err instanceof Error ? err.message : err)
      }
    }

    // Delete video from R2
    if (product.has_video) {
      await deleteVideoFromR2(product.product_code)
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('fafa_products')
      .delete()
      .eq('id', product.id)

    if (deleteError) {
      console.log(`  ❌ Failed to delete from DB:`, deleteError.message)
    } else {
      console.log(`  ✓ Deleted from database`)
    }

    console.log('')
  }

  // 3. Reset sequences for all sets
  const { data: sets, error: setsError } = await supabase
    .from('fafa_product_sets')
    .select('id, prefix, last_sequence')

  if (setsError) {
    console.error('❌ Error fetching sets:', setsError)
    process.exit(1)
  }

  console.log('🔄 Resetting sequence counters...\n')

  for (const set of sets || []) {
    const { error: updateError } = await supabase
      .from('fafa_product_sets')
      .update({ last_sequence: 0 })
      .eq('id', set.id)

    if (updateError) {
      console.log(`  ❌ Failed to reset ${set.prefix}:`, updateError.message)
    } else {
      console.log(`  ✓ Reset ${set.prefix} from ${set.last_sequence} → 0`)
    }
  }

  console.log('\n✅ Cleanup complete!')
}

main().catch(console.error)
