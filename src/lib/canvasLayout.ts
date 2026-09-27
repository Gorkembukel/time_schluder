import type { DateRange } from './dateRange'
import type { DependencyType, PlanningScale, Task } from '../types/domain'

/**
 * Görsel Planlama Kanvası'nın saf (side-effect'siz) yerleşim hesapları: tek, sürekli bir zaman
 * ekseninde (harita zoom'u gibi) yatay konum, çakışan kutucuklar için lane (satır) ataması,
 * zoom/pan sınırlama, ve sürükle-bağla bırakma noktasından FS/SS/FF/SF türü çıkarımı.
 * Bkz. `features/kanvas/PlanningCanvas.tsx`.
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

/** Verilen işlerin en erken başlangıcı ile en geç bitişini kapsayan aralık — kanvasın "dünyası". */
export function boundingRange(tasks: Task[]): DateRange | null {
  if (tasks.length === 0) return null
  let start = new Date(tasks[0].startAt)
  let end = new Date(tasks[0].endAt)
  for (const t of tasks) {
    const s = new Date(t.startAt)
    const e = new Date(t.endAt)
    if (s < start) start = s
    if (e > end) end = e
  }
  return { start, end }
}

/**
 * Harita tarzı zoom: imlecin altındaki an sabit kalacak şekilde görünür aralığın süresini
 * `factor` ile çarpar (1'den küçük = yakınlaş/zoom in, büyük = uzaklaş/zoom out). Süre
 * `minDurationMs`–`bounds` süresi arasında, aralık da `bounds` içinde kalacak şekilde kırpılır.
 */
export function zoomView(
  view: DateRange,
  cursorRatio: number,
  factor: number,
  minDurationMs: number,
  bounds: DateRange,
): DateRange {
  const boundsMs = bounds.end.getTime() - bounds.start.getTime()
  const cursorMs = view.start.getTime() + cursorRatio * (view.end.getTime() - view.start.getTime())
  const currentMs = view.end.getTime() - view.start.getTime()
  const nextMs = Math.min(Math.max(currentMs * factor, minDurationMs), boundsMs)
  let startMs = cursorMs - cursorRatio * nextMs
  startMs = Math.min(Math.max(startMs, bounds.start.getTime()), bounds.end.getTime() - nextMs)
  return { start: new Date(startMs), end: new Date(startMs + nextMs) }
}

/** Görünür aralığı `deltaMs` kadar kaydırır (pan), `bounds` dışına taşmayacak şekilde kırpılır. */
export function panView(view: DateRange, deltaMs: number, bounds: DateRange): DateRange {
  const durationMs = view.end.getTime() - view.start.getTime()
  const maxStartMs = bounds.end.getTime() - durationMs
  const startMs = Math.min(
    Math.max(view.start.getTime() + deltaMs, bounds.start.getTime()),
    Math.max(maxStartMs, bounds.start.getTime()),
  )
  return { start: new Date(startMs), end: new Date(startMs + durationMs) }
}

const HOURS_PER_DAY = 24
const HOUR_MS = 3_600_000
const DAY_MS = HOURS_PER_DAY * HOUR_MS

// Eşikler, bitişik ölçeklerin tipik sürelerinin (yıl3=1095g, yıl=365g, ay=30g, hafta=7g, gün=1g,
// saat=1g/24) geometrik ortalamasıdır — ör. yıl3 ve yıl arası √(1095×365)≈632g.
const YEAR3_THRESHOLD_DAYS = 632
const YEAR_THRESHOLD_DAYS = 104
const MONTH_THRESHOLD_DAYS = 14.5
const WEEK_THRESHOLD_DAYS = 2.6
const DAY_THRESHOLD_HOURS = 4.9

/**
 * Bir sürenin (ms) hangi 3 yıl/yıl/ay/hafta/gün/saat ölçeğine en yakın olduğunu çıkarır.
 * Görsel Planlama Kanvası'nda kilitlenen bir görevin ölçeğini, hangi kanvas derinliğinde
 * oluşturulduğundan bağımsız olarak, kendi süresinden belirler.
 */
export function inferScaleFromDuration(durationMs: number): PlanningScale {
  if (durationMs >= YEAR3_THRESHOLD_DAYS * DAY_MS) return 'year3'
  if (durationMs >= YEAR_THRESHOLD_DAYS * DAY_MS) return 'year'
  if (durationMs >= MONTH_THRESHOLD_DAYS * DAY_MS) return 'month'
  if (durationMs >= WEEK_THRESHOLD_DAYS * DAY_MS) return 'week'
  if (durationMs >= DAY_THRESHOLD_HOURS * HOUR_MS) return 'day'
  return 'hour'
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
