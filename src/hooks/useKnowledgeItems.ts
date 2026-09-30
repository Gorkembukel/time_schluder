import { useEffect, useState } from 'react'
import type { KnowledgeItem } from '../types/domain'
import { subscribeAllKnowledgeItems } from '../services/repositories/knowledgeItemsRepository'

/**
 * Kullanıcının tüm bilgi birimlerine, yalnızca bu hook mount'ken açık kalan bir abonelik.
 * Konu Çalışma Ortamı sayfası bunu bir kez açar; konu görünümü ve konular arası arama aynı
 * listeden client-side filtrelenir (bkz. docs/decisions/0010).
 */
export function useKnowledgeItems(uid: string) {
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeAllKnowledgeItems(uid, (all) => {
      setItems(all)
      setLoading(false)
    })
  }, [uid])

  return { items, loading }
}
