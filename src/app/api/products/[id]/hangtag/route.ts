import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { uploadImageToR2, deleteFromR2 } from '@/lib/r2'

const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// GET: List hangtag photo keys for product
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: product, error } = await supabase()
      .from('fafa_products')
      .select('hangtag_keys, product_code')
      .eq('id', id)
      .single()

    if (error || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        hangtag_keys: product.hangtag_keys || [],
        product_code: product.product_code,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

// POST: Upload additional hangtag photos (append to array)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
          { success: false, error: `Invalid image type: ${photo.type}` },
          { status: 400 }
        )
      }
      if (photo.size > MAX_PHOTO_SIZE) {
        return NextResponse.json(
          { success: false, error: `Photo too large: ${(photo.size / 1024 / 1024).toFixed(2)}MB` },
          { status: 400 }
        )
      }
    }

    // Get existing product
    const { data: product, error: fetchError } = await supabase()
      .from('fafa_products')
      .select('hangtag_keys, product_code')
      .eq('id', id)
      .single()

    if (fetchError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const existingKeys = product.hangtag_keys || []
    const productCode = product.product_code
    const hangtagBucket = process.env.R2_HANGTAG_BUCKET_NAME || 'stt-hangtag'

    // Generate new keys and upload in parallel
    const startIndex = existingKeys.length
    const newKeys: string[] = []
    const uploadTasks: Promise<void>[] = []

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      const key = `${productCode}/hangtag_${startIndex + i + 1}.jpg`
      newKeys.push(key)

      uploadTasks.push(
        (async () => {
          const buffer = Buffer.from(await photo.arrayBuffer())
          await uploadImageToR2(key, buffer, photo.type, hangtagBucket)
        })()
      )
    }

    await Promise.all(uploadTasks)

    // Update database with new keys appended
    const updatedKeys = [...existingKeys, ...newKeys]
    const { error: updateError } = await supabase()
      .from('fafa_products')
      .update({ hangtag_keys: updatedKeys })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { hangtag_keys: updatedKeys },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

// DELETE: Remove specific hangtag photo (requires key query param)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const keyToDelete = searchParams.get('key')

    if (!keyToDelete) {
      return NextResponse.json(
        { success: false, error: 'key query parameter is required' },
        { status: 400 }
      )
    }

    // Get existing product
    const { data: product, error: fetchError } = await supabase()
      .from('fafa_products')
      .select('hangtag_keys')
      .eq('id', id)
      .single()

    if (fetchError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const existingKeys = product.hangtag_keys || []
    if (!existingKeys.includes(keyToDelete)) {
      return NextResponse.json(
        { success: false, error: 'Key not found in product' },
        { status: 404 }
      )
    }

    // Remove from R2
    const hangtagBucket = process.env.R2_HANGTAG_BUCKET_NAME || 'stt-hangtag'
    await deleteFromR2(keyToDelete, hangtagBucket)

    // Update database - remove key from array
    const updatedKeys = existingKeys.filter((k: string) => k !== keyToDelete)
    const { error: updateError } = await supabase()
      .from('fafa_products')
      .update({ hangtag_keys: updatedKeys })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { hangtag_keys: updatedKeys },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
