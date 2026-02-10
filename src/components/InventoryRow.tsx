'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n'

interface InventoryRowProps {
  id: string
  productId: string
  productCode: string
  setName: string | null
  available: number
  variantId?: string | null
  lowStockThreshold: number
  onUpdate: (productId: string, variantId: string | null | undefined, newQuantity: number) => Promise<boolean>
}

export default function InventoryRow({
  id,
  productId,
  productCode,
  setName,
  available,
  variantId,
  lowStockThreshold,
  onUpdate,
}: InventoryRowProps) {
  const { t } = useT()
  const [quantity, setQuantity] = useState(available)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const isLowStock = quantity <= lowStockThreshold && quantity > 0
  const isOutOfStock = quantity === 0

  const handleIncrement = async () => {
    const newQuantity = quantity + 1
    setIsUpdating(true)
    const success = await onUpdate(productId, variantId, newQuantity)
    if (success) {
      setQuantity(newQuantity)
    }
    setIsUpdating(false)
  }

  const handleDecrement = async () => {
    if (quantity <= 0) return
    const newQuantity = quantity - 1
    setIsUpdating(true)
    const success = await onUpdate(productId, variantId, newQuantity)
    if (success) {
      setQuantity(newQuantity)
    }
    setIsUpdating(false)
  }

  const handleInputChange = (value: string) => {
    const num = parseInt(value, 10)
    if (!isNaN(num) && num >= 0) {
      setQuantity(num)
    }
  }

  const handleInputBlur = async () => {
    if (quantity === available) {
      setIsEditing(false)
      return
    }
    setIsUpdating(true)
    const success = await onUpdate(productId, variantId, quantity)
    if (!success) {
      setQuantity(available)
    }
    setIsUpdating(false)
    setIsEditing(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm">{productCode}</div>
          {setName && (
            <div className="text-xs text-gray-500 truncate">{setName}</div>
          )}
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          <div
            className={`w-2 h-2 rounded-full ${
              isOutOfStock
                ? 'bg-red-500'
                : isLowStock
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            title={
              isOutOfStock
                ? t('inventory.outOfStock')
                : isLowStock
                ? t('inventory.lowStock')
                : t('inventory.inStock')
            }
          />

          {/* Minus Button */}
          <button
            onClick={handleDecrement}
            disabled={isUpdating || quantity <= 0}
            className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed active:bg-gray-100"
          >
            -
          </button>

          {/* Quantity Input */}
          {isEditing ? (
            <input
              type="number"
              value={quantity}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={handleInputBlur}
              disabled={isUpdating}
              className="w-16 h-8 text-center border border-gray-300 rounded-md text-sm"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              disabled={isUpdating}
              className="w-16 h-8 text-center border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {quantity}
            </button>
          )}

          {/* Plus Button */}
          <button
            onClick={handleIncrement}
            disabled={isUpdating}
            className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed active:bg-gray-100"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
