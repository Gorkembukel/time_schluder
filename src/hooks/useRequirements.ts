import { useEffect, useState } from 'react'
import type { Requirement } from '../types/domain'
import { subscribeRequirements } from '../services/repositories/requirementsRepository'

/**
 * Bir hayat alanının gereklilik listesine abone olur. `areaId` boşsa (henüz
 * alan seçilmemişse) abonelik açılmaz, boş liste döner (bkz. requirementsRepository).
 */
export function useRequirements(uid: string, areaId: string) {
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeRequirements(uid, areaId, (items) => {
      setRequirements(items)
      setLoading(false)
    })
  }, [uid, areaId])

  return { requirements, loading }
}
