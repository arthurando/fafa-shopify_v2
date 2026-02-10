import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { uploadVideoToR2, deleteFromR2 } from '@/lib/r2'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo']

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const formData = await request.formData()
    const video = formData.get('video') as File | null

    if (!video || video.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Video file is required' },
        { status: 400 }
      )
    }

    if (!ALLOWED_VIDEO_TYPES.includes(video.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid video type: ${video.type}` },
        { status: 400 }
      )
    }

    if (video.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { success: false, error: `Video too large: ${(video.size / 1024 / 1024).toFixed(2)}MB. Max: ${MAX_VIDEO_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Get product to find product_code
    const { data: product, error: dbError } = await supabase()
      .from('fafa_products')
      .select('product_code, has_video')
      .eq('id', id)
      .single()

    if (dbError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // If product already has video, delete the old one first
    if (product.has_video) {
      try {
        await deleteFromR2(`${product.product_code}.mp4`)
      } catch (err) {
        console.error('Failed to delete old video:', err)
      }
    }

    // Upload new video
    const videoBuffer = Buffer.from(await video.arrayBuffer())
    await uploadVideoToR2(product.product_code, videoBuffer)

    // Update database
    const { error: updateError } = await supabase()
      .from('fafa_products')
      .update({ has_video: true })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Get product to find product_code
    const { data: product, error: dbError } = await supabase()
      .from('fafa_products')
      .select('product_code, has_video')
      .eq('id', id)
      .single()

    if (dbError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (!product.has_video) {
      return NextResponse.json(
        { success: false, error: 'Product has no video' },
        { status: 400 }
      )
    }

    // Delete from R2
    await deleteFromR2(`${product.product_code}.mp4`)

    // Update database
    const { error: updateError } = await supabase()
      .from('fafa_products')
      .update({ has_video: false })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
