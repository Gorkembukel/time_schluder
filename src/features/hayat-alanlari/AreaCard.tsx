import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ChevronRight, Layers, Plus, Trash2 } from 'lucide-react'
import {
  deleteLifeArea,
  renameLifeArea,
  updateLifeAreaColor,
  updateLifeAreaPriority,
} from '../../services/repositories/lifeAreasRepository'
import {
  createRequirement,
  deleteRequirement,
  updateRequirementDetails,
  updateRequirementProgress,
} from '../../services/repositories/requirementsRepository'
import { createTopic, deleteTopic, renameTopic } from '../../services/repositories/topicsRepository'
import { useRequirements } from '../../hooks/useRequirements'
import { useTopics } from '../../hooks/useTopics'
import { useTaskHierarchy } from '../../hooks/useTaskHierarchy'
import { effectiveRequirementId } from '../../lib/taskHierarchy'
import { AreaGoals } from './AreaGoals'
import {
  LIFE_AREA_PRIORITIES,
  LIFE_AREA_PRIORITY_LABELS,
  REQUIREMENT_STATUSES,
  REQUIREMENT_STATUS_LABELS,
  REQUIREMENT_TYPES,
  REQUIREMENT_TYPE_LABELS,
  type LifeAreaPriority,
  type LifeArea,
  type Requirement,
  type RequirementStatus,
  type RequirementType,
  type Topic,
} from '../../types/domain'
import { SkeletonLines } from '../../components/Skeleton'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'

const inputClass = 'rounded-lg border border-border bg-bg px-2 py-1 text-sm text-text'
const PROGRESS_MAX_PERCENT = 100
const LOADING_ROW_COUNT = 2
const STATUS_BADGE_VARIANT: Record<RequirementStatus, 'danger' | 'warning' | 'success'> = {
  yok: 'danger',
  alinacak: 'warning',
  var: 'success',
  edinildi: 'success',
}
/** Rengi henüz seçilmemiş bir hayat alanı için varsayılan (nötr) renk. */
export const DEFAULT_AREA_COLOR = '#94a3b8'
const ICON_SIZE = 14
/** Alt gereklilik ağacında her derinlik seviyesinin girinti miktarı (rem). */
const DEPTH_INDENT_REM = 0.5

export function AreaCard({ uid, area }: { uid: string; area: LifeArea }) {
  const { requirements, loading } = useRequirements(uid, area.id)
  const { topics, loading: topicsLoading } = useTopics(uid, area.id)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(area.name)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [showNewRequirement, setShowNewRequirement] = useState(false)
  const [showNewTopic, setShowNewTopic] = useState(false)
  // Gereklilikler ve Konular varsayılan olarak katlı: kart sadece hedefleri ve kısa bir özet gösterir.
  const [requirementsOpen, setRequirementsOpen] = useState(false)
  const [topicsOpen, setTopicsOpen] = useState(false)
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
        <label className="flex items-center gap-1.5 text-xs text-text-secondary">
          Renk
          <input
            type="color"
            value={area.color ?? DEFAULT_AREA_COLOR}
            onChange={(e) => void updateLifeAreaColor(uid, area.id, e.target.value)}
            title="Görsel Planlama Kanvası'nda bu alanın rengi"
            className="h-7 w-9 cursor-pointer rounded border border-border bg-bg p-0.5"
          />
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

      <button
        type="button"
        onClick={() => setTopicsOpen((v) => !v)}
        aria-expanded={topicsOpen}
        className="mt-4 flex w-full items-center gap-1.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary hover:text-text"
      >
        <ChevronRight
          size={ICON_SIZE}
          className={`transition-transform motion-safe:duration-150 ${topicsOpen ? 'rotate-90' : ''}`}
        />
        Konular
        <span className="font-normal normal-case tracking-normal">
          ({topicsLoading ? '…' : `${topics.length} adet`})
        </span>
      </button>
      {topicsOpen && (
        <>
          <div className="mt-2 flex flex-col gap-2">
            {topicsLoading ? (
              <SkeletonLines count={LOADING_ROW_COUNT} className="h-10" />
            ) : topics.length === 0 ? (
              <p className="text-sm text-text-secondary">Henüz konu yok.</p>
            ) : (
              topics.map((topic) => (
                <TopicRow key={topic.id} uid={uid} areaId={area.id} topic={topic} />
              ))
            )}
          </div>

          {showNewTopic ? (
            <NewTopicForm uid={uid} areaId={area.id} onDone={() => setShowNewTopic(false)} />
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowNewTopic(true)} className="mt-3">
              <Plus size={ICON_SIZE} />
              Konu ekle
            </Button>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => setRequirementsOpen((v) => !v)}
        aria-expanded={requirementsOpen}
        className="mt-4 flex w-full items-center gap-1.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary hover:text-text"
      >
        <ChevronRight
          size={ICON_SIZE}
          className={`transition-transform motion-safe:duration-150 ${requirementsOpen ? 'rotate-90' : ''}`}
        />
        Gereklilikler
        <span className="font-normal normal-case tracking-normal">
          (
          {loading
            ? '…'
            : `${requirements.length} adet, ortalama %${averageProgress(requirements)}`}
          )
        </span>
      </button>
      {requirementsOpen && (
        <>
          <div className="mt-2 flex flex-col gap-2">
            {loading ? (
              <SkeletonLines count={LOADING_ROW_COUNT} className="h-10" />
            ) : requirements.length === 0 ? (
              <p className="text-sm text-text-secondary">Henüz gereklilik yok.</p>
            ) : (
              topLevelRequirements(requirements).map((requirement) => (
                <RequirementNode
                  key={requirement.id}
                  uid={uid}
                  areaId={area.id}
                  requirement={requirement}
                  all={requirements}
                  topics={topics}
                />
              ))
            )}
          </div>

          {showNewRequirement ? (
            <NewRequirementForm
              uid={uid}
              areaId={area.id}
              topics={topics}
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
        </>
      )}
    </Card>
  )
}

function topLevelRequirements(requirements: Requirement[]): Requirement[] {
  return requirements.filter((r) => !r.parentRequirementId)
}

function childrenOf(requirements: Requirement[], parentId: string): Requirement[] {
  return requirements.filter((r) => r.parentRequirementId === parentId)
}

/**
 * Gerekliliğin ilerleme oranı: alt gerekliliği varsa Task'taki gibi alttan üste toplanır
 * (çocukların ortalaması); yaprak ise kendi `currentValue`/`targetMetric` oranı kullanılır.
 */
function requirementProgress(requirement: Requirement, all: Requirement[]): number {
  const kids = childrenOf(all, requirement.id)
  if (kids.length > 0) {
    return Math.round(
      kids.reduce((sum, k) => sum + requirementProgress(k, all), 0) / kids.length,
    )
  }
  return requirement.targetMetric > 0
    ? Math.min(
        PROGRESS_MAX_PERCENT,
        Math.round((requirement.currentValue / requirement.targetMetric) * PROGRESS_MAX_PERCENT),
      )
    : 0
}

function averageProgress(requirements: Requirement[]): number {
  const topLevel = topLevelRequirements(requirements)
  if (topLevel.length === 0) return 0
  return Math.round(
    topLevel.reduce((sum, r) => sum + requirementProgress(r, requirements), 0) / topLevel.length,
  )
}

function RequirementNode({
  uid,
  areaId,
  requirement,
  all,
  topics,
  depth = 0,
}: {
  uid: string
  areaId: string
  requirement: Requirement
  /** Bu alanın tüm gereklilikleri — alt/üst ilişkisini kurmak için. */
  all: Requirement[]
  /** Konu badge'i ve alt gereklilik formundaki "Konu" seçici için. */
  topics: Topic[]
  depth?: number
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [showAddChild, setShowAddChild] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { tasks, index } = useTaskHierarchy()
  const linkedTasks = tasks.filter((t) => effectiveRequirementId(t, index) === requirement.id)
  const linkedDone = linkedTasks.filter((t) => t.status === 'done').length
  const kids = childrenOf(all, requirement.id)
  const isParent = kids.length > 0
  const progress = requirementProgress(requirement, all)

  async function handleDelete() {
    if (isParent) {
      setError('Önce alt gereklilikleri sil.')
      setConfirmingDelete(false)
      return
    }
    await deleteRequirement(uid, areaId, requirement.id)
  }

  return (
    <div
      className={depth > 0 ? 'border-l-2 border-border pl-3' : undefined}
      style={depth > 0 ? { marginLeft: `${depth * DEPTH_INDENT_REM}rem` } : undefined}
    >
      <div className="rounded-lg border border-border bg-bg/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm text-text">{requirement.name}</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="neutral">{REQUIREMENT_TYPE_LABELS[requirement.type]}</Badge>
              {requirement.topicId && (
                <Badge variant="neutral">
                  {topics.find((t) => t.id === requirement.topicId)?.name ?? 'konu'}
                </Badge>
              )}
              {requirement.status && (
                <Badge variant={STATUS_BADGE_VARIANT[requirement.status]}>
                  {REQUIREMENT_STATUS_LABELS[requirement.status]}
                </Badge>
              )}
              {isParent && <Badge variant="primary">{kids.length} alt gereklilik</Badge>}
              {linkedTasks.length > 0 && (
                <Badge variant="primary">
                  {linkedDone}/{linkedTasks.length} bağlı iş tamamlandı
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddChild((v) => !v)}
              aria-label={`${requirement.name}: alt gereklilik ekle`}
              title="Alt gereklilik ekle"
            >
              <Plus size={ICON_SIZE} />
            </Button>
            {confirmingDelete ? (
              <div className="flex items-center gap-1 text-xs">
                <Button variant="danger" size="sm" onClick={() => void handleDelete()}>
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
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/60">
            <div
              className="h-full rounded-full bg-primary transition-all motion-safe:duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {isParent ? (
            <span className="text-xs text-text-secondary">%{progress} (alt gerekliliklerden)</span>
          ) : (
            <>
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
            </>
          )}
        </div>
        {!isParent && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1 text-xs text-text-secondary">
              Durum
              <select
                value={requirement.status ?? ''}
                onChange={(e) =>
                  void updateRequirementDetails(uid, areaId, requirement.id, {
                    status: (e.target.value || '') as RequirementStatus | '',
                  })
                }
                className="rounded-lg border border-border bg-bg px-1.5 py-0.5 text-xs text-text"
              >
                <option value="">—</option>
                {REQUIREMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {REQUIREMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1 text-xs text-text-secondary">
              Maliyet
              <input
                type="number"
                min={0}
                placeholder="TRY"
                defaultValue={requirement.estimatedCost ?? ''}
                onBlur={(e) =>
                  void updateRequirementDetails(uid, areaId, requirement.id, {
                    estimatedCost: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                className="w-20 rounded-lg border border-border bg-bg px-1.5 py-0.5 text-xs text-text"
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-text-secondary">
              Kaynak link
              <input
                type="url"
                placeholder="https://…"
                defaultValue={requirement.sourceUrl ?? ''}
                onBlur={(e) =>
                  void updateRequirementDetails(uid, areaId, requirement.id, {
                    sourceUrl: e.target.value.trim(),
                  })
                }
                className="w-36 rounded-lg border border-border bg-bg px-1.5 py-0.5 text-xs text-text"
              />
            </label>
          </div>
        )}
      </div>

      {showAddChild && (
        <div className="mt-2">
          <NewRequirementForm
            uid={uid}
            areaId={areaId}
            topics={topics}
            parentRequirementId={requirement.id}
            onDone={() => setShowAddChild(false)}
          />
        </div>
      )}

      {kids.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {kids.map((child) => (
            <RequirementNode
              key={child.id}
              uid={uid}
              areaId={areaId}
              requirement={child}
              all={all}
              topics={topics}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NewRequirementForm({
  uid,
  areaId,
  topics,
  parentRequirementId,
  onDone,
}: {
  uid: string
  areaId: string
  topics: Topic[]
  /** Verilirse yeni gereklilik bu gerekliliğin altına eklenir. */
  parentRequirementId?: string
  onDone: () => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<RequirementType>('bilgi')
  const [targetMetric, setTargetMetric] = useState('1')
  const [unit, setUnit] = useState('')
  const [topicId, setTopicId] = useState('')
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
      parentRequirementId,
      topicId: topicId || undefined,
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
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        Konu
        <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className={inputClass}>
          <option value="">—</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
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

function TopicRow({ uid, areaId, topic }: { uid: string; areaId: string; topic: Topic }) {
  const navigate = useNavigate()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(topic.name)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  async function handleRename() {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== topic.name) {
      await renameTopic(uid, areaId, topic.id, trimmed)
    } else {
      setNameDraft(topic.name)
    }
    setEditingName(false)
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/50 p-3">
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
          className="flex items-center gap-2 text-left text-sm text-text"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <BookOpen size={ICON_SIZE} />
          </span>
          {topic.name}
        </button>
      )}
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="sm" onClick={() => navigate(`/hayat-alanlari/${areaId}/konu/${topic.id}`)}>
          Çalışma ortamına git
          <ChevronRight size={ICON_SIZE} />
        </Button>
        {confirmingDelete ? (
          <div className="flex items-center gap-1 text-xs">
            <Button variant="danger" size="sm" onClick={() => void deleteTopic(uid, areaId, topic.id)}>
              Sil
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Vazgeç
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={ICON_SIZE} />
          </Button>
        )}
      </div>
    </div>
  )
}

function NewTopicForm({
  uid,
  areaId,
  onDone,
}: {
  uid: string
  areaId: string
  onDone: () => void
}) {
  const [name, setName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await createTopic(uid, areaId, trimmed)
    onDone()
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-3 flex flex-wrap items-end gap-2">
      <label className="flex flex-1 flex-col gap-1 text-xs text-text-secondary">
        Ad
        <input
          ref={nameInputRef}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ör. Atölye Kurma"
          className={inputClass}
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
