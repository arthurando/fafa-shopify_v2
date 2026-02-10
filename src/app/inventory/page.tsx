'use client'

import { useState, useEffect, useCallback } from 'react'
import { useT } from '@/lib/i18n'
import InventoryRow from '@/components/InventoryRow'

interface InventoryItem {
  id: string
  product_id: string
  variant_id: string | null
  available: number
  product_code: string
  set_name: string | null
}

interface ProductSet {
  id: string
  name: string
}

export default function InventoryPage() {
  const { t } = useT()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [sets, setSets] = useState<ProductSet[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedSet, setSelectedSet] = useState<string>('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [lowStockThreshold, setLowStockThreshold] = useState(3)

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedSet) params.append('set_id', selectedSet)
      if (search) params.append('search', search)
      if (lowStockOnly) params.append('low_stock', 'true')

      const res = await fetch(`/api/inventory?${params}`)
      const data = await res.json()

      if (data.success) {
        setInventory(data.data)
        setLowStockThreshold(data.low_stock_threshold || 3)
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedSet, search, lowStockOnly])

  const fetchSets = async () => {
    try {
      const res = await fetch('/api/sets')
      const data = await res.json()
      if (data.success) {
        setSets(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch sets:', error)
    }
  }

  useEffect(() => {
    fetchSets()
  }, [])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/inventory/sync', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        alert(data.message || t('inventory.syncSuccess'))
        fetchInventory()
      } else {
        alert(data.error || t('inventory.syncFailed'))
      }
    } catch (error) {
      console.error('Failed to sync inventory:', error)
      alert(t('inventory.syncFailed'))
    } finally {
      setSyncing(false)
    }
  }

  const handleUpdateInventory = async (
    productId: string,
    variantId: string | null | undefined,
    newQuantity: number
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/inventory/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_id: variantId, quantity: newQuantity }),
      })

      const data = await res.json()
      return data.success
    } catch (error) {
      console.error('Failed to update inventory:', error)
      return false
    }
  }

  const totalItems = inventory.length
  const lowStockItems = inventory.filter(
    (item) => item.available <= lowStockThreshold && item.available > 0
  ).length
  const outOfStockItems = inventory.filter((item) => item.available === 0).length

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('inventory.title')}
          </h1>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500">{t('inventory.total')}</div>
              <div className="text-xl font-bold text-gray-900">{totalItems}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-yellow-200">
              <div className="text-xs text-gray-500">{t('inventory.lowStock')}</div>
              <div className="text-xl font-bold text-yellow-600">{lowStockItems}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-red-200">
              <div className="text-xs text-gray-500">{t('inventory.outOfStock')}</div>
              <div className="text-xl font-bold text-red-600">{outOfStockItems}</div>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder={t('inventory.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 text-base"
          />

          {/* Filters */}
          <div className="flex gap-2 mb-3">
            <select
              value={selectedSet}
              onChange={(e) => setSelectedSet(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">{t('inventory.allSets')}</option>
              {sets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
            </select>
          </div>

          {/* Low Stock Toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            {t('inventory.lowStockOnly')}
          </label>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-base disabled:opacity-50 active:bg-blue-700"
          >
            {syncing ? t('inventory.syncing') : t('inventory.syncButton')}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center text-gray-500 py-8">
            {t('inventory.loading')}
          </div>
        )}

        {/* Empty State */}
        {!loading && inventory.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            {search || selectedSet || lowStockOnly
              ? t('inventory.noResults')
              : t('inventory.empty')}
          </div>
        )}

        {/* Inventory List */}
        {!loading && inventory.length > 0 && (
          <div className="space-y-3">
            {inventory.map((item) => (
              <InventoryRow
                key={item.id}
                id={item.id}
                productId={item.product_id}
                productCode={item.product_code}
                setName={item.set_name}
                available={item.available}
                variantId={item.variant_id}
                lowStockThreshold={lowStockThreshold}
                onUpdate={handleUpdateInventory}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
