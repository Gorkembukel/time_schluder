import { useState } from 'react'
import { subDays } from 'date-fns'
import { Plus, Target } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useTasksInRange } from '../../hooks/useTasksInRange'
import { scalePeriodRange } from '../../lib/planning-engine'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { SkeletonLines } from '../../components/Skeleton'
import { Button } from '../../components/Button'
import { PLANNING_SCALE_LABELS, type PlanningScale } from '../../types/domain'
import { GoalForm } from './GoalForm'
import { GoalNode } from './GoalNode'

/** Takvim'in Yıl / 3 Yıl sekmeleri — gün/hafta/ay ızgarası yerine hedef ağacı gösterir (bkz. WBS/rolling-wave, docs/decisions/0004). */
export function HorizonBoard({
  scale,
  referenceDate,
  weekStartsOn,
}: {
  scale: Extract<PlanningScale, 'year3' | 'year'>
  referenceDate: Date
  weekStartsOn: number
}) {
  const uid = useUid()
  const [showAddGoal, setShowAddGoal] = useState(false)
  const period = scalePeriodRange(scale, referenceDate, weekStartsOn)
  const { tasks, loading } = useTasksInRange(uid, period.start.toISOString(), period.end.toISOString())

  const goals = tasks
    .filter((t) => t.scale === scale && !t.parentTaskId)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))

  return (
    <div className="flex flex-col gap-4">
      {showAddGoal ? (
        <GoalForm
          uid={uid}
          scale={scale}
          defaultRange={{ start: period.start, end: subDays(period.end, 1) }}
          onDone={() => setShowAddGoal(false)}
        />
      ) : (
        <Button variant="primary" size="sm" onClick={() => setShowAddGoal(true)} className="self-start">
          <Plus size={16} />
          {PLANNING_SCALE_LABELS[scale]} hedefi ekle
        </Button>
      )}

      <Card className="p-5">
        {loading ? (
          <SkeletonLines count={3} className="h-12" />
        ) : goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title={`Bu ${PLANNING_SCALE_LABELS[scale].toLowerCase()} için hedef yok`}
            description="Yukarıdaki butonla bir hedef ekleyip alt hedeflere/görevlere kırabilirsin."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {goals.map((goal) => (
              <GoalNode key={goal.id} uid={uid} task={goal} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
