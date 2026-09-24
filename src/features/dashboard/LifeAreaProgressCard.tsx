import { Target } from 'lucide-react'
import { useRequirements } from '../../hooks/useRequirements'
import { useTaskHierarchy } from '../../hooks/useTaskHierarchy'
import { effectiveLifeAreaId, rollupProgress } from '../../lib/taskHierarchy'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { Badge } from '../../components/Badge'
import type { LifeArea } from '../../types/domain'

const PROGRESS_MAX_PERCENT = 100

function areaProgress(requirements: { targetMetric: number; currentValue: number }[]): number {
  const withTarget = requirements.filter((r) => r.targetMetric > 0)
  if (withTarget.length === 0) return 0
  const average =
    withTarget.reduce(
      (sum, r) =>
        sum +
        Math.min(PROGRESS_MAX_PERCENT, (r.currentValue / r.targetMetric) * PROGRESS_MAX_PERCENT),
      0,
    ) / withTarget.length
  return Math.round(average)
}

function AreaProgressRow({ uid, area }: { uid: string; area: LifeArea }) {
  const { requirements } = useRequirements(uid, area.id)
  const { tasks, index, children } = useTaskHierarchy()
  const progress = areaProgress(requirements)
  const rootGoals = tasks.filter(
    (t) => !t.parentTaskId && effectiveLifeAreaId(t, index) === area.id,
  )
  const goalProgress =
    rootGoals.length === 0
      ? null
      : Math.round(
          (rootGoals.reduce((sum, g) => sum + rollupProgress(g, children), 0) / rootGoals.length) *
            PROGRESS_MAX_PERCENT,
        )

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-text">{area.name}</span>
        <div className="flex items-center gap-2 text-text-secondary">
          <Badge variant="neutral">{requirements.length} gereklilik</Badge>
          <Badge variant="neutral">{rootGoals.length} hedef</Badge>
          {goalProgress !== null && <span>Hedef %{goalProgress}</span>}
          <span>%{progress}</span>
        </div>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border/60">
        <div
          className="h-full rounded-full bg-primary transition-all motion-safe:duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export function LifeAreaProgressCard({ uid, areas }: { uid: string; areas: LifeArea[] }) {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-text">Hayat alanları ilerlemesi</h2>
      {areas.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Henüz hayat alanı yok"
          description="Hayat Alanları sayfasından ilk alanını ekleyebilirsin."
        />
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {areas.map((area) => (
            <AreaProgressRow key={area.id} uid={uid} area={area} />
          ))}
        </div>
      )}
    </Card>
  )
}
