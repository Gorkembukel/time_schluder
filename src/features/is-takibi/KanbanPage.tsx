import { useState, type DragEvent } from 'react'
import { format, subMilliseconds } from 'date-fns'
import { tr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, KanbanSquare } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useTaskHierarchy } from '../../hooks/useTaskHierarchy'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { updateTaskStatus } from '../../services/repositories/tasksRepository'
import { scalePeriodRange } from '../../lib/planning-engine'
import {
  effectiveLifeAreaId,
  isOverdue,
  overlapsRange,
  rollupProgress,
  type TaskIndex,
} from '../../lib/taskHierarchy'
import { PageHeader } from '../../components/PageHeader'
import { Badge } from '../../components/Badge'
import {
  PLANNING_SCALES,
  PLANNING_SCALE_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type PlanningScale,
  type Task,
  type TaskStatus,
} from '../../types/domain'
import { OverdueBadge } from './OverdueBadge'
import { TaskBreadcrumb } from './TaskBreadcrumb'
import { ProgressBar } from './ProgressBar'

const ICON_SIZE = 14
const DATE_FORMAT = 'd MMM'
const ONE_MS = 1
const DRAG_MIME = 'text/plain'
const ALL = 'all'

type PeriodFilter = typeof ALL | Extract<PlanningScale, 'week' | 'month' | 'year'>
const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: ALL, label: 'Tüm zamanlar' },
  { value: 'week', label: 'Bu hafta' },
  { value: 'month', label: 'Bu ay' },
  { value: 'year', label: 'Bu yıl' },
]

const selectClass = 'rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text'

/** Jira tarzı Kanban panosu — iş akışı kolonları TASK_STATUSES'tan gelir, gecikme rozetle işaretlenir. */
export function KanbanPage() {
  const uid = useUid()
  const { tasks, index, children } = useTaskHierarchy()
  const areas = useLifeAreasStore((s) => s.areas)
  const weekStartsOn = useSettingsStore((s) => s.settings.calendarTime.weekStartsOn)

  const [scaleFilter, setScaleFilter] = useState<typeof ALL | PlanningScale>(ALL)
  const [areaFilter, setAreaFilter] = useState<string>(ALL)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>(ALL)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const now = new Date()
  const period = periodFilter === ALL ? null : scalePeriodRange(periodFilter, now, weekStartsOn)

  const visible = tasks
    .filter((t) => scaleFilter === ALL || t.scale === scaleFilter)
    .filter((t) => areaFilter === ALL || effectiveLifeAreaId(t, index) === areaFilter)
    .filter((t) => !period || overlapsRange(t, period.start, period.end))
    .filter((t) => !overdueOnly || isOverdue(t, now))
    .sort((a, b) => a.endAt.localeCompare(b.endAt))

  async function moveTo(task: Task, status: TaskStatus) {
    if (task.status === status) return
    await updateTaskStatus(uid, task.id, status)
    setAnnouncement(`"${task.title}" ${TASK_STATUS_LABELS[status]} kolonuna taşındı.`)
  }

  function handleDrop(event: DragEvent, status: TaskStatus) {
    event.preventDefault()
    setDragOver(null)
    const task = index.get(event.dataTransfer.getData(DRAG_MIME))
    if (task) void moveTo(task, status)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={KanbanSquare}
        title="Pano"
        subtitle="Tüm ölçeklerdeki işlerin iş akışı — sürükle-bırak ya da oklarla taşı"
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm">
        <label className="flex items-center gap-1.5 text-xs text-text-secondary">
          Ölçek
          <select
            value={scaleFilter}
            onChange={(e) => setScaleFilter(e.target.value as typeof ALL | PlanningScale)}
            className={selectClass}
          >
            <option value={ALL}>Tümü</option>
            {PLANNING_SCALES.map((s) => (
              <option key={s} value={s}>
                {PLANNING_SCALE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-text-secondary">
          Hayat alanı
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className={selectClass}
          >
            <option value={ALL}>Tümü</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-text-secondary">
          Dönem
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
            className={selectClass}
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
          />
          Sadece gecikenler
        </label>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {TASK_STATUSES.map((status, columnIndex) => {
          const columnTasks = visible.filter((t) => t.status === status)
          return (
            <section
              key={status}
              aria-label={TASK_STATUS_LABELS[status]}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(status)
              }}
              onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
              onDrop={(e) => handleDrop(e, status)}
              className={`flex min-h-[12rem] flex-col gap-2 rounded-xl border bg-bg/60 p-3 transition-colors ${
                dragOver === status ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <h2 className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {TASK_STATUS_LABELS[status]}
                <Badge variant="neutral">{columnTasks.length}</Badge>
              </h2>
              {columnTasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  index={index}
                  progress={children.has(task.id) ? rollupProgress(task, children) : null}
                  prevStatus={TASK_STATUSES[columnIndex - 1]}
                  nextStatus={TASK_STATUSES[columnIndex + 1]}
                  onMove={(s) => void moveTo(task, s)}
                />
              ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function KanbanCard({
  task,
  index,
  progress,
  prevStatus,
  nextStatus,
  onMove,
}: {
  task: Task
  index: TaskIndex
  progress: number | null
  prevStatus?: TaskStatus
  nextStatus?: TaskStatus
  onMove: (status: TaskStatus) => void
}) {
  return (
    <article
      aria-label={task.title}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, task.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="flex cursor-grab flex-col gap-1.5 rounded-lg border border-border bg-surface p-3 shadow-sm transition-shadow active:cursor-grabbing motion-safe:hover:shadow-md"
    >
      <TaskBreadcrumb task={task} index={index} />
      <p
        className={`text-sm font-medium ${task.status === 'done' ? 'text-text-secondary line-through' : 'text-text'}`}
      >
        {task.title}
      </p>
      {progress !== null && <ProgressBar ratio={progress} label={`${task.title} ilerlemesi`} />}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5 text-[0.7rem] text-text-secondary">
          <Badge variant="primary">{PLANNING_SCALE_LABELS[task.scale]}</Badge>
          <span>
            Bitiş:{' '}
            {format(subMilliseconds(new Date(task.endAt), ONE_MS), DATE_FORMAT, { locale: tr })}
          </span>
          <OverdueBadge task={task} />
        </div>
        <div className="flex gap-0.5">
          {prevStatus && (
            <button
              type="button"
              onClick={() => onMove(prevStatus)}
              aria-label={`${task.title}: ${TASK_STATUS_LABELS[prevStatus]} kolonuna taşı`}
              className="rounded p-1 text-text-secondary hover:bg-border/60 hover:text-text"
            >
              <ChevronLeft size={ICON_SIZE} />
            </button>
          )}
          {nextStatus && (
            <button
              type="button"
              onClick={() => onMove(nextStatus)}
              aria-label={`${task.title}: ${TASK_STATUS_LABELS[nextStatus]} kolonuna taşı`}
              className="rounded p-1 text-text-secondary hover:bg-border/60 hover:text-text"
            >
              <ChevronRight size={ICON_SIZE} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
