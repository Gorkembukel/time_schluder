import { useEffect, useState } from 'react'
import type { Topic } from '../types/domain'
import { subscribeTopics } from '../services/repositories/topicsRepository'

/** Bir hayat alanının konu listesine abone olur (bkz. useRequirements — aynı desen). */
export function useTopics(uid: string, areaId: string) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeTopics(uid, areaId, (items) => {
      setTopics(items)
      setLoading(false)
    })
  }, [uid, areaId])

  return { topics, loading }
}
