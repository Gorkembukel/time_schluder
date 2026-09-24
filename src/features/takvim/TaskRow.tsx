import { useState } from 'react'
import { format } from 'date-fns'
import {
  deleteTask,
  fetchAllTasks,
  stripDependencyReferences,
  updateTaskStatus,
} from '../../services/repositories/tasksRepository'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { recalculateFromDeletion } from '../../lib/planning-engine'
import { TASK_STATUSES, type Task, type TaskStatus } from '../../types/domain'
import { TaskEditor } from './TaskEditor'

const STATUS_LABELS: Record<TaskStatus, string> = {
  planned: 'Planlandı',
  'in-progress': 'Devam ediyor',
  done: 'Tamamlandı',
  delayed: 'Gecikti',
}

const TIME_FORMAT = 'HH:mm'

export function TaskRow({ uid, task }: { uid: string; task: Task }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleteNote, setDeleteNote] = useState<string | null>(null)
  const areaName = useLifeAreasStore((s) => s.areas.find((a) => a.id === task.lifeAreaId)?.name)
  const majorChangeThreshold = useSettingsStore(
    (s) => s.settings.planningEngine.majorChangeThreshold,
  )

  async function handleDelete() {
    const allTasks = await fetchAllTasks(uid)
    const { affectedTaskIds } = recalculateFromDeletion(allTasks, task.id, majorChangeThreshold)
    await deleteTask(uid, task.id)
    if (affectedTaskIds.length > 0) {
      const cleaned = await stripDependencyReferences(uid, allTasks, task.id)
      setDeleteNote(
        `Silindi. ${cleaned.length} görevin bu göreve olan bağımlılığı da kaldırıldı.`,
      )
    }
  }

  if (editing) {
    return (
      <li className="py-2.5">
        <TaskEditor
          uid={uid}
          task={task}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className={task.status === 'done' ? 'text-text-secondary line-through' : 'text-text'}>
          {format(new Date(task.startAt), TIME_FORMAT)}–{format(new Date(task.endAt), TIME_FORMAT)}{' '}
          {task.title}
        </p>
        {areaName && <p className="text-xs text-text-secondary">{areaName}</p>}
        {task.dependencies.length > 0 && (
          <p className="text-xs text-text-secondary">🔗 {task.dependencies.length} bağımlılık</p>
        )}
        {deleteNote && <p className="text-xs text-warning">{deleteNote}</p>}
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
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-text-secondary hover:text-text"
        >
          Düzenle
        </button>
        {confirmingDelete ? (
          <div className="flex items-center gap-2 text-xs">
            <button type="button" onClick={() => void handleDelete()} className="font-medium text-danger">
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
