import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Layers, Plus, Trash2 } from 'lucide-react'
import {
  deleteLifeArea,
  renameLifeArea,
  updateLifeAreaPriority,
} from '../../services/repositories/lifeAreasRepository'
import {
  createRequirement,
  deleteRequirement,
  updateRequirementProgress,
} from '../../services/repositories/requirementsRepository'
import { useRequirements } from '../../hooks/useRequirements'
import { useTaskHierarchy } from '../../hooks/useTaskHierarchy'
import { effectiveRequirementId } from '../../lib/taskHierarchy'
import { AreaGoals } from './AreaGoals'
import {
  LIFE_AREA_PRIORITIES,
  LIFE_AREA_PRIORITY_LABELS,
  REQUIREMENT_TYPES,
  REQUIREMENT_TYPE_LABELS,
  type LifeAreaPriority,
  type LifeArea,
  type Requirement,
  type RequirementType,
} from '../../types/domain'
import { SkeletonLines } from '../../components/Skeleton'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'

const inputClass = 'rounded-lg border border-border bg-bg px-2 py-1 text-sm text-text'
const PROGRESS_MAX_PERCENT = 100
const LOADING_ROW_COUNT = 2
const ICON_SIZE = 14

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
    <Card interactive className="p-5">
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
            className="flex items-center gap-2 text-left text-sm font-semibold text-text"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers size={ICON_SIZE} />
            </span>
            {area.name}
          </button>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-text-secondary">
          Öncelik
          <select
            value={area.priority ?? 'normal'}
            onChange={(e) =>
              void updateLifeAreaPriority(uid, area.id, e.target.value as LifeAreaPriority)
            }
            className={inputClass}
          >
            {LIFE_AREA_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {LIFE_AREA_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        {confirmingDelete ? (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-text-secondary">Emin misin?</span>
            <Button variant="danger" size="sm" onClick={() => void deleteLifeArea(uid, area.id)}>
              Sil
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Vazgeç
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={ICON_SIZE} />
            Alanı sil
          </Button>
        )}
      </div>

      <AreaGoals areaId={area.id} />

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Gereklilikler
      </h3>
      <div className="mt-2 flex flex-col gap-2">
        {loading ? (
          <SkeletonLines count={LOADING_ROW_COUNT} className="h-10" />
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
        <NewRequirementForm
          uid={uid}
          areaId={area.id}
          onDone={() => setShowNewRequirement(false)}
        />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNewRequirement(true)}
          className="mt-3"
        >
          <Plus size={ICON_SIZE} />
          Gereklilik ekle
        </Button>
      )}
    </Card>
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
  const { tasks, index } = useTaskHierarchy()
  const linkedTasks = tasks.filter((t) => effectiveRequirementId(t, index) === requirement.id)
  const linkedDone = linkedTasks.filter((t) => t.status === 'done').length
  const progress =
    requirement.targetMetric > 0
      ? Math.min(
          PROGRESS_MAX_PERCENT,
          Math.round((requirement.currentValue / requirement.targetMetric) * PROGRESS_MAX_PERCENT),
        )
      : 0

  return (
    <div className="rounded-lg border border-border bg-bg/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm text-text">{requirement.name}</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="neutral">{REQUIREMENT_TYPE_LABELS[requirement.type]}</Badge>
            {linkedTasks.length > 0 && (
              <Badge variant="primary">
                {linkedDone}/{linkedTasks.length} bağlı iş tamamlandı
              </Badge>
            )}
          </div>
        </div>
        {confirmingDelete ? (
          <div className="flex items-center gap-1 text-xs">
            <Button
              variant="danger"
              size="sm"
              onClick={() => void deleteRequirement(uid, areaId, requirement.id)}
            >
              Sil
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Vazgeç
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
            Sil
          </Button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full rounded-full bg-primary transition-all motion-safe:duration-300"
            style={{ width: `${progress}%` }}
          />
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
      <Button type="submit" variant="primary" size="sm">
        Ekle
      </Button>
      <Button variant="ghost" size="sm" onClick={onDone}>
        Vazgeç
      </Button>
    </form>
  )
}
