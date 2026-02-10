'use client'

import { calculateTotalCost, calculateMargin } from '@/lib/utils'
import { useT } from '@/lib/i18n'

interface MarginDisplayProps {
  price: number
  cost: number
  shippingCost?: number
  customsCost?: number
  exchangeRate?: number
  compact?: boolean
}

export function MarginDisplay({
  price,
  cost,
  shippingCost = 0,
  customsCost = 0,
  exchangeRate = 1,
  compact = false
}: MarginDisplayProps) {
  const { t } = useT()

  const totalCost = calculateTotalCost(cost, shippingCost, customsCost, exchangeRate)
  const margin = calculateMargin(price, totalCost)

  const colorClass =
    margin.percentage >= 30 ? 'text-green-600' :
    margin.percentage >= 15 ? 'text-yellow-600' :
    'text-red-600'

  const bgClass =
    margin.percentage >= 30 ? 'bg-green-50' :
    margin.percentage >= 15 ? 'bg-yellow-50' :
    'bg-red-50'

  if (compact) {
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded ${bgClass} ${colorClass}`}>
        {t('sets.margin')}: ${margin.amount} ({margin.percentage}%)
      </span>
    )
  }

  return (
    <div className={`px-3 py-2 rounded-lg ${bgClass}`}>
      <p className="text-xs text-gray-600 mb-0.5">{t('sets.margin')}</p>
      <p className={`text-sm font-bold ${colorClass}`}>
        ${margin.amount} ({margin.percentage}%)
      </p>
    </div>
  )
}
