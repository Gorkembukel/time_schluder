import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfWeek,
} from 'date-fns'
import { tr } from 'date-fns/locale'
import { useUid } from '../../app/UidContext'
import { useTasksInRange } from '../../hooks/useTasksInRange'
import { monthRange, toDateFnsWeekStartsOn } from '../../lib/dateRange'

const MAX_VISIBLE_TITLES = 2

export function MonthView({
  referenceDate,
  weekStartsOn,
  onSelectDay,
}: {
  referenceDate: Date
  weekStartsOn: number
  onSelectDay: (date: Date) => void
}) {
  const uid = useUid()
  const { start: monthStart, end: monthEnd } = monthRange(referenceDate)
  const dateFnsWeekStartsOn = toDateFnsWeekStartsOn(weekStartsOn)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: dateFnsWeekStartsOn })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: dateFnsWeekStartsOn })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const { tasks } = useTasksInRange(uid, gridStart.toISOString(), gridEnd.toISOString())

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => {
        const dayTasks = tasks
          .filter((t) => isSameDay(new Date(t.startAt), day))
          .sort((a, b) => a.startAt.localeCompare(b.startAt))
        const inCurrentMonth = isSameMonth(day, referenceDate)
        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelectDay(day)}
            className={`flex min-h-[5.5rem] flex-col gap-0.5 rounded-lg border p-1.5 text-left ${
              isToday(day) ? 'border-primary' : 'border-border'
            } ${inCurrentMonth ? 'bg-surface' : 'bg-bg'}`}
          >
            <span
              className={`text-xs font-medium ${inCurrentMonth ? 'text-text' : 'text-text-secondary'}`}
            >
              {format(day, 'd', { locale: tr })}
            </span>
            {dayTasks.slice(0, MAX_VISIBLE_TITLES).map((t) => (
              <span key={t.id} className="truncate text-[0.65rem] text-text-secondary">
                {t.title}
              </span>
            ))}
            {dayTasks.length > MAX_VISIBLE_TITLES && (
              <span className="text-[0.65rem] text-text-secondary">
                +{dayTasks.length - MAX_VISIBLE_TITLES}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
