import { useState } from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useTasksInRange } from '../../hooks/useTasksInRange'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import {
  deleteTask,
  fetchAllTasks,
  updateTaskStatus,
} from '../../services/repositories/tasksRepository'
import { finerScale } from '../../lib/planning-engine'
import { SkeletonLines } from '../../components/Skeleton'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  PLANNING_SCALE_LABELS,
  type Task,
  type TaskStatus,
} from '../../types/domain'
import { GoalForm } from './GoalForm'

const ICON_SIZE = 14
const DATE_FORMAT = 'd MMM yyyy'

const STATUS_BADGE_VARIANT: Record<TaskStatus, 'neutral' | 'success' | 'danger'> = {
  planned: 'neutral',
  'in-progress': 'neutral',
  done: 'success',
  delayed: 'danger',
}

export function GoalNode({ uid, task }: { uid: string; task: Task }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const areaName = useLifeAreasStore((s) => s.areas.find((a) => a.id === task.lifeAreaId)?.name)

  async function handleDelete() {
    const all = await fetchAllTasks(uid)
    if (all.some((t) => t.parentTaskId === task.id)) {
      setError('Önce alt hedefleri/görevleri sil.')
      setConfirmingDelete(false)
      return
    }
    await deleteTask(uid, task.id)
  }

  return (
    <div className="rounded-lg border border-border bg-bg/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 items-center gap-1.5 text-left text-sm font-medium text-text"
        >
          <ChevronRight
            size={ICON_SIZE}
            className={`shrink-0 transition-transform motion-safe:duration-150 ${expanded ? 'rotate-90' : ''}`}
          />
          <span className="truncate">{task.title}</span>
        </button>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          {areaName && <Badge variant="neutral">{areaName}</Badge>}
          <Badge variant={STATUS_BADGE_VARIANT[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
          <span>
            {format(new Date(task.startAt), DATE_FORMAT, { locale: tr })} –{' '}
            {format(new Date(task.endAt), DATE_FORMAT, { locale: tr })}
          </span>
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
          {confirmingDelete ? (
            <div className="flex items-center gap-1">
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
            </Button>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {expanded && <GoalChildren uid={uid} parent={task} />}
    </div>
  )
}

function GoalChildren({ uid, parent }: { uid: string; parent: Task }) {
  const [showAddChild, setShowAddChild] = useState(false)
  const { tasks, loading } = useTasksInRange(uid, parent.startAt, parent.endAt)
  const children = tasks
    .filter((t) => t.parentTaskId === parent.id)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
  const childScale = finerScale(parent.scale)

  return (
    <div className="mt-3 flex flex-col gap-2 border-l-2 border-border pl-4">
      {loading ? (
        <SkeletonLines count={1} className="h-10" />
      ) : children.length === 0 ? (
        <p className="text-xs text-text-secondary">Henüz alt hedef/görev yok.</p>
      ) : (
        children.map((child) => <GoalNode key={child.id} uid={uid} task={child} />)
      )}

      {childScale &&
        (showAddChild ? (
          <GoalForm
            uid={uid}
            scale={childScale}
            parentTaskId={parent.id}
            defaultLifeAreaId={parent.lifeAreaId}
            defaultRange={{ start: new Date(parent.startAt), end: new Date(parent.endAt) }}
            onDone={() => setShowAddChild(false)}
          />
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setShowAddChild(true)} className="self-start">
            <Plus size={ICON_SIZE} />
            {PLANNING_SCALE_LABELS[childScale]} ekle
          </Button>
        ))}
    </div>
  )
}
