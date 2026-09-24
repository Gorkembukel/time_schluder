import { useState } from 'react'
import { useUid } from '../../app/UidContext'
import { useTasksInRange } from '../../hooks/useTasksInRange'
import { dayRange } from '../../lib/dateRange'
import { TaskForm } from './TaskForm'
import { TaskRow } from './TaskRow'

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
      <div className="rounded-xl border border-border bg-surface p-5">
        {loading ? (
          <p className="text-sm text-text-secondary">Yükleniyor…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-text-secondary">Bu gün için görev yok.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {sorted.map((task) => (
              <TaskRow key={task.id} uid={uid} task={task} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
