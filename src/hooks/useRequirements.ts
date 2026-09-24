import { useEffect, useState } from 'react'
import type { Requirement } from '../types/domain'
import { subscribeRequirements } from '../services/repositories/requirementsRepository'

/**
 * Bir hayat alanının gereklilik listesine abone olur. `area.id` üst bileşende
 * React key olarak kullanıldığından (bkz. AreaCard), bu hook'un `areaId`'si
 * bir instance'ın ömrü boyunca değişmez — bu yüzden loading, sadece ilk
 * mount'ta true başlar ve effect içinde ayrıca senkron set edilmez.
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
