const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })

export function formatTRY(amount: number): string {
  return TRY_FORMATTER.format(amount)
}
