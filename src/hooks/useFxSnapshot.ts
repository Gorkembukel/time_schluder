import { useEffect, useState } from 'react'
import { fetchFxSnapshot, type FxFetchResult } from '../lib/fx/fetchFxSnapshot'

const EMPTY_SNAPSHOT: FxFetchResult = {
  usdRate: null,
  goldGramPriceTRY: null,
  btcPriceTRY: null,
  fetchedAt: '',
}

/** İşlem formu açıldığında bir kez tetiklenir; sonuç formda elle düzenlenebilir alanları doldurur. */
export function useFxSnapshot() {
  const [snapshot, setSnapshot] = useState<FxFetchResult>(EMPTY_SNAPSHOT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchFxSnapshot().then((result) => {
      if (!cancelled) {
        setSnapshot(result)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { snapshot, loading }
}
