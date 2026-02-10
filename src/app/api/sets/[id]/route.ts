import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

const updateSetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  prefix: z.string().min(1).max(10).optional(),
  price: z.number().positive().optional(),
  original_price: z.number().positive().nullable().optional(),
  cost: z.number().nonnegative().nullable().optional(),
  is_archived: z.boolean().optional(),
}).refine(
  (data) => !data.prefix || data.prefix === data.prefix.toUpperCase(),
  { message: 'Prefix must be uppercase', path: ['prefix'] }
)

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const parsed = updateSetSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { data, error } = await supabase()
    .from('fafa_product_sets')
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
