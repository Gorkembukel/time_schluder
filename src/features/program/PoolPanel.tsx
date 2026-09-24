import { format, subMilliseconds } from 'date-fns'
import { tr } from 'date-fns/locale'
import { CalendarPlus, Inbox } from 'lucide-react'
import { formatHours } from '../../lib/capacityGuidance'
import type { TaskIndex } from '../../lib/taskHierarchy'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { PLANNING_SCALE_LABELS, type Task } from '../../types/domain'
import { TaskBreadcrumb } from '../is-takibi/TaskBreadcrumb'
import { OverdueBadge } from '../is-takibi/OverdueBadge'
import { DependencyChips, DependencyHandle, DependencyTypePicker } from '../is-takibi/dependencies'
import { useDependencyDropTarget } from '../is-takibi/dependencyDrag'
import { POOL_DRAG_MIME } from './WeekGrid'

const ICON_SIZE = 14
const DATE_FORMAT = 'd MMM'
const ONE_MS = 1

/** Bu haftanın zaman bekleyen hedefleri — ızgaraya sürüklenir ya da "yerleştir" ile otomatik konur. */
export function PoolPanel({
  goals,
  index,
  scheduledMinutes,
  onAutoPlace,
}: {
  goals: Task[]
  index: TaskIndex
  scheduledMinutes: (goalId: string) => number
  onAutoPlace: (goal: Task) => void
}) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text">
        <Inbox size={ICON_SIZE} className="text-primary" />
        Bu haftanın işleri
      </h2>
      <p className="text-[0.7rem] text-text-secondary">
        Izgaraya sürükle, ya da <CalendarPlus size={10} className="inline" /> ile ilk uygun boşluğa
        koy. 🔗 ile başka bir işe bağla.
      </p>
      {goals.length === 0 ? (
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
