import { buildGraph } from './dependencyGraph'
import type { GraphEdge, GraphNode } from './types'
import type { DependencyType, Task } from '../../types/domain'

const MS_PER_MINUTE = 60_000

function toMinutes(date: Date): number {
  return date.getTime() / MS_PER_MINUTE
}

function fromMinutes(minutes: number): string {
  return new Date(minutes * MS_PER_MINUTE).toISOString()
}

function checkConstraint(
  predStart: number,
  predEnd: number,
  succStart: number,
  succEnd: number,
  type: DependencyType,
  lagMinutes: number,
): boolean {
  if (type === 'FS') return succStart >= predEnd + lagMinutes
  if (type === 'SS') return succStart >= predStart + lagMinutes
  if (type === 'FF') return succEnd >= predEnd + lagMinutes
  return succEnd >= predStart + lagMinutes // SF
}

const DEPENDENCY_LABELS: Record<DependencyType, string> = {
  FS: 'bitmeden başlamaz',
  SS: 'başlamadan başlamaz',
  FF: 'bitmeden bitemez',
  SF: 'başlamadan bitemez',
}

export interface TaskSwapChange {
  taskId: string
  newStartAt: string
  newEndAt: string
}

export interface SwapViolation {
  fromTaskId: string
  toTaskId: string
  type: DependencyType
  message: string
}

export interface SwapResult {
  changes: [TaskSwapChange, TaskSwapChange]
  violations: SwapViolation[]
  isValid: boolean
}

/**
 * İki görevin başlangıç zamanlarını yer değiştirir (her biri kendi süresini
 * korur). Sonucu otomatik uygulamaz — `violations` doluysa UI kullanıcıya
 * somut bir çözüm önerisiyle göstermeli (ör. "X'i de kaydır" ya da "bağımlılığı
 * gözden geçir"). "Aynı hafta içi" kısıtı bu fonksiyonun kapsamında değildir;
 * çağıran taraf (UI) hangi görevlerin swap adayı olarak sunulacağını seçer.
 * bkz. docs/decisions/0004-planlama-motoru.md.
 */
export function swapTasks(tasks: Task[], taskIdA: string, taskIdB: string): SwapResult {
  const taskA = tasks.find((t) => t.id === taskIdA)
  const taskB = tasks.find((t) => t.id === taskIdB)
  if (!taskA || !taskB) {
    throw new Error(`Bilinmeyen görev id'si: "${!taskA ? taskIdA : taskIdB}"`)
  }

  const durationA = toMinutes(new Date(taskA.endAt)) - toMinutes(new Date(taskA.startAt))
  const durationB = toMinutes(new Date(taskB.endAt)) - toMinutes(new Date(taskB.startAt))
  const originalStartA = toMinutes(new Date(taskA.startAt))
  const originalStartB = toMinutes(new Date(taskB.startAt))

  const newStartA = originalStartB
  const newStartB = originalStartA
  const newEndA = newStartA + durationA
  const newEndB = newStartB + durationB

  const swappedStart = new Map<string, number>([
    [taskIdA, newStartA],
    [taskIdB, newStartB],
  ])
  const swappedEnd = new Map<string, number>([
    [taskIdA, newEndA],
    [taskIdB, newEndB],
  ])

  function dateOf(taskId: string, kind: 'start' | 'end'): number {
    if (swappedStart.has(taskId)) {
      return kind === 'start' ? swappedStart.get(taskId)! : swappedEnd.get(taskId)!
    }
    const task = tasks.find((t) => t.id === taskId)!
    return toMinutes(new Date(kind === 'start' ? task.startAt : task.endAt))
  }

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
  // Sadece doğrulama amaçlı: edge'ler bilinmeyen bir görev id'sine referans veriyorsa burada hata fırlatılır.
  buildGraph(nodes, edges)

  const touchedEdges = edges.filter(
    (e) => e.from === taskIdA || e.from === taskIdB || e.to === taskIdA || e.to === taskIdB,
  )

  const violations: SwapViolation[] = []
  for (const edge of touchedEdges) {
    const ok = checkConstraint(
      dateOf(edge.from, 'start'),
      dateOf(edge.from, 'end'),
      dateOf(edge.to, 'start'),
      dateOf(edge.to, 'end'),
      edge.type,
      edge.lagMinutes,
    )
    if (!ok) {
      const fromTitle = tasks.find((t) => t.id === edge.from)?.title ?? edge.from
      const toTitle = tasks.find((t) => t.id === edge.to)?.title ?? edge.to
      violations.push({
        fromTaskId: edge.from,
        toTaskId: edge.to,
        type: edge.type,
        message: `"${fromTitle}" ${DEPENDENCY_LABELS[edge.type]} "${toTitle}" (${edge.type}) — bu takas sonrası sağlanmıyor. "${toTitle}" görevini de kaydırmayı ya da bağımlılığı gözden geçirmeyi düşün.`,
      })
    }
  }

  return {
    changes: [
      { taskId: taskIdA, newStartAt: fromMinutes(newStartA), newEndAt: fromMinutes(newEndA) },
      { taskId: taskIdB, newStartAt: fromMinutes(newStartB), newEndAt: fromMinutes(newEndB) },
    ],
    violations,
    isValid: violations.length === 0,
  }
}
