import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useTransactions } from '../../hooks/useTransactions'
import { useFinanceCategoriesStore } from '../../stores/financeCategoriesStore'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { deleteTransaction } from '../../services/repositories/financeTransactionsRepository'
import { formatTRY } from '../../lib/format'
import { TransactionForm } from './TransactionForm'
import { MagnitudeBreakdown } from './MagnitudeBreakdown'
import { BudgetComparison } from './BudgetComparison'
import { SkeletonLines } from '../../components/Skeleton'
import { PageHeader } from '../../components/PageHeader'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { buildBreakdown } from '../../lib/financeBreakdown'
import type { FinanceTransaction } from '../../types/domain'

const ISO_MONTH_LENGTH = 7
const RECENT_TRANSACTIONS_SKELETON_COUNT = 3

function currentMonthPrefix(): string {
  return new Date().toISOString().slice(0, ISO_MONTH_LENGTH)
}

export function FinansPage() {
  const uid = useUid()
  const { transactions, loading } = useTransactions(uid)
  const categories = useFinanceCategoriesStore((s) => s.categories)
  const areas = useLifeAreasStore((s) => s.areas)
  const [formKey, setFormKey] = useState(0)

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id
  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? id

  const monthPrefix = currentMonthPrefix()
  const monthExpenses = transactions.filter(
    (tx) => tx.type === 'expense' && tx.date.startsWith(monthPrefix),
  )

  const categoryBreakdown = buildBreakdown(monthExpenses, (tx) => tx.categoryId, categoryName)
  const areaBreakdown = buildBreakdown(monthExpenses, (tx) => tx.lifeAreaId, areaName)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader icon={Wallet} title="Finans" />

      <TransactionForm key={formKey} onCreated={() => setFormKey((k) => k + 1)} />

      <div className="grid gap-4 md:grid-cols-2">
        <MagnitudeBreakdown
          title="Bu ay kategoriye göre dağılım"
          items={categoryBreakdown}
          emptyText="Bu ay henüz gider girilmedi."
        />
        <MagnitudeBreakdown
          title="Bu ay hayat alanına bağlı harcamalar"
          items={areaBreakdown}
          emptyText="Bu ay hiçbir işlem bir hayat alanına bağlanmadı."
        />
      </div>

      <BudgetComparison categories={categories} monthExpenses={monthExpenses} />

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-text">Son işlemler</h2>
        {loading ? (
          <SkeletonLines count={RECENT_TRANSACTIONS_SKELETON_COUNT} className="mt-3" />
        ) : transactions.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">Henüz işlem yok.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} uid={uid} tx={tx} categoryName={categoryName(tx.categoryId)} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function TransactionRow({
  uid,
  tx,
  categoryName,
}: {
  uid: string
  tx: FinanceTransaction
  categoryName: string
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const isExpense = tx.type === 'expense'

  return (
    <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="truncate text-text">
          {categoryName}
          {tx.description ? ` — ${tx.description}` : ''}
        </p>
        <p className="text-xs text-text-secondary">{tx.date}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={isExpense ? 'text-danger' : 'text-success'}>
          {isExpense ? '−' : '+'}
          {formatTRY(tx.amountTRY)}
        </span>
        {confirmingDelete ? (
          <div className="flex items-center gap-1 text-xs">
            <Button variant="danger" size="sm" onClick={() => void deleteTransaction(uid, tx.id)}>
              Sil
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Vazgeç
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
            Sil
          </Button>
        )}
      </div>
    </li>
  )
}
