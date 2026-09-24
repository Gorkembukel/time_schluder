import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { FinanceTransaction, FxSnapshot, NeedWant, TransactionType } from '../../types/domain'

/** Spark plan günlük okuma kotasını korumak için son N işlemle sınırlandırılır. */
const RECENT_TRANSACTIONS_LIMIT = 200

function transactionsCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'financeTransactions')
}

export function subscribeTransactions(
  uid: string,
  onChange: (transactions: FinanceTransaction[]) => void,
): Unsubscribe {
  const q = query(
    transactionsCollectionRef(uid),
    orderBy('date', 'desc'),
    limit(RECENT_TRANSACTIONS_LIMIT),
  )
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as FinanceTransaction))
  })
}

export interface NewTransactionInput {
  type: TransactionType
  amountTRY: number
  categoryId: string
  date: string
  description: string
  lifeAreaId?: string
  requirementId?: string
  needWant?: NeedWant
  fxSnapshot: FxSnapshot
}

export async function createTransaction(uid: string, input: NewTransactionInput): Promise<void> {
  await addDoc(transactionsCollectionRef(uid), input)
}

export async function deleteTransaction(uid: string, transactionId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'financeTransactions', transactionId))
}
