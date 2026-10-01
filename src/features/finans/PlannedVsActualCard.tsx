import { Card } from '../../components/Card'
import { formatTRY } from '../../lib/format'
import type { FinanceTransaction, PlannedExpense } from '../../types/domain'

const PERCENT_MAX = 100

interface GroupTotal {
  id: string
  label: string
  planned: number
  actual: number
}

/**
 * Konu/hayat alanı bazlı "planlı maliyet toplamı vs. gerçekleşen toplamı" — mevcut kategori
 * bazlı dağılımın yanına eklenir, onu değiştirmez (bkz. docs/decisions/0012).
 */
export function PlannedVsActualCard({
  plannedExpenses,
  transactions,
  areaName,
}: {
  plannedExpenses: PlannedExpense[]
  transactions: FinanceTransaction[]
  areaName: (id: string) => string
}) {
  const groups = new Map<string, GroupTotal>()

  for (const p of plannedExpenses) {
    if (p.status === 'iptal') continue
    const key = p.lifeAreaId
    const existing = groups.get(key) ?? { id: key, label: areaName(key), planned: 0, actual: 0 }
    existing.planned += p.estimatedAmountTRY
    groups.set(key, existing)
  }

  const plannedExpenseIds = new Set(plannedExpenses.map((p) => p.id))
  for (const tx of transactions) {
    if (!tx.plannedExpenseId || !plannedExpenseIds.has(tx.plannedExpenseId)) continue
    const source = plannedExpenses.find((p) => p.id === tx.plannedExpenseId)
    if (!source) continue
    const key = source.lifeAreaId
    const existing = groups.get(key) ?? { id: key, label: areaName(key), planned: 0, actual: 0 }
    existing.actual += tx.amountTRY
    groups.set(key, existing)
  }

  const rows = [...groups.values()].sort((a, b) => b.planned - a.planned)

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-text">Hayat alanına göre planlı vs. gerçekleşen</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">Henüz planlı harcama yok.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {rows.map((row) => {
            const sharePercent =
              row.planned > 0 ? Math.min(PERCENT_MAX, Math.round((row.actual / row.planned) * PERCENT_MAX)) : 0
            return (
              <div key={row.id}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text">{row.label}</span>
                  <span className="text-text-secondary">
                    {formatTRY(row.actual)} / {formatTRY(row.planned)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${sharePercent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
