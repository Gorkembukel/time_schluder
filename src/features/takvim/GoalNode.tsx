import { useState } from 'react'
import { format, subMilliseconds } from 'date-fns'
import { tr } from 'date-fns/locale'
import { ChevronRight, GitBranchPlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTaskHierarchy } from '../../hooks/useTaskHierarchy'
import { useSettingsStore } from '../../stores/settingsStore'
import {
  createTasksBatch,
  deleteTask,
  newTaskId,
} from '../../services/repositories/tasksRepository'
import { BREAKDOWN_SCALES, planBreakdown } from '../../lib/autoPlanner'
import { finerScale } from '../../lib/planning-engine'
import { defaultChildRange, rollupProgress } from '../../lib/taskHierarchy'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { PLANNING_SCALE_LABELS, type Task } from '../../types/domain'
import { StatusControl } from '../is-takibi/StatusControl'
import { OverdueBadge } from '../is-takibi/OverdueBadge'
import { TaskBreadcrumb } from '../is-takibi/TaskBreadcrumb'
import { ProgressBar } from '../is-takibi/ProgressBar'
import { GoalForm } from './GoalForm'

const ICON_SIZE = 14
const DATE_FORMAT = 'd MMM yyyy'
const ONE_MS = 1

/** Kaydedilmiş `[startAt, endAt)` aralığını formun beklediği kapsayıcı aralığa çevirir. */
function inclusiveRange(task: Task) {
  return { start: new Date(task.startAt), end: subMilliseconds(new Date(task.endAt), ONE_MS) }
}

export function GoalNode({
  uid,
  task,
  showBreadcrumb = false,
}: {
  uid: string
  task: Task
  /** Ölçek listesinde (ağacın kökü değilken) üst hiyerarşiyi göstermek için. */
  showBreadcrumb?: boolean
}) {
  const { tasks, index, children } = useTaskHierarchy()
  const weekStartsOn = useSettingsStore((s) => s.settings.calendarTime.weekStartsOn)
  const detailWindowDays = useSettingsStore((s) => s.settings.planningEngine.detailWindowDays)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const kids = children.get(task.id) ?? []
  const canBreakDown = task.status !== 'done' && BREAKDOWN_SCALES.includes(task.scale)

  /** Yukarıdan aşağı kırılım: bu hedefi rolling wave penceresi içindeki alt dönemlere böler. */
  async function handleBreakdown() {
    const drafts = planBreakdown({
      tasks,
      now: new Date(),
      weekStartsOn,
      detailWindowDays,
      newId: () => newTaskId(uid),
      rootIds: [task.id],
    })
    if (drafts.length === 0) {
      setError('Kırılacak yeni dönem yok (alt dönemler zaten var ya da pencere dışında).')
      return
    }
    setError(null)
    await createTasksBatch(uid, drafts)
    setExpanded(true)
  }

  async function handleDelete() {
    if (kids.length > 0) {
      setError('Önce alt işleri sil ya da başka bir üst işe taşı.')
      setConfirmingDelete(false)
      return
    }
    await deleteTask(uid, task.id)
  }

  if (editing) {
    return (
      <GoalForm
        uid={uid}
        scale={task.scale}
        task={task}
        defaultRange={inclusiveRange(task)}
        onDone={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="rounded-lg border border-border bg-bg/50 p-3">
      {showBreadcrumb && <TaskBreadcrumb task={task} index={index} />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex min-w-0 items-center gap-1.5 text-left text-sm font-medium text-text"
        >
          <ChevronRight
            size={ICON_SIZE}
            className={`shrink-0 transition-transform motion-safe:duration-150 ${expanded ? 'rotate-90' : ''}`}
          />
          <span
            className={`truncate ${task.status === 'done' ? 'text-text-secondary line-through' : ''}`}
          >
            {task.title}
          </span>
          {kids.length > 0 && <Badge variant="neutral">{kids.length} alt iş</Badge>}
        </button>
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
          <OverdueBadge task={task} />
          <span>
            {format(new Date(task.startAt), DATE_FORMAT, { locale: tr })} –{' '}
            {format(subMilliseconds(new Date(task.endAt), ONE_MS), DATE_FORMAT, { locale: tr })}
          </span>
          <StatusControl uid={uid} task={task} />
          {canBreakDown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleBreakdown()}
              aria-label="Alt dönemlere kır"
              title="Alt dönemlere kır (3 Yıl → Yıl → Ay → Hafta)"
            >
              <GitBranchPlus size={ICON_SIZE} />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label="Düzenle">
            <Pencil size={ICON_SIZE} />
          </Button>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(true)}
              aria-label="Sil"
            >
              <Trash2 size={ICON_SIZE} />
            </Button>
          )}
        </div>
      </div>
      {kids.length > 0 && (
        <div className="mt-2">
          <ProgressBar ratio={rollupProgress(task, children)} label={`${task.title} ilerlemesi`} />
        </div>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {expanded && <GoalChildren uid={uid} parent={task} kids={kids} />}
    </div>
  )
}

function GoalChildren({ uid, parent, kids }: { uid: string; parent: Task; kids: Task[] }) {
  const weekStartsOn = useSettingsStore((s) => s.settings.calendarTime.weekStartsOn)
  const [showAddChild, setShowAddChild] = useState(false)
  const sorted = [...kids].sort((a, b) => a.startAt.localeCompare(b.startAt))
  const childScale = finerScale(parent.scale)

  return (
    <div className="mt-3 flex flex-col gap-2 border-l-2 border-border pl-4">
      {sorted.length === 0 ? (
        <p className="text-xs text-text-secondary">Henüz alt iş yok.</p>
      ) : (
        sorted.map((child) => <GoalNode key={child.id} uid={uid} task={child} />)
      )}

      {childScale &&
        (showAddChild ? (
          <GoalForm
            uid={uid}
            scale={childScale}
            parentTaskId={parent.id}
            defaultRange={(() => {
              const range = defaultChildRange(parent, childScale, new Date(), weekStartsOn)
              return { start: range.start, end: subMilliseconds(range.end, ONE_MS) }
            })()}
            onDone={() => setShowAddChild(false)}
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddChild(true)}
            className="self-start"
          >
            <Plus size={ICON_SIZE} />
            {PLANNING_SCALE_LABELS[childScale]} ekle
          </Button>
        ))}
    </div>
  )
}
