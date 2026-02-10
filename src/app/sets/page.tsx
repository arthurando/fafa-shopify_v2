'use client'

import { useState, useEffect } from 'react'
import type { ProductSet } from '@/types'
import { useT } from '@/lib/i18n'

export default function SetsPage() {
  const { t } = useT()
  const [sets, setSets] = useState<ProductSet[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // New set form
  const [newName, setNewName] = useState('')
  const [newPrefix, setNewPrefix] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newOriginalPrice, setNewOriginalPrice] = useState('')
  const [newCost, setNewCost] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrefix, setEditPrefix] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editOriginalPrice, setEditOriginalPrice] = useState('')
  const [editCost, setEditCost] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchSets = async () => {
    const res = await fetch('/api/sets')
    const json = await res.json()
    if (json.success) setSets(json.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchSets()
  }, [])

  const handleCreate = async () => {
    setError('')
    if (!newName || !newPrefix || !newPrice) {
      setError(t('sets.allRequired'))
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          prefix: newPrefix.toUpperCase(),
          price: parseFloat(newPrice),
          original_price: newOriginalPrice ? parseFloat(newOriginalPrice) : null,
          cost: newCost ? parseFloat(newCost) : null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSets((prev) => [...prev, json.data])
        setNewName('')
        setNewPrefix('')
        setNewPrice('')
        setNewOriginalPrice('')
        setNewCost('')
        setShowForm(false)
      } else {
        setError(json.error)
      }
    } finally {
      setCreating(false)
    }
  }

  const startEditing = (set: ProductSet) => {
    setEditingId(set.id)
    setEditName(set.name)
    setEditPrefix(set.prefix)
    setEditPrice(String(set.price))
    setEditOriginalPrice(String(set.original_price || ''))
    setEditCost(String(set.cost || ''))
  }

  const handleSave = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const originalSet = sets.find(s => s.id === editingId)
      const prefixChanged = originalSet && editPrefix !== originalSet.prefix

      const res = await fetch(`/api/sets/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          prefix: editPrefix,
          price: parseFloat(editPrice),
          original_price: editOriginalPrice ? parseFloat(editOriginalPrice) : null,
          cost: editCost ? parseFloat(editCost) : null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSets((prev) =>
          prev.map((s) => (s.id === editingId ? json.data : s))
        )

        // Sync products to Shopify
        try {
          const syncRes = await fetch(`/api/sets/${editingId}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              oldPrefix: prefixChanged ? originalSet?.prefix : undefined,
              newPrefix: prefixChanged ? editPrefix : undefined,
            }),
          })
          const syncJson = await syncRes.json()
          if (syncJson.success && syncJson.data.synced > 0) {
            if (prefixChanged) {
              fetchSets()
            }
            alert(`${t('sets.synced')} ${syncJson.data.synced} ${t('sets.toShopify')}${syncJson.data.errors ? ` (${syncJson.data.errors.length} ${t('sets.errors')})` : ''}`)
          }
        } catch {
          alert(t('sets.syncFailed'))
        }

        setEditingId(null)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">{t('sets.loading')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('sets.title')}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg"
        >
          {showForm ? t('sets.cancel') : t('sets.addSet')}
        </button>
      </div>

      {/* New Set Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <input
            type="text"
            placeholder={t('sets.namePlaceholder')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
          />
          <input
            type="text"
            placeholder={t('sets.prefixPlaceholder')}
            value={newPrefix}
            onChange={(e) => setNewPrefix(e.target.value.toUpperCase())}
            maxLength={10}
            className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
          />
          <input
            type="number"
            placeholder={t('sets.pricePlaceholder')}
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            step="0.01"
            min="0"
            className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
          />
          <input
            type="number"
            placeholder={t('sets.originalPricePlaceholder')}
            value={newOriginalPrice}
            onChange={(e) => setNewOriginalPrice(e.target.value)}
            step="0.01"
            min="0"
            className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
          />
          <input
            type="number"
            placeholder={t('sets.costPlaceholder')}
            value={newCost}
            onChange={(e) => setNewCost(e.target.value)}
            step="0.01"
            min="0"
            className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
          />
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full bg-green-600 text-white font-medium py-3 rounded-lg disabled:opacity-50"
          >
            {creating ? t('sets.creating') : t('sets.createSet')}
          </button>
        </div>
      )}

      {/* Sets List */}
      {sets.length === 0 ? (
        <p className="text-center text-gray-500 py-12">{t('sets.empty')}</p>
      ) : (
        <div className="space-y-3">
          {sets.map((set) => (
            <div
              key={set.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              {editingId === set.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                  />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('sets.prefix')}</label>
                    <input
                      type="text"
                      value={editPrefix}
                      onChange={(e) => setEditPrefix(e.target.value.toUpperCase())}
                      maxLength={10}
                      className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                    />
                    {editPrefix !== sets.find(s => s.id === editingId)?.prefix && (
                      <p className="text-xs text-amber-600 mt-1">
                        {t('sets.prefixWarning')}
                      </p>
                    )}
                  </div>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                  />
                  <input
                    type="number"
                    placeholder={t('sets.originalPricePlaceholder')}
                    value={editOriginalPrice}
                    onChange={(e) => setEditOriginalPrice(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                  />
                  <input
                    type="number"
                    placeholder={t('sets.costPlaceholder')}
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-lg disabled:opacity-50 text-sm"
                    >
                      {saving ? t('sets.savingSyncing') : t('sets.save')}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 bg-gray-100 text-gray-700 font-medium py-2 rounded-lg text-sm"
                    >
                      {t('sets.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">
                      {set.name}{' '}
                      <span className="text-blue-600">({set.prefix})</span>
                    </p>
                    <p className="text-gray-500">
                      ${set.price}
                      {set.original_price && (
                        <span className="text-gray-400 line-through ml-2">
                          ({t('sets.was')} ${set.original_price})
                        </span>
                      )}
                    </p>
                    {set.cost != null && (
                      <p className="text-sm text-gray-500">{t('sets.cost')}: ${set.cost}</p>
                    )}
                    <p className="text-sm text-gray-400">{set.product_count || 0} {t('sets.products')}</p>
                  </div>
                  <button
                    onClick={() => startEditing(set)}
                    className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg"
                  >
                    {t('sets.edit')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
