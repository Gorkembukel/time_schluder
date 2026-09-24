import type { CriticalPathResult, GraphEdge, GraphNode, TaskSchedule } from './types'
import { buildGraph, detectCycle, topologicalSort } from './dependencyGraph'

/**
 * Kritik Yol Yöntemi (CPM), PDM'in 4 bağımlılık türünü de (FS/SS/FF/SF, lag/lead
 * dahil) destekleyecek şekilde: ileri geçiş (en erken başlangıç/bitiş) + geri
 * geçiş (en geç başlangıç/bitiş) → serbest bolluk (float). float === 0 olan
 * görevler kritik yolu oluşturur. bkz. docs/decisions/0004-planlama-motoru.md.
 */
export function computeCriticalPath(nodes: GraphNode[], edges: GraphEdge[]): CriticalPathResult {
  const graph = buildGraph(nodes, edges)
  const cycleCheck = detectCycle(graph)
  if (cycleCheck.hasCycle) {
    throw new Error(`Grafikte döngü var: ${cycleCheck.cycle.join(' → ')}`)
  }
  const { order } = topologicalSort(graph)

  const earliestStart = new Map<string, number>()
  const earliestFinish = new Map<string, number>()

  for (const id of order) {
    const node = graph.nodes.get(id)!
    let es = 0
    for (const edge of graph.incoming.get(id) ?? []) {
      const predES = earliestStart.get(edge.from)!
      const predEF = earliestFinish.get(edge.from)!
      const candidate =
        edge.type === 'FS'
          ? predEF + edge.lagMinutes
          : edge.type === 'SS'
            ? predES + edge.lagMinutes
            : edge.type === 'FF'
              ? predEF + edge.lagMinutes - node.durationMinutes
              : predES + edge.lagMinutes - node.durationMinutes // SF
      es = Math.max(es, candidate)
    }
    earliestStart.set(id, es)
    earliestFinish.set(id, es + node.durationMinutes)
  }

  const projectDurationMinutes = Math.max(0, ...[...earliestFinish.values()])

  const latestStart = new Map<string, number>()
  const latestFinish = new Map<string, number>()

  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i]
    const node = graph.nodes.get(id)!
    const outgoingEdges = graph.outgoing.get(id) ?? []

    let lf: number
    if (outgoingEdges.length === 0) {
      lf = projectDurationMinutes
    } else {
      lf = Math.min(
        ...outgoingEdges.map((edge) => {
          const succLS = latestStart.get(edge.to)!
          const succLF = latestFinish.get(edge.to)!
          if (edge.type === 'FS') return succLS - edge.lagMinutes
          if (edge.type === 'SS') return succLS - edge.lagMinutes + node.durationMinutes
          if (edge.type === 'FF') return succLF - edge.lagMinutes
          return succLF - edge.lagMinutes + node.durationMinutes // SF
        }),
      )
    }
    latestFinish.set(id, lf)
    latestStart.set(id, lf - node.durationMinutes)
  }

  const schedule = new Map<string, TaskSchedule>()
  const criticalPath: string[] = []
  for (const id of order) {
    const es = earliestStart.get(id)!
    const ef = earliestFinish.get(id)!
    const ls = latestStart.get(id)!
    const lf = latestFinish.get(id)!
    const float = ls - es
    const isCritical = float === 0
    schedule.set(id, {
      id,
      earliestStart: es,
      earliestFinish: ef,
      latestStart: ls,
      latestFinish: lf,
      float,
      isCritical,
    })
    if (isCritical) criticalPath.push(id)
  }

  return { schedule, criticalPath, projectDurationMinutes }
}
