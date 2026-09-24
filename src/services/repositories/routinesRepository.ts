import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Routine } from '../../types/domain'

/** Haftalık sabit program küçük bir listedir; sınır yalnızca kota güvenliği için. */
const ROUTINES_LIMIT = 200

function routinesCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'routines')
}

export function subscribeRoutines(
  uid: string,
  onChange: (routines: Routine[]) => void,
): Unsubscribe {
  const q = query(routinesCollectionRef(uid), limit(ROUTINES_LIMIT))
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Routine))
  })
}

export type NewRoutineInput = Omit<Routine, 'id' | 'createdAt'>

export async function createRoutine(uid: string, input: NewRoutineInput): Promise<void> {
  await addDoc(routinesCollectionRef(uid), { ...input, createdAt: new Date().toISOString() })
}

export async function deleteRoutine(uid: string, routineId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'routines', routineId))
}
