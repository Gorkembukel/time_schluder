import { describe, expect, it } from 'vitest'
import type { Task } from '../types/domain'
import { computeRobotStats, levelForXp, streakDays, taskXp, xpForLevel } from './gamification'

function block(id: string, day: number, hour: number, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    scale: 'hour',
    startAt: new Date(2026, 8, day, hour).toISOString(),
    endAt: new Date(2026, 8, day, hour + 1).toISOString(),
    status: 'planned',
    dependencies: [],
    bufferMinutes: 0,
    detailLevel: 'detailed',
    ...overrides,
  }
}

describe('gamification', () => {
  it('60 dakikalık zamanında blok 6 × 1.2 = 7 XP, geç biten 6 XP verir', () => {
    expect(taskXp(block('a', 25, 9, { status: 'done' }))).toBe(7)
    const late = block('b', 25, 9, {
      status: 'done',
      completedAt: new Date(2026, 8, 26).toISOString(),
    })
    expect(taskXp(late)).toBe(6)
    expect(taskXp(block('c', 25, 9))).toBe(0)
  })

  it('hedef tamamlamaya ölçek bonusu verir', () => {
    const week: Task = { ...block('w', 25, 9), scale: 'week', status: 'done' }
    expect(taskXp(week)).toBe(60)
  })

  it('seviye eşikleri karesel büyür', () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(49)).toBe(1)
    expect(levelForXp(50)).toBe(2)
    expect(levelForXp(200)).toBe(3)
    expect(xpForLevel(4)).toBe(450)
  })

  it('seriyi bugünden (bugün boşsa dünden) geriye sayar', () => {
    const now = new Date(2026, 8, 25, 12)
    const tasks = [23, 24].map((d) => block(`d${d}`, d, 9, { status: 'done' }))
    expect(streakDays(tasks, now)).toBe(2)
    expect(streakDays([...tasks, block('t', 25, 9, { status: 'done' })], now)).toBe(3)
    expect(streakDays([block('old', 20, 9, { status: 'done' })], now)).toBe(0)
  })

  it('şu anki görevi, kuyruğu ve rozetleri hesaplar', () => {
    const now = new Date(2026, 8, 25, 10, 30)
    const stats = computeRobotStats(
      [
        block('done', 25, 8, { status: 'done' }),
        block('now', 25, 10),
        block('later', 25, 14),
        block('missed', 25, 7),
      ],
      now,
    )
    expect(stats.current?.id).toBe('now')
    expect(stats.queue.map((t) => t.id)).toEqual(['later'])
    expect(stats.todayDoneCount).toBe(1)
    expect(stats.badges.find((b) => b.id === 'first-block')?.earned).toBe(true)
    expect(stats.badges.find((b) => b.id === 'streak-3')?.earned).toBe(false)
  })
})
