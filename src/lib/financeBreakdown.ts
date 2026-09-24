import type { FinanceTransaction } from '../types/domain'

export interface BreakdownItem {
  id: string
  label: string
  amount: number
}

/** İşlemleri verilen anahtara (kategori/hayat alanı id'si) göre toplayıp etiketli kırılım listesine çevirir. */
export function buildBreakdown(
  transactions: FinanceTransaction[],
  keyOf: (tx: FinanceTransaction) => string | undefined,
  labelOf: (id: string) => string,
): BreakdownItem[] {
  const totals = new Map<string, number>()
  for (const tx of transactions) {
    const key = keyOf(tx)
    if (!key) continue
    totals.set(key, (totals.get(key) ?? 0) + tx.amountTRY)
  }
  return [...totals.entries()].map(([id, amount]) => ({ id, label: labelOf(id), amount }))
}
