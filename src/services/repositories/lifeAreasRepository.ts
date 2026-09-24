import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { LifeArea, LifeAreaPriority } from '../../types/domain'

function lifeAreasCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'lifeAreas')
}

export function subscribeLifeAreas(
  uid: string,
  onChange: (areas: LifeArea[]) => void,
): Unsubscribe {
  const q = query(lifeAreasCollectionRef(uid), orderBy('order'))
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as LifeArea))
  })
}

export async function createLifeArea(uid: string, name: string, order: number): Promise<void> {
  const now = new Date().toISOString()
  await addDoc(lifeAreasCollectionRef(uid), { name, order, createdAt: now, updatedAt: now })
}

export async function renameLifeArea(uid: string, areaId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'lifeAreas', areaId), {
    name,
    updatedAt: new Date().toISOString(),
  })
}

export async function updateLifeAreaPriority(
  uid: string,
  areaId: string,
  priority: LifeAreaPriority,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'lifeAreas', areaId), {
    priority,
    updatedAt: new Date().toISOString(),
  })
}

/** Alanı ve altındaki tüm gereklilikleri tek batch ile siler (Firestore alt koleksiyonları otomatik silmez). */
export async function deleteLifeArea(uid: string, areaId: string): Promise<void> {
  const requirementsCol = collection(db, 'users', uid, 'lifeAreas', areaId, 'requirements')
  const requirementsSnap = await getDocs(requirementsCol)

  const batch = writeBatch(db)
  for (const reqDoc of requirementsSnap.docs) {
    batch.delete(reqDoc.ref)
  }
  batch.delete(doc(db, 'users', uid, 'lifeAreas', areaId))
  await batch.commit()
}
