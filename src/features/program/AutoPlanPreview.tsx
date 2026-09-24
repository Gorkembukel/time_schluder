import { Bot, Check, X } from 'lucide-react'
import type { AutoPlan } from '../../lib/autoPlan'
import { formatHours } from '../../lib/capacityGuidance'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { PLANNING_SCALE_LABELS, PLANNING_SCALES } from '../../types/domain'

const ICON_SIZE = 14
const MS_PER_MINUTE = 60_000

/** Otomatik planın önizlemesi — bloklar ızgarada kesikli çizilir, kullanıcı onaylayınca yazılır. */
export function AutoPlanPreview({
  plan,
  applying,
  onApply,
  onCancel,
}: {
  plan: AutoPlan
  applying: boolean
  onApply: () => void
  onCancel: () => void
}) {
  const blockMinutes = plan.blocks.reduce(
    (sum, b) => sum + (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / MS_PER_MINUTE,
    0,
  )
  const breakdownByScale = PLANNING_SCALES.map((scale) => ({
    scale,
    count: plan.breakdown.filter((t) => t.scale === scale).length,
  })).filter((x) => x.count > 0)
  const nothingToDo = plan.blocks.length === 0 && plan.breakdown.length === 0

  return (
    <Card className="border-primary/50 p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text">
        <Bot size={ICON_SIZE} className="text-primary" />
        Robot planı önizlemesi
      </h2>
      {nothingToDo ? (
        <p className="mt-2 text-sm text-text-secondary">
          Eklenecek bir şey yok: bu haftanın bütçesi zaten planlanmış ya da açık hedef yok.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1 text-sm text-text">
          {breakdownByScale.length > 0 && (
            <li>
              Yukarıdan aşağı kırılım:{' '}
              {breakdownByScale
                .map((x) => `${x.count} ${PLANNING_SCALE_LABELS[x.scale].toLowerCase()} hedefi`)
                .join(', ')}
            </li>
          )}
          <li>
            Bu haftaya {plan.blocks.length} zaman bloğu ({formatHours(blockMinutes)}) — ızgarada
            kesikli çizgiyle gösteriliyor.
          </li>
        </ul>
      )}
      {plan.unmet.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 text-xs text-warning">
          {plan.unmet.map((u) => (
            <li key={u.taskId}>
              "{u.title}": {formatHours(u.missingMinutes)} yerleşmedi — {u.reason}.
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        {!nothingToDo && (
          <Button variant="primary" size="sm" disabled={applying} onClick={onApply}>
            <Check size={ICON_SIZE} />
            Uygula ve robota ver
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X size={ICON_SIZE} />
          Kapat
        </Button>
      </div>
    </Card>
  )
}
