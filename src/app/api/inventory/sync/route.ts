import { NextResponse, NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getInventoryLevels } from '@/lib/shopify'

const SHOPIFY_LOCATION_ID = 78369227006
const BATCH_SIZE = 50
const BATCH_DELAY_MS = 1000

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request: NextRequest) {
  try {
    // Get all products with their inventory item IDs
    const { data: products, error: productsError } = await supabase()
      .from('fafa_products')
      .select('id, product_code, shopify_product_id, shopify_inventory_item_id')
      .eq('is_archived', false)
      .not('shopify_inventory_item_id', 'is', null)

    if (productsError) {
      return NextResponse.json(
        { success: false, error: productsError.message },
        { status: 500 }
      )
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        errors: 0,
        message: 'No products to sync',
      })
    }

    let syncedCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process in batches of 50
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE)
      const inventoryItemIds = batch
        .map(p => p.shopify_inventory_item_id)
        .filter((id): id is number => id !== null)

      try {
        // Fetch inventory levels from Shopify
        const inventoryLevels = await getInventoryLevels(
          SHOPIFY_LOCATION_ID,
          inventoryItemIds
        )

        // Create a map for quick lookup
        const inventoryMap = new Map(
          inventoryLevels.map(level => [level.inventory_item_id, level.available])
        )

        // Upsert inventory records
        const upsertData = batch.map(product => ({
          product_id: product.id,
          variant_id: null,
          shopify_inventory_item_id: product.shopify_inventory_item_id!,
          available: inventoryMap.get(product.shopify_inventory_item_id!) ?? 0,
          last_synced_at: new Date().toISOString(),
        }))

        const { error: upsertError } = await supabase()
          .from('fafa_inventory_cache')
          .upsert(upsertData, {
            onConflict: 'product_id,variant_id',
            ignoreDuplicates: false,
          })

        if (upsertError) {
          errorCount += batch.length
          errors.push(`Batch ${i / BATCH_SIZE + 1}: ${upsertError.message}`)
        } else {
          syncedCount += batch.length
        }
      } catch (error) {
        errorCount += batch.length
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Batch ${i / BATCH_SIZE + 1}: ${message}`)
      }

      // Delay between batches to avoid rate limits
      if (i + BATCH_SIZE < products.length) {
        await delay(BATCH_DELAY_MS)
      }
    }

    return NextResponse.json({
      success: errorCount === 0,
      synced: syncedCount,
      errors: errorCount,
      error_details: errors.length > 0 ? errors : undefined,
      message: `Synced ${syncedCount} products${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
