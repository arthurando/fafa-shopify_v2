'use client'

import { useState, useEffect, use, useRef } from 'react'
import Link from 'next/link'
import type { Product } from '@/types'

interface ShopifyImage {
  id: number
  src: string
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [product, setProduct] = useState<Product | null>(null)
  const [shopifyImages, setShopifyImages] = useState<ShopifyImage[]>([])
  const [description, setDescription] = useState('')
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [newPhotoUrls, setNewPhotoUrls] = useState<string[]>([])
  const [newVideo, setNewVideo] = useState<File | null>(null)
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const photoCameraRef = useRef<HTMLInputElement>(null)
  const photoAlbumRef = useRef<HTMLInputElement>(null)
  const videoCameraRef = useRef<HTMLInputElement>(null)
  const videoAlbumRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setProduct(json.data)
          setDescription(json.data.description_custom || '')
          setShopifyImages(json.data.shopify_images || [])
        }
      })
  }, [id])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setNewPhotos((prev) => [...prev, ...files])
    const urls = files.map((f) => URL.createObjectURL(f))
    setNewPhotoUrls((prev) => [...prev, ...urls])
  }

  const removeNewPhoto = (index: number) => {
    URL.revokeObjectURL(newPhotoUrls[index])
    setNewPhotos((prev) => prev.filter((_, i) => i !== index))
    setNewPhotoUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (newVideoUrl) URL.revokeObjectURL(newVideoUrl)
    setNewVideo(file)
    setNewVideoUrl(file ? URL.createObjectURL(file) : '')
  }

  const removeNewVideo = () => {
    if (newVideoUrl) URL.revokeObjectURL(newVideoUrl)
    setNewVideo(null)
    setNewVideoUrl('')
  }

  const handleDeleteExistingPhoto = async (imageId: number) => {
    if (!confirm('Delete this photo from Shopify?')) return
    setDeleting(imageId)
    setMessage('')
    try {
      const res = await fetch(`/api/products/${id}?imageId=${imageId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        setShopifyImages((prev) => prev.filter((img) => img.id !== imageId))
        setMessage('Photo deleted!')
      } else {
        setMessage(json.error)
      }
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteVideo = async () => {
    if (!product?.product_code) return
    if (!confirm('Delete video from R2?')) return
    setMessage('')
    try {
      const res = await fetch(`/api/products/${id}/video`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        setProduct({ ...product, has_video: false })
        setMessage('Video deleted!')
      } else {
        setMessage(json.error)
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to delete video')
    }
  }

  const handleSaveDescription = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description_custom: description }),
      })
      const json = await res.json()
      setMessage(json.success ? 'Description saved!' : json.error)
    } finally {
      setSaving(false)
    }
  }

  const handleUploadMedia = async () => {
    if (newPhotos.length === 0 && !newVideo) return
    setUploading(true)
    setMessage('')
    try {
      const formData = new FormData()

      // Upload photos
      if (newPhotos.length > 0) {
        newPhotos.forEach((p) => formData.append('photos', p))
        const photoRes = await fetch(`/api/products/${id}/images`, {
          method: 'POST',
          body: formData,
        })
        const photoJson = await photoRes.json()
        if (!photoJson.success) {
          setMessage(photoJson.error)
          return
        }
      }

      // Upload video
      if (newVideo) {
        const videoFormData = new FormData()
        videoFormData.append('video', newVideo)
        const videoRes = await fetch(`/api/products/${id}/video`, {
          method: 'POST',
          body: videoFormData,
        })
        const videoJson = await videoRes.json()
        if (!videoJson.success) {
          setMessage(videoJson.error)
          return
        }
        setProduct(product ? { ...product, has_video: true } : null)
      }

      setMessage(`${newPhotos.length > 0 ? `${newPhotos.length} photo(s) ` : ''}${newVideo ? 'video ' : ''}uploaded!`)

      // Clear uploads
      setNewPhotos([])
      newPhotoUrls.forEach((url) => URL.revokeObjectURL(url))
      setNewPhotoUrls([])
      removeNewVideo()

      // Refresh Shopify images
      const res = await fetch(`/api/products/${id}`)
      const json = await res.json()
      if (json.success) {
        setShopifyImages(json.data.shopify_images || [])
      }
    } finally {
      setUploading(false)
    }
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/products" className="text-blue-600 text-sm">
          &larr; Back
        </Link>
        <h1 className="text-xl font-bold">{product.product_code}</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-600">
          {product.set_name} - ${product.set_price}
        </p>
        <div className="flex gap-2 mt-1">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {product.status}
          </span>
          {product.has_video && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
              Has Video
            </span>
          )}
        </div>
      </div>

      {/* Existing Photos */}
      {shopifyImages.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Photos ({shopifyImages.length})
          </label>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
            {shopifyImages.map((image) => (
              <div key={image.id} className="relative flex-shrink-0 w-40 h-40 snap-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.src}
                  alt="Product"
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteExistingPhoto(image.id)}
                  disabled={deleting === image.id}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full text-sm font-bold flex items-center justify-center disabled:opacity-50 shadow-lg"
                >
                  {deleting === image.id ? '...' : 'X'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Video */}
      {product.has_video && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Video
          </label>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-base text-purple-700 font-medium">{product.product_code}.mp4</span>
            <button
              onClick={handleDeleteVideo}
              className="text-sm bg-red-500 text-white px-4 py-2 rounded-lg font-medium active:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Edit Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base resize-none"
        />
        <button
          onClick={handleSaveDescription}
          disabled={saving}
          className="mt-2 w-full bg-blue-600 text-white font-semibold py-4 rounded-lg text-base disabled:opacity-50 active:bg-blue-700"
        >
          {saving ? 'Saving...' : 'Save Description'}
        </button>
      </div>

      {/* Add Photos */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Photos
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
            Camera
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
            Album
          </button>
        </div>
        {newPhotoUrls.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 mt-3 snap-x snap-mandatory">
            {newPhotoUrls.map((url, i) => (
              <div key={i} className="relative flex-shrink-0 w-40 h-40 snap-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`New photo ${i + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeNewPhoto(i)}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full text-sm font-bold flex items-center justify-center shadow-lg"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Video */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {product.has_video ? 'Replace Video' : 'Add Video'}
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
        {!newVideo ? (
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
              Record
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
              Album
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={newVideoUrl}
              controls
              className="w-full rounded-lg"
              style={{ maxHeight: '240px' }}
            />
            <button
              type="button"
              onClick={removeNewVideo}
              className="absolute top-2 right-2 w-10 h-10 bg-red-500 text-white rounded-full text-base font-bold flex items-center justify-center shadow-lg"
            >
              X
            </button>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {(newPhotos.length > 0 || newVideo) && (
        <button
          onClick={handleUploadMedia}
          disabled={uploading}
          className="w-full bg-green-600 text-white font-semibold py-4 rounded-lg text-base disabled:opacity-50 active:bg-green-700"
        >
          {uploading ? 'Uploading...' : `Upload ${newPhotos.length > 0 ? `${newPhotos.length} Photo(s)` : ''}${newPhotos.length > 0 && newVideo ? ' + ' : ''}${newVideo ? 'Video' : ''}`}
        </button>
      )}

      {message && (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 rounded-lg p-3 text-sm">
          {message}
        </div>
      )}
    </div>
  )
}
