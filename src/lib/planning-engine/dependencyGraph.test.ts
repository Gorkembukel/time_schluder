import { describe, expect, it } from 'vitest'
import { buildGraph, detectCycle, topologicalSort } from './dependencyGraph'
import type { GraphEdge, GraphNode } from './types'

function node(id: string, durationMinutes = 60): GraphNode {
  return { id, durationMinutes }
}

function edge(from: string, to: string, type: GraphEdge['type'] = 'FS', lagMinutes = 0): GraphEdge {
  return { from, to, type, lagMinutes }
}

describe('buildGraph', () => {
  it('bilinmeyen kaynak/hedef id için hata fırlatır', () => {
    const nodes = [node('a')]
    expect(() => buildGraph(nodes, [edge('a', 'b')])).toThrow(/hedef/)
    expect(() => buildGraph(nodes, [edge('x', 'a')])).toThrow(/kaynağı/)
  })
})

describe('detectCycle', () => {
  it('döngüsüz bir zincirde döngü bulmaz', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const graph = buildGraph(nodes, [edge('a', 'b'), edge('b', 'c')])
    expect(detectCycle(graph)).toEqual({ hasCycle: false, cycle: [] })
  })

  it('basit bir döngüyü (A→B→C→A) tespit eder', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const graph = buildGraph(nodes, [edge('a', 'b'), edge('b', 'c'), edge('c', 'a')])
    const result = detectCycle(graph)
    expect(result.hasCycle).toBe(true)
    expect(result.cycle).toEqual(['a', 'b', 'c', 'a'])
  })

  it('kendine bağımlılığı (A→A) döngü olarak tespit eder', () => {
    const nodes = [node('a')]
    const graph = buildGraph(nodes, [edge('a', 'a')])
    expect(detectCycle(graph).hasCycle).toBe(true)
  })
})

describe('topologicalSort', () => {
  it('doğrusal bir zinciri doğru sırayla döner', () => {
    const nodes = [node('c'), node('a'), node('b')]
    const graph = buildGraph(nodes, [edge('a', 'b'), edge('b', 'c')])
    const { order } = topologicalSort(graph)
    expect(order).toEqual(['a', 'b', 'c'])
  })

  it('elmas şeklindeki grafikte paralel seviyeleri doğru gruplar', () => {
    // a → b, a → c, b → d, c → d
    const nodes = [node('a'), node('b'), node('c'), node('d')]
    const graph = buildGraph(nodes, [
      edge('a', 'b'),
      edge('a', 'c'),
      edge('b', 'd'),
      edge('c', 'd'),
    ])
    const { levels } = topologicalSort(graph)
    expect(levels).toEqual([['a'], ['b', 'c'], ['d']])
  })

  it('döngü varsa hata fırlatır', () => {
    const nodes = [node('a'), node('b')]
    const graph = buildGraph(nodes, [edge('a', 'b'), edge('b', 'a')])
    expect(() => topologicalSort(graph)).toThrow(/döngü/)
  })
})
