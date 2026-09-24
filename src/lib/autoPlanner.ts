import {
  addDays,
  addMinutes,
  format,
  getISODay,
  isSameDay,
  max as maxDate,
  min as minDate,
} from 'date-fns'
import { tr } from 'date-fns/locale'
import { determineDetailLevel, finerScale, scalePeriodRange } from './planning-engine'
import type { DateRange } from './dateRange'
import { childrenIndex, indexTasks, overlapsRange } from './taskHierarchy'
import type { PlanningScale, Routine, Task } from '../types/domain'

/**
 * Otomatik planlayıcı — "robotun görev kuyruğunu" üretir:
 * 1. `planBreakdown`: açık hedefleri yukarıdan aşağı (3 Yıl → Yıl → Ay → Hafta) alt dönemlere kırar.
 *    Rolling wave: bir hedef yalnızca kendi ölçeğinin detaylandırma penceresi kadar ileriye kırılır.
 * 2. `computeWeeklyDemands`: backcast bütçesinden (alan başına) her yaprak hedefe haftalık süre düşer.
 * 3. `scheduleWeek`: bu süreleri rutinlerin ve mevcut blokların dışındaki boş saatlere, bağımlılık
 *    (FS/SS/FF/SF + gecikme) ve bitiş tarihlerine uyarak yerleştirir.
 * Tüm fonksiyonlar saftır; yeni kayıtlar `newId` ile üretilen id'lerle taslak `Task` olarak döner.
 */

/** Hedef (goal) ölçekleri — saatlik bloklar bunların altına yerleştirilir. */
export const GOAL_SCALES: PlanningScale[] = ['year3', 'year', 'month', 'week', 'day']
/** Otomatik kırılımın indiği en alt ölçek; hafta içi dağıtım saatlik bloklarla yapılır. */
export const BREAKDOWN_SCALES: PlanningScale[] = ['year3', 'year', 'month']
/** Blok başlangıçlarının hizalandığı dakika adımı (takvim ızgarasının çözünürlüğü). */
export const SLOT_ALIGN_MINUTES = 15
const MS_PER_MINUTE = 60_000

const CHILD_LABEL_FORMAT: Partial<Record<PlanningScale, string>> = {
  year: 'yyyy',
  month: 'LLLL yyyy',
  week: "d MMM 'haftası'",
}

function draftTask(
  fields: Pick<Task, 'id' | 'title' | 'scale' | 'startAt' | 'endAt'> & Partial<Task>,
): Task {
  return {
    status: 'planned',
    dependencies: [],
    bufferMinutes: 0,
    detailLevel: 'detailed',
    ...fields,
  }
}

export function planBreakdown({
  tasks,
  now,
  weekStartsOn,
  detailWindowDays,
  newId,
  rootIds,
}: {
  tasks: Task[]
  now: Date
  weekStartsOn: number
  detailWindowDays: Record<PlanningScale, number>
  newId: () => string
  /** Verilirse yalnızca bu hedeflerden (ve onlardan doğan alt hedeflerden) kırılım yapılır. */
  rootIds?: string[]
}): Task[] {
  const all = [...tasks]
  const drafts: Task[] = []
  const queue = tasks
    .filter(
      (t) =>
        t.status !== 'done' &&
        BREAKDOWN_SCALES.includes(t.scale) &&
        (!rootIds || rootIds.includes(t.id)),
    )
    .sort((a, b) => BREAKDOWN_SCALES.indexOf(a.scale) - BREAKDOWN_SCALES.indexOf(b.scale))

  while (queue.length > 0) {
    const goal = queue.shift()!
    const childScale = finerScale(goal.scale)
    if (!childScale) continue
    const goalStart = new Date(goal.startAt)
    const goalEnd = new Date(goal.endAt)
    const detailHorizon = addDays(now, detailWindowDays[goal.scale])
    const existingChildren = all.filter((t) => t.parentTaskId === goal.id)

    let period = scalePeriodRange(childScale, goalStart, weekStartsOn)
    while (period.start < goalEnd && period.start <= detailHorizon) {
      const start = maxDate([period.start, goalStart])
      const end = minDate([period.end, goalEnd])
      const covered = existingChildren.some((c) => overlapsRange(c, start, end))
      if (end > now && !covered) {
        const child = draftTask({
          id: newId(),
          title: `${goal.title} · ${format(period.start, CHILD_LABEL_FORMAT[childScale] ?? 'P', { locale: tr })}`,
          scale: childScale,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          parentTaskId: goal.id,
          detailLevel: determineDetailLevel(childScale, start, now, detailWindowDays),
        })
        drafts.push(child)
        all.push(child)
        if (BREAKDOWN_SCALES.includes(childScale)) queue.push(child)
      }
      period = scalePeriodRange(childScale, period.end, weekStartsOn)
    }
  }
  return drafts
}

/** Bu haftaya düşen, altında bu haftayla kesişen açık alt hedefi olmayan açık hedefler — zaman bunlara ayrılır. */
export function weeklyLeafGoals(tasks: Task[], week: DateRange): Task[] {
  const children = childrenIndex(tasks)
  return tasks.filter(
    (t) =>
      t.status !== 'done' &&
      GOAL_SCALES.includes(t.scale) &&
      overlapsRange(t, week.start, week.end) &&
      !(children.get(t.id) ?? []).some(
        (c) =>
          c.status !== 'done' &&
          GOAL_SCALES.includes(c.scale) &&
          overlapsRange(c, week.start, week.end),
      ),
  )
}

function durationMinutes(task: Pick<Task, 'startAt' | 'endAt'>): number {
  return (new Date(task.endAt).getTime() - new Date(task.startAt).getTime()) / MS_PER_MINUTE
}

/** Bir hedefin bu haftadaki saatlik blokları (doğrudan çocukları). */
export function scheduledMinutesFor(goalId: string, tasks: Task[], week: DateRange): number {
  return tasks
    .filter(
      (t) =>
        t.parentTaskId === goalId && t.scale === 'hour' && overlapsRange(t, week.start, week.end),
    )
    .reduce((sum, t) => sum + durationMinutes(t), 0)
}

export interface Demand {
  taskId: string
  minutes: number
}

/**
 * Alan bütçesinin henüz planlanmamış kısmı (bütçe − yapılan − planlı) alanın yaprak hedeflerine
 * eşit bölünür ve blok uzunluğuna yuvarlanır. Kullanıcıdan süre tahmini istenmez.
 */
export function computeWeeklyDemands({
  leafGoals,
  areaOf,
  remainingByArea,
  blockMinutes,
}: {
  leafGoals: Task[]
  areaOf: (task: Task) => string | undefined
  remainingByArea: Map<string, number>
  blockMinutes: number
}): Demand[] {
  const byArea = new Map<string, Task[]>()
  for (const goal of leafGoals) {
    const area = areaOf(goal)
    if (!area) continue
    byArea.set(area, [...(byArea.get(area) ?? []), goal])
  }
  const demands: Demand[] = []
  for (const [area, goals] of byArea) {
    const share = Math.max(0, remainingByArea.get(area) ?? 0) / goals.length
    const minutes = Math.round(share / blockMinutes) * blockMinutes
    if (minutes <= 0) continue
    for (const goal of goals) demands.push({ taskId: goal.id, minutes })
  }
  return demands
}

export interface Interval {
  start: Date
  end: Date
}

function timeOnDay(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(day)
  d.setHours(h, m, 0, 0)
  return d
}

function hourOnDay(day: Date, hour: number): Date {
  const d = new Date(day)
  d.setHours(hour, 0, 0, 0)
  return d
}

export interface RoutineOccurrence extends Interval {
  routine: Routine
}

export function routineOccurrences(routines: Routine[], week: DateRange): RoutineOccurrence[] {
  const result: RoutineOccurrence[] = []
  for (let day = week.start; day < week.end; day = addDays(day, 1)) {
    for (const routine of routines) {
      if (!routine.weekdays.includes(getISODay(day))) continue
      result.push({
        routine,
        start: timeOnDay(day, routine.startTime),
        end: timeOnDay(day, routine.endTime),
      })
    }
  }
  return result
}

function alignUp(date: Date): Date {
  const step = SLOT_ALIGN_MINUTES * MS_PER_MINUTE
  return new Date(Math.ceil(date.getTime() / step) * step)
}

/** Günün çalışma saatleri içindeki, dolu aralıklar ve geçmiş dışında kalan boş aralıklar. */
export function freeIntervals({
  week,
  busy,
  now,
  dayStartHour,
  dayEndHour,
}: {
  week: DateRange
  busy: Interval[]
  now: Date
  dayStartHour: number
  dayEndHour: number
}): Interval[] {
  const free: Interval[] = []
  for (let day = week.start; day < week.end; day = addDays(day, 1)) {
    let cursor = alignUp(maxDate([hourOnDay(day, dayStartHour), now]))
    const dayEnd = hourOnDay(day, dayEndHour)
    const dayBusy = busy
      .filter((b) => b.end > cursor && b.start < dayEnd)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
    for (const b of dayBusy) {
      if (b.start > cursor) free.push({ start: cursor, end: minDate([b.start, dayEnd]) })
      if (b.end > cursor) cursor = alignUp(b.end)
    }
    if (cursor < dayEnd) free.push({ start: cursor, end: dayEnd })
  }
  return free.filter((f) => f.end > f.start)
}

export interface ConstraintWindow {
  earliestStart: Date
  finishNoEarlierThan: Date | null
  latestEnd: Date
  /** Öncülü bu hafta içinde bitmeyen/başlamayan ve yerleşimi engelleyen iş başlığı. */
  blockedBy: string | null
}

/**
 * Bir hedefin bloklarının uyması gereken zaman penceresi. Öncülün bu haftadaki blokları varsa onlar,
 * yoksa (ve tamamlanmamışsa) öncülün kendi tarihleri esas alınır.
 */
export function constraintWindow({
  task,
  index,
  blocksOf,
  week,
  now,
}: {
  task: Task
  index: Map<string, Task>
  blocksOf: (taskId: string) => Interval[]
  week: DateRange
  now: Date
}): ConstraintWindow {
  let earliestStart = maxDate([week.start, now, new Date(task.startAt)])
  let finishNoEarlierThan: Date | null = null
  const latestEnd = minDate([week.end, new Date(task.endAt)])
  let blockedBy: string | null = null

  for (const dep of task.dependencies) {
    const pred = index.get(dep.taskId)
    if (!pred || pred.status === 'done') continue
    const blocks = blocksOf(pred.id)
    const predStart = blocks.length ? minDate(blocks.map((b) => b.start)) : new Date(pred.startAt)
    const predEnd = blocks.length ? maxDate(blocks.map((b) => b.end)) : new Date(pred.endAt)
    const lagStart = addMinutes(predStart, dep.lagMinutes)
    const lagEnd = addMinutes(predEnd, dep.lagMinutes)
    if (dep.type === 'FS') earliestStart = maxDate([earliestStart, lagEnd])
    if (dep.type === 'SS') earliestStart = maxDate([earliestStart, lagStart])
    if (dep.type === 'FF') finishNoEarlierThan = maxDate([finishNoEarlierThan ?? lagEnd, lagEnd])
    if (dep.type === 'SF')
      finishNoEarlierThan = maxDate([finishNoEarlierThan ?? lagStart, lagStart])
    if (earliestStart >= latestEnd || (finishNoEarlierThan && finishNoEarlierThan > latestEnd)) {
      blockedBy = pred.title
    }
  }
  return { earliestStart, finishNoEarlierThan, latestEnd, blockedBy }
}

/** Öncüller önce gelecek şekilde (bağımlılık içindeki talepler arasında) sıralar, sonra en erken bitiş. */
function orderDemands(demands: Demand[], index: Map<string, Task>): Demand[] {
  const ids = new Set(demands.map((d) => d.taskId))
  const byDeadline = [...demands].sort((a, b) =>
    (index.get(a.taskId)?.endAt ?? '').localeCompare(index.get(b.taskId)?.endAt ?? ''),
  )
  const ordered: Demand[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const visit = (demand: Demand) => {
    if (visited.has(demand.taskId) || visiting.has(demand.taskId)) return
    visiting.add(demand.taskId)
    for (const dep of index.get(demand.taskId)?.dependencies ?? []) {
      if (!ids.has(dep.taskId)) continue
      const pred = byDeadline.find((d) => d.taskId === dep.taskId)
      if (pred) visit(pred)
    }
    visiting.delete(demand.taskId)
    visited.add(demand.taskId)
    ordered.push(demand)
  }
  byDeadline.forEach(visit)
  return ordered
}

export interface UnmetDemand {
  taskId: string
  title: string
  missingMinutes: number
  reason: string
}

export interface ScheduleResult {
  blocks: Task[]
  unmet: UnmetDemand[]
}

/**
 * Talepleri boş aralıklara yerleştirir. İş, haftaya yayılsın diye her turda her güne en fazla bir
 * blok konur (robotun günlük görev listesi dengeli olur); tur tekrarlanarak talep tamamlanır.
 */
export function scheduleWeek({
  tasks,
  routines,
  week,
  now,
  dayStartHour,
  dayEndHour,
  blockMinutes,
  demands,
  newId,
}: {
  tasks: Task[]
  routines: Routine[]
  week: DateRange
  now: Date
  dayStartHour: number
  dayEndHour: number
  blockMinutes: number
  demands: Demand[]
  newId: () => string
}): ScheduleResult {
  const index = indexTasks(tasks)
  const existingBlocks = tasks.filter(
    (t) => t.scale === 'hour' && overlapsRange(t, week.start, week.end),
  )
  let free = freeIntervals({
    week,
    now,
    dayStartHour,
    dayEndHour,
    busy: [
      ...routineOccurrences(routines, week),
      ...existingBlocks.map((t) => ({ start: new Date(t.startAt), end: new Date(t.endAt) })),
    ],
  })

  const placed: Task[] = []
  const blocksOf = (goalId: string): Interval[] =>
    [...existingBlocks, ...placed]
      .filter((b) => b.parentTaskId === goalId)
      .map((b) => ({ start: new Date(b.startAt), end: new Date(b.endAt) }))

  const take = (start: Date, end: Date) => {
    free = free.flatMap((f) => {
      if (end <= f.start || start >= f.end) return [f]
      const parts: Interval[] = []
      if (f.start < start) parts.push({ start: f.start, end: start })
      if (end < f.end) parts.push({ start: end, end: f.end })
      return parts
    })
  }

  const findSlot = (notBefore: Date, notAfter: Date, minutes: number, day?: Date) => {
    for (const f of free) {
      if (day && !isSameDay(f.start, day)) continue
      const start = alignUp(maxDate([f.start, notBefore]))
      const end = addMinutes(start, minutes)
      if (end <= f.end && end <= notAfter) return { start, end }
    }
    return null
  }

  const unmet: UnmetDemand[] = []
  for (const demand of orderDemands(demands, index)) {
    const goal = index.get(demand.taskId)
    if (!goal) continue
    const window = constraintWindow({ task: goal, index, blocksOf, week, now })
    if (window.blockedBy) {
      unmet.push({
        taskId: goal.id,
        title: goal.title,
        missingMinutes: demand.minutes,
        reason: `Öncül "${window.blockedBy}" bu hafta yeterince erken bitmiyor`,
      })
      continue
    }

    let remaining = demand.minutes
    const mine: Task[] = []
    let progress = true
    while (remaining > 0 && progress) {
      progress = false
      for (let day = week.start; day < week.end && remaining > 0; day = addDays(day, 1)) {
        const length = Math.min(blockMinutes, remaining)
        const slot = findSlot(window.earliestStart, window.latestEnd, length, day)
        if (!slot) continue
        const block = draftTask({
          id: newId(),
          title: goal.title,
          scale: 'hour',
          startAt: slot.start.toISOString(),
          endAt: slot.end.toISOString(),
          parentTaskId: goal.id,
        })
        take(slot.start, slot.end)
        mine.push(block)
        remaining -= length
        progress = true
      }
    }

    // FF/SF: son blok, öncülün bitişinden/başlangıcından önce bitmemeli.
    if (window.finishNoEarlierThan && mine.length > 0) {
      const last = mine.reduce((a, b) => (a.endAt > b.endAt ? a : b))
      if (new Date(last.endAt) < window.finishNoEarlierThan) {
        const length = durationMinutes(last)
        free.push({ start: new Date(last.startAt), end: new Date(last.endAt) })
        free.sort((a, b) => a.start.getTime() - b.start.getTime())
        const slot = findSlot(
          addMinutes(window.finishNoEarlierThan, -length),
          window.latestEnd,
          length,
        )
        mine.splice(mine.indexOf(last), 1)
        if (slot) {
          take(slot.start, slot.end)
          mine.push({ ...last, startAt: slot.start.toISOString(), endAt: slot.end.toISOString() })
        } else {
          take(new Date(last.startAt), new Date(last.endAt))
          remaining += length
        }
      }
    }

    placed.push(...mine)
    if (remaining > 0) {
      unmet.push({
        taskId: goal.id,
        title: goal.title,
        missingMinutes: remaining,
        reason: 'Bu hafta bitiş tarihinden önce yeterli boş saat yok',
      })
    }
  }

  return { blocks: placed, unmet }
}

/**
 * "Ertele": bir bloğu `from` anından sonraki ilk uygun boşluğa taşımak için aralık bulur
 * (bu hafta, yoksa sonraki hafta). Rutinler ve diğer bloklar dolu sayılır.
 */
export function findNextSlot({
  tasks,
  routines,
  from,
  minutes,
  excludeId,
  weekOf,
  dayStartHour,
  dayEndHour,
}: {
  tasks: Task[]
  routines: Routine[]
  from: Date
  minutes: number
  excludeId?: string
  weekOf: (date: Date) => DateRange
  dayStartHour: number
  dayEndHour: number
}): Interval | null {
  const thisWeek = weekOf(from)
  for (const week of [thisWeek, weekOf(thisWeek.end)]) {
    const busy = [
      ...routineOccurrences(routines, week),
      ...tasks
        .filter(
          (t) => t.scale === 'hour' && t.id !== excludeId && overlapsRange(t, week.start, week.end),
        )
        .map((t) => ({ start: new Date(t.startAt), end: new Date(t.endAt) })),
    ]
    const free = freeIntervals({ week, busy, now: from, dayStartHour, dayEndHour })
    const slot = free.find((f) => addMinutes(f.start, minutes) <= f.end)
    if (slot) return { start: slot.start, end: addMinutes(slot.start, minutes) }
  }
  return null
}
