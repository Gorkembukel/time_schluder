import type { DateRange } from './dateRange'
import { finerScale, scalePeriodRange } from './planning-engine'
import type { DependencyType, PlanningScale, Task } from '../types/domain'

/**
 * Görsel Planlama Kanvası'nın saf (side-effect'siz) yerleşim hesapları: zaman → yatay konum,
 * çakışan kutucuklar için lane (satır) ataması, ve sürükle-bağla bırakma noktasından
 * FS/SS/FF/SF türü çıkarımı. Bkz. `PlanningCanvas.tsx`.
 */

/** Bir tarihin, verilen periyot içindeki 0..1 aralığındaki oransal konumu. Periyot dışına taşarsa kırpılır. */
export function timeRatio(date: Date, period: DateRange): number {
  const total = period.end.getTime() - period.start.getTime()
  if (total <= 0) return 0
  const ratio = (date.getTime() - period.start.getTime()) / total
  return Math.min(1, Math.max(0, ratio))
}

export interface CanvasNode {
  task: Task
  /** 0..1, periyodun soluna göre. */
  left: number
  /** 0..1, periyot genişliğine göre. */
  width: number
  /** Çakışmayı önlemek için atanan satır (0'dan başlar). */
  lane: number
}

const MIN_NODE_WIDTH_RATIO = 0.01

/**
 * Zaman ekseninde çakışan kutucukları farklı lane'lere yerleştirir (Gantt tarzı), böylece
 * üst üste binmezler. Başlangıç zamanına göre sırayla, ilk uygun (bitmiş) lane'e yerleştirir.
 */
export function layoutNodes(tasks: Task[], period: DateRange): CanvasNode[] {
  const sorted = [...tasks].sort((a, b) => a.startAt.localeCompare(b.startAt))
  const laneEndsMs: number[] = []
  const nodes: CanvasNode[] = []

  for (const task of sorted) {
    const start = new Date(task.startAt)
    const end = new Date(task.endAt)
    let lane = laneEndsMs.findIndex((endMs) => endMs <= start.getTime())
    if (lane === -1) {
      lane = laneEndsMs.length
      laneEndsMs.push(end.getTime())
    } else {
      laneEndsMs[lane] = end.getTime()
    }
    const left = timeRatio(start, period)
    nodes.push({
      task,
      left,
      width: Math.max(timeRatio(end, period) - left, MIN_NODE_WIDTH_RATIO),
      lane,
    })
  }
  return nodes
}

/** Bir ölçek bandının içindeki bir alt seviye sınırlarının (dashed çizgiler için) zaman listesi. */
export function subPeriodBoundaries(
  scale: PlanningScale,
  period: DateRange,
  weekStartsOn: number,
): Date[] {
  const finer = finerScale(scale)
  if (!finer) return []
  const boundaries: Date[] = []
  let cursor = period.start
  let guard = 0
  const GUARD_LIMIT = 1000
  while (cursor < period.end && guard < GUARD_LIMIT) {
    const sub = scalePeriodRange(finer, cursor, weekStartsOn)
    boundaries.push(sub.start)
    if (sub.end <= cursor) break
    cursor = sub.end
    guard += 1
  }
  return boundaries
}

export type EdgeSide = 'start' | 'end'

/** Sürükle-bağla bırakma noktasının hangi kenarlardan olduğuna göre bağımlılık türünü çıkarır. */
export function inferDependencyType(fromSide: EdgeSide, toSide: EdgeSide): DependencyType {
  if (fromSide === 'end' && toSide === 'start') return 'FS'
  if (fromSide === 'start' && toSide === 'start') return 'SS'
  if (fromSide === 'end' && toSide === 'end') return 'FF'
  return 'SF'
}

/** Bir bağımlılık türünün görsel olarak hangi kenardan hangi kenara çizileceği (inferDependencyType'ın tersi). */
export function dependencyEdgeSides(type: DependencyType): {
  fromSide: EdgeSide
  toSide: EdgeSide
} {
  switch (type) {
    case 'FS':
      return { fromSide: 'end', toSide: 'start' }
    case 'SS':
      return { fromSide: 'start', toSide: 'start' }
    case 'FF':
      return { fromSide: 'end', toSide: 'end' }
    case 'SF':
      return { fromSide: 'start', toSide: 'end' }
  }
}
