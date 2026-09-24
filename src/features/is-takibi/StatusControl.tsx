import { updateTaskStatus } from '../../services/repositories/tasksRepository'
import { TASK_STATUSES, TASK_STATUS_LABELS, type Task } from '../../types/domain'

/** İş akışı durumunu değiştiren segmentli kontrol (Planlandı / Devam ediyor / Tamamlandı). */
export function StatusControl({ uid, task }: { uid: string; task: Task }) {
  return (
    <div
      role="group"
      aria-label="Durum"
      className="inline-flex rounded-lg border border-border bg-bg p-0.5"
    >
      {TASK_STATUSES.map((status) => {
        const active = task.status === status
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            onClick={() => !active && void updateTaskStatus(uid, task.id, status)}
            className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
              active
                ? status === 'done'
                  ? 'bg-success/15 text-success'
                  : 'bg-primary/15 text-primary'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            {TASK_STATUS_LABELS[status]}
          </button>
        )
      })}
    </div>
  )
}
