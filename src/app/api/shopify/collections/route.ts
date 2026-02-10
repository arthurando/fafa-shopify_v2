import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!

const createSchema = z.object({
  title: z.string().min(1).max(255),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    // Create on Shopify
    const res = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/custom_collections.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        },
        body: JSON.stringify({
          custom_collection: { title: parsed.data.title },
        }),
      }
    )

    if (!res.ok) {
      const errorBody = await res.text()
      return NextResponse.json(
        { success: false, error: `Shopify error: ${errorBody}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    const title = data.custom_collection.title

    // Also save to Supabase
    const db = supabase()
    await db
      .from('fafa_collections')
      .upsert({ title }, { onConflict: 'title' })

    return NextResponse.json({
      success: true,
      data: { title },
    }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
