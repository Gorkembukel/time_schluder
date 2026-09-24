import type { DependencyType } from '../../types/domain'

/**
 * Bağımlılık grafiğinin kendi hafif veri modeli — Firestore'daki `Task`/
 * `TaskDependency`'den (bkz. types/domain.ts) bilinçli olarak ayrı tutulur.
 * Süre "dakika" cinsinden görecelidir (proje başlangıcına göre değil), bu
 * yüzden modül sabit örnek graflarla, takvim/tarih olmadan test edilebilir.
 * Gerçek görev tarihleriyle dönüşüm ileride `recalculate.ts`'in işi olacak.
 */
export interface GraphNode {
  id: string
  durationMinutes: number
}

export interface GraphEdge {
  /** Öncül görev id'si (bağımlılığın kaynağı) */
  from: string
  /** Ardıl görev id'si (bağımlılığın hedefi) */
  to: string
  type: DependencyType
  lagMinutes: number
}

export interface DependencyGraph {
  nodes: Map<string, GraphNode>
  /** Her düğümün gelen (predecessor) kenarları */
  incoming: Map<string, GraphEdge[]>
  /** Her düğümün giden (successor) kenarları */
  outgoing: Map<string, GraphEdge[]>
}

export interface CycleCheckResult {
  hasCycle: boolean
  /** Döngüyü oluşturan görev id'leri, sırasıyla (varsa) */
  cycle: string[]
}

export interface TopologicalSortResult {
  /** Tüm düğümler, bağımlılık sırasına göre düzleştirilmiş */
  order: string[]
  /** Aynı anda / paralel yürütülebilecek düğüm grupları, sırayla */
  levels: string[][]
}

export interface TaskSchedule {
  id: string
  earliestStart: number
  earliestFinish: number
  latestStart: number
  latestFinish: number
  /** Serbest bolluk (float) — 0 ise görev kritik yoldadır */
  float: number
  isCritical: boolean
}

export interface CriticalPathResult {
  schedule: Map<string, TaskSchedule>
  /** Kritik yoldaki görev id'leri, topolojik sırada */
  criticalPath: string[]
  /** Projenin toplam süresi (dakika) */
  projectDurationMinutes: number
}
