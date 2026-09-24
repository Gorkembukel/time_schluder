import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { DetailLevel, PlanningScale, Task, TaskDependency, TaskStatus } from '../../types/domain'

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

export interface NewTaskInput {
  title: string
  scale: PlanningScale
  startAt: string
  endAt: string
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

export async function deleteTask(uid: string, taskId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'tasks', taskId))
}
