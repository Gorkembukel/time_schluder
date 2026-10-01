import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import { DEFAULT_TOPIC_TEMPLATES } from '../../config/topic-templates'
import type { TopicSection, TopicTemplate } from '../../types/domain'

function topicTemplatesCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'topicTemplates')
}

function seedMarkerRef(uid: string) {
  return doc(db, 'users', uid, 'meta', 'topicTemplatesSeeded')
}

/** `seedDefaultFinanceCategoriesIfMissing` ile aynı desen — bkz. financeCategoriesRepository.ts. */
export async function seedDefaultTopicTemplatesIfMissing(uid: string): Promise<void> {
  const alreadySeeded = await runTransaction(db, async (tx) => {
    const markerSnap = await tx.get(seedMarkerRef(uid))
    if (markerSnap.exists()) return true
    tx.set(seedMarkerRef(uid), { seededAt: new Date().toISOString() })
    return false
  })
  if (alreadySeeded) return

  const colRef = topicTemplatesCollectionRef(uid)
  const batch = writeBatch(db)
  for (const template of DEFAULT_TOPIC_TEMPLATES) {
    batch.set(doc(colRef), template)
  }
  await batch.commit()
}

export function subscribeTopicTemplates(
  uid: string,
  onChange: (templates: TopicTemplate[]) => void,
): Unsubscribe {
  return onSnapshot(topicTemplatesCollectionRef(uid), (snapshot) => {
    onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TopicTemplate))
  })
}

/** "Yeni şablon olarak kaydet" — bir konunun düzenlenmiş bölüm yapısını özel bir şablona kopyalar. */
export async function createTopicTemplateFromSections(
  uid: string,
  name: string,
  sections: TopicSection[],
): Promise<void> {
  const template: Omit<TopicTemplate, 'id'> = {
    name,
    isBuiltIn: false,
    sections: sections.map(({ title, order }) => ({ title, order })),
  }
  await addDoc(topicTemplatesCollectionRef(uid), template)
}

export async function deleteTopicTemplate(uid: string, templateId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'topicTemplates', templateId))
}
