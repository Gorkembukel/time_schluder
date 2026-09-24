import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../config/constants'
import type { LifeArea, Task } from '../types/domain'
import { buildAutoPlan } from './autoPlan'

describe('buildAutoPlan', () => {
  it('tek bir 3 yıllık hedeften kırılım + bu haftanın bloklarını üretir, hiçbir girdi istemeden', () => {
    const areas: LifeArea[] = [
      { id: 'saglik', name: 'Sağlık', order: 0, createdAt: '', updatedAt: '' },
    ]
    const goal: Task = {
      id: 'g',
      title: 'Maraton',
      scale: 'year3',
      startAt: new Date(2026, 0, 1).toISOString(),
      endAt: new Date(2029, 0, 1).toISOString(),
      lifeAreaId: 'saglik',
      status: 'planned',
      dependencies: [],
      bufferMinutes: 0,
      detailLevel: 'rough',
    }
    let n = 0
    const plan = buildAutoPlan({
      tasks: [goal],
      areas,
      routines: [],
      week: { start: new Date(2026, 8, 28), end: new Date(2026, 9, 5) },
      now: new Date(2026, 8, 28, 6),
      settings: DEFAULT_SETTINGS,
      newId: () => `n${++n}`,
    })

    const weekGoal = plan.breakdown.find(
      (t) =>
        t.scale === 'week' && new Date(t.startAt).getTime() === new Date(2026, 8, 28).getTime(),
    )
    expect(weekGoal).toBeDefined()
    expect(plan.blocks.length).toBeGreaterThan(0)
    expect(plan.blocks.every((b) => b.parentTaskId && b.scale === 'hour')).toBe(true)
    // Bloklar ayın son gününde (30 Eylül) biten haftalık parçanın bitişinden sonra olmamalı
    const parents = new Map([...plan.breakdown].map((t) => [t.id, t]))
    for (const b of plan.blocks) {
      expect(new Date(b.endAt) <= new Date(parents.get(b.parentTaskId!)!.endAt)).toBe(true)
    }
  })
})
