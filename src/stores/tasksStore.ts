import { create } from 'zustand'
import type { Task } from '../types/domain'
import { subscribeAllTasks } from '../services/repositories/tasksRepository'

interface TasksState {
  tasks: Task[]
  loading: boolean
  uid: string | null
  unsubscribe: (() => void) | null
  connect: (uid: string) => void
  disconnect: () => void
}

/** Tüm görevlerin tek aboneliği — ölçek görünümleri, pano ve hayat alanı roll-up'ı aynı kaynağı okur. */
export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: true,
  uid: null,
  unsubscribe: null,
  connect: (uid) => {
    const current = get()
    if (current.uid === uid && current.unsubscribe) return
    current.unsubscribe?.()
    const unsubscribe = subscribeAllTasks(uid, (tasks) => set({ tasks, loading: false }))
    set({ uid, unsubscribe })
  },
  disconnect: () => {
    get().unsubscribe?.()
    set({ uid: null, unsubscribe: null, tasks: [], loading: true })
  },
}))
