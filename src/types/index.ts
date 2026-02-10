export interface ProductSet {
  id: string
  name: string
  prefix: string
  price: number
  original_price: number | null
  cost: number | null
  is_archived: boolean
  created_at: string
  updated_at: string
  product_count?: number
}

export interface Product {
  id: string
  set_id: string
  product_code: string
  shopify_product_id: string | null
  description_custom: string | null
  has_video: boolean
  status: 'active' | 'archived'
  is_archived: boolean
  created_at: string
  updated_at: string
  // Joined fields
  set_name?: string
  set_prefix?: string
  set_price?: number
  image_url?: string
}

export interface AppSetting {
  key: string
  value: string
  updated_at: string
}

export interface CreateProductPayload {
  set_id: string
  description_custom: string
  photos: string[] // base64 encoded
  video?: File | null
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface VariantSelection {
  color: string
  size: string
  inventory: number
}
