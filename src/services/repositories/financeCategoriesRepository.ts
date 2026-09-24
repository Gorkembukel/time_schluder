import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import { DEFAULT_FINANCE_CATEGORIES } from '../../config/finance-categories'
import type { FinanceCategory } from '../../types/domain'

function categoriesCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'financeCategories')
}

function seedMarkerRef(uid: string) {
  return doc(db, 'users', uid, 'meta', 'financeCategoriesSeeded')
}

/**
 * İlk girişte başlangıç kategori setini tek batch ile yazar. Seed hakkı bir
 * transaction ile "rezerve edilir" — StrictMode'un efekti iki kez çalıştırması
 * veya art arda yeniden bağlanmalar gibi durumlarda çift yazımı (yarış durumu)
 * önler; koleksiyonun kendisinin boş olup olmadığına bakmak yerine ayrı bir
 * işaretçi dokümana güvenilir.
 */
export async function seedDefaultFinanceCategoriesIfMissing(uid: string): Promise<void> {
  const alreadySeeded = await runTransaction(db, async (tx) => {
    const markerSnap = await tx.get(seedMarkerRef(uid))
    if (markerSnap.exists()) return true
    tx.set(seedMarkerRef(uid), { seededAt: new Date().toISOString() })
    return false
  })
  if (alreadySeeded) return

  const colRef = categoriesCollectionRef(uid)
  const batch = writeBatch(db)
  for (const category of DEFAULT_FINANCE_CATEGORIES) {
    batch.set(doc(colRef), category)
  }
  await batch.commit()
}

export async function updateCategoryBudget(
  uid: string,
  categoryId: string,
  monthlyBudgetTRY: number | null,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'financeCategories', categoryId), {
    monthlyBudgetTRY: monthlyBudgetTRY ?? undefined,
  })
}

export function subscribeFinanceCategories(
  uid: string,
  onChange: (categories: FinanceCategory[]) => void,
): Unsubscribe {
  return onSnapshot(categoriesCollectionRef(uid), (snapshot) => {
    const categories = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as FinanceCategory)
      .sort((a, b) => a.order - b.order)
    onChange(categories)
  })
}
