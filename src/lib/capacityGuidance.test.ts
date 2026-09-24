import { describe, expect, it } from 'vitest'
import type { LifeArea, Task } from '../types/domain'
import { computeCapacityGuidance, formatHours, type GuidanceSettings } from './capacityGuidance'

const settings: GuidanceSettings = {
  dayStartHour: 8,
  dayEndHour: 18, // 10 saat/gün
  bufferRatio: 0,
  plannableRatio: 0.5, // 5 saat/gün planlanabilir
  forecastDeviationThreshold: 0.25,
  priorityWeights: { low: 0.5, normal: 1, high: 2 },
}

// 10 günlük dönem → 50 saat = 3000 dk kapasite
const period = { start: new Date(2026, 0, 1), end: new Date(2026, 0, 11) }
const mid = new Date(2026, 0, 6) // dönemin yarısı

function area(id: string, priority?: LifeArea['priority']): LifeArea {
  return { id, name: id, order: 0, createdAt: '', updatedAt: '', priority }
}

function task(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: overrides.id,
    scale: 'month',
    startAt: new Date(2026, 0, 1).toISOString(),
    endAt: new Date(2026, 1, 1).toISOString(),
    status: 'planned',
    dependencies: [],
    bufferMinutes: 0,
    detailLevel: 'rough',
    ...overrides,
  }
}

function hourTask(id: string, day: number, hours: number, extra: Partial<Task> = {}): Task {
  return task({
    id,
    scale: 'hour',
    startAt: new Date(2026, 0, day, 9).toISOString(),
    endAt: new Date(2026, 0, day, 9 + hours).toISOString(),
    ...extra,
  })
}

function run(tasks: Task[], areas: LifeArea[], now = mid) {
  return computeCapacityGuidance({ tasks, areas, period, periodScale: 'week', now, settings })
}

describe('computeCapacityGuidance', () => {
  it('kapasiteyi gün × saat × planlanabilir oran ile hesaplar', () => {
    const g = run([], [area('saglik')])
    expect(g.totalCapacityMinutes).toBe(3000)
    expect(g.elapsedRatio).toBeCloseTo(0.5)
  })

  it('bütçeyi açık hedef sayısı × öncelik ağırlığıyla dağıtır (girdi gerektirmez)', () => {
    const g = run(
      [
        task({ id: 'g1', lifeAreaId: 'saglik' }),
        task({ id: 'g2', lifeAreaId: 'kariyer' }),
        task({ id: 'g3', parentTaskId: 'g2' }), // alanı g2'den devralır
      ],
      [area('saglik', 'high'), area('kariyer')],
    )
    // saglik: 1 × 2 = 2, kariyer: 2 × 1 = 2 → eşit
    expect(g.areas.map((a) => a.allocatedMinutes)).toEqual([1500, 1500])
  })

  it('tamamlanan saatlik görevleri gerçekleşen, gelecektekileri planlı sayar; elle girilen süre önceliklidir', () => {
    const g = run(
      [
        task({ id: 'goal', lifeAreaId: 'saglik' }),
        hourTask('done1', 2, 2, { lifeAreaId: 'saglik', status: 'done' }),
        hourTask('done2', 3, 2, { lifeAreaId: 'saglik', status: 'done', actualMinutes: 30 }),
        hourTask('future', 8, 3, { lifeAreaId: 'saglik' }),
      ],
      [area('saglik')],
    )
    expect(g.areas[0].actualMinutes).toBe(150)
    expect(g.areas[0].scheduledMinutes).toBe(180)
    expect(g.areas[0].projectedMinutes).toBe(330)
  })

  it('bütçenin altında planlanan alan için "daha planla" ve tempo uyarısı üretir', () => {
    const g = run([task({ id: 'goal', lifeAreaId: 'saglik' })], [area('saglik')])
    const kinds = g.suggestions.map((s) => s.kind)
    expect(kinds).toContain('plan-more')
    expect(kinds).toContain('behind-pace')
    expect(g.suggestions.find((s) => s.kind === 'plan-more')?.message).toContain('50 saat')
  })

  it('bütçeyi aşan alanı uyarır', () => {
    const g = run(
      [
        task({ id: 'goal', lifeAreaId: 'saglik' }),
        task({ id: 'goal2', lifeAreaId: 'kariyer' }),
        ...Array.from({ length: 5 }, (_, i) =>
          hourTask(`h${i}`, 7 + i, 8, { lifeAreaId: 'saglik' }),
        ),
      ],
      [area('saglik'), area('kariyer')],
    )
    expect(g.suggestions.some((s) => s.kind === 'over-budget' && s.areaId === 'saglik')).toBe(true)
  })

  it('hedefi olmayan alanı bilgi olarak bildirir, alansız işi hatırlatır', () => {
    const g = run([hourTask('x', 2, 1, { status: 'done' })], [area('saglik')])
    expect(g.suggestions.map((s) => s.kind)).toEqual(['no-goal', 'no-area'])
    expect(g.unassignedActualMinutes).toBe(60)
  })

  it('zamanın gerisinde kalan ve gecikmiş hedefleri işaretler, en ciddiyi önce sıralar', () => {
    const behind = task({
      id: 'behind',
      lifeAreaId: 'saglik',
      startAt: new Date(2025, 11, 1).toISOString(),
      endAt: new Date(2026, 0, 10).toISOString(),
    })
    const child = task({ id: 'c', parentTaskId: 'behind', scale: 'week' })
    const late = task({
      id: 'late',
      lifeAreaId: 'saglik',
      scale: 'week',
      startAt: new Date(2026, 0, 1).toISOString(),
      endAt: new Date(2026, 0, 3).toISOString(),
    })
    const g = run([behind, child, late], [area('saglik')])
    expect(g.suggestions[0].kind).toBe('goal-overdue')
    expect(g.suggestions.some((s) => s.kind === 'goal-behind' && s.taskId === 'behind')).toBe(true)
  })

  it('süreyi en yakın yarım saate yuvarlar', () => {
    expect(formatHours(100)).toBe('1,5 saat')
    expect(formatHours(60)).toBe('1 saat')
  })
})
