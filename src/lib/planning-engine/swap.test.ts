import { describe, expect, it } from 'vitest'
import { swapTasks } from './swap'
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

describe('swapTasks', () => {
  it('bağımsız iki görevin başlangıç zamanlarını sorunsuz değiştirir', () => {
    const tasks: Task[] = [
      task({ id: 'a', startAt: '2026-01-01T09:00:00.000Z', endAt: '2026-01-01T10:00:00.000Z' }),
      task({ id: 'b', startAt: '2026-01-01T14:00:00.000Z', endAt: '2026-01-01T15:30:00.000Z' }),
    ]
    const result = swapTasks(tasks, 'a', 'b')

    expect(result.isValid).toBe(true)
    expect(result.violations).toEqual([])
    expect(result.changes).toEqual([
      { taskId: 'a', newStartAt: '2026-01-01T14:00:00.000Z', newEndAt: '2026-01-01T15:00:00.000Z' },
      { taskId: 'b', newStartAt: '2026-01-01T09:00:00.000Z', newEndAt: '2026-01-01T10:30:00.000Z' },
    ])
  })

  it('takas bir FS bağımlılığını ihlal ediyorsa somut bir öneriyle işaretler', () => {
    // b, a bitmeden başlayamaz (FS). Takastan sonra b, a'dan önceye düşer.
    const tasks: Task[] = [
      task({ id: 'a', startAt: '2026-01-01T09:00:00.000Z', endAt: '2026-01-01T10:00:00.000Z' }),
      task({
        id: 'b',
        startAt: '2026-01-01T11:00:00.000Z',
        endAt: '2026-01-01T12:00:00.000Z',
        dependencies: [{ taskId: 'a', type: 'FS', lagMinutes: 0 }],
      }),
    ]
    const result = swapTasks(tasks, 'a', 'b')

    expect(result.isValid).toBe(false)
    expect(result.violations).toHaveLength(1)
    expect(result.violations[0]).toMatchObject({ fromTaskId: 'a', toTaskId: 'b', type: 'FS' })
    expect(result.violations[0].message).toContain('kaydır')
  })

  it('bilinmeyen görev id\'si için hata fırlatır', () => {
    const tasks: Task[] = [task({ id: 'a' })]
    expect(() => swapTasks(tasks, 'a', 'bilinmeyen')).toThrow(/Bilinmeyen/)
  })
})
