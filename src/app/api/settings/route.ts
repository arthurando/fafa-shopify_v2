import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase()
    .from('fafa_app_settings')
    .select('*')

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data })
}

const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
})

export async function PATCH(request: Request) {
  const body = await request.json()
  const parsed = updateSettingSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { data, error } = await supabase()
    .from('fafa_app_settings')
    .upsert({ key: parsed.data.key, value: parsed.data.value })
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
