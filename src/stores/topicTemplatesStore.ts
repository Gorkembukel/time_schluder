import { create } from 'zustand'
import type { TopicTemplate } from '../types/domain'
import {
  seedDefaultTopicTemplatesIfMissing,
  subscribeTopicTemplates,
} from '../services/repositories/topicTemplatesRepository'

interface TopicTemplatesState {
  templates: TopicTemplate[]
  loading: boolean
  uid: string | null
  unsubscribe: (() => void) | null
  connect: (uid: string) => void
  disconnect: () => void
}

export const useTopicTemplatesStore = create<TopicTemplatesState>((set, get) => ({
  templates: [],
  loading: true,
  uid: null,
  unsubscribe: null,
  connect: (uid) => {
    const current = get()
    if (current.uid === uid && current.unsubscribe) return
    current.unsubscribe?.()
    void seedDefaultTopicTemplatesIfMissing(uid)
    const unsubscribe = subscribeTopicTemplates(uid, (templates) =>
      set({ templates, loading: false }),
    )
    set({ uid, unsubscribe })
  },
  disconnect: () => {
    get().unsubscribe?.()
    set({ uid: null, unsubscribe: null, templates: [], loading: true })
  },
}))
