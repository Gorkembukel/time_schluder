import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { KnowledgeItem, Requirement, RequirementStatus, RequirementType } from '../../types/domain'

function requirementsCollectionRef(uid: string, areaId: string) {
  return collection(db, 'users', uid, 'lifeAreas', areaId, 'requirements')
}

export function subscribeRequirements(
  uid: string,
  areaId: string,
  onChange: (requirements: Requirement[]) => void,
): Unsubscribe {
  if (!areaId) {
    onChange([])
    return () => {}
  }
  const q = query(requirementsCollectionRef(uid, areaId), orderBy('createdAt'))
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Requirement))
  })
}

export interface NewRequirementInput {
  name: string
  type: RequirementType
  targetMetric: number
  currentValue: number
  unit: string
  /** Üst gereklilik — verilirse bu, o gerekliliğin altında bir alt gereklilik olur. */
  parentRequirementId?: string
  /** Bu gerekliliğin bağlı olduğu konu (aynı hayat alanı içinde), opsiyonel. */
  topicId?: string
  status?: RequirementStatus
  estimatedCost?: number
  sourceUrl?: string
}

export async function createRequirement(
  uid: string,
  areaId: string,
  input: NewRequirementInput,
): Promise<void> {
  const now = new Date().toISOString()
  await addDoc(requirementsCollectionRef(uid, areaId), {
    ...input,
    lifeAreaId: areaId,
    createdAt: now,
    updatedAt: now,
  })
}

export async function updateRequirementProgress(
  uid: string,
  areaId: string,
  requirementId: string,
  currentValue: number,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'lifeAreas', areaId, 'requirements', requirementId), {
    currentValue,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteRequirement(
  uid: string,
  areaId: string,
  requirementId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'lifeAreas', areaId, 'requirements', requirementId))
}

export interface RequirementDetailsUpdate {
  status?: RequirementStatus | ''
  estimatedCost?: number | ''
  sourceUrl?: string | ''
}

/** Envanter durumu/tahmini maliyet/kaynak link günceller — boş string (`''`) verilen alan belgeden silinir. */
export async function updateRequirementDetails(
  uid: string,
  areaId: string,
  requirementId: string,
  fields: RequirementDetailsUpdate,
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  for (const [key, value] of Object.entries(fields)) {
    payload[key] = value === '' ? deleteField() : value
  }
  await updateDoc(
    doc(db, 'users', uid, 'lifeAreas', areaId, 'requirements', requirementId),
    payload,
  )
}

export interface DerivedRequirementInput {
  name: string
  type: RequirementType
  targetMetric: number
  currentValue: number
  unit: string
  status?: RequirementStatus
  estimatedCost?: number
}

/**
 * Bir deneyim notundan tek adımda gereklilik türetir: yeni gerekliliği notun konusuna/alanına
 * bağlar (`originNoteId`) ve notun `derivedRequirementIds`'ine ekler — iki yönlü bağ, tek batch
 * (bkz. docs/decisions/0011).
 */
export async function deriveRequirementFromNote(
  uid: string,
  areaId: string,
  note: KnowledgeItem,
  input: DerivedRequirementInput,
): Promise<void> {
  const now = new Date().toISOString()
  const reqRef = doc(requirementsCollectionRef(uid, areaId))
  const batch = writeBatch(db)
  batch.set(reqRef, {
    ...input,
    lifeAreaId: areaId,
    topicId: note.topicId,
    originNoteId: note.id,
    createdAt: now,
    updatedAt: now,
  })
  batch.update(doc(db, 'users', uid, 'knowledgeItems', note.id), {
    derivedRequirementIds: arrayUnion(reqRef.id),
    updatedAt: now,
  })
  await batch.commit()
}
