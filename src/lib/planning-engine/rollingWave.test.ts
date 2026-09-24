import { describe, expect, it } from 'vitest'
import { determineDetailLevel, evaluateRollingWave, type RollingWaveItem } from './rollingWave'
import type { PlanningScale } from '../../types/domain'

const WINDOW: Record<PlanningScale, number> = {
  year3: 365,
  year: 90,
  month: 7,
  week: 2,
  day: 1,
  hour: 0,
}

const TODAY = new Date('2026-01-01T00:00:00Z')

describe('determineDetailLevel', () => {
  it('pencere içindeki bir ay ölçeği öğesini detailed sayar', () => {
    const startAt = new Date('2026-01-05T00:00:00Z') // 4 gün sonra, pencere 7
    expect(determineDetailLevel('month', startAt, TODAY, WINDOW)).toBe('detailed')
  })

  it('pencere dışındaki bir ay ölçeği öğesini rough sayar', () => {
    const startAt = new Date('2026-01-10T00:00:00Z') // 9 gün sonra, pencere 7
    expect(determineDetailLevel('month', startAt, TODAY, WINDOW)).toBe('rough')
  })

  it('saat ölçeğinde (pencere 0) sadece bugünü detailed sayar', () => {
    expect(determineDetailLevel('hour', TODAY, TODAY, WINDOW)).toBe('detailed')
    const tomorrow = new Date('2026-01-02T00:00:00Z')
    expect(determineDetailLevel('hour', tomorrow, TODAY, WINDOW)).toBe('rough')
  })

  it('geçmişteki bir öğeyi her zaman detailed sayar', () => {
    const yesterday = new Date('2025-12-31T00:00:00Z')
    expect(determineDetailLevel('day', yesterday, TODAY, WINDOW)).toBe('detailed')
  })
})

describe('evaluateRollingWave', () => {
  it('rough→detailed geçişini enteredDetailWindow=true ile işaretler', () => {
    const items: RollingWaveItem[] = [
      {
        id: 'a',
        scale: 'month',
        startAt: new Date('2026-01-05T00:00:00Z'),
        detailLevel: 'rough',
      },
    ]
    const transitions = evaluateRollingWave(items, TODAY, WINDOW)
    expect(transitions).toEqual([
      { id: 'a', previousLevel: 'rough', currentLevel: 'detailed', enteredDetailWindow: true },
    ])
  })

  it('seviyesi değişmeyen öğeler için geçiş döndürmez', () => {
    const items: RollingWaveItem[] = [
      {
        id: 'b',
        scale: 'month',
        startAt: new Date('2026-01-05T00:00:00Z'),
        detailLevel: 'detailed',
      },
    ]
    expect(evaluateRollingWave(items, TODAY, WINDOW)).toEqual([])
  })

  it('detailed→rough geçişini enteredDetailWindow=false ile işaretler', () => {
    const items: RollingWaveItem[] = [
      {
        id: 'c',
        scale: 'month',
        startAt: new Date('2026-01-10T00:00:00Z'),
        detailLevel: 'detailed',
      },
    ]
    const transitions = evaluateRollingWave(items, TODAY, WINDOW)
    expect(transitions).toEqual([
      { id: 'c', previousLevel: 'detailed', currentLevel: 'rough', enteredDetailWindow: false },
    ])
  })
})
