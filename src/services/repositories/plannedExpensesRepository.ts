import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { PlannedExpense, PlannedExpenseStatus } from '../../types/domain'

/** Spark plan günlük okuma kotasını korumak için son N kayıtla sınırlandırılır. */
const RECENT_PLANNED_EXPENSES_LIMIT = 200

function plannedExpensesCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'plannedExpenses')
}

/** `lifeAreaId` verilirse yalnızca o alana ait kayıtlara abone olunur (bkz. docs/decisions/0012). */
export function subscribePlannedExpenses(
  uid: string,
  onChange: (items: PlannedExpense[]) => void,
  lifeAreaId?: string,
): Unsubscribe {
  const q = lifeAreaId
    ? query(plannedExpensesCollectionRef(uid), where('lifeAreaId', '==', lifeAreaId))
    : query(
        plannedExpensesCollectionRef(uid),
        orderBy('createdAt', 'desc'),
        limit(RECENT_PLANNED_EXPENSES_LIMIT),
      )
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as PlannedExpense))
  })
}

export interface NewPlannedExpenseInput {
  requirementId: string
  lifeAreaId: string
  topicId?: string
  description: string
  estimatedAmountTRY: number
  plannedDate?: string
}

export async function createPlannedExpense(
  uid: string,
  input: NewPlannedExpenseInput,
): Promise<string> {
  const now = new Date().toISOString()
  const initialStatus: PlannedExpenseStatus = 'planlandi'
  const ref = await addDoc(plannedExpensesCollectionRef(uid), {
    ...input,
    status: initialStatus,
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function updatePlannedExpenseStatus(
  uid: string,
  id: string,
  status: PlannedExpenseStatus,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'plannedExpenses', id), {
    status,
    updatedAt: new Date().toISOString(),
  })
}

/** "Satın alındı" aksiyonu: planlı harcamayı gerçekleşmiş olarak işaretler ve işleme bağlar. */
export async function markPlannedExpensePurchased(
  uid: string,
  id: string,
  linkedTransactionId: string,
): Promise<void> {
  const purchasedStatus: PlannedExpenseStatus = 'gerceklesti'
  await updateDoc(doc(db, 'users', uid, 'plannedExpenses', id), {
    status: purchasedStatus,
    linkedTransactionId,
    updatedAt: new Date().toISOString(),
  })
}

export async function deletePlannedExpense(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'plannedExpenses', id))
}
