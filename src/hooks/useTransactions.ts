import { useEffect, useState } from 'react'
import type { FinanceTransaction } from '../types/domain'
import { subscribeTransactions } from '../services/repositories/financeTransactionsRepository'

export function useTransactions(uid: string) {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeTransactions(uid, (items) => {
      setTransactions(items)
      setLoading(false)
    })
  }, [uid])

  return { transactions, loading }
}
