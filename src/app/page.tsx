'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ProductSet } from '@/types'
import { useT } from '@/lib/i18n'

export default function CreateProductPage() {
  const { t } = useT()
  const [sets, setSets] = useState<ProductSet[]>([])
  const [selectedSetId, setSelectedSetId] = useState('')
  const [nextCode, setNextCode] = useState('')
  const [descriptionCustom, setDescriptionCustom] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])
  const [video, setVideo] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [brand, setBrand] = useState('')
  const [status, setStatus] = useState<'draft' | 'active'>('draft')
  const photoCameraRef = useRef<HTMLInputElement>(null)
  const photoAlbumRef = useRef<HTMLInputElement>(null)
  const videoCameraRef = useRef<HTMLInputElement>(null)
  const videoAlbumRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/sets')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setSets(res.data)
      })
    fetch('/api/settings')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          const brandSetting = res.data.find((s: { key: string; value: string }) => s.key === 'metafield_brands')
          if (brandSetting) setBrand(brandSetting.value)
        }
      })
  }, [])

  const fetchNextCode = useCallback(async (setId: string) => {
    if (!setId) {
      setNextCode('')
      return
    }
    const res = await fetch(`/api/sets/${setId}/next-code`)
    const json = await res.json()
    if (json.success) setNextCode(json.data.nextCode)
  }, [])

  useEffect(() => {
    fetchNextCode(selectedSetId)
  }, [selectedSetId, fetchNextCode])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newPhotos = [...photos, ...files]
    setPhotos(newPhotos)

    const newUrls = files.map((f) => URL.createObjectURL(f))
    setPhotoPreviewUrls((prev) => [...prev, ...newUrls])
  }

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index])
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setVideo(file)
    setVideoPreviewUrl(file ? URL.createObjectURL(file) : '')
  }

  const removeVideo = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setVideo(null)
    setVideoPreviewUrl('')
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    if (!selectedSetId) {
      setError(t('create.selectSetError'))
      return
    }
    if (photos.length === 0) {
      setError(t('create.photoRequired'))
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('set_id', selectedSetId)
      formData.append('description_custom', descriptionCustom)
      formData.append('status', status)
      photos.forEach((photo) => formData.append('photos', photo))
      if (video) formData.append('video', video)

      const res = await fetch('/api/products/create', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (json.success) {
        setSuccess(`${nextCode} ${t('create.success')}`)
        setDescriptionCustom('')
        setPhotos([])
        photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url))
        setPhotoPreviewUrls([])
        removeVideo()
        fetchNextCode(selectedSetId)
      } else {
        setError(json.error || t('create.failed'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('create.networkError'))
    } finally {
      setLoading(false)
    }
  }

  const selectedSet = sets.find((s) => s.id === selectedSetId)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold">{t('create.title')}</h1>
        {brand && (
          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {brand}
          </span>
        )}
      </div>

      {/* Set Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('create.productSet')}
        </label>
        <select
          value={selectedSetId}
          onChange={(e) => setSelectedSetId(e.target.value)}
          className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-3 text-base bg-white"
        >
          <option value="">{t('create.selectSet')}</option>
          {sets.map((set) => (
            <option key={set.id} value={set.id}>
              {set.name} ({set.prefix}) - ${set.price}
            </option>
          ))}
        </select>
      </div>

      {/* Product Code Display */}
      {nextCode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-sm text-blue-600 mb-1">{t('create.nextCode')}</p>
          <p className="text-3xl font-bold text-blue-800">{nextCode}</p>
          {selectedSet && (
            <p className="text-sm text-blue-600 mt-1">
              {t('create.price')}: ${selectedSet.price}
              {selectedSet.original_price && (
                <span className="text-gray-400 line-through ml-2">
                  ${selectedSet.original_price}
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('create.photos')} <span className="text-red-500">*</span>
        </label>
        <input
          ref={photoCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
        />
        <input
          ref={photoAlbumRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoChange}
          className="hidden"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => photoCameraRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-300 rounded-lg px-3 py-3 text-base bg-white active:bg-gray-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            {t('create.takePhoto')}
          </button>
          <button
            type="button"
            onClick={() => photoAlbumRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-300 rounded-lg px-3 py-3 text-base bg-white active:bg-gray-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            {t('create.chooseFromAlbum')}
          </button>
        </div>
        {photoPreviewUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {photoPreviewUrls.map((url, i) => (
              <div key={i} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('create.video')} <span className="text-gray-400">{t('create.optional')}</span>
        </label>
        <input
          ref={videoCameraRef}
          type="file"
          accept="video/*"
          capture="environment"
          onChange={handleVideoChange}
          className="hidden"
        />
        <input
          ref={videoAlbumRef}
          type="file"
          accept="video/*"
          onChange={handleVideoChange}
          className="hidden"
        />
        {!video ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => videoCameraRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 border border-gray-300 rounded-lg px-3 py-3 text-base bg-white active:bg-gray-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {t('create.recordVideo')}
            </button>
            <button
              type="button"
              onClick={() => videoAlbumRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 border border-gray-300 rounded-lg px-3 py-3 text-base bg-white active:bg-gray-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              {t('create.chooseVideo')}
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={videoPreviewUrl}
              controls
              className="w-full rounded-lg max-h-48"
            />
            <button
              type="button"
              onClick={removeVideo}
              className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full text-sm flex items-center justify-center"
            >
              X
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('create.description')}
        </label>
        <textarea
          value={descriptionCustom}
          onChange={(e) => setDescriptionCustom(e.target.value)}
          rows={4}
          placeholder={t('create.descPlaceholder')}
          className="w-full max-w-full border border-gray-300 rounded-lg px-3 py-3 text-base resize-none break-words"
        />
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

      {/* Product Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('create.status')}
        </label>
        <div className="flex gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="status"
              value="draft"
              checked={status === 'draft'}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'active')}
              className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-base text-gray-700">{t('create.statusDraft')}</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="status"
              value="active"
              checked={status === 'active'}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'active')}
              className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-base text-gray-700">{t('create.statusActive')}</span>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={loading || !selectedSetId || photos.length === 0}
        className="w-full bg-blue-600 text-white font-semibold py-4 rounded-lg text-base disabled:opacity-50 disabled:cursor-not-allowed active:bg-blue-700"
      >
        {loading ? t('create.creating') : t('create.submit')}
      </button>
    </div>
  )
}
