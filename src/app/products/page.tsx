'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Product } from '@/types'
import { useT } from '@/lib/i18n'

export default function ProductsPage() {
  const { t } = useT()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [archiving, setArchiving] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchProducts = async () => {
    const res = await fetch('/api/products')
    const json = await res.json()
    if (json.success) setProducts(json.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleArchive = async (id: string) => {
    if (!confirm(t('products.archiveConfirm'))) return
    setArchiving(id)
    try {
      const res = await fetch(`/api/products/${id}/archive`, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id))
      }
    } finally {
      setArchiving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">{t('products.loading')}</p>
      </div>
    )
  }

  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.product_code.toLowerCase().includes(q) ||
      (p.set_name && p.set_name.toLowerCase().includes(q)) ||
      (p.description_custom && p.description_custom.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t('products.title')}</h1>

      <input
        type="text"
        placeholder={t('products.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
      />

      {search.trim() && (
        <p className="text-sm text-gray-500">{filteredProducts.length} {t('products.results')}</p>
      )}

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {search.trim() ? (
            <p>{t('products.noMatch')} &quot;{search}&quot;</p>
          ) : (
            <>
              <p>{t('products.empty')}</p>
              <Link href="/" className="text-blue-600 font-medium mt-2 inline-block">
                {t('products.createFirst')}
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3 overflow-hidden"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-lg">{product.product_code}</p>
                  {product.has_video && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                      Video
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {product.set_name} - ${product.set_price}
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    product.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {product.status}
                </span>
              </div>

              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/products/${product.id}`}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg"
                >
                  {t('products.edit')}
                </Link>
                <button
                  onClick={() => handleArchive(product.id)}
                  disabled={archiving === product.id}
                  className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg disabled:opacity-50"
                >
                  {archiving === product.id ? '...' : t('products.archive')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
