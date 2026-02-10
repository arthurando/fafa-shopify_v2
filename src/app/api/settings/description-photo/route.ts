import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { uploadImageToR2, getFromR2, deleteFromR2 } from '@/lib/r2'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const photo = formData.get('photo') as File | null

    if (!photo || photo.size === 0) {
      return NextResponse.json(
        { success: false, error: 'No photo provided' },
        { status: 400 }
      )
    }

    const ext = ALLOWED_TYPES[photo.type]
    if (!ext) {
      return NextResponse.json(
        { success: false, error: `Invalid image type: ${photo.type}` },
        { status: 400 }
      )
    }

    if (photo.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: `Photo too large: ${(photo.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB` },
        { status: 400 }
      )
    }

    // Delete old photo if exists
    const { data: existing } = await supabase()
      .from('fafa_app_settings')
      .select('value')
      .eq('key', 'description_photo_key')
      .single()

    if (existing?.value) {
      try {
        await deleteFromR2(existing.value)
      } catch {
        // Old file may not exist, continue
      }
    }

    const key = `settings/description-photo.${ext}`
    const buffer = Buffer.from(await photo.arrayBuffer())
    await uploadImageToR2(key, buffer, photo.type)

    await supabase()
      .from('fafa_app_settings')
      .upsert({ key: 'description_photo_key', value: key })

    return NextResponse.json({
      success: true,
      url: '/api/settings/description-photo',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { data } = await supabase()
      .from('fafa_app_settings')
      .select('value')
      .eq('key', 'description_photo_key')
      .single()

    if (!data?.value) {
      return NextResponse.json(
        { success: false, error: 'No description photo' },
        { status: 404 }
      )
    }

    const { stream, contentType } = await getFromR2(data.value)

    // Convert the readable stream to a web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
        stream.on('end', () => controller.close())
        stream.on('error', (err: Error) => controller.error(err))
      },
    })

    return new Response(webStream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch photo'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const { data } = await supabase()
      .from('fafa_app_settings')
      .select('value')
      .eq('key', 'description_photo_key')
      .single()

    if (data?.value) {
      try {
        await deleteFromR2(data.value)
      } catch {
        // File may already be deleted
      }
    }

    await supabase()
      .from('fafa_app_settings')
      .delete()
      .eq('key', 'description_photo_key')

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
