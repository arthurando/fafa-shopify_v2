import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createShopifyProduct, uploadProductImage, addProductToCollectionByTitle, setInventoryLevel, setInventoryItemCost } from '@/lib/shopify'
import { uploadVideoToR2 } from '@/lib/r2'
import { formatCode, mergeDescription, escapeHtml } from '@/lib/utils'

async function claimNextCode(setId: string, prefix: string): Promise<string> {
  // Atomically increment last_sequence and return the new value
  const { data, error } = await supabase()
    .rpc('increment_set_sequence', { set_id_input: setId })

  if (error || data === null) {
    throw new Error('Failed to generate product code: ' + (error?.message || 'no data'))
  }

  return formatCode(prefix, data)
}

const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo']

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const setId = formData.get('set_id') as string
    const descriptionCustom = (formData.get('description_custom') as string) || ''
    const status = (formData.get('status') as 'draft' | 'active') || 'draft'
    const photos = formData.getAll('photos') as File[]
    const video = formData.get('video') as File | null

    if (!setId) {
      return NextResponse.json(
        { success: false, error: 'set_id is required' },
        { status: 400 }
      )
    }

    if (photos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one photo is required' },
        { status: 400 }
      )
    }

    for (const photo of photos) {
      if (!ALLOWED_IMAGE_TYPES.includes(photo.type)) {
        return NextResponse.json(
          { success: false, error: `Invalid image type: ${photo.type}. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}` },
          { status: 400 }
        )
      }
      if (photo.size > MAX_PHOTO_SIZE) {
        return NextResponse.json(
          { success: false, error: `Photo too large: ${(photo.size / 1024 / 1024).toFixed(2)}MB. Max: ${MAX_PHOTO_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        )
      }
    }

    if (video && video.size > 0) {
      if (!ALLOWED_VIDEO_TYPES.includes(video.type)) {
        return NextResponse.json(
          { success: false, error: `Invalid video type: ${video.type}. Allowed: ${ALLOWED_VIDEO_TYPES.join(', ')}` },
          { status: 400 }
        )
      }
      if (video.size > MAX_VIDEO_SIZE) {
        return NextResponse.json(
          { success: false, error: `Video too large: ${(video.size / 1024 / 1024).toFixed(2)}MB. Max: ${MAX_VIDEO_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        )
      }
    }

    const { data: set, error: setError } = await supabase()
      .from('fafa_product_sets')
      .select('*')
      .eq('id', setId)
      .single()

    if (setError || !set) {
      return NextResponse.json(
        { success: false, error: 'Set not found' },
        { status: 404 }
      )
    }

    const productCode = await claimNextCode(setId, set.prefix)

    // Fetch all settings at once
    const { data: allSettings } = await supabase()
      .from('fafa_app_settings')
      .select('key, value')

    const settingsMap: Record<string, string> = {}
    for (const s of (allSettings || [])) {
      settingsMap[s.key] = s.value
    }

    const universalDesc = settingsMap['universal_product_description'] || ''
    const productType = settingsMap['product_type'] || ''
    const vendor = settingsMap['vendor'] || ''
    const collectionTitle = settingsMap['collection'] || ''
    const metafieldBrands = settingsMap['metafield_brands'] || ''
    const metafieldArrival = settingsMap['metafield_estimate_arrival'] || ''
    const metafieldCutoff = settingsMap['metafield_cutoff'] || ''

    const mergedDescription = mergeDescription(descriptionCustom, universalDesc)
    let bodyHtml = escapeHtml(mergedDescription)

    const descPhotoKey = settingsMap['description_photo_key']
    if (descPhotoKey) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      const photoUrl = `${appUrl}/api/settings/description-photo`
      bodyHtml += `<img src="${photoUrl}" alt="" style="max-width:100%;height:auto;display:block;margin:16px 0;">`
    }

    // Build metafields array (only include non-empty ones)
    const metafields: Array<{ namespace: string; key: string; value: string; type: string }> = []
    if (metafieldBrands) {
      metafields.push({ namespace: 'custom', key: '_brands', value: metafieldBrands, type: 'single_line_text_field' })
    }
    if (metafieldArrival) {
      metafields.push({ namespace: 'custom', key: 'estimate_arrival', value: metafieldArrival, type: 'single_line_text_field' })
    }
    if (metafieldCutoff) {
      metafields.push({ namespace: 'custom', key: '_cutoff', value: metafieldCutoff, type: 'date' })
    }
    metafields.push({ namespace: 'custom', key: 'stt_code', value: productCode, type: 'single_line_text_field' })

    const productTitle = `馬年賀年花【${productCode}】`

    const shopifyProduct = await createShopifyProduct({
      title: productTitle,
      handle: productCode,
      bodyHtml,
      price: Number(set.price),
      originalPrice: set.original_price ? Number(set.original_price) : null,
      productType,
      vendor,
      status,
      metafields,
    })

    // Run all post-creation operations in parallel
    const parallelTasks: Promise<unknown>[] = []

    const locationId = Number(process.env.SHOPIFY_LOCATION_ID)
    const inventoryItemId = shopifyProduct.variants?.[0]?.inventory_item_id
    if (locationId && inventoryItemId) {
      parallelTasks.push(setInventoryLevel(inventoryItemId, locationId, 1))
    }
    if (inventoryItemId && set.cost != null) {
      parallelTasks.push(setInventoryItemCost(inventoryItemId, Number(set.cost)))
    }

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      parallelTasks.push(
        (async () => {
          const buffer = Buffer.from(await photo.arrayBuffer())
          const base64 = buffer.toString('base64')
          await uploadProductImage(shopifyProduct.id, base64, `${productCode}_${i + 1}.jpg`)
        })()
      )
    }

    if (collectionTitle) {
      parallelTasks.push(
        addProductToCollectionByTitle(shopifyProduct.id, collectionTitle).catch(err => {
          console.error('Failed to add to collection:', err)
        })
      )
    }

    let hasVideo = false
    if (video && video.size > 0) {
      hasVideo = true
      parallelTasks.push(
        (async () => {
          const videoBuffer = Buffer.from(await video.arrayBuffer())
          await uploadVideoToR2(productCode, videoBuffer)
        })()
      )
    }

    await Promise.all(parallelTasks)

    const { data: product, error: dbError } = await supabase()
      .from('fafa_products')
      .insert({
        set_id: setId,
        product_code: productCode,
        shopify_product_id: String(shopifyProduct.id),
        description_custom: descriptionCustom,
        has_video: hasVideo,
        status,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json(
        { success: false, error: dbError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: product }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
