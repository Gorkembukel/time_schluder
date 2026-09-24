import { useState } from 'react'
import { subMilliseconds } from 'date-fns'
import { Plus, Target } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useTaskHierarchy } from '../../hooks/useTaskHierarchy'
import { scalePeriodRange } from '../../lib/planning-engine'
import { overlapsRange } from '../../lib/taskHierarchy'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { SkeletonLines } from '../../components/Skeleton'
import { Button } from '../../components/Button'
import { PLANNING_SCALE_LABELS, type PlanningScale } from '../../types/domain'
import { GoalForm } from './GoalForm'
import { GoalNode } from './GoalNode'

export type HorizonScale = Extract<PlanningScale, 'year3' | 'year' | 'month' | 'week'>

const ICON_SIZE = 16
const ONE_MS = 1

/**
 * Bir ölçeğin (3 Yıl / Yıl / Ay / Hafta) o döneme düşen işleri. Tek kaynak (tasksStore) okunur ve
 * ebeveyne bakılmaksızın o ölçekteki, dönemle kesişen tüm işler listelenir. Böylece üst ölçekte
 * (ör. 3 Yıl ağacında) oluşturulan yıllık iş Yıl görünümünde de çıkar. Üst hiyerarşi breadcrumb ile gösterilir.
 */
export function HorizonBoard({
  scale,
  referenceDate,
  weekStartsOn,
}: {
  scale: HorizonScale
  referenceDate: Date
  weekStartsOn: number
}) {
  const uid = useUid()
  const { tasks, loading } = useTaskHierarchy()
  const [showAddGoal, setShowAddGoal] = useState(false)
  const period = scalePeriodRange(scale, referenceDate, weekStartsOn)
  const label = PLANNING_SCALE_LABELS[scale]

  const items = tasks
    .filter((t) => t.scale === scale && overlapsRange(t, period.start, period.end))
    .sort((a, b) => a.startAt.localeCompare(b.startAt))

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text">{label} işleri</h2>
        {!showAddGoal && (
          <Button variant="primary" size="sm" onClick={() => setShowAddGoal(true)}>
            <Plus size={ICON_SIZE} />
            {label} işi ekle
          </Button>
        )}
      </div>
      {showAddGoal && (
        <div className="mb-3">
          <GoalForm
            uid={uid}
            scale={scale}
            defaultRange={{ start: period.start, end: subMilliseconds(period.end, ONE_MS) }}
            onDone={() => setShowAddGoal(false)}
          />
        </div>
      )}
      {loading ? (
        <SkeletonLines count={3} className="h-12" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Target}
          title={`Bu dönem için ${label.toLowerCase()} işi yok`}
          description="Buradan ekleyebilir ya da bir üst ölçekteki işin altından kırabilirsin."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <GoalNode key={item.id} uid={uid} task={item} showBreadcrumb />
          ))}
        </div>
      )}
    </Card>
  )
}
