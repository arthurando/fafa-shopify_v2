import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { getShopifyProduct, deleteProductImage } from '@/lib/shopify'

const updateProductSchema = z.object({
  description_custom: z.string().optional(),
  status: z.enum(['active', 'archived']).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const parsed = updateProductSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { data, error } = await supabase()
    .from('fafa_products')
    .update(parsed.data)
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
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabase()
    .from('fafa_products')
    .select(`
      *,
      fafa_product_sets (
        name,
        prefix,
        price
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  // Fetch Shopify product to get images
  let shopifyImages: Array<{ id: number; src: string }> = []
  if (data.shopify_product_id) {
    try {
      const shopifyProduct = await getShopifyProduct(data.shopify_product_id)
      shopifyImages = shopifyProduct.images || []
    } catch (err) {
      console.error('Failed to fetch Shopify images:', err)
    }
  }

  const product = {
    ...data,
    set_name: data.fafa_product_sets?.name,
    set_prefix: data.fafa_product_sets?.prefix,
    set_price: data.fafa_product_sets?.price,
    shopify_images: shopifyImages,
    fafa_product_sets: undefined,
  }

  return NextResponse.json({ success: true, data: product })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = new URL(request.url)
  const imageId = url.searchParams.get('imageId')

  if (!imageId) {
    return NextResponse.json(
      { success: false, error: 'imageId parameter required' },
      { status: 400 }
    )
  }

  // Get product to find shopify_product_id
  const { data: product, error: dbError } = await supabase()
    .from('fafa_products')
    .select('shopify_product_id')
    .eq('id', id)
    .single()

  if (dbError || !product) {
    return NextResponse.json(
      { success: false, error: 'Product not found' },
      { status: 404 }
    )
  }

  try {
    await deleteProductImage(Number(product.shopify_product_id), Number(imageId))
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete image'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
