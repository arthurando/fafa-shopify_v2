import { NextResponse, NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const setId = searchParams.get('set_id')
  const search = searchParams.get('search')
  const lowStock = searchParams.get('low_stock') === 'true'

  let query = supabase()
    .from('fafa_inventory_cache')
    .select(`
      *,
      fafa_products!inner (
        id,
        product_code,
        set_id,
        fafa_product_sets (
          name
        )
      )
    `)

  // Filter by set if provided
  if (setId) {
    query = query.eq('fafa_products.set_id', setId)
  }

  // Search by product code
  if (search && search.trim().length > 0) {
    query = query.ilike('fafa_products.product_code', `%${search.trim()}%`)
  }

  // Get low stock threshold from settings
  const { data: settingsData } = await supabase()
    .from('fafa_app_settings')
    .select('setting_value')
    .eq('setting_key', 'low_stock_threshold')
    .single()

  const threshold = settingsData?.setting_value ? parseInt(settingsData.setting_value, 10) : 3

  // Filter by low stock if requested
  if (lowStock) {
    query = query.lte('available', threshold)
  }

  const { data, error } = await query.order('fafa_products.product_code', { ascending: true })

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  // Flatten the joined data
  const inventory = (data ?? []).map((item) => ({
    id: item.id,
    product_id: item.product_id,
    variant_id: item.variant_id,
    shopify_inventory_item_id: item.shopify_inventory_item_id,
    available: item.available,
    last_synced_at: item.last_synced_at,
    product_code: item.fafa_products?.product_code,
    set_name: item.fafa_products?.fafa_product_sets?.name,
  }))

  return NextResponse.json({
    success: true,
    data: inventory,
    low_stock_threshold: threshold,
  })
}
