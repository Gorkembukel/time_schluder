import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, Link2, Pencil, Trash2 } from 'lucide-react'
import {
  deleteTask,
  fetchAllTasks,
  stripDependencyReferences,
  updateTaskStatus,
} from '../../services/repositories/tasksRepository'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { recalculateFromDeletion } from '../../lib/planning-engine'
import { TASK_STATUSES, TASK_STATUS_LABELS, type Task, type TaskStatus } from '../../types/domain'
import { TaskEditor } from './TaskEditor'
import { Button } from '../../components/Button'

const TIME_FORMAT = 'HH:mm'
const ICON_SIZE = 14

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
      setDeleteNote(`Silindi. ${cleaned.length} görevin bu göreve olan bağımlılığı da kaldırıldı.`)
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
        <p
          className={`flex items-center gap-1.5 ${task.status === 'done' ? 'text-text-secondary line-through' : 'text-text'}`}
        >
          {task.status === 'done' && <CheckCircle2 size={ICON_SIZE} className="shrink-0 text-success" />}
          <span className="text-xs font-medium text-text-secondary">
            {format(new Date(task.startAt), TIME_FORMAT)}–{format(new Date(task.endAt), TIME_FORMAT)}
          </span>
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
          {areaName && <span>{areaName}</span>}
          {task.dependencies.length > 0 && (
            <span className="flex items-center gap-1">
              <Link2 size={12} />
              {task.dependencies.length} bağımlılık
            </span>
          )}
        </div>
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
              {TASK_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Pencil size={ICON_SIZE} />
          Düzenle
        </Button>
        {confirmingDelete ? (
          <div className="flex items-center gap-1 text-xs">
            <Button variant="danger" size="sm" onClick={() => void handleDelete()}>
              Sil
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Vazgeç
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={ICON_SIZE} />
            Sil
          </Button>
        )}
      </div>
    </li>
  )
}
