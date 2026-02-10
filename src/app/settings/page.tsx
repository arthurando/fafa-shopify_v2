'use client'

import { useState, useEffect, useRef } from 'react'
import { useT } from '@/lib/i18n'

interface Setting {
  key: string
  value: string
}

interface ShopifyOptions {
  productTypes: string[]
  vendors: string[]
  collections: string[]
  arrivalChoices: string[]
  brands: string[]
}

type SettingsState = {
  [key: string]: string
}

const DEFAULT_SETTINGS: SettingsState = {
  product_type: '',
  vendor: '',
  collection: '',
  metafield_brands: '',
  metafield_estimate_arrival: '',
  metafield_cutoff: '',
  universal_product_description: '',
}

export default function SettingsPage() {
  const { t } = useT()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [values, setValues] = useState<SettingsState>(DEFAULT_SETTINGS)
  const [initialValues, setInitialValues] = useState<SettingsState>(DEFAULT_SETTINGS)
  const [options, setOptions] = useState<ShopifyOptions>({
    productTypes: [],
    vendors: [],
    collections: [],
    arrivalChoices: [],
    brands: [],
  })

  // Add-new states
  const [showNewVendor, setShowNewVendor] = useState(false)
  const [newVendor, setNewVendor] = useState('')
  const [showNewCollection, setShowNewCollection] = useState(false)
  const [newCollection, setNewCollection] = useState('')
  const [creatingCollection, setCreatingCollection] = useState(false)
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [newBrand, setNewBrand] = useState('')

  // Description photo states
  const [descriptionPhoto, setDescriptionPhoto] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const photoCameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSettings()
    fetchOptions()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      const json = await res.json()

      if (json.success) {
        const fetchedSettings: SettingsState = {}
        json.data.forEach((s: Setting) => {
          fetchedSettings[s.key] = s.value
        })
        const merged = { ...DEFAULT_SETTINGS, ...fetchedSettings }
        setValues(merged)
        setInitialValues(merged)

        if (fetchedSettings['description_photo_key']) {
          setDescriptionPhoto(`/api/settings/description-photo?t=${Date.now()}`)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    try {
      const res = await fetch('/api/shopify/options')
      const json = await res.json()
      if (json.success) {
        setOptions(json.data)
      }
    } catch { /* options load silently */ }
  }

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleAddVendor = () => {
    if (!newVendor.trim()) return
    const trimmed = newVendor.trim()
    setOptions((prev) => ({
      ...prev,
      vendors: prev.vendors.includes(trimmed) ? prev.vendors : [...prev.vendors, trimmed],
    }))
    handleChange('vendor', trimmed)
    setNewVendor('')
    setShowNewVendor(false)
  }

  const handleAddCollection = async () => {
    if (!newCollection.trim()) return
    setCreatingCollection(true)
    try {
      const res = await fetch('/api/shopify/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newCollection.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        const title = json.data.title
        setOptions((prev) => ({
          ...prev,
          collections: prev.collections.includes(title) ? prev.collections : [...prev.collections, title],
        }))
        handleChange('collection', title)
        setNewCollection('')
        setShowNewCollection(false)
      } else {
        setError(json.error)
      }
    } finally {
      setCreatingCollection(false)
    }
  }

  const handleAddBrand = async () => {
    if (!newBrand.trim()) return
    const trimmed = newBrand.trim()
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const json = await res.json()
      if (json.success) {
        setOptions((prev) => ({
          ...prev,
          brands: prev.brands.includes(trimmed) ? prev.brands : [...prev.brands, trimmed].sort(),
        }))
        handleChange('metafield_brands', trimmed)
        setNewBrand('')
        setShowNewBrand(false)
      } else {
        setError(json.error)
      }
    } catch {
      setError('Failed to add brand')
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    setError('')
    try {
      const form = new FormData()
      form.append('photo', file)
      const res = await fetch('/api/settings/description-photo', {
        method: 'POST',
        body: form,
      })
      const json = await res.json()
      if (json.success) {
        setDescriptionPhoto(`${json.url}?t=${Date.now()}`)
      } else {
        setError(json.error)
      }
    } catch {
      setError('Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
      if (photoInputRef.current) {
        photoInputRef.current.value = ''
      }
      if (photoCameraInputRef.current) {
        photoCameraInputRef.current.value = ''
      }
    }
  }

  const handlePhotoRemove = async () => {
    setError('')
    try {
      const res = await fetch('/api/settings/description-photo', {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        setDescriptionPhoto(null)
      } else {
        setError(json.error)
      }
    } catch {
      setError('Failed to remove photo')
    }
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const changedKeys = Object.keys(values).filter(
        (key) => values[key] !== initialValues[key]
      )

      if (changedKeys.length === 0) {
        setSuccess(t('settings.noChanges'))
        setSaving(false)
        setTimeout(() => setSuccess(''), 3000)
        return
      }

      for (const key of changedKeys) {
        const res = await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value: values[key] }),
        })
        const json = await res.json()
        if (!json.success) {
          throw new Error(json.error || `Failed to save ${key}`)
        }
      }

      setSuccess(t('settings.saved'))
      setInitialValues(values)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">{t('settings.loading')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">{t('settings.title')}</h1>

      {/* Section 1: Product Defaults */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-hidden">
        <h2 className="text-base font-semibold text-gray-800 mb-3">{t('settings.productDefaults')}</h2>
        <div className="space-y-3">
          {/* Product Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.productType')}
            </label>
            <select
              value={values.product_type}
              onChange={(e) => handleChange('product_type', e.target.value)}
              className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
            >
              <option value="">{t('settings.selectProductType')}</option>
              {options.productTypes.map((pt) => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
              {values.product_type && !options.productTypes.includes(values.product_type) && (
                <option value={values.product_type}>{values.product_type}</option>
              )}
            </select>
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.vendor')}
            </label>
            <div className="flex gap-2">
              <select
                value={values.vendor}
                onChange={(e) => handleChange('vendor', e.target.value)}
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-3 text-base bg-white truncate"
              >
                <option value="">{t('settings.selectVendor')}</option>
                {options.vendors.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
                {values.vendor && !options.vendors.includes(values.vendor) && (
                  <option value={values.vendor}>{values.vendor}</option>
                )}
              </select>
              <button
                onClick={() => setShowNewVendor(!showNewVendor)}
                className="shrink-0 w-12 h-12 flex items-center justify-center border border-gray-300 rounded-lg text-xl text-gray-600"
              >
                +
              </button>
            </div>
            {showNewVendor && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newVendor}
                  onChange={(e) => setNewVendor(e.target.value)}
                  placeholder={t('settings.newVendorPlaceholder')}
                  className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-base"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddVendor()}
                />
                <button
                  onClick={handleAddVendor}
                  className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  {t('settings.add')}
                </button>
              </div>
            )}
          </div>

          {/* Collection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.collection')}
            </label>
            <div className="flex gap-2">
              <select
                value={values.collection}
                onChange={(e) => handleChange('collection', e.target.value)}
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-3 text-base bg-white truncate"
              >
                <option value="">{t('settings.selectCollection')}</option>
                {options.collections.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                {values.collection && !options.collections.includes(values.collection) && (
                  <option value={values.collection}>{values.collection}</option>
                )}
              </select>
              <button
                onClick={() => setShowNewCollection(!showNewCollection)}
                className="shrink-0 w-12 h-12 flex items-center justify-center border border-gray-300 rounded-lg text-xl text-gray-600"
              >
                +
              </button>
            </div>
            {showNewCollection && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newCollection}
                  onChange={(e) => setNewCollection(e.target.value)}
                  placeholder={t('settings.newCollectionPlaceholder')}
                  className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-base"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCollection()}
                />
                <button
                  onClick={handleAddCollection}
                  disabled={creatingCollection}
                  className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {creatingCollection ? '...' : t('settings.add')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Metafields */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-hidden">
        <h2 className="text-base font-semibold text-gray-800 mb-3">{t('settings.metafields')}</h2>
        <div className="space-y-3">
          {/* Brands */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.brands')}
            </label>
            <div className="flex gap-2">
              <select
                value={values.metafield_brands}
                onChange={(e) => handleChange('metafield_brands', e.target.value)}
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-3 text-base bg-white truncate"
              >
                <option value="">{t('settings.selectBrand')}</option>
                {options.brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
                {values.metafield_brands && !options.brands.includes(values.metafield_brands) && (
                  <option value={values.metafield_brands}>{values.metafield_brands}</option>
                )}
              </select>
              <button
                onClick={() => setShowNewBrand(!showNewBrand)}
                className="shrink-0 w-12 h-12 flex items-center justify-center border border-gray-300 rounded-lg text-xl text-gray-600"
              >
                +
              </button>
            </div>
            {showNewBrand && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  placeholder={t('settings.newBrandPlaceholder')}
                  className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-base"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddBrand()}
                />
                <button
                  onClick={handleAddBrand}
                  className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  {t('settings.add')}
                </button>
              </div>
            )}
          </div>

          {/* Estimated Arrival */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.estimatedArrival')}
            </label>
            <select
              value={values.metafield_estimate_arrival}
              onChange={(e) => handleChange('metafield_estimate_arrival', e.target.value)}
              className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
            >
              <option value="">{t('settings.selectArrival')}</option>
              {options.arrivalChoices.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              {values.metafield_estimate_arrival && !options.arrivalChoices.includes(values.metafield_estimate_arrival) && (
                <option value={values.metafield_estimate_arrival}>{values.metafield_estimate_arrival}</option>
              )}
            </select>
          </div>

          {/* Cutoff Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.cutoff')}
            </label>
            <input
              type="date"
              value={values.metafield_cutoff}
              onChange={(e) => handleChange('metafield_cutoff', e.target.value)}
              className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Description */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-hidden">
        <h2 className="text-base font-semibold text-gray-800 mb-3">{t('settings.descriptionSection')}</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings.universalDesc')}
          </label>
          <p className="text-xs text-gray-500 mb-2">
            {t('settings.universalDescHint')}
          </p>
          <textarea
            value={values.universal_product_description}
            onChange={(e) => handleChange('universal_product_description', e.target.value)}
            rows={6}
            placeholder={t('settings.descPlaceholder')}
            className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-3 text-base resize-none break-words"
          />
        </div>

        {/* Description Photo */}
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings.descPhoto')}
          </label>
          <p className="text-xs text-gray-500 mb-2">
            {t('settings.descPhotoHint')}
          </p>

          <input
            ref={photoCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />

          {descriptionPhoto ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={descriptionPhoto}
                alt="Description photo"
                className="w-32 h-32 object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={handlePhotoRemove}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow"
              >
                X
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => photoCameraInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 active:bg-gray-50 disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                {uploadingPhoto ? t('settings.uploading') : t('create.takePhoto')}
              </button>
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 active:bg-gray-50 disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                {uploadingPhoto ? t('settings.uploading') : t('create.chooseFromAlbum')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error / Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          {success}
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white font-semibold py-4 rounded-lg text-base disabled:opacity-50 disabled:cursor-not-allowed active:bg-blue-700"
      >
        {saving ? t('settings.saving') : t('settings.saveSettings')}
      </button>
    </div>
  )
}
