import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { formatCode } from '@/lib/utils'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: set, error: setError } = await supabase()
    .from('fafa_product_sets')
    .select('prefix, last_sequence')
    .eq('id', id)
    .single()

  if (setError || !set) {
    return NextResponse.json(
      { success: false, error: 'Set not found' },
      { status: 404 }
    )
  }

  const nextCode = formatCode(set.prefix, set.last_sequence + 1)

  return NextResponse.json({ success: true, data: { nextCode } })
}
