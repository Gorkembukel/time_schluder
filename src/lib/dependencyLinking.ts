import { buildGraph, detectCycle } from './planning-engine'
import type { DependencyType, Task, TaskDependency } from '../types/domain'

export const DEPENDENCY_TYPE_DESCRIPTIONS: Record<DependencyType, string> = {
  FS: 'bitmeden başlamaz',
  SS: 'başlamadan başlamaz',
  FF: 'bitmeden bitemez',
  SF: 'başlamadan bitemez',
}

export type LinkCheck = { ok: true } | { ok: false; reason: string }

/**
 * `predecessorId` → `successorId` bağımlılığı eklenebilir mi? Aynı iş, mevcut bağ ve döngü
 * (A→B→…→A) reddedilir. Silinmiş görevlere işaret eden eski bağlar grafiğe alınmaz.
 */
export function checkDependencyLink(
  tasks: Task[],
  predecessorId: string,
  successorId: string,
): LinkCheck {
  if (predecessorId === successorId) return { ok: false, reason: 'Bir iş kendisine bağlanamaz.' }
  const successor = tasks.find((t) => t.id === successorId)
  if (!successor || !tasks.some((t) => t.id === predecessorId)) {
    return { ok: false, reason: 'İş bulunamadı.' }
  }
  if (successor.dependencies.some((d) => d.taskId === predecessorId)) {
    return { ok: false, reason: 'Bu bağ zaten var.' }
  }

  const ids = new Set(tasks.map((t) => t.id))
  const nodes = tasks.map((t) => ({ id: t.id, durationMinutes: 0 }))
  const edges = tasks.flatMap((t) =>
    t.dependencies
      .filter((d) => ids.has(d.taskId))
      .map((d) => ({ from: d.taskId, to: t.id, type: d.type, lagMinutes: d.lagMinutes })),
  )
  edges.push({ from: predecessorId, to: successorId, type: 'FS', lagMinutes: 0 })
  const cycle = detectCycle(buildGraph(nodes, edges))
  if (cycle.hasCycle) {
    const titles = cycle.cycle.map((id) => tasks.find((t) => t.id === id)?.title ?? id)
    return { ok: false, reason: `Döngü oluşur: ${titles.join(' → ')}` }
  }
  return { ok: true }
}

export function withDependency(
  successor: Task,
  predecessorId: string,
  type: DependencyType,
  lagMinutes = 0,
): TaskDependency[] {
  return [...successor.dependencies, { taskId: predecessorId, type, lagMinutes }]
}
