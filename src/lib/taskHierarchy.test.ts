import { describe, expect, it } from 'vitest'
import type { Task } from '../types/domain'
import {
  ancestorsOf,
  childrenIndex,
  defaultChildRange,
  effectiveLifeAreaId,
  effectiveRequirementId,
  indexTasks,
  isOverdue,
  overlapsRange,
  rollupProgress,
} from './taskHierarchy'

function task(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: overrides.id,
    scale: 'month',
    startAt: '2026-01-01T00:00:00.000Z',
    endAt: '2026-02-01T00:00:00.000Z',
    status: 'planned',
    dependencies: [],
    bufferMinutes: 0,
    detailLevel: 'rough',
    ...overrides,
  }
}

const epic = task({ id: 'epic', scale: 'year3', lifeAreaId: 'saglik', requirementId: 'req1' })
const year = task({ id: 'year', scale: 'year', parentTaskId: 'epic' })
const monthDone = task({ id: 'm1', parentTaskId: 'year', status: 'done' })
const monthOpen = task({ id: 'm2', parentTaskId: 'year' })
const all = [epic, year, monthDone, monthOpen]
const index = indexTasks(all)

describe('taskHierarchy', () => {
  it('ata zincirini en yakından köke döndürür', () => {
    expect(ancestorsOf(monthDone, index).map((t) => t.id)).toEqual(['year', 'epic'])
  })

  it('döngüsel parent link sonsuz döngüye girmez', () => {
    const a = task({ id: 'a', parentTaskId: 'b' })
    const b = task({ id: 'b', parentTaskId: 'a' })
    expect(ancestorsOf(a, indexTasks([a, b])).map((t) => t.id)).toEqual(['b'])
  })

  it('hayat alanını ve gerekliliği atadan devralır', () => {
    expect(effectiveLifeAreaId(monthOpen, index)).toBe('saglik')
    expect(effectiveRequirementId(monthOpen, index)).toBe('req1')
  })

  it('kendi hayat alanı atanınkini ezer', () => {
    const own = task({ id: 'own', parentTaskId: 'epic', lifeAreaId: 'kariyer' })
    expect(effectiveLifeAreaId(own, indexTasks([...all, own]))).toBe('kariyer')
  })

  it('ilerlemeyi alt işlerden üste toplar', () => {
    const children = childrenIndex(all)
    expect(rollupProgress(year, children)).toBe(0.5)
    expect(rollupProgress(epic, children)).toBe(0.5)
    expect(rollupProgress(monthDone, children)).toBe(1)
  })

  it('gecikmeyi bitiş tarihine göre hesaplar, tamamlananı gecikmiş saymaz', () => {
    const now = new Date('2026-03-01T00:00:00.000Z')
    expect(isOverdue(monthOpen, now)).toBe(true)
    expect(isOverdue(monthDone, now)).toBe(false)
    expect(isOverdue(monthOpen, new Date('2026-01-15T00:00:00.000Z'))).toBe(false)
  })

  it('dönem kesişimini yarı açık aralıkla hesaplar', () => {
    expect(overlapsRange(monthOpen, new Date('2026-01-15'), new Date('2026-03-01'))).toBe(true)
    expect(
      overlapsRange(monthOpen, new Date('2026-02-01T00:00:00.000Z'), new Date('2026-03-01')),
    ).toBe(false)
  })

  it('alt işin varsayılan aralığını tek bir alt dönemle sınırlar', () => {
    const threeYear = task({
      id: 'y3',
      scale: 'year3',
      startAt: new Date(2026, 0, 1).toISOString(),
      endAt: new Date(2029, 0, 1).toISOString(),
    })
    const range = defaultChildRange(threeYear, 'year', new Date(2027, 5, 15), 1)
    expect(range.start).toEqual(new Date(2027, 0, 1))
    expect(range.end).toEqual(new Date(2028, 0, 1))

    const beforeParent = defaultChildRange(threeYear, 'year', new Date(2020, 0, 1), 1)
    expect(beforeParent.start).toEqual(new Date(2026, 0, 1))
  })
})
