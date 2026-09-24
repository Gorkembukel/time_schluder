import {
  addDoc,
  collection,
  deleteDoc,
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
import type { DetailLevel, PlanningScale, Task, TaskDependency, TaskStatus } from '../../types/domain'
import type { TaskChange } from '../../lib/planning-engine'

/** recalculate.ts'in bağımlılık zincirini tam olarak görebilmesi için tek seferlik tüm-görev çekimi. */
const ALL_TASKS_FETCH_LIMIT = 1000

function tasksCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'tasks')
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
    onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Task))
  })
}

/** Bağımlılık düzenleme ve recalculate/swap önerileri için tüm görevlerin tek seferlik anlık görüntüsü. */
export async function fetchAllTasks(uid: string): Promise<Task[]> {
  const q = query(tasksCollectionRef(uid), limit(ALL_TASKS_FETCH_LIMIT))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Task)
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
