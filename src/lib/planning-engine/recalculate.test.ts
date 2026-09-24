import { describe, expect, it } from 'vitest'
import { recalculateFromChange, recalculateFromDeletion } from './recalculate'
import type { Task } from '../../types/domain'

function task(overrides: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    title: overrides.id,
    scale: 'hour',
    startAt: '2026-01-01T09:00:00.000Z',
    endAt: '2026-01-01T10:00:00.000Z',
    status: 'planned',
    dependencies: [],
    bufferMinutes: 0,
    detailLevel: 'detailed',
    ...overrides,
  }
}

const LENIENT_THRESHOLD = { affectedTaskCount: 100, criticalPathChanged: false }
const STRICT_THRESHOLD = { affectedTaskCount: 1, criticalPathChanged: false }

describe('recalculateFromChange', () => {
  it('FS bağımlılığı ihlal olunca ardıl görevi zincirleme kaydırır', () => {
    const tasks: Task[] = [
      task({ id: 'a', startAt: '2026-01-01T09:00:00.000Z', endAt: '2026-01-01T10:00:00.000Z' }),
      task({
        id: 'b',
        startAt: '2026-01-01T10:00:00.000Z',
        endAt: '2026-01-01T11:00:00.000Z',
        dependencies: [{ taskId: 'a', type: 'FS', lagMinutes: 0 }],
      }),
    ]

    const result = recalculateFromChange(
      tasks,
      'a',
      new Date('2026-01-01T10:00:00.000Z'),
      new Date('2026-01-01T11:00:00.000Z'),
      LENIENT_THRESHOLD,
    )

    expect(result.affectedTaskCount).toBe(1)
    const bChange = result.changes.find((c) => c.taskId === 'b')
    expect(bChange).toEqual({
      taskId: 'b',
      newStartAt: '2026-01-01T11:00:00.000Z',
      newEndAt: '2026-01-01T12:00:00.000Z',
    })
  })

  it('bağımlılık zaten sağlanıyorsa ardıl görevi kaydırmaz', () => {
    const tasks: Task[] = [
      task({ id: 'a', startAt: '2026-01-01T09:00:00.000Z', endAt: '2026-01-01T10:00:00.000Z' }),
      task({
        id: 'b',
        startAt: '2026-01-01T12:00:00.000Z',
        endAt: '2026-01-01T13:00:00.000Z',
        dependencies: [{ taskId: 'a', type: 'FS', lagMinutes: 0 }],
      }),
    ]

    // a'yı 1 saat erkene çekmek b'nin kısıtını daha da gevşetir, b sabit kalmalı.
    const result = recalculateFromChange(
      tasks,
      'a',
      new Date('2026-01-01T08:00:00.000Z'),
      new Date('2026-01-01T09:00:00.000Z'),
      LENIENT_THRESHOLD,
    )

    expect(result.affectedTaskCount).toBe(0)
    expect(result.changes).toEqual([
      { taskId: 'a', newStartAt: '2026-01-01T08:00:00.000Z', newEndAt: '2026-01-01T09:00:00.000Z' },
    ])
  })

  it('izole (bağımlılıksız) bir görev kritik yolu etkilemez ve onay gerektirmez', () => {
    const tasks: Task[] = [
      task({ id: 'a', startAt: '2026-01-01T09:00:00.000Z', endAt: '2026-01-01T10:00:00.000Z' }),
      task({
        id: 'b',
        startAt: '2026-01-01T10:00:00.000Z',
        endAt: '2026-01-01T11:00:00.000Z',
        dependencies: [{ taskId: 'a', type: 'FS', lagMinutes: 0 }],
      }),
      task({
        id: 'x',
        startAt: '2026-01-01T09:00:00.000Z',
        endAt: '2026-01-01T09:30:00.000Z',
      }),
    ]

    const result = recalculateFromChange(
      tasks,
      'x',
      new Date('2026-01-01T14:00:00.000Z'),
      new Date('2026-01-01T14:30:00.000Z'),
      STRICT_THRESHOLD,
    )

    expect(result.affectedTaskCount).toBe(0)
    expect(result.criticalPathAffected).toBe(false)
    expect(result.requiresApproval).toBe(false)
  })

  it('kritik yoldaki bir görev değişince criticalPathAffected true olur', () => {
    const tasks: Task[] = [
      task({ id: 'a', startAt: '2026-01-01T09:00:00.000Z', endAt: '2026-01-01T10:00:00.000Z' }),
      task({
        id: 'b',
        startAt: '2026-01-01T10:00:00.000Z',
        endAt: '2026-01-01T11:00:00.000Z',
        dependencies: [{ taskId: 'a', type: 'FS', lagMinutes: 0 }],
      }),
    ]

    const result = recalculateFromChange(
      tasks,
      'a',
      new Date('2026-01-01T10:00:00.000Z'),
      new Date('2026-01-01T11:00:00.000Z'),
      LENIENT_THRESHOLD,
    )

    expect(result.criticalPathAffected).toBe(true)
  })

  it('etkilenen görev sayısı eşiği aşarsa requiresApproval true olur', () => {
    const tasks: Task[] = [
      task({ id: 'a', startAt: '2026-01-01T09:00:00.000Z', endAt: '2026-01-01T10:00:00.000Z' }),
      task({
        id: 'b',
        startAt: '2026-01-01T10:00:00.000Z',
        endAt: '2026-01-01T11:00:00.000Z',
        dependencies: [{ taskId: 'a', type: 'FS', lagMinutes: 0 }],
      }),
    ]

    const result = recalculateFromChange(
      tasks,
      'a',
      new Date('2026-01-01T10:00:00.000Z'),
      new Date('2026-01-01T11:00:00.000Z'),
      STRICT_THRESHOLD,
    )

    expect(result.requiresApproval).toBe(true)
  })

  it('döngü içeren bağımlılıklarda hata fırlatır', () => {
    const tasks: Task[] = [
      task({ id: 'a', dependencies: [{ taskId: 'b', type: 'FS', lagMinutes: 0 }] }),
      task({ id: 'b', dependencies: [{ taskId: 'a', type: 'FS', lagMinutes: 0 }] }),
    ]
    expect(() =>
      recalculateFromChange(
        tasks,
        'a',
        new Date('2026-01-01T09:00:00.000Z'),
        new Date('2026-01-01T10:00:00.000Z'),
        LENIENT_THRESHOLD,
      ),
    ).toThrow(/döngü/)
  })

  it('bilinmeyen görev id\'si için hata fırlatır', () => {
    expect(() =>
      recalculateFromChange(
        [task({ id: 'a' })],
        'bilinmeyen',
        new Date(),
        new Date(),
        LENIENT_THRESHOLD,
      ),
    ).toThrow(/Bilinmeyen/)
  })
})

describe('recalculateFromDeletion', () => {
  it('silinen göreve doğrudan bağımlı görevleri bulur', () => {
    const tasks: Task[] = [
      task({ id: 'a' }),
      task({ id: 'b', dependencies: [{ taskId: 'a', type: 'FS', lagMinutes: 0 }] }),
      task({ id: 'c' }),
    ]
    const result = recalculateFromDeletion(tasks, 'a', LENIENT_THRESHOLD)
    expect(result.affectedTaskIds).toEqual(['b'])
    expect(result.requiresApproval).toBe(false)
  })

  it('etkilenen görev sayısı eşiği aşarsa requiresApproval true olur', () => {
    const tasks: Task[] = [
      task({ id: 'a' }),
      task({ id: 'b', dependencies: [{ taskId: 'a', type: 'FS', lagMinutes: 0 }] }),
    ]
    const result = recalculateFromDeletion(tasks, 'a', STRICT_THRESHOLD)
    expect(result.requiresApproval).toBe(true)
  })
})
