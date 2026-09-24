import { useState } from 'react'
import { format } from 'date-fns'
import { deleteTask, updateTaskStatus } from '../../services/repositories/tasksRepository'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { TASK_STATUSES, type Task, type TaskStatus } from '../../types/domain'

const STATUS_LABELS: Record<TaskStatus, string> = {
  planned: 'Planlandı',
  'in-progress': 'Devam ediyor',
  done: 'Tamamlandı',
  delayed: 'Gecikti',
}

const TIME_FORMAT = 'HH:mm'

export function TaskRow({ uid, task }: { uid: string; task: Task }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const areaName = useLifeAreasStore((s) => s.areas.find((a) => a.id === task.lifeAreaId)?.name)

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className={task.status === 'done' ? 'text-text-secondary line-through' : 'text-text'}>
          {format(new Date(task.startAt), TIME_FORMAT)}–{format(new Date(task.endAt), TIME_FORMAT)}{' '}
          {task.title}
        </p>
        {areaName && <p className="text-xs text-text-secondary">{areaName}</p>}
      </div>
      <div className="flex items-center gap-2">
        <select
          value={task.status}
          onChange={(e) => void updateTaskStatus(uid, task.id, e.target.value as TaskStatus)}
          className="rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text"
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        {confirmingDelete ? (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => void deleteTask(uid, task.id)}
              className="font-medium text-danger"
            >
              Sil
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-text-secondary"
            >
              Vazgeç
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-xs text-text-secondary hover:text-danger"
          >
            Sil
          </button>
        )}
      </div>
    </li>
  )
}
