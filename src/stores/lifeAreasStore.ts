import { create } from 'zustand'
import type { LifeArea } from '../types/domain'
import { subscribeLifeAreas } from '../services/repositories/lifeAreasRepository'

interface LifeAreasState {
  areas: LifeArea[]
  loading: boolean
  uid: string | null
  unsubscribe: (() => void) | null
  connect: (uid: string) => void
  disconnect: () => void
}

export const useLifeAreasStore = create<LifeAreasState>((set, get) => ({
  areas: [],
  loading: true,
  uid: null,
  unsubscribe: null,
  connect: (uid) => {
    const current = get()
    if (current.uid === uid && current.unsubscribe) return
    current.unsubscribe?.()
    const unsubscribe = subscribeLifeAreas(uid, (areas) => set({ areas, loading: false }))
    set({ uid, unsubscribe })
  },
  disconnect: () => {
    get().unsubscribe?.()
    set({ uid: null, unsubscribe: null, areas: [], loading: true })
  },
}))
