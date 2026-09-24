import { describe, expect, it } from 'vitest'
import type { PlanningScale, Routine, Task } from '../types/domain'
import {
  computeWeeklyDemands,
  constraintWindow,
  freeIntervals,
  planBreakdown,
  routineOccurrences,
  scheduleWeek,
  weeklyLeafGoals,
} from './autoPlanner'
import { indexTasks } from './taskHierarchy'

const WINDOW: Record<PlanningScale, number> = {
  year3: 365,
  year: 90,
  month: 7,
  week: 2,
  day: 1,
  hour: 0,
}

function idFactory() {
  let n = 0
  return () => `new-${++n}`
}

function task(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: overrides.id,
    scale: 'week',
    startAt: new Date(2026, 8, 28).toISOString(),
    endAt: new Date(2026, 9, 5).toISOString(),
    status: 'planned',
    dependencies: [],
    bufferMinutes: 0,
    detailLevel: 'detailed',
    ...overrides,
  }
}

// Pazartesi 28 Eylül 2026 haftası
const week = { start: new Date(2026, 8, 28), end: new Date(2026, 9, 5) }
const monday8 = new Date(2026, 8, 28, 8)

describe('planBreakdown', () => {
  it('3 yıllık hedefi rolling wave penceresi içindeki yıllara, onları aylara ve haftalara kırar', () => {
    const goal = task({
      id: 'g',
      title: 'Maraton',
      scale: 'year3',
      lifeAreaId: 'saglik',
      startAt: new Date(2026, 0, 1).toISOString(),
      endAt: new Date(2029, 0, 1).toISOString(),
    })
    const drafts = planBreakdown({
      tasks: [goal],
      now: new Date(2026, 8, 25),
      weekStartsOn: 1,
      detailWindowDays: WINDOW,
      newId: idFactory(),
    })
    const years = drafts.filter((d) => d.scale === 'year')
    // year3 penceresi 365 gün → 2026 ve 2027 (2027-01-01 pencere içinde), 2028 değil
    expect(years.map((y) => y.title)).toEqual(['Maraton · 2026', 'Maraton · 2027'])
    expect(years.every((y) => y.parentTaskId === 'g')).toBe(true)
    // year penceresi 90 gün → Eylül–Aralık 2026 ayları (geçmiş aylar atlanır)
    const months2026 = drafts.filter((d) => d.scale === 'month' && d.parentTaskId === years[0].id)
    expect(months2026.map((m) => new Date(m.startAt).getMonth())).toEqual([8, 9, 10, 11])
    // month penceresi 7 gün → Eylül ayı içinde bu hafta ve sonraki; ay sınırına kırpılır
    const septWeeks = drafts.filter(
      (d) => d.scale === 'week' && d.parentTaskId === months2026[0].id,
    )
    expect(septWeeks.length).toBeGreaterThan(0)
    expect(septWeeks.every((w) => new Date(w.endAt) <= new Date(2026, 9, 1))).toBe(true)
  })

  it('zaten alt işi olan dönemi tekrar oluşturmaz, tamamlanan hedefi kırmaz', () => {
    const goal = task({
      id: 'g',
      scale: 'year',
      startAt: new Date(2026, 0, 1).toISOString(),
      endAt: new Date(2027, 0, 1).toISOString(),
    })
    const october = task({
      id: 'oct',
      scale: 'month',
      parentTaskId: 'g',
      startAt: new Date(2026, 9, 1).toISOString(),
      endAt: new Date(2026, 10, 1).toISOString(),
    })
    const done = task({ ...goal, id: 'done', status: 'done' })
    const drafts = planBreakdown({
      tasks: [goal, october, done],
      now: new Date(2026, 8, 25),
      weekStartsOn: 1,
      detailWindowDays: { ...WINDOW, month: -1 },
      newId: idFactory(),
    })
    const months = drafts
      .filter((d) => d.scale === 'month')
      .map((m) => new Date(m.startAt).getMonth())
    expect(months).toEqual([8, 10, 11])
    expect(drafts.some((d) => d.parentTaskId === 'done')).toBe(false)
  })
})

describe('weeklyLeafGoals', () => {
  it('bu haftayla kesişen açık alt hedefi olan hedefi yaprak saymaz', () => {
    const month = task({ id: 'm', scale: 'month', startAt: new Date(2026, 8, 1).toISOString() })
    const weekGoal = task({ id: 'w', parentTaskId: 'm' })
    const other = task({ id: 'o', scale: 'month' })
    expect(weeklyLeafGoals([month, weekGoal, other], week).map((t) => t.id)).toEqual(['w', 'o'])
  })
})

describe('routines & free intervals', () => {
  const routine: Routine = {
    id: 'r',
    title: 'Ders',
    weekdays: [1, 3],
    startTime: '09:00',
    endTime: '12:00',
    createdAt: '',
  }

  it('rutinleri haftanın doğru günlerine yerleştirir', () => {
    const occ = routineOccurrences([routine], week)
    expect(occ.map((o) => o.start)).toEqual([new Date(2026, 8, 28, 9), new Date(2026, 8, 30, 9)])
  })

  it('boş aralıkları gün saatleri, rutinler ve şimdiki zamana göre çıkarır', () => {
    const free = freeIntervals({
      week,
      busy: routineOccurrences([routine], week),
      now: new Date(2026, 8, 28, 7, 50),
      dayStartHour: 8,
      dayEndHour: 18,
    })
    expect(free[0]).toEqual({ start: monday8, end: new Date(2026, 8, 28, 9) })
    expect(free[1]).toEqual({ start: new Date(2026, 8, 28, 12), end: new Date(2026, 8, 28, 18) })
  })
})

describe('computeWeeklyDemands', () => {
  it('alanın kalan bütçesini yaprak hedeflere bölüp bloğa yuvarlar', () => {
    const a = task({ id: 'a', lifeAreaId: 'saglik' })
    const b = task({ id: 'b', lifeAreaId: 'saglik' })
    const demands = computeWeeklyDemands({
      leafGoals: [a, b, task({ id: 'noarea' })],
      areaOf: (t) => t.lifeAreaId,
      remainingByArea: new Map([['saglik', 250]]),
      blockMinutes: 60,
    })
    expect(demands).toEqual([
      { taskId: 'a', minutes: 120 },
      { taskId: 'b', minutes: 120 },
    ])
  })
})

describe('scheduleWeek', () => {
  const base = {
    week,
    now: monday8,
    dayStartHour: 8,
    dayEndHour: 18,
    blockMinutes: 60,
  }

  it('blokları haftaya yayar, rutinlere ve mevcut bloklara çakıştırmaz', () => {
    const goal = task({ id: 'g' })
    const existing = task({
      id: 'x',
      scale: 'hour',
      startAt: new Date(2026, 8, 29, 8).toISOString(),
      endAt: new Date(2026, 8, 29, 10).toISOString(),
    })
    const routine: Routine = {
      id: 'r',
      title: 'Spor',
      weekdays: [1],
      startTime: '08:00',
      endTime: '09:30',
      createdAt: '',
    }
    const { blocks, unmet } = scheduleWeek({
      ...base,
      tasks: [goal, existing],
      routines: [routine],
      demands: [{ taskId: 'g', minutes: 180 }],
      newId: idFactory(),
    })
    expect(unmet).toEqual([])
    expect(blocks.map((b) => new Date(b.startAt))).toEqual([
      new Date(2026, 8, 28, 9, 30),
      new Date(2026, 8, 29, 10),
      new Date(2026, 8, 30, 8),
    ])
    expect(blocks.every((b) => b.parentTaskId === 'g' && b.scale === 'hour')).toBe(true)
  })

  it('FS bağımlılığında ardılı öncülün son bloğundan sonra başlatır', () => {
    const pred = task({ id: 'pred', endAt: new Date(2026, 9, 5).toISOString() })
    const succ = task({
      id: 'succ',
      dependencies: [{ taskId: 'pred', type: 'FS', lagMinutes: 0 }],
    })
    const { blocks } = scheduleWeek({
      ...base,
      tasks: [succ, pred],
      routines: [],
      demands: [
        { taskId: 'succ', minutes: 60 },
        { taskId: 'pred', minutes: 120 },
      ],
      newId: idFactory(),
    })
    const predEnd = Math.max(
      ...blocks.filter((b) => b.parentTaskId === 'pred').map((b) => new Date(b.endAt).getTime()),
    )
    const succStart = new Date(blocks.find((b) => b.parentTaskId === 'succ')!.startAt).getTime()
    expect(succStart).toBeGreaterThanOrEqual(predEnd)
  })

  it('öncülü hafta içinde bitmeyen işi bloke olarak raporlar', () => {
    const pred = task({ id: 'pred', title: 'Öncül', endAt: new Date(2026, 11, 1).toISOString() })
    const succ = task({ id: 'succ', dependencies: [{ taskId: 'pred', type: 'FS', lagMinutes: 0 }] })
    const { blocks, unmet } = scheduleWeek({
      ...base,
      tasks: [pred, succ],
      routines: [],
      demands: [{ taskId: 'succ', minutes: 60 }],
      newId: idFactory(),
    })
    expect(blocks).toEqual([])
    expect(unmet[0].reason).toContain('Öncül')
  })

  it('bitiş tarihinden önce yer yoksa eksik süreyi bildirir', () => {
    const goal = task({ id: 'g', endAt: new Date(2026, 8, 28, 10).toISOString() })
    const { blocks, unmet } = scheduleWeek({
      ...base,
      tasks: [goal],
      routines: [],
      demands: [{ taskId: 'g', minutes: 240 }],
      newId: idFactory(),
    })
    expect(blocks).toHaveLength(2)
    expect(unmet[0].missingMinutes).toBe(120)
  })
})

describe('constraintWindow', () => {
  it('SS bağımlılığında öncülün ilk bloğu + gecikmeden önce başlatmaz', () => {
    const pred = task({ id: 'p' })
    const succ = task({ id: 's', dependencies: [{ taskId: 'p', type: 'SS', lagMinutes: 30 }] })
    const w = constraintWindow({
      task: succ,
      index: indexTasks([pred, succ]),
      blocksOf: (id) =>
        id === 'p' ? [{ start: new Date(2026, 8, 29, 10), end: new Date(2026, 8, 29, 11) }] : [],
      week,
      now: monday8,
    })
    expect(w.earliestStart).toEqual(new Date(2026, 8, 29, 10, 30))
    expect(w.blockedBy).toBeNull()
  })
})
