import {
  addDoc,
  arrayRemove,
  collection,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Topic } from '../../types/domain'

function topicsCollectionRef(uid: string, areaId: string) {
  return collection(db, 'users', uid, 'lifeAreas', areaId, 'topics')
}

export function subscribeTopics(
  uid: string,
  areaId: string,
  onChange: (topics: Topic[]) => void,
): Unsubscribe {
  if (!areaId) {
    onChange([])
    return () => {}
  }
  const q = query(topicsCollectionRef(uid, areaId), orderBy('createdAt'))
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Topic))
  })
}

export async function createTopic(
  uid: string,
  areaId: string,
  name: string,
  description?: string,
): Promise<void> {
  const now = new Date().toISOString()
  await addDoc(topicsCollectionRef(uid, areaId), {
    lifeAreaId: areaId,
    name,
    description: description || undefined,
    createdAt: now,
    updatedAt: now,
  })
}

export async function renameTopic(
  uid: string,
  areaId: string,
  topicId: string,
  name: string,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'lifeAreas', areaId, 'topics', topicId), {
    name,
    updatedAt: new Date().toISOString(),
  })
}

export async function updateTopicDescription(
  uid: string,
  areaId: string,
  topicId: string,
  description: string,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'lifeAreas', areaId, 'topics', topicId), {
    description: description || undefined,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Konuyu, altındaki bilgi birimlerini ve konuya olan referansları (gereklilik/iş) tek batch ile
 * temizler — bkz. docs/decisions/0009 "Sonuçlar". `Task.topicIds` bir dizi olduğu için
 * `arrayRemove` ile yalnızca bu konunun id'si çıkarılır, işin kendisi silinmez.
 */
export async function deleteTopic(uid: string, areaId: string, topicId: string): Promise<void> {
  const [knowledgeItemsSnap, requirementsSnap, taggedTasksSnap] = await Promise.all([
    getDocs(query(collection(db, 'users', uid, 'knowledgeItems'), where('topicId', '==', topicId))),
    getDocs(
      query(
        collection(db, 'users', uid, 'lifeAreas', areaId, 'requirements'),
        where('topicId', '==', topicId),
      ),
    ),
    getDocs(query(collection(db, 'users', uid, 'tasks'), where('topicIds', 'array-contains', topicId))),
  ])

  const batch = writeBatch(db)
  for (const d of knowledgeItemsSnap.docs) batch.delete(d.ref)
  for (const d of requirementsSnap.docs) batch.update(d.ref, { topicId: deleteField() })
  for (const d of taggedTasksSnap.docs) batch.update(d.ref, { topicIds: arrayRemove(topicId) })
  batch.delete(doc(db, 'users', uid, 'lifeAreas', areaId, 'topics', topicId))
  await batch.commit()
}
