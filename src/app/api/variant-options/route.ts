import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') as 'color' | 'size' | null

  try {
    let query = supabase
      .from('fafa_variant_options')
      .select('*')
      .order('display_order', { ascending: true })

    if (type) {
      query = query.eq('option_type', type)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching variant options:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch variant options' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { option_type, name } = body

    if (!option_type || !name) {
      return NextResponse.json(
        { success: false, error: 'option_type and name are required' },
        { status: 400 }
      )
    }

    if (!['color', 'size'].includes(option_type)) {
      return NextResponse.json(
        { success: false, error: 'option_type must be color or size' },
        { status: 400 }
      )
    }

    // Get current max display_order for this type
    const { data: maxData } = await supabase
      .from('fafa_variant_options')
      .select('display_order')
      .eq('option_type', option_type)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxData?.display_order ?? -1) + 1

    const { data, error } = await supabase
      .from('fafa_variant_options')
      .insert({
        option_type,
        name: name.trim(),
        display_order: nextOrder,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          { success: false, error: 'This option already exists' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error creating variant option:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create variant option' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'id parameter is required' },
      { status: 400 }
    )
  }

  try {
    const { error } = await supabase
      .from('fafa_variant_options')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting variant option:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete variant option' },
      { status: 500 }
    )
  }
}
