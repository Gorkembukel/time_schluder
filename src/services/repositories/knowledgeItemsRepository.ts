import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  limit,
  onSnapshot,
  query,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { KnowledgeItem, KnowledgeItemType } from '../../types/domain'

/** Tüm-bilgi-birimi aboneliğinin üst sınırı (Spark plan okuma kotası, bkz. CLAUDE.md). Konular arası
 * arama bu tek abonelikten client-side filtrelenir (bkz. docs/decisions/0010). */
const ALL_KNOWLEDGE_ITEMS_FETCH_LIMIT = 500

function knowledgeItemsCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'knowledgeItems')
}

/**
 * Kullanıcının tüm bilgi birimlerine tek abonelik — konu görünümü kendi `topicId`'sine göre,
 * arama tüm listeye göre client-side filtreler. Yalnızca bir Konu Çalışma Ortamı sayfası
 * açıkken abone olunur (bkz. `useKnowledgeItems`), sürekli açık bir dinleyici değildir.
 */
export function subscribeAllKnowledgeItems(
  uid: string,
  onChange: (items: KnowledgeItem[]) => void,
): Unsubscribe {
  const q = query(knowledgeItemsCollectionRef(uid), limit(ALL_KNOWLEDGE_ITEMS_FETCH_LIMIT))
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as KnowledgeItem))
  })
}

export interface NewKnowledgeItemInput {
  type: KnowledgeItemType
  title: string
  body: string
  topicId: string
  sectionId?: string
  taskId?: string
  requirementId?: string
  isExperienceNote?: boolean
}

export async function createKnowledgeItem(
  uid: string,
  input: NewKnowledgeItemInput,
): Promise<void> {
  const now = new Date().toISOString()
  await addDoc(knowledgeItemsCollectionRef(uid), {
    ...input,
    createdAt: now,
    updatedAt: now,
  })
}

export type KnowledgeItemFieldsUpdate = Partial<
  Pick<KnowledgeItem, 'type' | 'title' | 'body' | 'isExperienceNote'>
> & {
  /** `''` verilirse bölüm ataması kaldırılır (belgeden silinir), bkz. docs/decisions/0013. */
  sectionId?: string
}

export async function updateKnowledgeItem(
  uid: string,
  itemId: string,
  fields: KnowledgeItemFieldsUpdate,
): Promise<void> {
  const { sectionId, ...rest } = fields
  await updateDoc(doc(db, 'users', uid, 'knowledgeItems', itemId), {
    ...rest,
    ...(sectionId !== undefined && { sectionId: sectionId === '' ? deleteField() : sectionId }),
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteKnowledgeItem(uid: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'knowledgeItems', itemId))
}
