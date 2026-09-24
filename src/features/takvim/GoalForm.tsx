import { useState, type FormEvent } from 'react'
import { endOfDay, startOfDay } from 'date-fns'
import { Plus, Save } from 'lucide-react'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useRequirements } from '../../hooks/useRequirements'
import { useTaskHierarchy } from '../../hooks/useTaskHierarchy'
import { createTask, updateTaskFields } from '../../services/repositories/tasksRepository'
import { coarserScale, determineDetailLevel } from '../../lib/planning-engine'
import { ancestorsOf, effectiveLifeAreaId, overlapsRange } from '../../lib/taskHierarchy'
import { toDateInputValue } from '../../lib/dateInput'
import { PLANNING_SCALE_LABELS, type PlanningScale, type Task } from '../../types/domain'
import { Button } from '../../components/Button'

const inputClass = 'rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text'
const ICON_SIZE = 14

/**
 * Hedef/iş ekleme ve düzenleme formu. Her iş bir üst ölçekteki ebeveyne bağlanabilir (parent link);
 * ebeveyni olan iş hayat alanını ondan devralır, ebeveynsiz (kök) iş için hayat alanı zorunludur.
 * `defaultRange` her iki uçta da dahildir (kapsayıcı).
 */
export function GoalForm({
  uid,
  scale,
  task,
  parentTaskId: fixedParentId,
  defaultRange,
  onDone,
}: {
  uid: string
  scale: PlanningScale
  /** Verilirse form düzenleme modunda açılır. */
  task?: Task
  /** Verilirse ebeveyn sabittir (ağaçta "alt iş ekle" akışı). */
  parentTaskId?: string
  defaultRange: { start: Date; end: Date }
  onDone: () => void
}) {
  const areas = useLifeAreasStore((s) => s.areas)
  const detailWindowDays = useSettingsStore((s) => s.settings.planningEngine.detailWindowDays)
  const { tasks, index } = useTaskHierarchy()

  const [title, setTitle] = useState(task?.title ?? '')
  const [startDate, setStartDate] = useState(toDateInputValue(defaultRange.start))
  const [endDate, setEndDate] = useState(toDateInputValue(defaultRange.end))
  const [parentId, setParentId] = useState(fixedParentId ?? task?.parentTaskId ?? '')
  const [lifeAreaId, setLifeAreaId] = useState(task?.lifeAreaId ?? '')
  const [requirementId, setRequirementId] = useState(task?.requirementId ?? '')
  const [error, setError] = useState<string | null>(null)

  const parent = parentId ? index.get(parentId) : undefined
  const inheritedAreaId = parent ? effectiveLifeAreaId(parent, index) : undefined
  const areaIdForRequirements = lifeAreaId || inheritedAreaId || ''
  const { requirements } = useRequirements(uid, areaIdForRequirements)

  // Ebeveyn adayları: bir üst ölçekteki, seçili tarihlerle kesişen işler (kendisi ve torunları hariç).
  const parentScale = coarserScale(scale)
  const rangeStart = startOfDay(new Date(startDate))
  const rangeEnd = endOfDay(new Date(endDate))
  const parentCandidates = parentScale
    ? tasks.filter(
        (t) =>
          t.scale === parentScale &&
          t.id !== task?.id &&
          !ancestorsOf(t, index).some((a) => a.id === task?.id) &&
          (t.id === parentId || overlapsRange(t, rangeStart, rangeEnd)),
      )
    : []

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
    if (!parentId && !lifeAreaId) {
      setError('Üst iş seçilmediyse bir hayat alanı seçmelisin — her iş bir alana bağlanır.')
      return
    }

    if (task) {
      await updateTaskFields(uid, task.id, {
        title: title.trim(),
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        parentTaskId: parentId,
        lifeAreaId,
        requirementId,
      })
    } else {
      await createTask(uid, {
        title: title.trim(),
        scale,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        parentTaskId: parentId || undefined,
        lifeAreaId: lifeAreaId || undefined,
        requirementId: requirementId || undefined,
        bufferMinutes: 0,
        detailLevel: determineDetailLevel(scale, startAt, new Date(), detailWindowDays),
      })
    }
    onDone()
  }

  const inheritedAreaName = areas.find((a) => a.id === inheritedAreaId)?.name

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
      {parentScale && !fixedParentId && (
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Üst iş ({PLANNING_SCALE_LABELS[parentScale]})
          <select
            value={parentId}
            onChange={(e) => {
              setParentId(e.target.value)
              setRequirementId('')
            }}
            className={inputClass}
          >
            <option value="">— yok (kök)</option>
            {parentCandidates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
      )}
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
      <Button type="submit" variant="primary" size="sm">
        {task ? <Save size={ICON_SIZE} /> : <Plus size={ICON_SIZE} />}
        {task ? 'Kaydet' : 'Ekle'}
      </Button>
      <Button variant="ghost" size="sm" onClick={onDone}>
        Vazgeç
      </Button>
    </form>
  )
}
