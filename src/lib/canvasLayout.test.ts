import { describe, expect, it } from 'vitest'
import {
  dependencyEdgeSides,
  inferDependencyType,
  layoutNodes,
  subPeriodBoundaries,
  timeRatio,
} from './canvasLayout'
import type { DependencyType, Task } from '../types/domain'

const PERIOD = { start: new Date(2026, 0, 1), end: new Date(2027, 0, 1) }

function task(id: string, startAt: string, endAt: string): Task {
  return {
    id,
    title: id,
    scale: 'month',
    startAt,
    endAt,
    status: 'planned',
    dependencies: [],
    bufferMinutes: 0,
    detailLevel: 'rough',
  }
}

describe('timeRatio', () => {
  it('periyodun başında 0, sonunda 1 döner', () => {
    expect(timeRatio(PERIOD.start, PERIOD)).toBe(0)
    expect(timeRatio(PERIOD.end, PERIOD)).toBe(1)
  })

  it('periyot dışına taşan tarihleri kırpar', () => {
    expect(timeRatio(new Date(2025, 0, 1), PERIOD)).toBe(0)
    expect(timeRatio(new Date(2028, 0, 1), PERIOD)).toBe(1)
  })
})

describe('layoutNodes', () => {
  it("çakışmayan işleri aynı lane'e koyar", () => {
    const tasks = [
      task('a', new Date(2026, 0, 1).toISOString(), new Date(2026, 1, 1).toISOString()),
      task('b', new Date(2026, 2, 1).toISOString(), new Date(2026, 3, 1).toISOString()),
    ]
    const nodes = layoutNodes(tasks, PERIOD)
    expect(nodes.find((n) => n.task.id === 'a')?.lane).toBe(0)
    expect(nodes.find((n) => n.task.id === 'b')?.lane).toBe(0)
  })

  it("çakışan işleri farklı lane'lere ayırır", () => {
    const tasks = [
      task('a', new Date(2026, 0, 1).toISOString(), new Date(2026, 2, 1).toISOString()),
      task('b', new Date(2026, 1, 1).toISOString(), new Date(2026, 3, 1).toISOString()),
    ]
    const nodes = layoutNodes(tasks, PERIOD)
    const laneA = nodes.find((n) => n.task.id === 'a')?.lane
    const laneB = nodes.find((n) => n.task.id === 'b')?.lane
    expect(laneA).not.toBe(laneB)
  })
})

describe('subPeriodBoundaries', () => {
  it('yıl periyodunu ay sınırlarına böler (12 sınır)', () => {
    const boundaries = subPeriodBoundaries('year', PERIOD, 1)
    expect(boundaries).toHaveLength(12)
    expect(boundaries[0].toISOString()).toBe(PERIOD.start.toISOString())
  })

  it('en ince ölçekte (saat) boş liste döner', () => {
    expect(subPeriodBoundaries('hour', PERIOD, 1)).toEqual([])
  })
})

describe('inferDependencyType / dependencyEdgeSides', () => {
  const types: DependencyType[] = ['FS', 'SS', 'FF', 'SF']

  it('her tür için kenarlardan tür çıkarımı ve tersi tutarlı', () => {
    for (const type of types) {
      const { fromSide, toSide } = dependencyEdgeSides(type)
      expect(inferDependencyType(fromSide, toSide)).toBe(type)
    }
  })
})
