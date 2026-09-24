import { useEffect, useState } from 'react'
import {
  applyTaskChanges,
  fetchAllTasks,
  updateTaskDependencies,
} from '../../services/repositories/tasksRepository'
import { useSettingsStore } from '../../stores/settingsStore'
import { recalculateFromChange, type RecalculationProposal } from '../../lib/planning-engine'
import { RecalculationPreview } from './RecalculationPreview'
import { DEPENDENCY_TYPES, type DependencyType, type Task, type TaskDependency } from '../../types/domain'

const inputClass = 'rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text'

function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toTimeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const DEPENDENCY_TYPE_LABELS: Record<DependencyType, string> = {
  FS: 'FS — bitmeden başlamaz',
  SS: 'SS — başlamadan başlamaz',
  FF: 'FF — bitmeden bitemez',
  SF: 'SF — başlamadan bitemez',
}

/** Görev saatini ve bağımlılıklarını düzenler; saat değişikliği planlama motorunun recalculateFromChange'ini tetikler. */
export function TaskEditor({
  uid,
  task,
  onDone,
  onCancel,
}: {
  uid: string
  task: Task
  onDone: () => void
  onCancel: () => void
}) {
  const majorChangeThreshold = useSettingsStore(
    (s) => s.settings.planningEngine.majorChangeThreshold,
  )
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [date, setDate] = useState(toDateInputValue(new Date(task.startAt)))
  const [startTime, setStartTime] = useState(toTimeInputValue(new Date(task.startAt)))
  const [endTime, setEndTime] = useState(toTimeInputValue(new Date(task.endAt)))
  const [dependencies, setDependencies] = useState<TaskDependency[]>(task.dependencies)
  const [newDepTaskId, setNewDepTaskId] = useState('')
  const [newDepType, setNewDepType] = useState<DependencyType>('FS')
  const [newDepLag, setNewDepLag] = useState('0')
  const [proposal, setProposal] = useState<RecalculationProposal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAllTasks(uid).then(setAllTasks)
  }, [uid])

  const candidateTasks = allTasks.filter(
    (t) => t.id !== task.id && !dependencies.some((dep) => dep.taskId === t.id),
  )

  function addDependency() {
    if (!newDepTaskId) return
    setDependencies((deps) => [
      ...deps,
      { taskId: newDepTaskId, type: newDepType, lagMinutes: Number(newDepLag) || 0 },
    ])
    setNewDepTaskId('')
    setNewDepLag('0')
  }

  function removeDependency(taskId: string) {
    setDependencies((deps) => deps.filter((dep) => dep.taskId !== taskId))
  }

  async function handleSave() {
    setError(null)
    const newStartAt = new Date(`${date}T${startTime}:00`)
    const newEndAt = new Date(`${date}T${endTime}:00`)
    if (newEndAt <= newStartAt) {
      setError('Bitiş saati başlangıçtan sonra olmalı.')
      return
    }

    const depsChanged = JSON.stringify(dependencies) !== JSON.stringify(task.dependencies)
    const scheduleChanged =
      newStartAt.toISOString() !== task.startAt || newEndAt.toISOString() !== task.endAt

    if (depsChanged) {
      await updateTaskDependencies(uid, task.id, dependencies)
    }

    if (!scheduleChanged) {
      onDone()
      return
    }

    // Her zaman taze veri çekilir: başka bir görevin bağımlılığı az önce kaydedilmiş
    // olabilir (ör. art arda iki görev düzenlenirken) — `allTasks`'ın mount anındaki
    // anlık görüntüsüne güvenmek eski (stale) veriyle yanlış hesaplamaya yol açabilir.
    const source = await fetchAllTasks(uid)
    setAllTasks(source)
    const tasksForCalc = source.map((t) => (t.id === task.id ? { ...t, dependencies } : t))

    let result: RecalculationProposal
    try {
      result = recalculateFromChange(
        tasksForCalc,
        task.id,
        newStartAt,
        newEndAt,
        majorChangeThreshold,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yeniden hesaplama başarısız.')
      return
    }

    if (result.requiresApproval) {
      setProposal(result)
      return
    }

    setSaving(true)
    await applyTaskChanges(uid, result.changes)
    setSaving(false)
    onDone()
  }

  async function handleConfirmProposal() {
    if (!proposal) return
    setSaving(true)
    await applyTaskChanges(uid, proposal.changes)
    setSaving(false)
    onDone()
  }

  if (proposal) {
    return (
      <RecalculationPreview
        changes={proposal.changes}
        tasks={allTasks}
        reason={`Bu değişiklik ${proposal.affectedTaskCount} başka görevi de etkiliyor${
          proposal.criticalPathAffected ? ' ve kritik yolu değiştiriyor' : ''
        } — önce gözden geçir:`}
        onConfirm={() => void handleConfirmProposal()}
        onCancel={() => setProposal(null)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Tarih
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Başlangıç
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Bitiş
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div>
        <p className="text-xs font-medium text-text-secondary">Bağımlılıklar</p>
        {dependencies.length === 0 ? (
          <p className="mt-1 text-xs text-text-secondary">Yok.</p>
        ) : (
          <ul className="mt-1 flex flex-col gap-1">
            {dependencies.map((dep) => (
              <li key={dep.taskId} className="flex items-center justify-between text-xs text-text">
                <span>
                  {allTasks.find((t) => t.id === dep.taskId)?.title ?? dep.taskId} — {dep.type}
                  {dep.lagMinutes ? ` (${dep.lagMinutes}dk lag)` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => removeDependency(dep.taskId)}
                  className="text-text-secondary hover:text-danger"
                >
                  Kaldır
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <select
            value={newDepTaskId}
            onChange={(e) => setNewDepTaskId(e.target.value)}
            className={inputClass}
          >
            <option value="">Görev seç…</option>
            {candidateTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <select
            value={newDepType}
            onChange={(e) => setNewDepType(e.target.value as DependencyType)}
            className={inputClass}
          >
            {DEPENDENCY_TYPES.map((type) => (
              <option key={type} value={type}>
                {DEPENDENCY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={newDepLag}
            onChange={(e) => setNewDepLag(e.target.value)}
            placeholder="lag (dk)"
            className={`${inputClass} w-20`}
          />
          <button
            type="button"
            onClick={addDependency}
            className="rounded-lg border border-border px-2 py-1 text-xs text-text-secondary"
          >
            + Ekle
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-text disabled:opacity-60"
        >
          Kaydet
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-text-secondary">
          Vazgeç
        </button>
      </div>
    </div>
  )
}
