import { useEffect, useRef, useState, type FormEvent } from 'react'
import { format, subMilliseconds } from 'date-fns'
import { tr } from 'date-fns/locale'
import { CalendarPlus, Inbox, Plus, X, Zap } from 'lucide-react'
import { formatHours } from '../../lib/capacityGuidance'
import type { TaskIndex } from '../../lib/taskHierarchy'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { PLANNING_SCALE_LABELS, type LifeArea, type Task } from '../../types/domain'
import { TaskBreadcrumb } from '../is-takibi/TaskBreadcrumb'
import { OverdueBadge } from '../is-takibi/OverdueBadge'
import { DependencyChips, DependencyHandle, DependencyTypePicker } from '../is-takibi/dependencies'
import { useDependencyDropTarget } from '../is-takibi/dependencyDrag'
import { POOL_DRAG_MIME, QUICK_DRAG_MIME } from './WeekGrid'

const ICON_SIZE = 14
const DATE_FORMAT = 'd MMM'
const ONE_MS = 1

export interface PendingQuickTask {
  id: string
  title: string
  lifeAreaId?: string
}

/** Bu haftanın zaman bekleyen hedefleri — ızgaraya sürüklenir ya da "yerleştir" ile otomatik konur. */
export function PoolPanel({
  goals,
  index,
  scheduledMinutes,
  onAutoPlace,
  areas,
  pendingQuickTasks,
  onAddQuickTask,
  onRemoveQuickTask,
}: {
  goals: Task[]
  index: TaskIndex
  scheduledMinutes: (goalId: string) => number
  onAutoPlace: (goal: Task) => void
  areas: LifeArea[]
  pendingQuickTasks: PendingQuickTask[]
  onAddQuickTask: (title: string, lifeAreaId?: string) => void
  onRemoveQuickTask: (id: string) => void
}) {
  const [showQuickForm, setShowQuickForm] = useState(false)

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text">
          <Inbox size={ICON_SIZE} className="text-primary" />
          Bu haftanın işleri
        </h2>
        {!showQuickForm && (
          <Button variant="ghost" size="sm" onClick={() => setShowQuickForm(true)}>
            <Plus size={ICON_SIZE} />
            Tek seferlik görev
          </Button>
        )}
      </div>
      <p className="text-[0.7rem] text-text-secondary">
        Izgaraya sürükle, ya da <CalendarPlus size={10} className="inline" /> ile ilk uygun boşluğa
        koy. 🔗 ile başka bir işe bağla. Izgarada boş bir hücreye tıklayarak da tek seferlik görev
        ekleyebilirsin.
      </p>

      {showQuickForm && (
        <QuickTaskForm
          areas={areas}
          onDone={(title, lifeAreaId) => {
            onAddQuickTask(title, lifeAreaId)
            setShowQuickForm(false)
          }}
          onCancel={() => setShowQuickForm(false)}
        />
      )}

      {pendingQuickTasks.length > 0 && (
        <ul className="flex flex-col gap-2">
          {pendingQuickTasks.map((item) => (
            <PendingQuickTaskItem
              key={item.id}
              item={item}
              areaName={areas.find((a) => a.id === item.lifeAreaId)?.name}
              onRemove={() => onRemoveQuickTask(item.id)}
            />
          ))}
        </ul>
      )}

      {goals.length === 0 && pendingQuickTasks.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Bu haftaya düşen açık hedef yok. "Otomatik planla" üst hedeflerini haftalara kırar.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {goals.map((goal) => (
            <PoolItem
              key={goal.id}
              goal={goal}
              index={index}
              scheduled={scheduledMinutes(goal.id)}
              onAutoPlace={onAutoPlace}
            />
          ))}
        </ul>
      )}
    </Card>
  )
}

/** Havuzda henüz zamanlanmamış, tek seferlik bir görev taslağı — ızgaraya sürüklenince gerçek göreve dönüşür. */
function PendingQuickTaskItem({
  item,
  areaName,
  onRemove,
}: {
  item: PendingQuickTask
  areaName?: string
  onRemove: () => void
}) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(QUICK_DRAG_MIME, item.id)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      aria-label={item.title}
      className="flex cursor-grab items-center justify-between gap-1 rounded-lg border border-dashed border-primary/50 bg-primary/5 p-2 active:cursor-grabbing"
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <Zap size={ICON_SIZE} className="shrink-0 text-primary" />
        <span className="truncate text-sm font-medium text-text">{item.title}</span>
        {areaName && <Badge variant="neutral">{areaName}</Badge>}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${item.title}: taslağı sil`}
        className="shrink-0 rounded p-1 text-text-secondary hover:bg-border/60 hover:text-danger"
      >
        <X size={ICON_SIZE} />
      </button>
    </li>
  )
}

/** Hayat alanı hiyerarşisine dahil olmayan, tek seferlik bir görev taslağı oluşturur. */
function QuickTaskForm({
  areas,
  onDone,
  onCancel,
}: {
  areas: LifeArea[]
  onDone: (title: string, lifeAreaId?: string) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [lifeAreaId, setLifeAreaId] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    onDone(trimmed, lifeAreaId || undefined)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-bg/50 p-2"
    >
      <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs text-text-secondary">
        Başlık
        <input
          ref={titleInputRef}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        Hayat alanı
        <select
          value={lifeAreaId}
          onChange={(e) => setLifeAreaId(e.target.value)}
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-text"
        >
          <option value="">— yok —</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" variant="primary" size="sm">
        <Plus size={ICON_SIZE} />
        Ekle
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Vazgeç
      </Button>
    </form>
  )
}

function PoolItem({
  goal,
  index,
  scheduled,
  onAutoPlace,
}: {
  goal: Task
  index: TaskIndex
  scheduled: number
  onAutoPlace: (goal: Task) => void
}) {
  const { isOver, targetProps, pendingPredecessorId, clearPending } = useDependencyDropTarget(goal)
  return (
    <li
      {...targetProps}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(POOL_DRAG_MIME, goal.id)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      aria-label={goal.title}
      className={`flex cursor-grab flex-col gap-1 rounded-lg border bg-bg/50 p-2 active:cursor-grabbing ${
        isOver ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      }`}
    >
      <TaskBreadcrumb task={goal} index={index} />
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-medium text-text">{goal.title}</span>
        <div className="flex shrink-0">
          <DependencyHandle task={goal} />
          <button
            type="button"
            onClick={() => onAutoPlace(goal)}
            aria-label={`${goal.title}: ilk uygun boşluğa yerleştir`}
            className="rounded p-1 text-text-secondary hover:bg-border/60 hover:text-primary"
          >
            <CalendarPlus size={ICON_SIZE} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 text-[0.7rem] text-text-secondary">
        <Badge variant="primary">{PLANNING_SCALE_LABELS[goal.scale]}</Badge>
        <span>
          Son: {format(subMilliseconds(new Date(goal.endAt), ONE_MS), DATE_FORMAT, { locale: tr })}
        </span>
        <span>· planlı {formatHours(scheduled)}</span>
        <OverdueBadge task={goal} />
      </div>
      <DependencyChips task={goal} index={index} />
      {pendingPredecessorId && (
        <DependencyTypePicker
          successor={goal}
          predecessorId={pendingPredecessorId}
          onDone={clearPending}
        />
      )}
    </li>
  )
}
