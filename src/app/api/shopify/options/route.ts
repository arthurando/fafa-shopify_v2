import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!

async function graphql<T>(query: string): Promise<T> {
  const res = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      },
      body: JSON.stringify({ query }),
    }
  )
  return res.json() as Promise<T>
}

interface GraphQLResponse {
  data: {
    shop: {
      productTypes: { edges: Array<{ node: string }> }
      productVendors: { edges: Array<{ node: string }> }
    }
    metafieldDefinitions: {
      edges: Array<{
        node: {
          namespace: string
          key: string
          validations: Array<{ name: string; value: string }>
        }
      }>
    }
  }
}

function sortCollections(collections: string[]): string[] {
  const zhibo: string[] = []
  const rest: string[] = []
  for (const c of collections) {
    if (c.includes('直播')) {
      zhibo.push(c)
    } else {
      rest.push(c)
    }
  }
  zhibo.sort((a, b) => a.localeCompare(b, 'zh'))
  rest.sort((a, b) => a.localeCompare(b, 'zh'))
  return [...zhibo, ...rest]
}

export async function GET() {
  try {
    const db = supabase()

    // Fetch from Shopify: product types, vendors, arrival choices
    const result = await graphql<GraphQLResponse>(`{
      shop {
        productTypes(first: 250) { edges { node } }
        productVendors(first: 250) { edges { node } }
      }
      metafieldDefinitions(ownerType: PRODUCT, namespace: "custom", first: 20) {
        edges {
          node {
            namespace
            key
            validations { name value }
          }
        }
      }
    }`)

    const productTypes = result.data.shop.productTypes.edges
      .map((e) => e.node)
      .filter(Boolean)
      .filter((pt) => pt.toUpperCase() !== 'GIFT')
      .sort((a, b) => a.localeCompare(b, 'zh'))

    const vendors = result.data.shop.productVendors.edges
      .map((e) => e.node)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'zh'))

    // Extract estimate_arrival choices from metafield definition
    const arrivalDef = result.data.metafieldDefinitions.edges.find(
      (e) => e.node.key === 'estimate_arrival'
    )
    const arrivalChoices: string[] = []
    if (arrivalDef) {
      const choicesValidation = arrivalDef.node.validations.find(
        (v) => v.name === 'choices'
      )
      if (choicesValidation) {
        try {
          arrivalChoices.push(...JSON.parse(choicesValidation.value))
        } catch { /* ignore parse errors */ }
      }
    }

    // Fetch brands from Supabase
    const { data: brandsData } = await db
      .from('fafa_brands')
      .select('name')
      .order('name')
    const brands = (brandsData || []).map((b) => b.name)

    // Fetch collections from Supabase
    const { data: collectionsData } = await db
      .from('fafa_collections')
      .select('title')
      .order('title')
    const collections = sortCollections(
      (collectionsData || []).map((c) => c.title)
    )

    return NextResponse.json({
      success: true,
      data: {
        productTypes,
        vendors,
        collections,
        arrivalChoices,
        brands,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
