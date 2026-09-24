import { useEffect, useState } from 'react'
import type { Task } from '../types/domain'
import { subscribeTasksInRange } from '../services/repositories/tasksRepository'

/** `rangeStartIso`/`rangeEndIso` her değiştiğinde (gün/hafta/ay geçişi) yeniden abone olur. */
export function useTasksInRange(uid: string, rangeStartIso: string, rangeEndIso: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeTasksInRange(uid, rangeStartIso, rangeEndIso, (items) => {
      setTasks(items)
      setLoading(false)
    })
  }, [uid, rangeStartIso, rangeEndIso])

  return { tasks, loading }
}
