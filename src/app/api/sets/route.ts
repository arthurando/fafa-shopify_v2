import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data: setsData, error: setsError } = await supabase()
    .from('fafa_product_sets')
    .select('*')
    .eq('is_archived', false)
    .order('prefix', { ascending: true })

  if (setsError) {
    return NextResponse.json(
      { success: false, error: setsError.message },
      { status: 500 }
    )
  }

  // Get product counts per set
  const { data: countData } = await supabase()
    .from('fafa_products')
    .select('set_id')
    .eq('is_archived', false)

  const countMap: Record<string, number> = {}
  for (const row of (countData || [])) {
    countMap[row.set_id] = (countMap[row.set_id] || 0) + 1
  }

  const data = (setsData || []).map(set => ({
    ...set,
    product_count: countMap[set.id] || 0,
  }))

  return NextResponse.json({ success: true, data })
}

const createSetSchema = z.object({
  name: z.string().min(1).max(100),
  prefix: z.string().min(1).max(10).toUpperCase(),
  price: z.number().positive(),
  original_price: z.number().positive().nullable().optional(),
  cost: z.number().nonnegative().nullable().optional(),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = createSetSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { data, error } = await supabase()
    .from('fafa_product_sets')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data }, { status: 201 })
}
