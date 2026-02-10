import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { uploadProductImage } from '@/lib/shopify'

const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { data: product, error: fetchError } = await supabase()
      .from('fafa_products')
      .select('shopify_product_id, product_code')
      .eq('id', id)
      .single()

    if (fetchError || !product || !product.shopify_product_id) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const photos = formData.getAll('photos') as File[]

    if (photos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one photo is required' },
        { status: 400 }
      )
    }

    for (const photo of photos) {
      if (!ALLOWED_IMAGE_TYPES.includes(photo.type)) {
        return NextResponse.json(
          { success: false, error: `Invalid image type: ${photo.type}. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}` },
          { status: 400 }
        )
      }
      if (photo.size > MAX_PHOTO_SIZE) {
        return NextResponse.json(
          { success: false, error: `Photo too large: ${(photo.size / 1024 / 1024).toFixed(2)}MB. Max: ${MAX_PHOTO_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        )
      }
    }

    const uploadedUrls: string[] = []
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      const buffer = Buffer.from(await photo.arrayBuffer())
      const base64 = buffer.toString('base64')
      const url = await uploadProductImage(
        Number(product.shopify_product_id),
        base64,
        `${product.product_code}_extra_${i + 1}.jpg`
      )
      uploadedUrls.push(url)
    }

    return NextResponse.json({ success: true, data: { urls: uploadedUrls } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
