export function generateNextCode(prefix: string, lastCode: string | null): string {
  if (!lastCode) {
    return `${prefix}001`
  }

  const numPart = lastCode.replace(prefix, '')
  const nextNum = parseInt(numPart, 10) + 1
  return `${prefix}${String(nextNum).padStart(3, '0')}`
}

export function formatCode(prefix: string, sequence: number): string {
  return `${prefix}${String(sequence).padStart(3, '0')}`
}

export function mergeDescription(
  customText: string,
  universalTemplate: string
): string {
  const parts = [customText.trim(), universalTemplate.trim()].filter(Boolean)
  return parts.join('\n\n\n')
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>')
}

export function calculateTotalCost(
  cost: number,
  shippingCost: number,
  customsCost: number,
  exchangeRate: number
): number {
  return (cost + shippingCost + customsCost) * exchangeRate
}

export function calculateMargin(
  price: number,
  totalCost: number
): { amount: number; percentage: number } {
  const amount = Math.round((price - totalCost) * 100) / 100
  const percentage = price > 0 ? Math.round((amount / price) * 100) : 0
  return { amount, percentage }
}
