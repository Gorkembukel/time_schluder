import { buildGraph, detectCycle, topologicalSort } from './dependencyGraph'
import { computeCriticalPath } from './criticalPath'
import type { GraphEdge, GraphNode } from './types'
import type { Task } from '../../types/domain'

const MS_PER_MINUTE = 60_000

function toMinutes(date: Date): number {
  return date.getTime() / MS_PER_MINUTE
}

function fromMinutes(minutes: number): Date {
  return new Date(minutes * MS_PER_MINUTE)
}

function buildTaskGraph(tasks: Task[]) {
  const nodes: GraphNode[] = tasks.map((t) => ({
    id: t.id,
    durationMinutes: toMinutes(new Date(t.endAt)) - toMinutes(new Date(t.startAt)),
  }))
  const edges: GraphEdge[] = tasks.flatMap((t) =>
    t.dependencies.map((dep) => ({
      from: dep.taskId,
      to: t.id,
      type: dep.type,
      lagMinutes: dep.lagMinutes,
    })),
  )
  return { nodes, edges }
}

/** Bir grafikte `startId`'den giden kenarlarla ulaşılabilen tüm düğümler (kendisi hariç). */
function reachableFrom(
  outgoing: Map<string, GraphEdge[]>,
  startId: string,
): Set<string> {
  const visited = new Set<string>()
  const stack = [startId]
  while (stack.length > 0) {
    const current = stack.pop()!
    for (const edge of outgoing.get(current) ?? []) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to)
        stack.push(edge.to)
      }
    }
  }
  return visited
}

export interface TaskChange {
  taskId: string
  newStartAt: string
  newEndAt: string
}

export interface MajorChangeThreshold {
  affectedTaskCount: number
  criticalPathChanged: boolean
}

export interface RecalculationProposal {
  /** Doğrudan yapılan değişiklik dahil, yeni tarih alan tüm görevler. */
  changes: TaskChange[]
  /** Doğrudan değişen görev hariç, zincirleme etkilenen görev sayısı. */
  affectedTaskCount: number
  /** Değişen ya da etkilenen görevlerden en az biri (değişiklik öncesi) kritik yoldaydı mı. */
  criticalPathAffected: boolean
  /** true ise: eşik aşıldı, otomatik uygulanmamalı — kullanıcıya öncesi/sonrası gösterilip onay istenmeli. */
  requiresApproval: boolean
}

/**
 * Bir görev taşındığında/ertelendiğinde/süresi değiştiğinde çağrılır. Bağımlılık
 * grafiğinde değişen görevden ulaşılabilen (ondan sonra gelen) tüm görevleri,
 * bağımlılık türü ve lag/lead'e göre ileri doğru yeniden konumlandırır. Hiçbir
 * şeyi otomatik "uygulamaz" — sadece önerilen değişiklik listesini döner.
 * bkz. docs/decisions/0004-planlama-motoru.md.
 */
export function recalculateFromChange(
  tasks: Task[],
  changedTaskId: string,
  newStartAt: Date,
  newEndAt: Date,
  majorChangeThreshold: MajorChangeThreshold,
): RecalculationProposal {
  if (!tasks.some((t) => t.id === changedTaskId)) {
    throw new Error(`Bilinmeyen görev id'si: "${changedTaskId}"`)
  }

  const { nodes, edges } = buildTaskGraph(tasks)
  const graph = buildGraph(nodes, edges)
  const cycleCheck = detectCycle(graph)
  if (cycleCheck.hasCycle) {
    throw new Error(`Görev bağımlılıklarında döngü var: ${cycleCheck.cycle.join(' → ')}`)
  }

  const beforeCritical = computeCriticalPath(nodes, edges)
  const { order } = topologicalSort(graph)
  const reachable = reachableFrom(graph.outgoing, changedTaskId)

  const currentStart = new Map<string, number>()
  const currentEnd = new Map<string, number>()
  for (const t of tasks) {
    currentStart.set(t.id, toMinutes(new Date(t.startAt)))
    currentEnd.set(t.id, toMinutes(new Date(t.endAt)))
  }
  currentStart.set(changedTaskId, toMinutes(newStartAt))
  currentEnd.set(changedTaskId, toMinutes(newEndAt))

  const changedIds = new Set<string>([changedTaskId])

  for (const id of order) {
    if (id === changedTaskId || !reachable.has(id)) continue
    const node = graph.nodes.get(id)!
    let newStart = currentStart.get(id)!
    let constrained = false

    for (const edge of graph.incoming.get(id) ?? []) {
      const predStart = currentStart.get(edge.from)
      const predEnd = currentEnd.get(edge.from)
      if (predStart === undefined || predEnd === undefined) continue

      const candidate =
        edge.type === 'FS'
          ? predEnd + edge.lagMinutes
          : edge.type === 'SS'
            ? predStart + edge.lagMinutes
            : edge.type === 'FF'
              ? predEnd + edge.lagMinutes - node.durationMinutes
              : predStart + edge.lagMinutes - node.durationMinutes // SF

      if (candidate > newStart) {
        newStart = candidate
        constrained = true
      }
    }

    if (constrained && newStart !== currentStart.get(id)) {
      currentStart.set(id, newStart)
      currentEnd.set(id, newStart + node.durationMinutes)
      changedIds.add(id)
    }
  }

  const changes: TaskChange[] = [...changedIds].map((id) => ({
    taskId: id,
    newStartAt: fromMinutes(currentStart.get(id)!).toISOString(),
    newEndAt: fromMinutes(currentEnd.get(id)!).toISOString(),
  }))

  const criticalPathAffected = [...changedIds].some((id) =>
    beforeCritical.criticalPath.includes(id),
  )
  const affectedTaskCount = changedIds.size - 1

  const requiresApproval =
    affectedTaskCount >= majorChangeThreshold.affectedTaskCount ||
    (majorChangeThreshold.criticalPathChanged && criticalPathAffected)

  return { changes, affectedTaskCount, criticalPathAffected, requiresApproval }
}

export interface DeletionProposal {
  /** Silinen göreve doğrudan bağımlı olan (dependencies'inde referans veren) görev id'leri. */
  affectedTaskIds: string[]
  requiresApproval: boolean
}

/**
 * Bir görev silindiğinde çağrılır. Silinen göreve doğrudan bağımlı olan
 * görevleri bulur — bunların `dependencies` listesinden silinen görev
 * referansının kaldırılması gerekir (çağıran taraf uygular).
 */
export function recalculateFromDeletion(
  tasks: Task[],
  deletedTaskId: string,
  majorChangeThreshold: MajorChangeThreshold,
): DeletionProposal {
  const affectedTaskIds = tasks
    .filter((t) => t.dependencies.some((dep) => dep.taskId === deletedTaskId))
    .map((t) => t.id)

  return {
    affectedTaskIds,
    requiresApproval: affectedTaskIds.length >= majorChangeThreshold.affectedTaskCount,
  }
}
