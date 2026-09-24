import type { Day } from 'date-fns'
import { addDays, addMonths, addWeeks, startOfDay, startOfMonth, startOfWeek } from 'date-fns'

export interface DateRange {
  start: Date
  end: Date
}

const DAYS_IN_WEEK = 7

/** Ayarlardaki ISO 8601 hafta başlangıcını (1=Pazartesi…7=Pazar) date-fns'in beklediği 0-6'ya (0=Pazar) çevirir. */
export function toDateFnsWeekStartsOn(isoWeekStartsOn: number): Day {
  return (isoWeekStartsOn % DAYS_IN_WEEK) as Day
}

export function dayRange(date: Date): DateRange {
  const start = startOfDay(date)
  return { start, end: addDays(start, 1) }
}

export function weekRange(date: Date, weekStartsOn: number): DateRange {
  const start = startOfWeek(date, { weekStartsOn: toDateFnsWeekStartsOn(weekStartsOn) })
  return { start, end: addWeeks(start, 1) }
}

export function monthRange(date: Date): DateRange {
  const start = startOfMonth(date)
  return { start, end: addMonths(start, 1) }
}
