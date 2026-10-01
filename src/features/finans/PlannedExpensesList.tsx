import { useState } from 'react'
import { ShoppingCart, Trash2, X } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { usePlannedExpenses } from '../../hooks/usePlannedExpenses'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import {
  deletePlannedExpense,
  updatePlannedExpenseStatus,
} from '../../services/repositories/plannedExpensesRepository'
import { formatTRY } from '../../lib/format'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { SkeletonLines } from '../../components/Skeleton'
import { TransactionForm } from './TransactionForm'
import { PLANNED_EXPENSE_STATUS_LABELS, type PlannedExpense } from '../../types/domain'

const LOADING_ROW_COUNT = 2
const ICON_SIZE = 14

/** Faz 3 — fiyatlı gerekliliklerden doğan planlı harcamaların listesi + "Satın alındı" akışı (ADR 0012). */
export function PlannedExpensesList() {
  const uid = useUid()
  const { plannedExpenses, loading } = usePlannedExpenses(uid)
  const areas = useLifeAreasStore((s) => s.areas)
  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? id

  const active = plannedExpenses.filter((p) => p.status !== 'iptal')

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-text">Planlı harcamalar</h2>
      {loading ? (
        <SkeletonLines count={LOADING_ROW_COUNT} className="mt-3" />
      ) : active.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">
          Henüz planlı harcama yok. Bir gerekliliğe tahmini maliyet girip "alınacak" durumuna
          getirdiğinde buradan satın alma akışını başlatabilirsin.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {active.map((item) => (
            <PlannedExpenseRow key={item.id} uid={uid} item={item} areaName={areaName(item.lifeAreaId)} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function PlannedExpenseRow({
  uid,
  item,
  areaName,
}: {
  uid: string
  item: PlannedExpense
  areaName: string
}) {
  const [purchasing, setPurchasing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <li className="py-2.5 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-text">{item.description}</p>
          <p className="text-xs text-text-secondary">
            {areaName}
            {item.plannedDate ? ` · ${item.plannedDate}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-text-secondary">{formatTRY(item.estimatedAmountTRY)}</span>
          <Badge variant={item.status === 'gerceklesti' ? 'success' : 'warning'}>
            {PLANNED_EXPENSE_STATUS_LABELS[item.status]}
          </Badge>
          {item.status === 'planlandi' && (
            <Button variant="secondary" size="sm" onClick={() => setPurchasing((v) => !v)}>
              {purchasing ? <X size={ICON_SIZE} /> : <ShoppingCart size={ICON_SIZE} />}
              {purchasing ? 'Vazgeç' : 'Satın alındı'}
            </Button>
          )}
          {item.status === 'planlandi' && (
            <Button variant="ghost" size="sm" onClick={() => void updatePlannedExpenseStatus(uid, item.id, 'iptal')}>
              İptal et
            </Button>
          )}
          {confirmingDelete ? (
            <div className="flex items-center gap-1 text-xs">
              <Button variant="danger" size="sm" onClick={() => void deletePlannedExpense(uid, item.id)}>
                Sil
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                Vazgeç
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
              <Trash2 size={ICON_SIZE} />
            </Button>
          )}
        </div>
      </div>
      {purchasing && (
        <div className="mt-2">
          <TransactionForm purchasing={item} onCreated={() => setPurchasing(false)} />
        </div>
      )}
    </li>
  )
}
