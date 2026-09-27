import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase'
import type { CanvasDraft } from '../../types/domain'

const EMPTY_DRAFT: CanvasDraft = { pool: [], nodes: [], edges: [] }

/**
 * Görsel Planlama Kanvası'nın taslak katmanı: henüz bir tarihe kilitlenmemiş (gerçek bir Task'a
 * dönüşmemiş) havuz öğeleri, yerleştirilmiş düğümler ve aralarındaki bağlantılar. Bir hayat
 * alanının kökü için `contextId` = alanın id'si; bir işin alt-kanvası için `contextId` = o işin id'si.
 * Tek belge olarak tutulur (küçük, seyrek yazılır) — Spark plan okuma/yazma kotasına uygun.
 */
function draftDocRef(uid: string, contextId: string) {
  return doc(db, 'users', uid, 'canvasDrafts', contextId)
}

export function subscribeCanvasDraft(
  uid: string,
  contextId: string,
  onChange: (draft: CanvasDraft) => void,
): Unsubscribe {
  return onSnapshot(draftDocRef(uid, contextId), (snapshot) => {
    onChange(snapshot.exists() ? (snapshot.data() as CanvasDraft) : EMPTY_DRAFT)
  })
}

export async function saveCanvasDraft(
  uid: string,
  contextId: string,
  draft: CanvasDraft,
): Promise<void> {
  await setDoc(draftDocRef(uid, contextId), draft)
}
