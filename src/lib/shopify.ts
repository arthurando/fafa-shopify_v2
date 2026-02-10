const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!
const API_VERSION = '2024-01'

function shopifyUrl(path: string): string {
  return `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}${path}`
}

async function shopifyFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(shopifyUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`Shopify API error ${res.status}: ${errorBody}`)
  }

  return res.json() as Promise<T>
}

interface ShopifyProduct {
  id: number
  title: string
  body_html: string
  status: string
  variants: Array<{ id: number; price: string; inventory_item_id: number }>
  images: Array<{ id: number; src: string }>
}

interface CreateProductResponse {
  product: ShopifyProduct
}

interface CreateProductParams {
  title: string
  handle?: string
  bodyHtml: string
  price: number
  originalPrice?: number | null
  productType?: string
  vendor?: string
  status?: 'draft' | 'active'
  metafields?: Array<{
    namespace: string
    key: string
    value: string
    type: string
  }>
}

export async function createShopifyProduct(params: CreateProductParams): Promise<ShopifyProduct> {
  const { title, handle, bodyHtml, price, originalPrice, productType, vendor, status = 'draft', metafields } = params

  if (!title || title.trim().length === 0) {
    throw new Error('Product title is required')
  }
  if (title.length > 255) {
    throw new Error('Product title too long (max 255 characters)')
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new Error('Invalid price')
  }
  if (bodyHtml.length > 65535) {
    throw new Error('Product description too long')
  }

  const productPayload: Record<string, unknown> = {
    title: title.trim(),
    ...(handle ? { handle: handle.toLowerCase() } : {}),
    body_html: bodyHtml,
    status,
    variants: [{
      price: price.toFixed(2),
      ...(originalPrice ? { compare_at_price: originalPrice.toFixed(2) } : {}),
      inventory_policy: 'deny',
      inventory_management: 'shopify',
    }],
  }

  if (productType) productPayload.product_type = productType
  if (vendor) productPayload.vendor = vendor
  if (metafields && metafields.length > 0) {
    productPayload.metafields = metafields
  }

  const { product } = await shopifyFetch<CreateProductResponse>('/products.json', {
    method: 'POST',
    body: JSON.stringify({ product: productPayload }),
  })
  return product
}

interface UploadImageResponse {
  image: { id: number; src: string }
}

export async function uploadProductImage(
  productId: number,
  base64Image: string,
  filename: string
): Promise<string> {
  if (!Number.isInteger(productId) || productId <= 0) {
    throw new Error('Invalid product ID')
  }
  if (!base64Image || base64Image.length === 0) {
    throw new Error('Image data is required')
  }
  if (!/^[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
    throw new Error('Invalid filename format')
  }

  const { image } = await shopifyFetch<UploadImageResponse>(
    `/products/${productId}/images.json`,
    {
      method: 'POST',
      body: JSON.stringify({
        image: {
          attachment: base64Image,
          filename,
        },
      }),
    }
  )
  return image.src
}

export async function archiveShopifyProduct(productId: string): Promise<void> {
  const numericId = Number(productId)
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('Invalid product ID')
  }

  await shopifyFetch(`/products/${numericId}.json`, {
    method: 'PUT',
    body: JSON.stringify({
      product: {
        id: numericId,
        status: 'archived',
      },
    }),
  })
}

export async function getShopifyProduct(productId: string): Promise<ShopifyProduct> {
  const numericId = Number(productId)
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('Invalid product ID')
  }

  const { product } = await shopifyFetch<{ product: ShopifyProduct }>(
    `/products/${numericId}.json`
  )
  return product
}

export async function addProductToCollectionByTitle(
  productId: number,
  collectionTitle: string
): Promise<void> {
  // First find the custom collection by title
  const { custom_collections } = await shopifyFetch<{ custom_collections: Array<{ id: number; title: string }> }>(
    `/custom_collections.json?title=${encodeURIComponent(collectionTitle)}`
  )

  let collectionId: number | null = null

  if (custom_collections && custom_collections.length > 0) {
    collectionId = custom_collections[0].id
  } else {
    // Try smart collections
    const { smart_collections } = await shopifyFetch<{ smart_collections: Array<{ id: number; title: string }> }>(
      `/smart_collections.json?title=${encodeURIComponent(collectionTitle)}`
    )
    if (smart_collections && smart_collections.length > 0) {
      collectionId = smart_collections[0].id
    }
  }

  if (collectionId) {
    await shopifyFetch('/collects.json', {
      method: 'POST',
      body: JSON.stringify({
        collect: {
          product_id: productId,
          collection_id: collectionId,
        },
      }),
    })
  }
}

interface UpdateProductParams {
  productId: string
  title?: string
  handle?: string
  price?: number
  compareAtPrice?: number | null
}

export async function deleteProductImage(
  productId: number,
  imageId: number
): Promise<void> {
  if (!Number.isInteger(productId) || productId <= 0) {
    throw new Error('Invalid product ID')
  }
  if (!Number.isInteger(imageId) || imageId <= 0) {
    throw new Error('Invalid image ID')
  }

  await shopifyFetch(`/products/${productId}/images/${imageId}.json`, {
    method: 'DELETE',
  })
}

export async function updateShopifyProduct(params: UpdateProductParams): Promise<void> {
  const { productId, title, handle, price, compareAtPrice } = params

  const productPayload: Record<string, unknown> = {
    id: Number(productId),
  }

  if (title !== undefined) productPayload.title = title
  if (handle !== undefined) productPayload.handle = handle.toLowerCase()

  // Update product basic fields
  await shopifyFetch(`/products/${productId}.json`, {
    method: 'PUT',
    body: JSON.stringify({ product: productPayload }),
  })

  // Update variant pricing if needed
  if (price !== undefined || compareAtPrice !== undefined) {
    // Get the product to find variant ID
    const { product } = await shopifyFetch<{ product: ShopifyProduct }>(`/products/${productId}.json`)
    if (product.variants && product.variants.length > 0) {
      const variantId = product.variants[0].id
      const variantPayload: Record<string, unknown> = { id: variantId }
      if (price !== undefined) variantPayload.price = price.toFixed(2)
      if (compareAtPrice !== undefined) {
        variantPayload.compare_at_price = compareAtPrice ? compareAtPrice.toFixed(2) : null
      }
      await shopifyFetch(`/variants/${variantId}.json`, {
        method: 'PUT',
        body: JSON.stringify({ variant: variantPayload }),
      })
    }
  }
}

export async function setInventoryItemCost(
  inventoryItemId: number,
  cost: number
): Promise<void> {
  await shopifyFetch(`/inventory_items/${inventoryItemId}.json`, {
    method: 'PUT',
    body: JSON.stringify({
      inventory_item: {
        id: inventoryItemId,
        cost: cost.toFixed(2),
      },
    }),
  })
}

export async function setInventoryLevel(
  inventoryItemId: number,
  locationId: number,
  available: number
): Promise<void> {
  await shopifyFetch('/inventory_levels/set.json', {
    method: 'POST',
    body: JSON.stringify({
      location_id: locationId,
      inventory_item_id: inventoryItemId,
      available,
    }),
  })
}

export async function getInventoryLevels(
  locationId: number,
  inventoryItemIds: number[]
): Promise<Array<{ inventory_item_id: number; available: number }>> {
  const ids = inventoryItemIds.join(',')
  const { inventory_levels } = await shopifyFetch<{
    inventory_levels: Array<{ inventory_item_id: number; available: number }>
  }>(`/inventory_levels.json?location_ids=${locationId}&inventory_item_ids=${ids}`)
  return inventory_levels || []
}

export async function updateProductMetafield(
  productId: string,
  namespace: string,
  key: string,
  value: string
): Promise<void> {
  // Get existing metafields to find the ID
  const { metafields } = await shopifyFetch<{ metafields: Array<{ id: number; namespace: string; key: string }> }>(
    `/products/${productId}/metafields.json`
  )

  const existing = metafields?.find(m => m.namespace === namespace && m.key === key)

  if (existing) {
    // Update existing metafield
    await shopifyFetch(`/products/${productId}/metafields/${existing.id}.json`, {
      method: 'PUT',
      body: JSON.stringify({
        metafield: { id: existing.id, value, type: 'single_line_text_field' },
      }),
    })
  } else {
    // Create new metafield
    await shopifyFetch(`/products/${productId}/metafields.json`, {
      method: 'POST',
      body: JSON.stringify({
        metafield: { namespace, key, value, type: 'single_line_text_field' },
      }),
    })
  }
}
