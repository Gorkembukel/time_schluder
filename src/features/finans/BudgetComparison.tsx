import { formatTRY } from '../../lib/format'
import type { FinanceCategory, FinanceTransaction } from '../../types/domain'

const PERCENT_MAX = 100
const WARNING_THRESHOLD_PERCENT = 90

/**
 * Bütçe vs. gerçekleşen — burada renk "durum" (bütçe aşımı riski) taşıdığı için
 * status paleti (primary/warning/danger) kullanılır; bu, kategori kimliği için
 * kategorik renk kullanmaktan farklı, meşru bir kullanım (bkz. dataviz skill).
 */
export function BudgetComparison({
  categories,
  monthExpenses,
}: {
  categories: FinanceCategory[]
  monthExpenses: FinanceTransaction[]
}) {
  const budgeted = categories.filter(
    (c) => c.kind === 'expense' && c.monthlyBudgetTRY !== undefined && c.monthlyBudgetTRY > 0,
  )

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold text-text">Bu ay bütçe vs. gerçekleşen</h2>
      {budgeted.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">
          Henüz bütçe belirlenmedi — Ayarlar → Finans → Bütçe'den kategori başına aylık hedef
          girebilirsin.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {budgeted.map((category) => {
            const budget = category.monthlyBudgetTRY ?? 0
            const actual = monthExpenses
              .filter((tx) => tx.categoryId === category.id)
              .reduce((sum, tx) => sum + tx.amountTRY, 0)
            const usagePercent = Math.round((actual / budget) * PERCENT_MAX)
            const barColor =
              usagePercent > PERCENT_MAX
                ? 'bg-danger'
                : usagePercent >= WARNING_THRESHOLD_PERCENT
                  ? 'bg-warning'
                  : 'bg-primary'
            return (
              <div key={category.id}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text">{category.name}</span>
                  <span className="text-text-secondary">
                    {formatTRY(actual)} / {formatTRY(budget)} · %{usagePercent}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${Math.min(usagePercent, PERCENT_MAX)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
