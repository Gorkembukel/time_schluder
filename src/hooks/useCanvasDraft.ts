import { useEffect, useState } from 'react'
import type { CanvasDraft } from '../types/domain'
import { subscribeCanvasDraft } from '../services/repositories/canvasDraftsRepository'

const EMPTY_DRAFT: CanvasDraft = { pool: [], nodes: [], edges: [] }

/** Bir Görsel Planlama Kanvası bağlamının (hayat alanı ya da bir işin alt-kanvası) taslak verisine abone olur. */
export function useCanvasDraft(uid: string, contextId: string) {
  const [draft, setDraft] = useState<CanvasDraft>(EMPTY_DRAFT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeCanvasDraft(uid, contextId, (next) => {
      setDraft(next)
      setLoading(false)
    })
  }, [uid, contextId])

  return { draft, loading }
}
