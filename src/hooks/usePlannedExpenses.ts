import { useEffect, useState } from 'react'
import type { PlannedExpense } from '../types/domain'
import { subscribePlannedExpenses } from '../services/repositories/plannedExpensesRepository'

/** `lifeAreaId` verilmezse tüm planlı harcamalara (son N kayıt) abone olunur. */
export function usePlannedExpenses(uid: string, lifeAreaId?: string) {
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribePlannedExpenses(
      uid,
      (items) => {
        setPlannedExpenses(items)
        setLoading(false)
      },
      lifeAreaId,
    )
  }, [uid, lifeAreaId])

  return { plannedExpenses, loading }
}
