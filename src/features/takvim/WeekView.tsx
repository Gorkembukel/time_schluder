import { addDays, eachDayOfInterval, format, isSameDay, isToday } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useUid } from '../../app/UidContext'
import { useTasksInRange } from '../../hooks/useTasksInRange'
import { weekRange } from '../../lib/dateRange'
import { SwapPanel } from './SwapPanel'

const MAX_VISIBLE_TITLES = 3
const ONE_DAY = 1

export function WeekView({
  referenceDate,
  weekStartsOn,
  onSelectDay,
}: {
  referenceDate: Date
  weekStartsOn: number
  onSelectDay: (date: Date) => void
}) {
  const uid = useUid()
  const { start, end } = weekRange(referenceDate, weekStartsOn)
  const { tasks } = useTasksInRange(uid, start.toISOString(), end.toISOString())
  const days = eachDayOfInterval({ start, end: addDays(end, -ONE_DAY) })

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayTasks = tasks
            .filter((t) => isSameDay(new Date(t.startAt), day))
            .sort((a, b) => a.startAt.localeCompare(b.startAt))
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`flex min-h-[7rem] flex-col gap-1 rounded-lg border p-2 text-left transition-all motion-safe:duration-150 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md ${
                isToday(day) ? 'border-primary' : 'border-border hover:border-primary/50'
              } bg-surface`}
            >
              <span className="text-xs font-medium text-text-secondary">
                {format(day, 'EEE d', { locale: tr })}
              </span>
              {dayTasks.slice(0, MAX_VISIBLE_TITLES).map((t) => (
                <span key={t.id} className="truncate text-xs text-text">
                  {t.title}
                </span>
              ))}
              {dayTasks.length > MAX_VISIBLE_TITLES && (
                <span className="text-xs text-text-secondary">
                  +{dayTasks.length - MAX_VISIBLE_TITLES} daha
                </span>
              )}
            </button>
          )
        })}
      </div>
      <SwapPanel uid={uid} tasks={tasks} />
    </div>
  )
}
