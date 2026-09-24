import { formatTRY } from '../../lib/format'
import { Card } from '../../components/Card'

const PERCENT_MAX = 100

export interface BreakdownItem {
  id: string
  label: string
  amount: number
}

/**
 * Kategoriler arası büyüklük karşılaştırması — kimlik (hue) değil miktar sırası
 * iletildiği için tek renkli (primary) çubuklar kullanılır; kategorik palet
 * gerektirmez (bkz. dataviz skill, "form seçimi": magnitude → sequential/tek hue).
 */
export function MagnitudeBreakdown({
  title,
  items,
  emptyText,
}: {
  title: string
  items: BreakdownItem[]
  emptyText: string
}) {
  const total = items.reduce((sum, item) => sum + item.amount, 0)
  const sorted = [...items].sort((a, b) => b.amount - a.amount)
  const maxAmount = sorted[0]?.amount ?? 0

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">{emptyText}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          {sorted.map((item) => {
            const sharePercent =
              total > 0 ? Math.round((item.amount / total) * PERCENT_MAX) : 0
            const barPercent =
              maxAmount > 0 ? Math.round((item.amount / maxAmount) * PERCENT_MAX) : 0
            return (
              <div key={item.id}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text">{item.label}</span>
                  <span className="text-text-secondary">
                    {formatTRY(item.amount)} · %{sharePercent}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${barPercent}%` }}
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
