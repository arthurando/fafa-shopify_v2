import { NextResponse, NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { setInventoryLevel } from '@/lib/shopify'

const SHOPIFY_LOCATION_ID = 78369227006

interface BulkUpdateItem {
  productId: string
  variantId?: string | null
  quantity: number
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { updates } = body as { updates: BulkUpdateItem[] }

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid updates array' },
      { status: 400 }
    )
  }

  // Validate all updates
  for (const update of updates) {
    if (!update.productId || typeof update.quantity !== 'number' || update.quantity < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid update format' },
        { status: 400 }
      )
    }
  }

  try {
    // Process all updates with Promise.allSettled for partial success
    const results = await Promise.allSettled(
      updates.map(async (update) => {
        // Get inventory item from cache
        let query = supabase()
          .from('fafa_inventory_cache')
          .select('shopify_inventory_item_id, product_id')
          .eq('product_id', update.productId)

        if (update.variantId) {
          query = query.eq('variant_id', update.variantId)
        } else {
          query = query.is('variant_id', null)
        }

        const { data: cacheData, error: cacheError } = await query.single()

        if (cacheError || !cacheData) {
          throw new Error(`Inventory record not found for product ${update.productId}`)
        }

        // Update Shopify inventory
        await setInventoryLevel(
          cacheData.shopify_inventory_item_id,
          SHOPIFY_LOCATION_ID,
          update.quantity
        )

        // Update cache
        const updateQuery = supabase()
          .from('fafa_inventory_cache')
          .update({
            available: update.quantity,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('product_id', update.productId)

        if (update.variantId) {
          updateQuery.eq('variant_id', update.variantId)
        } else {
          updateQuery.is('variant_id', null)
        }

        const { error: updateError } = await updateQuery

        if (updateError) {
          throw new Error(`Failed to update cache: ${updateError.message}`)
        }

        return { productId: update.productId, success: true }
      })
    )

    // Count successes and failures
    const successes = results.filter(r => r.status === 'fulfilled').length
    const failures = results.filter(r => r.status === 'rejected')
    const errors = failures.map(f =>
      f.status === 'rejected' ? f.reason?.message || 'Unknown error' : ''
    )

    return NextResponse.json({
      success: failures.length === 0,
      updated: successes,
      failed: failures.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Updated ${successes} products${failures.length > 0 ? `, ${failures.length} failed` : ''}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
