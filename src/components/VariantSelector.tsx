'use client'

import { useState, useEffect } from 'react'
import { VariantSelection } from '@/types'

interface VariantSelectorProps {
  availableColors: string[]
  availableSizes: string[]
  onSelectionChange: (variants: VariantSelection[]) => void
}

export default function VariantSelector({
  availableColors,
  availableSizes,
  onSelectionChange,
}: VariantSelectorProps) {
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [variantInventory, setVariantInventory] = useState<Map<string, number>>(new Map())

  // Generate variant combinations whenever selections change
  useEffect(() => {
    const combinations: VariantSelection[] = []
    for (const color of selectedColors) {
      for (const size of selectedSizes) {
        const key = `${color}-${size}`
        combinations.push({
          color,
          size,
          inventory: variantInventory.get(key) || 0,
        })
      }
    }
    onSelectionChange(combinations)
  }, [selectedColors, selectedSizes, variantInventory, onSelectionChange])

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    )
  }

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    )
  }

  const updateInventory = (color: string, size: string, inventory: number) => {
    const key = `${color}-${size}`
    setVariantInventory((prev) => {
      const updated = new Map(prev)
      updated.set(key, inventory)
      return updated
    })
  }

  const totalCombinations = selectedColors.length * selectedSizes.length

  return (
    <div className="space-y-6">
      {/* Color Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Colors
        </label>
        <div className="flex flex-wrap gap-2">
          {availableColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => toggleColor(color)}
              className={`min-h-[44px] px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                selectedColors.includes(color)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* Size Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sizes
        </label>
        <div className="flex flex-wrap gap-2">
          {availableSizes.map((size) => (
            <label
              key={size}
              className={`min-h-[44px] px-4 py-2 rounded-lg border-2 text-sm font-medium cursor-pointer transition-colors ${
                selectedSizes.includes(size)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={selectedSizes.includes(size)}
                onChange={() => toggleSize(size)}
              />
              {size}
            </label>
          ))}
        </div>
      </div>

      {/* Variant Count Warning */}
      {totalCombinations > 0 && (
        <div
          className={`p-3 rounded-lg border text-sm ${
            totalCombinations > 100
              ? 'border-red-300 bg-red-50 text-red-700'
              : 'border-blue-300 bg-blue-50 text-blue-700'
          }`}
        >
          {totalCombinations > 100 ? (
            <>
              <strong>Too many variants!</strong> You have {totalCombinations}{' '}
              combinations. Shopify allows maximum 100 variants per product.
            </>
          ) : (
            <>
              {totalCombinations} variant{totalCombinations > 1 ? 's' : ''} will be created
            </>
          )}
        </div>
      )}

      {/* Variant Grid Preview */}
      {totalCombinations > 0 && totalCombinations <= 100 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Variant Inventory (optional)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-2 border border-gray-200 rounded-lg">
            {selectedColors.map((color) =>
              selectedSizes.map((size) => {
                const key = `${color}-${size}`
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {color} / {size}
                    </span>
                    <input
                      type="number"
                      min="0"
                      className="w-20 min-h-[44px] px-2 py-1 text-base border border-gray-300 rounded"
                      placeholder="0"
                      value={variantInventory.get(key) || ''}
                      onChange={(e) =>
                        updateInventory(color, size, parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
