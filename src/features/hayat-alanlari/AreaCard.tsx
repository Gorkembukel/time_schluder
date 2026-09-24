import { useEffect, useRef, useState, type FormEvent } from 'react'
import { deleteLifeArea, renameLifeArea } from '../../services/repositories/lifeAreasRepository'
import {
  createRequirement,
  deleteRequirement,
  updateRequirementProgress,
} from '../../services/repositories/requirementsRepository'
import { useRequirements } from '../../hooks/useRequirements'
import {
  REQUIREMENT_TYPES,
  REQUIREMENT_TYPE_LABELS,
  type LifeArea,
  type Requirement,
  type RequirementType,
} from '../../types/domain'

const inputClass = 'rounded-lg border border-border bg-bg px-2 py-1 text-sm text-text'
const PROGRESS_MAX_PERCENT = 100

export function AreaCard({ uid, area }: { uid: string; area: LifeArea }) {
  const { requirements, loading } = useRequirements(uid, area.id)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(area.name)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [showNewRequirement, setShowNewRequirement] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  async function handleRename() {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== area.name) {
      await renameLifeArea(uid, area.id, trimmed)
    } else {
      setNameDraft(area.name)
    }
    setEditingName(false)
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        {editingName ? (
          <input
            ref={nameInputRef}
            className={inputClass}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => void handleRename()}
            onKeyDown={(e) => e.key === 'Enter' && void handleRename()}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="text-left text-sm font-semibold text-text"
          >
            {area.name}
          </button>
        )}
        {confirmingDelete ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-secondary">Emin misin?</span>
            <button
              type="button"
              onClick={() => void deleteLifeArea(uid, area.id)}
              className="font-medium text-danger"
            >
              Sil
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-text-secondary"
            >
              Vazgeç
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-xs text-text-secondary hover:text-danger"
          >
            Alanı sil
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {loading ? (
          <p className="text-sm text-text-secondary">Gereklilikler yükleniyor…</p>
        ) : requirements.length === 0 ? (
          <p className="text-sm text-text-secondary">Henüz gereklilik yok.</p>
        ) : (
          requirements.map((requirement) => (
            <RequirementRow
              key={requirement.id}
              uid={uid}
              areaId={area.id}
              requirement={requirement}
            />
          ))
        )}
      </div>

      {showNewRequirement ? (
        <NewRequirementForm uid={uid} areaId={area.id} onDone={() => setShowNewRequirement(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowNewRequirement(true)}
          className="mt-3 text-sm text-primary"
        >
          + Gereklilik ekle
        </button>
      )}
    </div>
  )
}

function RequirementRow({
  uid,
  areaId,
  requirement,
}: {
  uid: string
  areaId: string
  requirement: Requirement
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const progress =
    requirement.targetMetric > 0
      ? Math.min(
          PROGRESS_MAX_PERCENT,
          Math.round((requirement.currentValue / requirement.targetMetric) * PROGRESS_MAX_PERCENT),
        )
      : 0

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm text-text">{requirement.name}</p>
          <p className="text-xs text-text-secondary">
            {REQUIREMENT_TYPE_LABELS[requirement.type]}
          </p>
        </div>
        {confirmingDelete ? (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => void deleteRequirement(uid, areaId, requirement.id)}
              className="font-medium text-danger"
            >
              Sil
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-text-secondary"
            >
              Vazgeç
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-xs text-text-secondary hover:text-danger"
          >
            Sil
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <input
          type="number"
          className="w-16 rounded-lg border border-border bg-bg px-1.5 py-0.5 text-xs text-text"
          value={requirement.currentValue}
          onChange={(e) =>
            void updateRequirementProgress(uid, areaId, requirement.id, Number(e.target.value))
          }
        />
        <span className="text-xs text-text-secondary">
          / {requirement.targetMetric} {requirement.unit}
        </span>
      </div>
    </div>
  )
}

function NewRequirementForm({
  uid,
  areaId,
  onDone,
}: {
  uid: string
  areaId: string
  onDone: () => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<RequirementType>('bilgi')
  const [targetMetric, setTargetMetric] = useState('1')
  const [unit, setUnit] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await createRequirement(uid, areaId, {
      name: trimmed,
      type,
      targetMetric: Number(targetMetric) || 0,
      currentValue: 0,
      unit: unit.trim(),
    })
    onDone()
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-3 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        Ad
        <input
          ref={nameInputRef}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        Tür
        <select
          value={type}
          onChange={(e) => setType(e.target.value as RequirementType)}
          className={inputClass}
        >
          {REQUIREMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {REQUIREMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        Hedef
        <input
          type="number"
          min={0}
          value={targetMetric}
          onChange={(e) => setTargetMetric(e.target.value)}
          className={`${inputClass} w-20`}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        Birim
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="ör. sertifika"
          className={`${inputClass} w-28`}
        />
      </label>
      <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-text">
        Ekle
      </button>
      <button type="button" onClick={onDone} className="text-xs text-text-secondary">
        Vazgeç
      </button>
    </form>
  )
}
