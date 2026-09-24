import { format } from 'date-fns'
import type { TaskChange } from '../../lib/planning-engine'
import type { Task } from '../../types/domain'

const DATE_TIME_FORMAT = 'd MMM HH:mm'

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
    <div className="rounded-lg border border-warning/60 bg-surface p-3">
      <p className="text-sm font-medium text-text">{reason}</p>
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
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-text"
        >
          Uygula
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary"
        >
          Vazgeç
        </button>
      </div>
    </div>
  )
}
