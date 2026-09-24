import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { useRequirements } from '../../hooks/useRequirements'
import { useSettingsStore } from '../../stores/settingsStore'
import { createTask } from '../../services/repositories/tasksRepository'
import { determineDetailLevel } from '../../lib/planning-engine'
import { Button } from '../../components/Button'

const inputClass = 'rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text'
const DEFAULT_START_TIME = '09:00'
const DEFAULT_END_TIME = '10:00'

function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function TaskForm({ defaultDate, onCreated }: { defaultDate: Date; onCreated: () => void }) {
  const uid = useUid()
  const areas = useLifeAreasStore((s) => s.areas)
  const detailWindowDays = useSettingsStore((s) => s.settings.planningEngine.detailWindowDays)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(toDateInputValue(defaultDate))
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME)
  const [endTime, setEndTime] = useState(DEFAULT_END_TIME)
  const [lifeAreaId, setLifeAreaId] = useState('')
  const [requirementId, setRequirementId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { requirements } = useRequirements(uid, lifeAreaId)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const startAt = new Date(`${date}T${startTime}:00`)
    const endAt = new Date(`${date}T${endTime}:00`)

    if (!title.trim()) return
    if (endAt <= startAt) {
      setError('Bitiş saati başlangıçtan sonra olmalı.')
      return
    }

    await createTask(uid, {
      title: title.trim(),
      scale: 'hour',
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      lifeAreaId: lifeAreaId || undefined,
      requirementId: requirementId || undefined,
      bufferMinutes: 0,
      detailLevel: determineDetailLevel('hour', startAt, new Date(), detailWindowDays),
    })

    setTitle('')
    setRequirementId('')
    onCreated()
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface p-4 shadow-sm"
    >
      <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-text-secondary">
        Başlık
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        Tarih
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        Başlangıç
        <input
          type="time"
          required
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        Bitiş
        <input
          type="time"
          required
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        Hayat alanı
        <select
          value={lifeAreaId}
          onChange={(e) => {
            setLifeAreaId(e.target.value)
            setRequirementId('')
          }}
          className={inputClass}
        >
          <option value="">—</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        Gereklilik
        <select
          value={requirementId}
          onChange={(e) => setRequirementId(e.target.value)}
          disabled={!lifeAreaId}
          className={inputClass}
        >
          <option value="">—</option>
          {requirements.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="w-full text-xs text-danger">{error}</p>}
      <Button type="submit" variant="primary">
        <Plus size={16} />
        Görev ekle
      </Button>
    </form>
  )
}
