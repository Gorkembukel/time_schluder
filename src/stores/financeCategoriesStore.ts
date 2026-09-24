import { create } from 'zustand'
import type { FinanceCategory } from '../types/domain'
import {
  seedDefaultFinanceCategoriesIfMissing,
  subscribeFinanceCategories,
} from '../services/repositories/financeCategoriesRepository'

interface FinanceCategoriesState {
  categories: FinanceCategory[]
  loading: boolean
  uid: string | null
  unsubscribe: (() => void) | null
  connect: (uid: string) => void
  disconnect: () => void
}

export const useFinanceCategoriesStore = create<FinanceCategoriesState>((set, get) => ({
  categories: [],
  loading: true,
  uid: null,
  unsubscribe: null,
  connect: (uid) => {
    const current = get()
    if (current.uid === uid && current.unsubscribe) return
    current.unsubscribe?.()
    void seedDefaultFinanceCategoriesIfMissing(uid)
    const unsubscribe = subscribeFinanceCategories(uid, (categories) =>
      set({ categories, loading: false }),
    )
    set({ uid, unsubscribe })
  },
  disconnect: () => {
    get().unsubscribe?.()
    set({ uid: null, unsubscribe: null, categories: [], loading: true })
  },
}))
