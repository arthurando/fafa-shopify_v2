import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { archiveShopifyProduct } from '@/lib/shopify'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Get the product
    const { data: product, error: fetchError } = await supabase()
      .from('fafa_products')
      .select('shopify_product_id')
      .eq('id', id)
      .single()

    if (fetchError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Archive on Shopify
    if (product.shopify_product_id) {
      await archiveShopifyProduct(product.shopify_product_id)
    }

    // Archive in DB
    const { data, error } = await supabase()
      .from('fafa_products')
      .update({ status: 'archived', is_archived: true })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
