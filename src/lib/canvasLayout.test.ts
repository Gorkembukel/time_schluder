import { describe, expect, it } from 'vitest'
import {
  boundingRange,
  dependencyEdgeSides,
  gridLines,
  inferDependencyType,
  inferScaleFromDuration,
  layoutNodes,
  panView,
  pickGridUnit,
  timeRatio,
  zoomView,
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

describe('boundingRange', () => {
  it('boş listede null döner', () => {
    expect(boundingRange([])).toBeNull()
  })

  it('en erken başlangıç ile en geç bitişi kapsar', () => {
    const tasks = [
      task('a', new Date(2026, 2, 1).toISOString(), new Date(2026, 3, 1).toISOString()),
      task('b', new Date(2026, 0, 1).toISOString(), new Date(2026, 1, 1).toISOString()),
    ]
    const range = boundingRange(tasks)
    expect(range?.start.getTime()).toBe(new Date(2026, 0, 1).getTime())
    expect(range?.end.getTime()).toBe(new Date(2026, 3, 1).getTime())
  })
})

describe('zoomView / panView', () => {
  const bounds = PERIOD

  it('zoomView imlecin altındaki anı sabit tutarak yakınlaştırır', () => {
    const view = { start: new Date(2026, 0, 1), end: new Date(2027, 0, 1) }
    const cursorRatio = 0.5
    const zoomed = zoomView(view, cursorRatio, 0.5, 1000, bounds)
    const zoomedDuration = zoomed.end.getTime() - zoomed.start.getTime()
    const originalDuration = view.end.getTime() - view.start.getTime()
    expect(zoomedDuration).toBeCloseTo(originalDuration * 0.5, -3)
  })

  it('zoomView süreyi minDurationMs altına düşürmez', () => {
    const view = { start: new Date(2026, 0, 1), end: new Date(2026, 0, 2) }
    const oneHourMs = 60 * 60 * 1000
    const zoomed = zoomView(view, 0.5, 0.001, oneHourMs, bounds)
    expect(zoomed.end.getTime() - zoomed.start.getTime()).toBe(oneHourMs)
  })

  it('zoomView sınırları (bounds) aşıp büyümez', () => {
    const view = { start: new Date(2026, 5, 1), end: new Date(2026, 6, 1) }
    const zoomed = zoomView(view, 0.5, 100, 1000, bounds)
    expect(zoomed.start.getTime()).toBeGreaterThanOrEqual(bounds.start.getTime())
    expect(zoomed.end.getTime()).toBeLessThanOrEqual(bounds.end.getTime())
  })

  it('panView aralığı kaydırır ama bounds dışına taşırmaz', () => {
    const view = { start: new Date(2026, 0, 1), end: new Date(2026, 1, 1) }
    const oneDayMs = 24 * 60 * 60 * 1000
    const panned = panView(view, -oneDayMs, bounds)
    expect(panned.start.getTime()).toBe(bounds.start.getTime())

    const pannedForward = panView(view, 400 * oneDayMs, bounds)
    expect(pannedForward.end.getTime()).toBe(bounds.end.getTime())
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

describe('inferScaleFromDuration', () => {
  const HOUR_MS = 3_600_000
  const DAY_MS = 24 * HOUR_MS
  const thresholds = { year3Days: 632, yearDays: 104, monthDays: 14.5, weekDays: 2.6, dayHours: 4.9 }

  it('tipik süreler için beklenen ölçeği döner', () => {
    expect(inferScaleFromDuration(3 * 365 * DAY_MS, thresholds)).toBe('year3')
    expect(inferScaleFromDuration(365 * DAY_MS, thresholds)).toBe('year')
    expect(inferScaleFromDuration(30 * DAY_MS, thresholds)).toBe('month')
    expect(inferScaleFromDuration(7 * DAY_MS, thresholds)).toBe('week')
    expect(inferScaleFromDuration(DAY_MS, thresholds)).toBe('day')
    expect(inferScaleFromDuration(2 * HOUR_MS, thresholds)).toBe('hour')
  })

  it('çok kısa ve çok uzun uçlarda sınırları aşmaz', () => {
    expect(inferScaleFromDuration(0, thresholds)).toBe('hour')
    expect(inferScaleFromDuration(100 * 365 * DAY_MS, thresholds)).toBe('year3')
  })

  it('eşikler değiştirilince farklı ölçek dönebilir', () => {
    const thirtyHours = 30 * HOUR_MS
    expect(inferScaleFromDuration(thirtyHours, thresholds)).toBe('day')
    const stricterThresholds = { ...thresholds, dayHours: 40 }
    expect(inferScaleFromDuration(thirtyHours, stricterThresholds)).toBe('hour')
  })
})

describe('pickGridUnit / gridLines', () => {
  const HOUR_MS = 3_600_000
  const DAY_MS = 24 * HOUR_MS

  it('geniş aralıkta yıl, dar aralıkta saat birimini seçer', () => {
    expect(pickGridUnit(5 * 365 * DAY_MS)).toBe('year')
    expect(pickGridUnit(3 * HOUR_MS)).toBe('hour')
  })

  it('bir yıllık aralıkta ay çizgileri üretir ve aralığın içinde kalır', () => {
    const period = { start: new Date(2026, 0, 1), end: new Date(2027, 0, 1) }
    const lines = gridLines(period, 1)
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) {
      expect(line.date.getTime()).toBeGreaterThanOrEqual(period.start.getTime())
      expect(line.date.getTime()).toBeLessThan(period.end.getTime())
      expect(line.unit).toBe('month')
    }
  })
})
