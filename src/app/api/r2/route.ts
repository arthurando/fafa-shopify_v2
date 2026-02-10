import { NextResponse } from 'next/server'
import { getFromR2 } from '@/lib/r2'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const bucket = searchParams.get('bucket')

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'key parameter is required' },
        { status: 400 }
      )
    }

    const { stream, contentType } = await getFromR2(key, bucket || undefined)

    // Convert stream to buffer for response
    const chunks: Uint8Array[] = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
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
