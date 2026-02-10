import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
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
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  // Flatten the joined data
  const products = (data ?? []).map((p) => ({
    ...p,
    set_name: p.fafa_product_sets?.name,
    set_prefix: p.fafa_product_sets?.prefix,
    set_price: p.fafa_product_sets?.price,
    fafa_product_sets: undefined,
  }))

  return NextResponse.json({ success: true, data: products })
}
