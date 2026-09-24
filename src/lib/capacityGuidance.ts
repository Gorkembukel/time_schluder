import { differenceInMilliseconds } from 'date-fns'
import {
  computeForecastDeviations,
  distributeCapacity,
  periodCapacityMinutes,
} from './planning-engine'
import type { DateRange } from './dateRange'
import {
  childrenIndex,
  effectiveLifeAreaId,
  indexTasks,
  isOverdue,
  overlapsRange,
  rollupProgress,
} from './taskHierarchy'
import {
  PLANNING_SCALES,
  type LifeArea,
  type LifeAreaPriority,
  type PlanningScale,
  type Task,
} from '../types/domain'

/**
 * Backcast (üstten bütçe) + forecast (alttan gerçekleşme) + hedef takvim sapmasını tek çağrıda
 * hesaplayıp kullanıcıya somut öneriler üretir. Kullanıcıdan yeni girdi istemez: ağırlıklar açık
 * hedeflerden, gerçekleşen süre saatlik görevlerden türetilir (bkz. .claude/personas/musteri.md
 * "Minimum girdi, maksimum yönlendirme"). Sayfa bileşenleri yalnızca bu çıktıyı gösterir.
 */

const MS_PER_MINUTE = 60_000
const MINUTES_PER_HOUR = 60
const HALF_HOUR_STEPS = 2
const PERCENT = 100
const SEVERITY_ORDER = { danger: 0, warning: 1, info: 2 } as const

export interface GuidanceSettings {
  dayStartHour: number
  dayEndHour: number
  bufferRatio: number
  plannableRatio: number
  forecastDeviationThreshold: number
  priorityWeights: Record<LifeAreaPriority, number>
}

export interface AreaCapacity {
  areaId: string
  areaName: string
  openGoalCount: number
  weight: number
  /** Backcast: bu döneme ayrılan bütçe. */
  allocatedMinutes: number
  /** Bu ana kadar harcanmış olması beklenen (bütçe × geçen süre oranı). */
  expectedToDateMinutes: number
  /** Forecast: tamamlanan işlerin gerçekleşen süresi. */
  actualMinutes: number
  /** Dönemin kalanında planlanmış ama henüz yapılmamış süre. */
  scheduledMinutes: number
  /** actual + scheduled — bu gidişle dönem sonunda varılacak süre. */
  projectedMinutes: number
}

export type SuggestionKind =
  | 'plan-more'
  | 'over-budget'
  | 'behind-pace'
  | 'goal-behind'
  | 'goal-overdue'
  | 'no-goal'
  | 'no-area'

export interface Suggestion {
  kind: SuggestionKind
  severity: 'info' | 'warning' | 'danger'
  message: string
  areaId?: string
  taskId?: string
}

export interface CapacityGuidance {
  totalCapacityMinutes: number
  bufferMinutes: number
  elapsedRatio: number
  areas: AreaCapacity[]
  unassignedActualMinutes: number
  suggestions: Suggestion[]
}

function durationMinutes(task: Task): number {
  return differenceInMilliseconds(new Date(task.endAt), new Date(task.startAt)) / MS_PER_MINUTE
}

/** Saatlik görevlerde süre bellidir; diğer ölçeklerde yalnızca elle girilen gerçekleşen süre sayılır. */
function actualWorkMinutes(task: Task): number {
  if (task.actualMinutes !== undefined) return task.actualMinutes
  return task.scale === 'hour' ? durationMinutes(task) : 0
}

function clampRatio(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function timeElapsedRatio(start: Date, end: Date, now: Date): number {
  const total = differenceInMilliseconds(end, start)
  return total > 0 ? clampRatio(differenceInMilliseconds(now, start) / total) : 0
}

/** Kullanıcıya gösterilecek süre: en yakın yarım saate yuvarlanmış saat. */
export function formatHours(minutes: number): string {
  const hours = Math.round((minutes / MINUTES_PER_HOUR) * HALF_HOUR_STEPS) / HALF_HOUR_STEPS
  return `${hours.toLocaleString('tr-TR')} saat`
}

function isAtLeastAsCoarse(scale: PlanningScale, periodScale: PlanningScale): boolean {
  return PLANNING_SCALES.indexOf(scale) <= PLANNING_SCALES.indexOf(periodScale)
}

export function computeCapacityGuidance({
  tasks,
  areas,
  period,
  periodScale,
  now,
  settings,
}: {
  tasks: Task[]
  areas: LifeArea[]
  period: DateRange
  periodScale: PlanningScale
  now: Date
  settings: GuidanceSettings
}): CapacityGuidance {
  const index = indexTasks(tasks)
  const children = childrenIndex(tasks)
  const threshold = settings.forecastDeviationThreshold
  const elapsedRatio = timeElapsedRatio(period.start, period.end, now)
  const inPeriod = tasks.filter((t) => overlapsRange(t, period.start, period.end))

  // Backcast ağırlığı: dönemle kesişen açık hedef sayısı × alan önceliği.
  const openGoals = inPeriod.filter(
    (t) => t.status !== 'done' && t.scale !== 'hour' && isAtLeastAsCoarse(t.scale, periodScale),
  )
  const goalCountByArea = new Map<string, number>()
  for (const goal of openGoals) {
    const areaId = effectiveLifeAreaId(goal, index)
    if (areaId) goalCountByArea.set(areaId, (goalCountByArea.get(areaId) ?? 0) + 1)
  }
  const allocations = areas.map((a) => ({
    id: a.id,
    weight: (goalCountByArea.get(a.id) ?? 0) * settings.priorityWeights[a.priority ?? 'normal'],
  }))

  const totalCapacityMinutes =
    periodCapacityMinutes(period.start, period.end, settings.dayStartHour, settings.dayEndHour) *
    settings.plannableRatio
  const distribution = distributeCapacity(totalCapacityMinutes, settings.bufferRatio, allocations)

  // Forecast: gerçekleşen (tamamlanan) ve kalan planlı süre.
  const actualByArea = new Map<string, number>()
  const scheduledByArea = new Map<string, number>()
  let unassignedActualMinutes = 0
  for (const task of inPeriod) {
    const areaId = effectiveLifeAreaId(task, index)
    if (task.status === 'done') {
      const minutes = actualWorkMinutes(task)
      if (!areaId) unassignedActualMinutes += minutes
      else actualByArea.set(areaId, (actualByArea.get(areaId) ?? 0) + minutes)
    } else if (task.scale === 'hour' && areaId && new Date(task.startAt) >= now) {
      scheduledByArea.set(areaId, (scheduledByArea.get(areaId) ?? 0) + durationMinutes(task))
    }
  }

  const areaRows: AreaCapacity[] = areas.map((area, i) => {
    const allocatedMinutes = distribution.allocations[i].allocatedMinutes
    const actualMinutes = actualByArea.get(area.id) ?? 0
    const scheduledMinutes = scheduledByArea.get(area.id) ?? 0
    return {
      areaId: area.id,
      areaName: area.name,
      openGoalCount: goalCountByArea.get(area.id) ?? 0,
      weight: allocations[i].weight,
      allocatedMinutes,
      expectedToDateMinutes: allocatedMinutes * elapsedRatio,
      actualMinutes,
      scheduledMinutes,
      projectedMinutes: actualMinutes + scheduledMinutes,
    }
  })

  const paceDeviations = computeForecastDeviations(
    areaRows.map((r) => ({ id: r.areaId, allocatedMinutes: r.expectedToDateMinutes })),
    areaRows.map((r) => ({ id: r.areaId, actualMinutes: r.actualMinutes })),
    threshold,
  )

  const suggestions: Suggestion[] = []

  for (const row of areaRows) {
    const pace = paceDeviations.find((d) => d.id === row.areaId)
    if (row.allocatedMinutes === 0 && row.projectedMinutes === 0) {
      suggestions.push({
        kind: 'no-goal',
        severity: 'info',
        areaId: row.areaId,
        message: `${row.areaName}: bu dönemde açık hedef yok, bu alana zaman ayrılmıyor. İlerlemek istiyorsan bir hedef ekle.`,
      })
      continue
    }
    if (row.allocatedMinutes === 0) {
      suggestions.push({
        kind: 'over-budget',
        severity: 'warning',
        areaId: row.areaId,
        message: `${row.areaName}: açık hedefi olmadığı halde ${formatHours(row.projectedMinutes)} ayrılmış. Bu işleri bir hedefe bağla ya da alan için hedef ekle.`,
      })
      continue
    }
    const gap = row.allocatedMinutes - row.projectedMinutes
    if (gap > row.allocatedMinutes * threshold) {
      suggestions.push({
        kind: 'plan-more',
        severity: 'info',
        areaId: row.areaId,
        message: `${row.areaName}: bütçenin ${formatHours(row.allocatedMinutes)}, planlı + yapılan ${formatHours(row.projectedMinutes)}. Bu dönem ~${formatHours(gap)} daha planla.`,
      })
    } else if (-gap > row.allocatedMinutes * threshold) {
      suggestions.push({
        kind: 'over-budget',
        severity: 'warning',
        areaId: row.areaId,
        message: `${row.areaName}: ${formatHours(row.projectedMinutes)} planlanmış, bütçe ${formatHours(row.allocatedMinutes)}. Fazlası diğer alanlardan ya da tampondan gidiyor; bazı işleri ertele veya önceliği Yüksek yap.`,
      })
    }
    if (pace?.exceedsThreshold && row.actualMinutes < row.expectedToDateMinutes) {
      suggestions.push({
        kind: 'behind-pace',
        severity: 'warning',
        areaId: row.areaId,
        message: `${row.areaName}: bu noktada ~${formatHours(row.expectedToDateMinutes)} yapılmış olmalıydı, tamamlanan ${formatHours(row.actualMinutes)}. Tempoyu yakalamak için yakın günlere zaman blokla.`,
      })
    }
  }

  if (unassignedActualMinutes > 0) {
    suggestions.push({
      kind: 'no-area',
      severity: 'info',
      message: `${formatHours(unassignedActualMinutes)} tamamlanan iş hiçbir hayat alanına bağlı değil; bağlarsan ilerleme hesabına girer.`,
    })
  }

  // Hedef takvim sapması (roll-up ilerleme vs. geçen süre) ve gecikmeler.
  for (const goal of openGoals) {
    if (isOverdue(goal, now)) {
      suggestions.push({
        kind: 'goal-overdue',
        severity: 'danger',
        taskId: goal.id,
        areaId: effectiveLifeAreaId(goal, index),
        message: `"${goal.title}" bitiş tarihini geçti. Tamamlandı olarak işaretle ya da tarihini güncelle.`,
      })
      continue
    }
    if (!children.has(goal.id)) continue
    const expected = timeElapsedRatio(new Date(goal.startAt), new Date(goal.endAt), now)
    const progress = rollupProgress(goal, children)
    if (expected - progress > threshold) {
      suggestions.push({
        kind: 'goal-behind',
        severity: 'warning',
        taskId: goal.id,
        areaId: effectiveLifeAreaId(goal, index),
        message: `"${goal.title}": sürenin %${Math.round(expected * PERCENT)}'i geçti, ilerleme %${Math.round(progress * PERCENT)}. Alt işlerden birini bu hafta öne al.`,
      })
    }
  }

  suggestions.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  return {
    totalCapacityMinutes: distribution.totalCapacityMinutes,
    bufferMinutes: distribution.bufferMinutes,
    elapsedRatio,
    areas: areaRows,
    unassignedActualMinutes,
    suggestions,
  }
}
