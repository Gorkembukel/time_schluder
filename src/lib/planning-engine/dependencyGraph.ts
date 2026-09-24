import type { CycleCheckResult, DependencyGraph, GraphEdge, GraphNode, TopologicalSortResult } from './types'

export function buildGraph(nodes: GraphNode[], edges: GraphEdge[]): DependencyGraph {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const incoming = new Map<string, GraphEdge[]>()
  const outgoing = new Map<string, GraphEdge[]>()

  for (const node of nodes) {
    incoming.set(node.id, [])
    outgoing.set(node.id, [])
  }

  for (const edge of edges) {
    if (!nodeMap.has(edge.from)) {
      throw new Error(`Bilinmeyen görev id'si (kenar kaynağı): "${edge.from}"`)
    }
    if (!nodeMap.has(edge.to)) {
      throw new Error(`Bilinmeyen görev id'si (kenar hedefi): "${edge.to}"`)
    }
    outgoing.get(edge.from)?.push(edge)
    incoming.get(edge.to)?.push(edge)
  }

  return { nodes: nodeMap, incoming, outgoing }
}

const UNVISITED = 0
const IN_PROGRESS = 1
const DONE = 2

/** DFS tabanlı (beyaz/gri/siyah) döngü tespiti — bkz. docs/decisions/0004-planlama-motoru.md. */
export function detectCycle(graph: DependencyGraph): CycleCheckResult {
  const color = new Map<string, number>()
  for (const id of graph.nodes.keys()) color.set(id, UNVISITED)
  const stack: string[] = []

  function visit(id: string): string[] | null {
    color.set(id, IN_PROGRESS)
    stack.push(id)
    for (const edge of graph.outgoing.get(id) ?? []) {
      const nextColor = color.get(edge.to)
      if (nextColor === IN_PROGRESS) {
        const cycleStart = stack.indexOf(edge.to)
        return [...stack.slice(cycleStart), edge.to]
      }
      if (nextColor === UNVISITED) {
        const found = visit(edge.to)
        if (found) return found
      }
    }
    stack.pop()
    color.set(id, DONE)
    return null
  }

  for (const id of graph.nodes.keys()) {
    if (color.get(id) === UNVISITED) {
      const found = visit(id)
      if (found) return { hasCycle: true, cycle: found }
    }
  }
  return { hasCycle: false, cycle: [] }
}

/**
 * Kahn algoritması, BFS katmanları halinde — her katman aynı anda başlanabilecek
 * (aralarında doğrudan/dolaylı bağımlılık olmayan) görevleri temsil eder. Bu,
 * bağımlılık türünün (FS/SS/FF/SF) tam zamanlamasını değil, yalnızca grafik
 * yapısını dikkate alan basitleştirilmiş bir paralellik ipucudur — kesin
 * zamanlama için bkz. `computeCriticalPath`.
 */
export function topologicalSort(graph: DependencyGraph): TopologicalSortResult {
  const remainingInDegree = new Map<string, number>()
  for (const id of graph.nodes.keys()) {
    remainingInDegree.set(id, (graph.incoming.get(id) ?? []).length)
  }

  const levels: string[][] = []
  const order: string[] = []
  let frontier = [...graph.nodes.keys()].filter((id) => remainingInDegree.get(id) === 0)

  while (frontier.length > 0) {
    levels.push(frontier)
    order.push(...frontier)
    const nextFrontier: string[] = []
    for (const id of frontier) {
      for (const edge of graph.outgoing.get(id) ?? []) {
        const remaining = (remainingInDegree.get(edge.to) ?? 0) - 1
        remainingInDegree.set(edge.to, remaining)
        if (remaining === 0) nextFrontier.push(edge.to)
      }
    }
    frontier = nextFrontier
  }

  if (order.length !== graph.nodes.size) {
    throw new Error(
      'Grafik döngü içeriyor, topolojik sıralama yapılamaz. Önce detectCycle ile kontrol edin.',
    )
  }

  return { order, levels }
}
