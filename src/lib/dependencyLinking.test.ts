import { describe, expect, it } from 'vitest'
import type { Task } from '../types/domain'
import { checkDependencyLink, withDependency } from './dependencyLinking'

function task(id: string, deps: string[] = []): Task {
  return {
    id,
    title: id,
    scale: 'hour',
    startAt: '2026-01-01T09:00:00.000Z',
    endAt: '2026-01-01T10:00:00.000Z',
    status: 'planned',
    dependencies: deps.map((taskId) => ({ taskId, type: 'FS', lagMinutes: 0 })),
    bufferMinutes: 0,
    detailLevel: 'detailed',
  }
}

describe('checkDependencyLink', () => {
  const tasks = [task('a'), task('b', ['a']), task('c', ['b', 'silinmis'])]

  it('geçerli bağa izin verir', () => {
    expect(checkDependencyLink(tasks, 'a', 'c')).toEqual({ ok: true })
  })

  it('kendine bağlamayı ve tekrar eden bağı reddeder', () => {
    expect(checkDependencyLink(tasks, 'a', 'a').ok).toBe(false)
    expect(checkDependencyLink(tasks, 'a', 'b').ok).toBe(false)
  })

  it('döngü oluşturacak bağı başlıklarla açıklayarak reddeder', () => {
    const result = checkDependencyLink(tasks, 'c', 'a')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('a → b → c → a')
  })

  it('yeni bağı mevcut bağlara ekler', () => {
    expect(withDependency(tasks[1], 'c', 'SS', 15)).toEqual([
      { taskId: 'a', type: 'FS', lagMinutes: 0 },
      { taskId: 'c', type: 'SS', lagMinutes: 15 },
    ])
  })
})
