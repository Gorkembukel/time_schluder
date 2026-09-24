import type { Settings } from '../config/constants'
import type { DateRange } from './dateRange'
import {
  computeWeeklyDemands,
  planBreakdown,
  scheduleWeek,
  weeklyLeafGoals,
  type Demand,
  type UnmetDemand,
} from './autoPlanner'
import { computeCapacityGuidance } from './capacityGuidance'
import { effectiveLifeAreaId, indexTasks } from './taskHierarchy'
import type { LifeArea, Routine, Task } from '../types/domain'

export interface AutoPlan {
  /** Yukarıdan aşağı kırılımla oluşacak yeni alt hedefler (3 Yıl → Yıl → Ay → Hafta). */
  breakdown: Task[]
  /** Haftaya yerleştirilecek saatlik bloklar. */
  blocks: Task[]
  unmet: UnmetDemand[]
  demands: Demand[]
}

/**
 * "Otomatik planla" düğmesinin tamamı: kırılım → backcast bütçesi (kırılım dahil) → yaprak hedef
 * talepleri → boş saatlere yerleşim. Kullanıcıdan süre/tahmin istemez; sonuç önizlenip onaylanır.
 */
export function buildAutoPlan({
  tasks,
  areas,
  routines,
  week,
  now,
  settings,
  newId,
}: {
  tasks: Task[]
  areas: LifeArea[]
  routines: Routine[]
  week: DateRange
  now: Date
  settings: Settings
  newId: () => string
}): AutoPlan {
  const { calendarTime, planningEngine } = settings
  const breakdown = planBreakdown({
    tasks,
    now,
    weekStartsOn: calendarTime.weekStartsOn,
    detailWindowDays: planningEngine.detailWindowDays,
    newId,
  })
  const all = [...tasks, ...breakdown]
  const index = indexTasks(all)

  const guidance = computeCapacityGuidance({
    tasks: all,
    areas,
    period: week,
    periodScale: 'week',
    now,
    settings: {
      dayStartHour: calendarTime.dayStartHour,
      dayEndHour: calendarTime.dayEndHour,
      bufferRatio: planningEngine.bufferRatio,
      plannableRatio: planningEngine.plannableRatio,
      forecastDeviationThreshold: planningEngine.forecastDeviationThreshold,
      priorityWeights: planningEngine.priorityWeights,
    },
  })
  const remainingByArea = new Map(
    guidance.areas.map((a) => [a.areaId, a.allocatedMinutes - a.projectedMinutes]),
  )

  const demands = computeWeeklyDemands({
    leafGoals: weeklyLeafGoals(all, week),
    areaOf: (t) => effectiveLifeAreaId(t, index),
    remainingByArea,
    blockMinutes: planningEngine.autoBlockMinutes,
  })

  const { blocks, unmet } = scheduleWeek({
    tasks: all,
    routines,
    week,
    now,
    dayStartHour: calendarTime.dayStartHour,
    dayEndHour: calendarTime.dayEndHour,
    blockMinutes: planningEngine.autoBlockMinutes,
    demands,
    newId,
  })

  return { breakdown, blocks, unmet, demands }
}
