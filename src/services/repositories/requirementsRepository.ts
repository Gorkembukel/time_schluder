import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Requirement, RequirementType } from '../../types/domain'

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
