import { useState, type FormEvent } from 'react'
import { endOfDay, startOfDay } from 'date-fns'
import { Plus } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { useRequirements } from '../../hooks/useRequirements'
import { useTaskHierarchy } from '../../hooks/useTaskHierarchy'
import { effectiveLifeAreaId, overlapsRange } from '../../lib/taskHierarchy'
import { PLANNING_SCALE_LABELS, type PlanningScale } from '../../types/domain'
import { useSettingsStore } from '../../stores/settingsStore'
import { createTask } from '../../services/repositories/tasksRepository'
import { determineDetailLevel } from '../../lib/planning-engine'
import { toDateInputValue } from '../../lib/dateInput'
import { Button } from '../../components/Button'

const inputClass = 'rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text'
const DEFAULT_START_TIME = '09:00'
const DEFAULT_END_TIME = '10:00'
/** Günlük görevin bağlanabileceği üst ölçekler (Story/Task seviyesi), yakından uzağa. */
const PARENT_SCALES: PlanningScale[] = ['day', 'week', 'month']

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
  const [parentId, setParentId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { tasks, index } = useTaskHierarchy()
  const parent = parentId ? index.get(parentId) : undefined
  const inheritedAreaId = parent ? effectiveLifeAreaId(parent, index) : undefined
  const inheritedAreaName = areas.find((a) => a.id === inheritedAreaId)?.name
  const areaIdForRequirements = lifeAreaId || inheritedAreaId || ''
  const { requirements } = useRequirements(uid, areaIdForRequirements)

  const dayStart = startOfDay(new Date(`${date}T00:00:00`))
  const dayEnd = endOfDay(dayStart)
  const parentCandidates = tasks
    .filter((t) => PARENT_SCALES.includes(t.scale) && overlapsRange(t, dayStart, dayEnd))
    .sort((a, b) => PARENT_SCALES.indexOf(a.scale) - PARENT_SCALES.indexOf(b.scale))

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
      parentTaskId: parentId || undefined,
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
        Üst iş
        <select
          value={parentId}
          onChange={(e) => {
            setParentId(e.target.value)
            setRequirementId('')
          }}
          className={inputClass}
        >
          <option value="">—</option>
          {parentCandidates.map((t) => (
            <option key={t.id} value={t.id}>
              {PLANNING_SCALE_LABELS[t.scale]}: {t.title}
            </option>
          ))}
        </select>
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
          <option value="">{inheritedAreaName ? `Devral: ${inheritedAreaName}` : '—'}</option>
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
          disabled={!areaIdForRequirements}
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
