import { collection, doc, getDocs, onSnapshot, writeBatch, type Unsubscribe } from 'firebase/firestore'
import { db } from '../firebase'
import { DEFAULT_FINANCE_CATEGORIES } from '../../config/finance-categories'
import type { FinanceCategory } from '../../types/domain'

function categoriesCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'financeCategories')
}

/** İlk girişte kategori koleksiyonu boşsa başlangıç setini tek batch ile yazar. */
export async function seedDefaultFinanceCategoriesIfMissing(uid: string): Promise<void> {
  const colRef = categoriesCollectionRef(uid)
  const snapshot = await getDocs(colRef)
  if (!snapshot.empty) return

  const batch = writeBatch(db)
  for (const category of DEFAULT_FINANCE_CATEGORIES) {
    batch.set(doc(colRef), category)
  }
  await batch.commit()
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
