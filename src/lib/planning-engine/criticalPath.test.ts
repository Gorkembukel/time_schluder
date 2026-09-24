import { describe, expect, it } from 'vitest'
import { computeCriticalPath } from './criticalPath'
import type { GraphEdge, GraphNode } from './types'

function node(id: string, durationMinutes: number): GraphNode {
  return { id, durationMinutes }
}

function edge(from: string, to: string, type: GraphEdge['type'], lagMinutes = 0): GraphEdge {
  return { from, to, type, lagMinutes }
}

describe('computeCriticalPath', () => {
  it('klasik ders kitabı örneğinde kritik yolu ve süreleri doğru hesaplar', () => {
    // A→B→D→E (kritik) ve A→C→D (C'de 2 birim bolluk var)
    const nodes = [node('a', 3), node('b', 4), node('c', 2), node('d', 5), node('e', 1)]
    const edges = [
      edge('a', 'b', 'FS'),
      edge('a', 'c', 'FS'),
      edge('b', 'd', 'FS'),
      edge('c', 'd', 'FS'),
      edge('d', 'e', 'FS'),
    ]

    const result = computeCriticalPath(nodes, edges)

    expect(result.projectDurationMinutes).toBe(13)
    expect(result.criticalPath).toEqual(['a', 'b', 'd', 'e'])

    expect(result.schedule.get('a')).toMatchObject({ earliestStart: 0, earliestFinish: 3, float: 0 })
    expect(result.schedule.get('b')).toMatchObject({ earliestStart: 3, earliestFinish: 7, float: 0 })
    expect(result.schedule.get('c')).toMatchObject({ earliestStart: 3, earliestFinish: 5, float: 2 })
    expect(result.schedule.get('d')).toMatchObject({ earliestStart: 7, earliestFinish: 12, float: 0 })
    expect(result.schedule.get('e')).toMatchObject({ earliestStart: 12, earliestFinish: 13, float: 0 })
    expect(result.schedule.get('c')?.isCritical).toBe(false)
  })

  it('FS bağımlılığında pozitif lag süreyi geciktirir', () => {
    const nodes = [node('a', 2), node('b', 3)]
    const edges = [edge('a', 'b', 'FS', 5)]
    const result = computeCriticalPath(nodes, edges)
    expect(result.schedule.get('b')).toMatchObject({ earliestStart: 7, earliestFinish: 10 })
    expect(result.projectDurationMinutes).toBe(10)
    expect(result.criticalPath).toEqual(['a', 'b'])
  })

  it('SS (start-to-start) bağımlılığını doğru hesaplar', () => {
    // a -SS(1)-> b -FS(0)-> c
    const nodes = [node('a', 4), node('b', 2), node('c', 1)]
    const edges = [edge('a', 'b', 'SS', 1), edge('b', 'c', 'FS')]
    const result = computeCriticalPath(nodes, edges)
    expect(result.schedule.get('a')).toMatchObject({ earliestStart: 0, earliestFinish: 4, float: 0 })
    expect(result.schedule.get('b')).toMatchObject({ earliestStart: 1, earliestFinish: 3, float: 0 })
    expect(result.schedule.get('c')).toMatchObject({ earliestStart: 3, earliestFinish: 4, float: 0 })
    expect(result.projectDurationMinutes).toBe(4)
  })

  it('FF (finish-to-finish) bağımlılığını doğru hesaplar', () => {
    const nodes = [node('a', 3), node('b', 2)]
    const edges = [edge('a', 'b', 'FF', 2)]
    const result = computeCriticalPath(nodes, edges)
    expect(result.schedule.get('a')).toMatchObject({ earliestStart: 0, earliestFinish: 3, float: 0 })
    expect(result.schedule.get('b')).toMatchObject({ earliestStart: 3, earliestFinish: 5, float: 0 })
    expect(result.projectDurationMinutes).toBe(5)
  })

  it('SF (start-to-finish) bağımlılığını doğru hesaplar', () => {
    const nodes = [node('a', 2), node('b', 3)]
    const edges = [edge('a', 'b', 'SF', 4)]
    const result = computeCriticalPath(nodes, edges)
    expect(result.schedule.get('a')).toMatchObject({ earliestStart: 0, earliestFinish: 2, float: 0 })
    expect(result.schedule.get('b')).toMatchObject({ earliestStart: 1, earliestFinish: 4, float: 0 })
    expect(result.projectDurationMinutes).toBe(4)
  })

  it('döngü içeren grafikte hata fırlatır', () => {
    const nodes = [node('a', 1), node('b', 1)]
    const edges = [edge('a', 'b', 'FS'), edge('b', 'a', 'FS')]
    expect(() => computeCriticalPath(nodes, edges)).toThrow(/döngü/)
  })

  it('bağımsız (kenarsız) tek görev için tüm alanları 0/isCritical olarak hesaplar', () => {
    const nodes = [node('solo', 30)]
    const result = computeCriticalPath(nodes, [])
    expect(result.schedule.get('solo')).toMatchObject({
      earliestStart: 0,
      earliestFinish: 30,
      latestStart: 0,
      latestFinish: 30,
      float: 0,
      isCritical: true,
    })
    expect(result.projectDurationMinutes).toBe(30)
  })
})
