import { addHours, addYears, startOfHour, startOfYear } from 'date-fns'
import { dayRange, monthRange, weekRange, type DateRange } from '../dateRange'
import { PLANNING_SCALES, type PlanningScale } from '../../types/domain'

const YEAR3_SPAN_YEARS = 3

export function yearRange(date: Date): DateRange {
  const start = startOfYear(date)
  return { start, end: addYears(start, 1) }
}

export function year3Range(date: Date): DateRange {
  const start = startOfYear(date)
  return { start, end: addYears(start, YEAR3_SPAN_YEARS) }
}

export function hourRange(date: Date): DateRange {
  const start = startOfHour(date)
  return { start, end: addHours(start, 1) }
}

/**
 * Verilen ölçek + referans tarih için o periyodun `[start, end)` aralığı —
 * 6 ölçeğin (3 yıl…saat) tümü için tek giriş noktası. Gün/hafta/ay için
 * `../dateRange`'deki (Takvim ekranının da kullandığı) fonksiyonlara delege
 * eder; burada sadece yıl/3-yıl/saat eklenir — mantık iki yerde tekrarlanmaz.
 */
export function scalePeriodRange(
  scale: PlanningScale,
  referenceDate: Date,
  weekStartsOn: number,
): DateRange {
  switch (scale) {
    case 'year3':
      return year3Range(referenceDate)
    case 'year':
      return yearRange(referenceDate)
    case 'month':
      return monthRange(referenceDate)
    case 'week':
      return weekRange(referenceDate, weekStartsOn)
    case 'day':
      return dayRange(referenceDate)
    case 'hour':
      return hourRange(referenceDate)
  }
}

/** Bir ölçeğin bir sonraki (daha ince) ölçeği — kademeli kırılım sırası: 3 yıl → yıl → ay → hafta → gün → saat. */
export function finerScale(scale: PlanningScale): PlanningScale | null {
  const index = PLANNING_SCALES.indexOf(scale)
  return index >= 0 && index < PLANNING_SCALES.length - 1 ? PLANNING_SCALES[index + 1] : null
}

/** Bir ölçeğin bir önceki (daha kaba) ölçeği. */
export function coarserScale(scale: PlanningScale): PlanningScale | null {
  const index = PLANNING_SCALES.indexOf(scale)
  return index > 0 ? PLANNING_SCALES[index - 1] : null
}
