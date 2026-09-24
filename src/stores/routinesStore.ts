import { create } from 'zustand'
import type { Routine } from '../types/domain'
import { subscribeRoutines } from '../services/repositories/routinesRepository'

interface RoutinesState {
  routines: Routine[]
  loading: boolean
  uid: string | null
  unsubscribe: (() => void) | null
  connect: (uid: string) => void
  disconnect: () => void
}

/** Haftalık sabit program (rutinler/ders programı) — haftalık program ve otomatik dağıtım okur. */
export const useRoutinesStore = create<RoutinesState>((set, get) => ({
  routines: [],
  loading: true,
  uid: null,
  unsubscribe: null,
  connect: (uid) => {
    const current = get()
    if (current.uid === uid && current.unsubscribe) return
    current.unsubscribe?.()
    const unsubscribe = subscribeRoutines(uid, (routines) => set({ routines, loading: false }))
    set({ uid, unsubscribe })
  },
  disconnect: () => {
    get().unsubscribe?.()
    set({ uid: null, unsubscribe: null, routines: [], loading: true })
  },
}))
