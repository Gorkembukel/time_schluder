import { format } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import type { TaskChange } from '../../lib/planning-engine'
import type { Task } from '../../types/domain'
import { Button } from '../../components/Button'

const DATE_TIME_FORMAT = 'd MMM HH:mm'
const ICON_SIZE = 16

/** recalculate.ts / swap.ts'in "büyük değişiklik" önerisini onaya sunan panel — hiçbir şey burada otomatik uygulanmaz. */
export function RecalculationPreview({
  changes,
  tasks,
  reason,
  onConfirm,
  onCancel,
}: {
  changes: TaskChange[]
  tasks: Task[]
  reason: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const taskOf = (id: string) => tasks.find((t) => t.id === id)

  return (
    <div className="rounded-lg border border-warning/60 bg-warning/5 p-3">
      <p className="flex items-start gap-2 text-sm font-medium text-text">
        <AlertTriangle size={ICON_SIZE} className="mt-0.5 shrink-0 text-warning" />
        {reason}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5 text-xs">
        {changes.map((change) => {
          const original = taskOf(change.taskId)
          return (
            <li key={change.taskId} className="text-text-secondary">
              <span className="text-text">{original?.title ?? change.taskId}</span>:{' '}
              {original ? (
                <>
                  {format(new Date(original.startAt), DATE_TIME_FORMAT)}–
                  {format(new Date(original.endAt), DATE_TIME_FORMAT)}{' '}
                </>
              ) : null}
              → {format(new Date(change.newStartAt), DATE_TIME_FORMAT)}–
              {format(new Date(change.newEndAt), DATE_TIME_FORMAT)}
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex gap-2">
        <Button variant="primary" size="sm" onClick={onConfirm}>
          Uygula
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </div>
  )
}
