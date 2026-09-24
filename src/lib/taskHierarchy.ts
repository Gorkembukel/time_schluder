import type { PlanningScale, Task } from '../types/domain'
import type { DateRange } from './dateRange'
import { scalePeriodRange } from './planning-engine/scales'

/**
 * Görev hiyerarşisi (parent link) yardımcıları — Hayat Alanı (Initiative) → 3 Yıl/Yıl (Epic)
 * → Ay (Story) → Hafta/Gün (Task) zinciri. Tüm fonksiyonlar saf; girdi olarak tek kaynak
 * görev listesini (tasksStore) alır. Bkz. .claude/personas/jira-developer.md.
 */

export type TaskIndex = Map<string, Task>

export function indexTasks(tasks: Task[]): TaskIndex {
  return new Map(tasks.map((t) => [t.id, t]))
}

/** Ebeveynden köke doğru ata zinciri (en yakın ebeveyn ilk). Döngüye karşı korumalıdır. */
export function ancestorsOf(task: Task, index: TaskIndex): Task[] {
  const chain: Task[] = []
  const seen = new Set<string>([task.id])
  let parentId = task.parentTaskId
  while (parentId && !seen.has(parentId)) {
    const parent = index.get(parentId)
    if (!parent) break
    chain.push(parent)
    seen.add(parent.id)
    parentId = parent.parentTaskId
  }
  return chain
}

/** Görevin kendisinde yoksa en yakın atadan devralınan hayat alanı. */
export function effectiveLifeAreaId(task: Task, index: TaskIndex): string | undefined {
  if (task.lifeAreaId) return task.lifeAreaId
  return ancestorsOf(task, index).find((a) => a.lifeAreaId)?.lifeAreaId
}

/** Görevin kendisinde yoksa en yakın atadan devralınan gereklilik bağlantısı. */
export function effectiveRequirementId(task: Task, index: TaskIndex): string | undefined {
  if (task.requirementId) return task.requirementId
  return ancestorsOf(task, index).find((a) => a.requirementId)?.requirementId
}

export function childrenIndex(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>()
  for (const t of tasks) {
    if (!t.parentTaskId) continue
    const list = map.get(t.parentTaskId) ?? []
    list.push(t)
    map.set(t.parentTaskId, list)
  }
  return map
}

/**
 * İlerleme oranı (0–1), alttan üste toplanır (roll-up). Yaprak iş: tamamlandıysa 1, değilse 0.
 * Alt işi olan iş: alt işlerin ortalaması (Jira'daki "done issues / total" mantığının ağırlıksız hâli).
 */
export function rollupProgress(
  task: Task,
  children: Map<string, Task[]>,
  seen: Set<string> = new Set(),
): number {
  const kids = children.get(task.id) ?? []
  if (kids.length === 0 || seen.has(task.id)) return task.status === 'done' ? 1 : 0
  seen.add(task.id)
  const total = kids.reduce((sum, child) => sum + rollupProgress(child, children, seen), 0)
  seen.delete(task.id)
  return total / kids.length
}

/** Bitiş tarihi geçmiş ve tamamlanmamış iş — "Gecikti" işareti (durum değil). */
export function isOverdue(task: Task, now: Date): boolean {
  return task.status !== 'done' && new Date(task.endAt) < now
}

/** `[task.startAt, task.endAt)` ile `[start, end)` kesişiyor mu. */
export function overlapsRange(task: Task, start: Date, end: Date): boolean {
  return new Date(task.startAt) < end && new Date(task.endAt) > start
}

/**
 * Bir ebeveynin altına eklenecek alt iş için varsayılan aralık: alt ölçeğin, `now`'ı (ebeveyn
 * aralığına sıkıştırılmış) içeren tek dönemi, ebeveyn sınırlarına kırpılmış. Ör. 3 Yıl hedefine
 * eklenen yıllık iş varsayılan olarak 3 yıla değil içinde bulunulan yıla yayılır. `[start, end)`.
 */
export function defaultChildRange(
  parent: Task,
  childScale: PlanningScale,
  now: Date,
  weekStartsOn: number,
): DateRange {
  const parentStart = new Date(parent.startAt)
  const parentEnd = new Date(parent.endAt)
  const reference =
    now < parentStart ? parentStart : now >= parentEnd ? new Date(parentEnd.getTime() - 1) : now
  const period = scalePeriodRange(childScale, reference, weekStartsOn)
  return {
    start: period.start < parentStart ? parentStart : period.start,
    end: period.end > parentEnd ? parentEnd : period.end,
  }
}
