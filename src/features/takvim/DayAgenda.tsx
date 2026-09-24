import { useState } from 'react'
import { ListTodo } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useTasksInRange } from '../../hooks/useTasksInRange'
import { dayRange } from '../../lib/dateRange'
import { TaskForm } from './TaskForm'
import { TaskRow } from './TaskRow'
import { SkeletonLines } from '../../components/Skeleton'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'

const LOADING_ROW_COUNT = 3

/** Belirli bir günün görev listesi + hızlı ekleme formu. Bugün ve Takvim (gün sekmesi) tarafından paylaşılır. */
export function DayAgenda({ date }: { date: Date }) {
  const uid = useUid()
  const { start, end } = dayRange(date)
  const { tasks, loading } = useTasksInRange(uid, start.toISOString(), end.toISOString())
  const [formKey, setFormKey] = useState(0)

  const sorted = [...tasks].sort((a, b) => a.startAt.localeCompare(b.startAt))

  return (
    <div className="flex flex-col gap-4">
      <TaskForm key={formKey} defaultDate={date} onCreated={() => setFormKey((k) => k + 1)} />
      <Card className="p-5">
        {loading ? (
          <SkeletonLines count={LOADING_ROW_COUNT} />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="Bu gün için görev yok"
            description="Yukarıdaki formla hızlıca bir görev ekleyebilirsin."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {sorted.map((task) => (
              <TaskRow key={task.id} uid={uid} task={task} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
