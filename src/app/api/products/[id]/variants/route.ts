import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { setInventoryLevel } from '@/lib/shopify'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { data, error } = await supabase()
      .from('fafa_product_variants')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching product variants:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product variants' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { variant_id, inventory_quantity, price_override } = body

    if (!variant_id) {
      return NextResponse.json(
        { success: false, error: 'variant_id is required' },
        { status: 400 }
      )
    }

    // Get the variant to find shopify_variant_id
    const { data: variant, error: fetchError } = await supabase()
      .from('fafa_product_variants')
      .select('*')
      .eq('id', variant_id)
      .eq('product_id', id)
      .single()

    if (fetchError || !variant) {
      return NextResponse.json(
        { success: false, error: 'Variant not found' },
        { status: 404 }
      )
    }

    // Update inventory in Shopify if inventory_quantity changed
    if (inventory_quantity !== undefined && variant.shopify_variant_id) {
      const locationId = Number(process.env.SHOPIFY_LOCATION_ID)
      if (locationId) {
        // Get inventory_item_id from Shopify variant
        const shopifyRes = await fetch(
          `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/variants/${variant.shopify_variant_id}.json`,
          {
            headers: {
              'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
            },
          }
        )
        if (shopifyRes.ok) {
          const { variant: shopifyVariant } = await shopifyRes.json()
          if (shopifyVariant.inventory_item_id) {
            await setInventoryLevel(
              shopifyVariant.inventory_item_id,
              locationId,
              inventory_quantity
            )
          }
        }
      }
    }

    // Update database
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (inventory_quantity !== undefined) updateData.inventory_quantity = inventory_quantity
    if (price_override !== undefined) updateData.price_override = price_override

    const { data, error } = await supabase()
      .from('fafa_product_variants')
      .update(updateData)
      .eq('id', variant_id)
      .eq('product_id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating product variant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update product variant' },
      { status: 500 }
    )
  }
}
