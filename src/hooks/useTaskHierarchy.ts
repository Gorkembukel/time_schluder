import { useMemo } from 'react'
import { useTasksStore } from '../stores/tasksStore'
import { childrenIndex, indexTasks } from '../lib/taskHierarchy'

/** tasksStore'daki tek kaynaktan id indeksi + çocuk indeksi (her görev listesi değişiminde bir kez hesaplanır). */
export function useTaskHierarchy() {
  const tasks = useTasksStore((s) => s.tasks)
  const loading = useTasksStore((s) => s.loading)
  const index = useMemo(() => indexTasks(tasks), [tasks])
  const children = useMemo(() => childrenIndex(tasks), [tasks])
  return { tasks, loading, index, children }
}
