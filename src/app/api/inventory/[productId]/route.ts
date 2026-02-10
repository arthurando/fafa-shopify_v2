import { NextResponse, NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { setInventoryLevel } from '@/lib/shopify'

const SHOPIFY_LOCATION_ID = 78369227006

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const { productId } = await context.params
  const body = await request.json()
  const { variant_id, quantity } = body

  if (typeof quantity !== 'number' || quantity < 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid quantity' },
      { status: 400 }
    )
  }

  try {
    // Get inventory item from cache
    let query = supabase()
      .from('fafa_inventory_cache')
      .select('shopify_inventory_item_id')
      .eq('product_id', productId)

    if (variant_id) {
      query = query.eq('variant_id', variant_id)
    } else {
      query = query.is('variant_id', null)
    }

    const { data: cacheData, error: cacheError } = await query.single()

    if (cacheError || !cacheData) {
      return NextResponse.json(
        { success: false, error: 'Inventory record not found' },
        { status: 404 }
      )
    }

    // Update Shopify inventory
    await setInventoryLevel(
      cacheData.shopify_inventory_item_id,
      SHOPIFY_LOCATION_ID,
      quantity
    )

    // Update cache
    const updateQuery = supabase()
      .from('fafa_inventory_cache')
      .update({
        available: quantity,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('product_id', productId)

    if (variant_id) {
      updateQuery.eq('variant_id', variant_id)
    } else {
      updateQuery.is('variant_id', null)
    }

    const { error: updateError } = await updateQuery

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
