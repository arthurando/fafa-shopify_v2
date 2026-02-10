import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { updateShopifyProduct, updateProductMetafield } from '@/lib/shopify'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { oldPrefix, newPrefix } = body as { oldPrefix?: string; newPrefix?: string }
    const prefixChanged = oldPrefix && newPrefix && oldPrefix !== newPrefix

    // Get the set
    const { data: set, error: setError } = await supabase()
      .from('fafa_product_sets')
      .select('*')
      .eq('id', id)
      .single()

    if (setError || !set) {
      return NextResponse.json({ success: false, error: 'Set not found' }, { status: 404 })
    }

    // Get all products in this set
    const { data: products, error: productsError } = await supabase()
      .from('fafa_products')
      .select('*')
      .eq('set_id', id)
      .eq('is_archived', false)

    if (productsError) {
      return NextResponse.json({ success: false, error: productsError.message }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ success: true, data: { synced: 0 } })
    }

    let synced = 0
    const errors: string[] = []

    for (const product of products) {
      try {
        let newProductCode = product.product_code

        // If prefix changed, compute new product code
        if (prefixChanged) {
          const numPart = product.product_code.replace(oldPrefix, '')
          newProductCode = `${newPrefix}${numPart}`

          // Update product code in database
          await supabase()
            .from('fafa_products')
            .update({ product_code: newProductCode })
            .eq('id', product.id)
        }

        // Update Shopify product if it has a shopify_product_id
        if (product.shopify_product_id) {
          const newTitle = `馬年賀年花【${newProductCode}】`

          await updateShopifyProduct({
            productId: product.shopify_product_id,
            title: newTitle,
            ...(prefixChanged ? { handle: newProductCode } : {}),
            price: Number(set.price),
            compareAtPrice: set.original_price ? Number(set.original_price) : null,
          })

          // Update stt_code metafield if prefix changed
          if (prefixChanged) {
            await updateProductMetafield(
              product.shopify_product_id,
              'custom',
              'stt_code',
              newProductCode
            )
          }
        }

        synced++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`${product.product_code}: ${msg}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: { synced, total: products.length, errors: errors.length > 0 ? errors : undefined },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
