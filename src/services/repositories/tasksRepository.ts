import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import {
  TASK_STATUSES,
  type DetailLevel,
  type PlanningScale,
  type Task,
  type TaskDependency,
  type TaskStatus,
} from '../../types/domain'
import type { TaskChange } from '../../lib/planning-engine'

/** Tüm-görev abonelik/çekimlerinin üst sınırı (Spark plan okuma kotası, bkz. CLAUDE.md). */
const ALL_TASKS_FETCH_LIMIT = 1000

function tasksCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'tasks')
}

/**
 * Firestore belgesini `Task`'a çevirir. Eski sürümde elle seçilen `delayed` durumu artık
 * iş akışı durumu değil (tarihten hesaplanan işaret) — okurken `planned`'a normalize edilir.
 */
function toTask(id: string, data: Record<string, unknown>): Task {
  const status = TASK_STATUSES.includes(data.status as TaskStatus)
    ? (data.status as TaskStatus)
    : 'planned'
  return { id, ...data, status } as Task
}

/** Belirli bir tarih aralığındaki (startAt bazlı) görevlere abone olur — gün/hafta/ay görünümleri için. */
export function subscribeTasksInRange(
  uid: string,
  rangeStartIso: string,
  rangeEndIso: string,
  onChange: (tasks: Task[]) => void,
): Unsubscribe {
  const q = query(
    tasksCollectionRef(uid),
    where('startAt', '>=', rangeStartIso),
    where('startAt', '<', rangeEndIso),
    orderBy('startAt'),
  )
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((d) => toTask(d.id, d.data())))
  })
}

/** Tüm görevlere tek abonelik — hiyerarşi (parent link), pano ve hayat alanı roll-up'ı için tek kaynak. */
export function subscribeAllTasks(uid: string, onChange: (tasks: Task[]) => void): Unsubscribe {
  const q = query(tasksCollectionRef(uid), limit(ALL_TASKS_FETCH_LIMIT))
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((d) => toTask(d.id, d.data())))
  })
}

/** Bağımlılık düzenleme ve recalculate/swap önerileri için tüm görevlerin tek seferlik anlık görüntüsü. */
export async function fetchAllTasks(uid: string): Promise<Task[]> {
  const q = query(tasksCollectionRef(uid), limit(ALL_TASKS_FETCH_LIMIT))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => toTask(d.id, d.data()))
}

export interface NewTaskInput {
  title: string
  scale: PlanningScale
  startAt: string
  endAt: string
  parentTaskId?: string
  lifeAreaId?: string
  requirementId?: string
  bufferMinutes: number
  detailLevel: DetailLevel
  dependencies?: TaskDependency[]
}

export async function createTask(uid: string, input: NewTaskInput): Promise<void> {
  await addDoc(tasksCollectionRef(uid), {
    ...input,
    status: 'planned' satisfies TaskStatus,
    dependencies: input.dependencies ?? [],
  })
}

export async function updateTaskStatus(
  uid: string,
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'tasks', taskId), { status })
}

export type TaskFieldsUpdate = Partial<
  Pick<Task, 'title' | 'startAt' | 'endAt' | 'parentTaskId' | 'lifeAreaId' | 'requirementId'>
> & { actualMinutes?: number | '' }

/** Başlık/tarih/hiyerarşi alanlarını günceller. `undefined` alan dokunulmadan kalır; boş string (`''`) verilen bağlantı alanı (ör. parentTaskId) belgeden silinir. */
export async function updateTaskFields(
  uid: string,
  taskId: string,
  fields: TaskFieldsUpdate,
): Promise<void> {
  const payload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    payload[key] = value === '' ? deleteField() : value
  }
  await updateDoc(doc(db, 'users', uid, 'tasks', taskId), payload)
}

export async function updateTaskDependencies(
  uid: string,
  taskId: string,
  dependencies: TaskDependency[],
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'tasks', taskId), { dependencies })
}

/** recalculate.ts / swap.ts'ten dönen değişiklik önerilerini tek batch ile Firestore'a uygular. */
export async function applyTaskChanges(uid: string, changes: TaskChange[]): Promise<void> {
  if (changes.length === 0) return
  const batch = writeBatch(db)
  for (const change of changes) {
    batch.update(doc(db, 'users', uid, 'tasks', change.taskId), {
      startAt: change.newStartAt,
      endAt: change.newEndAt,
    })
  }
  await batch.commit()
}

export async function deleteTask(uid: string, taskId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'tasks', taskId))
}

/** Silinen bir göreve referans veren `dependencies` girdilerini diğer görevlerden temizler. */
export async function stripDependencyReferences(
  uid: string,
  tasks: Task[],
  removedTaskId: string,
): Promise<string[]> {
  const affected = tasks.filter((t) => t.dependencies.some((dep) => dep.taskId === removedTaskId))
  if (affected.length === 0) return []

  const batch = writeBatch(db)
  for (const t of affected) {
    batch.update(doc(db, 'users', uid, 'tasks', t.id), {
      dependencies: t.dependencies.filter((dep) => dep.taskId !== removedTaskId),
    })
  }
  await batch.commit()
  return affected.map((t) => t.id)
}
