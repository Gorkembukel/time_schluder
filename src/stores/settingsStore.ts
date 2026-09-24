import { create } from 'zustand'
import { DEFAULT_SETTINGS, type Settings } from '../config/constants'
import { subscribeSettings, updateSettings } from '../services/repositories/settingsRepository'

interface SettingsState {
  settings: Settings
  loading: boolean
  uid: string | null
  unsubscribe: (() => void) | null
  connect: (uid: string) => void
  disconnect: () => void
  update: (partial: Partial<Settings>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loading: true,
  uid: null,
  unsubscribe: null,
  connect: (uid) => {
    const current = get()
    if (current.uid === uid && current.unsubscribe) return
    current.unsubscribe?.()
    const unsubscribe = subscribeSettings(uid, (settings) => set({ settings, loading: false }))
    set({ uid, unsubscribe })
  },
  disconnect: () => {
    get().unsubscribe?.()
    set({ uid: null, unsubscribe: null, settings: DEFAULT_SETTINGS, loading: true })
  },
  update: async (partial) => {
    const uid = get().uid
    if (!uid) return
    await updateSettings(uid, partial)
  },
}))
