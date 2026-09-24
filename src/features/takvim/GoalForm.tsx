import { useState, type FormEvent } from 'react'
import { endOfDay, startOfDay } from 'date-fns'
import { Plus } from 'lucide-react'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { createTask } from '../../services/repositories/tasksRepository'
import { determineDetailLevel } from '../../lib/planning-engine'
import { toDateInputValue } from '../../lib/dateInput'
import { PLANNING_SCALE_LABELS, type PlanningScale } from '../../types/domain'
import { Button } from '../../components/Button'

const inputClass = 'rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text'

/** `defaultRange` her iki uçta da dahildir (kapsayıcı) — çağıran taraf dışlayıcı aralıkları (`scalePeriodRange`) buraya vermeden önce kendi çevirir. */
export function GoalForm({
  uid,
  scale,
  parentTaskId,
  defaultLifeAreaId,
  defaultRange,
  onDone,
}: {
  uid: string
  scale: PlanningScale
  parentTaskId?: string
  defaultLifeAreaId?: string
  defaultRange: { start: Date; end: Date }
  onDone: () => void
}) {
  const areas = useLifeAreasStore((s) => s.areas)
  const detailWindowDays = useSettingsStore((s) => s.settings.planningEngine.detailWindowDays)

  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState(toDateInputValue(defaultRange.start))
  const [endDate, setEndDate] = useState(toDateInputValue(defaultRange.end))
  const [lifeAreaId, setLifeAreaId] = useState(defaultLifeAreaId ?? '')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const startAt = startOfDay(new Date(startDate))
    const endAt = endOfDay(new Date(endDate))

    if (!title.trim()) return
    if (endAt <= startAt) {
      setError('Bitiş tarihi başlangıçtan sonra olmalı.')
      return
    }

    await createTask(uid, {
      title: title.trim(),
      scale,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      parentTaskId,
      lifeAreaId: lifeAreaId || undefined,
      bufferMinutes: 0,
      detailLevel: determineDetailLevel(scale, startAt, new Date(), detailWindowDays),
    })
    onDone()
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface p-3"
    >
      <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-text-secondary">
        {PLANNING_SCALE_LABELS[scale]} başlığı
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        Başlangıç
        <input
          type="date"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        Bitiş
        <input
          type="date"
          required
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        Hayat alanı
        <select
          value={lifeAreaId}
          onChange={(e) => setLifeAreaId(e.target.value)}
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
      {error && <p className="w-full text-xs text-danger">{error}</p>}
      <Button type="submit" variant="primary" size="sm">
        <Plus size={14} />
        Ekle
      </Button>
      <Button variant="ghost" size="sm" onClick={onDone}>
        Vazgeç
      </Button>
    </form>
  )
}
