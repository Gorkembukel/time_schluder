import { format, isSameDay, subDays } from 'date-fns'
import { BADGES, GAMIFICATION } from '../config/gamification'
import type { Task } from '../types/domain'

/**
 * Robot oyunlaştırması — tamamen mevcut veriden türetilir (XP/seviye/seri saklanmaz, her
 * açılışta hesaplanır), kullanıcıdan ek girdi istemez. Kurallar: config/gamification.ts.
 */

const MS_PER_MINUTE = 60_000
const DAY_KEY = 'yyyy-MM-dd'
const MINUTES_PER_HOUR = 60
const HOURS_FOR_BADGE = 10
const STREAK_SHORT = 3
const STREAK_LONG = 7

function workMinutes(task: Task): number {
  if (task.actualMinutes !== undefined) return task.actualMinutes
  if (task.scale !== 'hour') return 0
  return (new Date(task.endAt).getTime() - new Date(task.startAt).getTime()) / MS_PER_MINUTE
}

function completionDate(task: Task): Date {
  return new Date(task.completedAt ?? task.startAt)
}

/** Tek bir tamamlanmış işin XP'si: çalışma süresi + ölçek bonusu, zamanında ise çarpanlı. */
export function taskXp(task: Task): number {
  if (task.status !== 'done') return 0
  const base = workMinutes(task) * GAMIFICATION.xpPerMinute + GAMIFICATION.scaleBonus[task.scale]
  const onTime = !task.completedAt || task.completedAt <= task.endAt
  return Math.round(base * (onTime ? GAMIFICATION.onTimeMultiplier : 1))
}

export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / GAMIFICATION.levelBaseXp)) + 1
}

export function xpForLevel(level: number): number {
  return GAMIFICATION.levelBaseXp * (level - 1) ** 2
}

/** Bugün (ya da henüz bugün bir şey yapılmadıysa dünden) geriye kesintisiz iş yapılan gün sayısı. */
export function streakDays(tasks: Task[], now: Date): number {
  const days = new Set(
    tasks
      .filter((t) => t.status === 'done' && t.scale === 'hour')
      .map((t) => format(completionDate(t), DAY_KEY)),
  )
  let cursor = days.has(format(now, DAY_KEY)) ? now : subDays(now, 1)
  let streak = 0
  while (days.has(format(cursor, DAY_KEY))) {
    streak += 1
    cursor = subDays(cursor, 1)
  }
  return streak
}

export interface RobotStats {
  totalXp: number
  level: number
  levelStartXp: number
  nextLevelXp: number
  todayXp: number
  streak: number
  todayBlocks: Task[]
  todayDoneCount: number
  current: Task | null
  queue: Task[]
  badges: { id: string; label: string; description: string; earned: boolean }[]
}

export function computeRobotStats(tasks: Task[], now: Date): RobotStats {
  const done = tasks.filter((t) => t.status === 'done')
  const totalXp = done.reduce((sum, t) => sum + taskXp(t), 0)
  const level = levelForXp(totalXp)
  const todayXp = done
    .filter((t) => isSameDay(completionDate(t), now))
    .reduce((sum, t) => sum + taskXp(t), 0)
  const streak = streakDays(tasks, now)

  const todayBlocks = tasks
    .filter((t) => t.scale === 'hour' && isSameDay(new Date(t.startAt), now))
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
  const open = todayBlocks.filter((t) => t.status !== 'done')
  const nowIso = now.toISOString()
  const current = open.find((t) => t.startAt <= nowIso && nowIso < t.endAt) ?? null
  const queue = open.filter((t) => t !== current && t.endAt > nowIso)

  const doneHours =
    done.filter((t) => t.scale === 'hour').reduce((sum, t) => sum + workMinutes(t), 0) /
    MINUTES_PER_HOUR
  const earned: Record<string, boolean> = {
    'first-block': done.some((t) => t.scale === 'hour'),
    'streak-3': streak >= STREAK_SHORT,
    'streak-7': streak >= STREAK_LONG,
    'hours-10': doneHours >= HOURS_FOR_BADGE,
    'week-goal': done.some((t) => t.scale === 'week'),
    'month-goal': done.some((t) => t.scale === 'month'),
    'year-goal': done.some((t) => t.scale === 'year' || t.scale === 'year3'),
  }

  return {
    totalXp,
    level,
    levelStartXp: xpForLevel(level),
    nextLevelXp: xpForLevel(level + 1),
    todayXp,
    streak,
    todayBlocks,
    todayDoneCount: todayBlocks.length - open.length,
    current,
    queue,
    badges: BADGES.map((b) => ({ ...b, earned: earned[b.id] ?? false })),
  }
}
