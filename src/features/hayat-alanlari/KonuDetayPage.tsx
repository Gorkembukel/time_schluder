import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookmarkPlus,
  ExternalLink,
  FolderPlus,
  Lightbulb,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Waypoints,
  X,
} from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { useTopics } from '../../hooks/useTopics'
import { useKnowledgeItems } from '../../hooks/useKnowledgeItems'
import { useRequirements } from '../../hooks/useRequirements'
import {
  renameTopic,
  updateTopicDescription,
  deleteTopic,
  addTopicSection,
  renameTopicSection,
  deleteTopicSection,
} from '../../services/repositories/topicsRepository'
import {
  createKnowledgeItem,
  deleteKnowledgeItem,
  updateKnowledgeItem,
} from '../../services/repositories/knowledgeItemsRepository'
import { deriveRequirementFromNote } from '../../services/repositories/requirementsRepository'
import { createTopicTemplateFromSections } from '../../services/repositories/topicTemplatesRepository'
import { KNOWLEDGE_ITEM_TYPE_ICONS, isLinkType } from '../../config/knowledge-item-types'
import {
  KNOWLEDGE_ITEM_TYPES,
  KNOWLEDGE_ITEM_TYPE_LABELS,
  REQUIREMENT_STATUSES,
  REQUIREMENT_STATUS_LABELS,
  REQUIREMENT_TYPES,
  REQUIREMENT_TYPE_LABELS,
  type KnowledgeItem,
  type KnowledgeItemType,
  type Requirement,
  type RequirementStatus,
  type RequirementType,
  type TopicSection,
} from '../../types/domain'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { Skeleton, SkeletonLines } from '../../components/Skeleton'
import { EmptyState } from '../../components/EmptyState'
import { PlanningCanvas } from '../kanvas/PlanningCanvas'

const ICON_SIZE = 14
const SMALL_ICON_SIZE = 10
const inputClass = 'rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text'

const TYPE_TINT: Record<KnowledgeItemType, string> = {
  not: 'bg-primary/5 border-primary/20',
  kisi: 'bg-success/5 border-success/20',
  'tasarim-karari': 'bg-warning/5 border-warning/20',
  link: 'bg-surface border-border',
  dokuman: 'bg-surface border-border',
}

const TYPE_ICON_TINT: Record<KnowledgeItemType, string> = {
  not: 'bg-primary/10 text-primary',
  kisi: 'bg-success/10 text-success',
  'tasarim-karari': 'bg-warning/10 text-warning',
  link: 'bg-border/60 text-text-secondary',
  dokuman: 'bg-border/60 text-text-secondary',
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function KonuDetayPage() {
  const { areaId = '', topicId = '' } = useParams()
  // `key`, farklı bir konuya geçildiğinde bileşeni tamamen yeniden kurar — aksi halde
  // aşağıdaki uncontrolled isim/açıklama input'ları bir önceki konunun değerinde kalırdı.
  return <KonuDetayInner key={topicId} areaId={areaId} topicId={topicId} />
}

function KonuDetayInner({ areaId, topicId }: { areaId: string; topicId: string }) {
  const navigate = useNavigate()
  const uid = useUid()
  const areas = useLifeAreasStore((s) => s.areas)
  const area = areas.find((a) => a.id === areaId)
  const { topics, loading: topicsLoading } = useTopics(uid, areaId)
  const topic = topics.find((t) => t.id === topicId)
  const { items, loading: itemsLoading } = useKnowledgeItems(uid)
  const { requirements } = useRequirements(uid, areaId)

  const [activeTab, setActiveTab] = useState<'notlar' | 'kanvas'>('notlar')
  const [editingName, setEditingName] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [showNewItem, setShowNewItem] = useState(false)
  const [search, setSearch] = useState('')
  const [addingSection, setAddingSection] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  useEffect(() => {
    if (editingDescription) descriptionInputRef.current?.focus()
  }, [editingDescription])

  const query = search.trim().toLowerCase()
  const visibleItems = useMemo(() => {
    if (!query) return items.filter((i) => i.topicId === topicId)
    return items.filter((i) => `${i.title} ${i.body}`.toLowerCase().includes(query))
  }, [items, topicId, query])

  const topicRequirements = requirements.filter((r) => r.topicId === topicId)
  const sections = useMemo(
    () => [...(topic?.sections ?? [])].sort((a, b) => a.order - b.order),
    [topic?.sections],
  )
  const sectionIds = new Set(sections.map((s) => s.id))
  const groupedItems = useMemo(() => {
    if (query) return null
    const groups = new Map<string, KnowledgeItem[]>()
    const unclassified: KnowledgeItem[] = []
    for (const item of visibleItems) {
      if (item.sectionId && sectionIds.has(item.sectionId)) {
        const list = groups.get(item.sectionId) ?? []
        list.push(item)
        groups.set(item.sectionId, list)
      } else {
        unclassified.push(item)
      }
    }
    return { groups, unclassified }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sectionIds her render'da yeni Set referansı alır, içeriği visibleItems/sections'tan türer
  }, [visibleItems, query, sections])

  async function handleRenameTopic() {
    const trimmed = nameInputRef.current?.value.trim() ?? ''
    if (topic && trimmed && trimmed !== topic.name) {
      await renameTopic(uid, areaId, topicId, trimmed)
    }
    setEditingName(false)
  }

  async function handleSaveDescription() {
    const trimmed = descriptionInputRef.current?.value.trim() ?? ''
    await updateTopicDescription(uid, areaId, topicId, trimmed)
    setEditingDescription(false)
  }

  async function handleDeleteTopic() {
    await deleteTopic(uid, areaId, topicId)
    navigate('/hayat-alanlari')
  }

  async function handleAddSection(title: string) {
    const trimmed = title.trim()
    if (!trimmed) return
    await addTopicSection(uid, areaId, topicId, sections, trimmed)
    setAddingSection(false)
  }

  async function handleSaveAsTemplate(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    await createTopicTemplateFromSections(uid, trimmed, sections)
    setSavingTemplate(false)
  }

  if (topicsLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (!topic) {
    return (
      <EmptyState
        icon={Search}
        title="Konu bulunamadı"
        description="Silinmiş olabilir. Hayat Alanları'na dönüp tekrar dene."
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate('/hayat-alanlari')}
        className="flex w-fit items-center gap-1 text-xs text-text-secondary hover:text-text"
      >
        <ArrowLeft size={ICON_SIZE} />
        Hayat Alanları
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="primary">{area?.name ?? 'Hayat alanı'}</Badge>
          </div>
          {editingName ? (
            <input
              ref={nameInputRef}
              defaultValue={topic.name}
              className="rounded-lg border border-border bg-bg px-2 py-1 text-xl font-bold text-text"
              onBlur={() => void handleRenameTopic()}
              onKeyDown={(e) => e.key === 'Enter' && void handleRenameTopic()}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="text-left text-2xl font-bold tracking-tight text-text"
            >
              {topic.name}
            </button>
          )}
          {editingDescription ? (
            <div className="flex max-w-lg flex-col gap-1">
              <textarea
                ref={descriptionInputRef}
                defaultValue={topic.description ?? ''}
                className={`${inputClass} min-h-16 resize-y`}
              />
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={() => void handleSaveDescription()}>
                  Kaydet
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingDescription(false)}>
                  Vazgeç
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingDescription(true)}
              className="max-w-lg text-left text-sm text-text-secondary hover:text-text"
            >
              {topic.description || 'Açıklama ekle…'}
            </button>
          )}
        </div>

        {confirmingDelete ? (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-text-secondary">Konuyu ve bilgi birimlerini sil?</span>
            <Button variant="danger" size="sm" onClick={() => void handleDeleteTopic()}>
              Sil
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Vazgeç
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={ICON_SIZE} />
            Konuyu sil
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('notlar')}
          className={`flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-semibold ${
            activeTab === 'notlar'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text'
          }`}
        >
          Bilgi birimleri
          <span className="rounded-full bg-border/60 px-1.5 py-0.5 text-xs font-medium text-text-secondary">
            {items.filter((i) => i.topicId === topicId).length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('kanvas')}
          className={`flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-semibold ${
            activeTab === 'kanvas'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text'
          }`}
        >
          <Waypoints size={ICON_SIZE} />
          Kanvas
        </button>
      </div>

      {activeTab === 'notlar' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Bilgi birimleri
            </h2>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5">
              <Search size={ICON_SIZE} className="text-text-secondary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Konu içinde ve konular arasında ara…"
                className="w-56 bg-transparent text-sm text-text outline-none"
              />
            </label>
          </div>

          {!query && (
            <div className="flex flex-wrap items-center gap-1.5">
              {sections.map((section) => (
                <SectionChip
                  key={section.id}
                  uid={uid}
                  areaId={areaId}
                  topicId={topicId}
                  sections={sections}
                  section={section}
                />
              ))}
              {addingSection ? (
                <InlineTextForm
                  placeholder="Bölüm adı"
                  submitLabel="Ekle"
                  onSubmit={(value) => void handleAddSection(value)}
                  onCancel={() => setAddingSection(false)}
                />
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setAddingSection(true)}>
                  <FolderPlus size={ICON_SIZE} />
                  Bölüm ekle
                </Button>
              )}
              {sections.length > 0 &&
                (savingTemplate ? (
                  <InlineTextForm
                    placeholder="Şablon adı"
                    submitLabel="Kaydet"
                    onSubmit={(value) => void handleSaveAsTemplate(value)}
                    onCancel={() => setSavingTemplate(false)}
                  />
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setSavingTemplate(true)}>
                    <BookmarkPlus size={ICON_SIZE} />
                    Yeni şablon olarak kaydet
                  </Button>
                ))}
            </div>
          )}

          {itemsLoading ? (
            <SkeletonLines count={3} className="h-24" />
          ) : visibleItems.length === 0 ? (
            <EmptyState
              icon={Search}
              title={query ? 'Eşleşen bilgi birimi yok' : 'Henüz bilgi birimi yok'}
              description={query ? undefined : 'Not, link, kişi ya da tasarım kararı ekleyerek başla.'}
            />
          ) : !groupedItems || sections.length === 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleItems.map((item) => (
                <KnowledgeItemCard
                  key={item.id}
                  uid={uid}
                  areaId={areaId}
                  item={item}
                  requirements={requirements}
                  sections={sections}
                  crossTopicLabel={
                    query && item.topicId !== topicId
                      ? topics.find((t) => t.id === item.topicId)?.name
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {sections.map((section) => {
                const sectionItems = groupedItems.groups.get(section.id) ?? []
                return (
                  <div key={section.id}>
                    <h3 className="mb-2 text-xs font-semibold text-text-secondary">
                      {section.title}{' '}
                      <span className="font-normal normal-case">({sectionItems.length})</span>
                    </h3>
                    {sectionItems.length === 0 ? (
                      <p className="text-xs text-text-secondary">Bu bölümde henüz bilgi birimi yok.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {sectionItems.map((item) => (
                          <KnowledgeItemCard
                            key={item.id}
                            uid={uid}
                            areaId={areaId}
                            item={item}
                            requirements={requirements}
                            sections={sections}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {groupedItems.unclassified.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-text-secondary">
                    Sınıflandırılmamış{' '}
                    <span className="font-normal normal-case">({groupedItems.unclassified.length})</span>
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {groupedItems.unclassified.map((item) => (
                      <KnowledgeItemCard
                        key={item.id}
                        uid={uid}
                        areaId={areaId}
                        item={item}
                        requirements={requirements}
                        sections={sections}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {showNewItem ? (
            <NewKnowledgeItemForm
              uid={uid}
              topicId={topicId}
              sections={sections}
              onDone={() => setShowNewItem(false)}
            />
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowNewItem(true)} className="w-fit">
              <Plus size={ICON_SIZE} />
              Bilgi birimi ekle
            </Button>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Bu konudaki gereklilikler ({topicRequirements.length})
            </h2>
            {topicRequirements.length === 0 ? (
              <p className="text-sm text-text-secondary">Bu konuya bağlı gereklilik yok.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {topicRequirements.map((r) => (
                  <Card key={r.id} className="min-w-0 p-3">
                    <p className="min-w-0 break-words text-sm text-text">{r.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="neutral">{REQUIREMENT_TYPE_LABELS[r.type]}</Badge>
                      {r.status && (
                        <Badge variant={r.status === 'yok' ? 'danger' : r.status === 'alinacak' ? 'warning' : 'success'}>
                          {REQUIREMENT_STATUS_LABELS[r.status]}
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <PlanningCanvas areaId={areaId} topicId={topicId} topicName={topic.name} />
      )}
    </div>
  )
}

function KnowledgeItemCard({
  uid,
  areaId,
  item,
  requirements,
  sections,
  crossTopicLabel,
}: {
  uid: string
  areaId: string
  item: KnowledgeItem
  /** Türetilen gerekliliklerin adını göstermek için — bu alanın tüm gereklilikleri. */
  requirements: Requirement[]
  /** Düzenleme formundaki "Bölüm" seçicisi için — konunun bölümleri. */
  sections: TopicSection[]
  crossTopicLabel?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deriving, setDeriving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const Icon = KNOWLEDGE_ITEM_TYPE_ICONS[item.type]
  const derivedRequirements = (item.derivedRequirementIds ?? [])
    .map((id) => requirements.find((r) => r.id === id))
    .filter((r): r is Requirement => Boolean(r))

  if (editing) {
    return (
      <NewKnowledgeItemForm
        uid={uid}
        topicId={item.topicId}
        sections={sections}
        initial={item}
        onDone={() => setEditing(false)}
      />
    )
  }

  if (deriving) {
    return (
      <DeriveRequirementForm
        uid={uid}
        areaId={areaId}
        note={item}
        onDone={() => setDeriving(false)}
      />
    )
  }

  const header = (
    <div className="flex items-center gap-2">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TYPE_ICON_TINT[item.type]}`}>
        <Icon size={ICON_SIZE} />
      </span>
      <Badge variant="neutral">{KNOWLEDGE_ITEM_TYPE_LABELS[item.type]}</Badge>
      {item.isExperienceNote && (
        <Badge variant="warning">
          <Lightbulb size={ICON_SIZE - 2} />
          deneyim notu
        </Badge>
      )}
      {crossTopicLabel && <Badge variant="primary">{crossTopicLabel}</Badge>}
      {isLinkType(item.type) && <ExternalLink size={ICON_SIZE} className="ml-auto text-text-secondary" />}
    </div>
  )

  const derivedFooter = derivedRequirements.length > 0 && (
    <div className="flex flex-wrap items-center gap-1 border-t border-dashed border-success/40 pt-2 text-xs text-success">
      <Sparkles size={ICON_SIZE - 2} />
      Türedi:
      {derivedRequirements.map((r) => (
        <Badge key={r.id} variant="success">
          {r.name}
        </Badge>
      ))}
    </div>
  )

  const actions = (
    <div className="mt-2 flex items-center justify-between gap-1">
      {item.isExperienceNote && derivedRequirements.length === 0 ? (
        <Button variant="ghost" size="sm" onClick={() => setDeriving(true)}>
          <Sparkles size={ICON_SIZE} />
          Gerekliliğe dönüştür
        </Button>
      ) : (
        <span />
      )}
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label="Düzenle">
          <Pencil size={ICON_SIZE} />
        </Button>
        {confirmingDelete ? (
          <>
            <Button variant="danger" size="sm" onClick={() => void deleteKnowledgeItem(uid, item.id)}>
              Sil
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Vazgeç
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)} aria-label="Sil">
            <Trash2 size={ICON_SIZE} />
          </Button>
        )}
      </div>
    </div>
  )

  if (isLinkType(item.type)) {
    return (
      <Card className={`flex min-w-0 flex-col gap-2 border p-3.5 ${TYPE_TINT[item.type]}`}>
        <a href={item.body} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-col gap-2">
          {header}
          <p className="min-w-0 break-words text-sm font-semibold text-text">{item.title}</p>
          <p className="min-w-0 truncate text-xs text-text-secondary">{hostnameOf(item.body)}</p>
        </a>
        {derivedFooter}
        {actions}
      </Card>
    )
  }

  return (
    <Card className={`flex min-w-0 flex-col gap-2 border p-3.5 ${TYPE_TINT[item.type]}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex min-w-0 flex-col gap-2 text-left"
      >
        {header}
        <p className="min-w-0 break-words text-sm font-semibold text-text">{item.title}</p>
        <p
          className={`min-w-0 break-words text-sm text-text-secondary ${expanded ? '' : 'line-clamp-4'}`}
        >
          {item.body}
        </p>
      </button>
      {derivedFooter}
      {actions}
    </Card>
  )
}

function DeriveRequirementForm({
  uid,
  areaId,
  note,
  onDone,
}: {
  uid: string
  areaId: string
  note: KnowledgeItem
  onDone: () => void
}) {
  const [name, setName] = useState(note.title)
  const [type, setType] = useState<RequirementType>('varlik-arac')
  const [status, setStatus] = useState<RequirementStatus | ''>('alinacak')
  const [targetMetric, setTargetMetric] = useState('1')
  const [unit, setUnit] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    await deriveRequirementFromNote(uid, areaId, note, {
      name: trimmedName,
      type,
      targetMetric: Number(targetMetric) || 0,
      currentValue: 0,
      unit: unit.trim(),
      status: status || undefined,
      estimatedCost: estimatedCost === '' ? undefined : Number(estimatedCost),
    })
    onDone()
  }

  return (
    <Card className="flex flex-col gap-2 border-warning/30 bg-warning/5 p-4">
      <p className="text-xs text-text-secondary">
        Kaynak not: <span className="font-medium text-text">{note.title}</span>
      </p>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-text-secondary">
          Gereklilik adı
          <input
            ref={nameRef}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Tür
          <select value={type} onChange={(e) => setType(e.target.value as RequirementType)} className={inputClass}>
            {REQUIREMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {REQUIREMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Durum
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RequirementStatus | '')}
            className={inputClass}
          >
            <option value="">—</option>
            {REQUIREMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REQUIREMENT_STATUS_LABELS[s]}
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
            placeholder="ör. adet"
            className={`${inputClass} w-24`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Tahmini maliyet (TRY)
          <input
            type="number"
            min={0}
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
            placeholder="opsiyonel"
            className={`${inputClass} w-28`}
          />
        </label>
        <Button type="submit" variant="primary" size="sm">
          <Sparkles size={ICON_SIZE} />
          Gereklilik oluştur
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Vazgeç
        </Button>
      </form>
    </Card>
  )
}

function NewKnowledgeItemForm({
  uid,
  topicId,
  sections,
  initial,
  onDone,
}: {
  uid: string
  topicId: string
  /** Konunun bölümleri — opsiyonel "Bölüm" seçicisini doldurmak için. */
  sections: TopicSection[]
  initial?: KnowledgeItem
  onDone: () => void
}) {
  const [type, setType] = useState<KnowledgeItemType>(initial?.type ?? 'not')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [sectionId, setSectionId] = useState(initial?.sectionId ?? '')
  const [isExperienceNote, setIsExperienceNote] = useState(initial?.isExperienceNote ?? false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedBody = body.trim()
    if (!trimmedTitle || !trimmedBody) return

    if (initial) {
      await updateKnowledgeItem(uid, initial.id, {
        type,
        title: trimmedTitle,
        body: trimmedBody,
        sectionId,
        isExperienceNote,
      })
    } else {
      await createKnowledgeItem(uid, {
        type,
        title: trimmedTitle,
        body: trimmedBody,
        topicId,
        sectionId: sectionId || undefined,
        isExperienceNote,
      })
    }
    onDone()
  }

  return (
    <Card className="flex flex-col gap-2 p-4">
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Tür
          <select value={type} onChange={(e) => setType(e.target.value as KnowledgeItemType)} className={inputClass}>
            {KNOWLEDGE_ITEM_TYPES.map((t) => (
              <option key={t} value={t}>
                {KNOWLEDGE_ITEM_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        {sections.length > 0 && (
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            Bölüm
            <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className={inputClass}>
              <option value="">—</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-text-secondary">
          Başlık
          <input
            ref={titleRef}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex min-w-[14rem] flex-[2] flex-col gap-1 text-xs text-text-secondary">
          {isLinkType(type) ? 'URL' : 'İçerik'}
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={isLinkType(type) ? 'https://…' : 'Not metni'}
            className={`${inputClass} min-h-10 resize-y`}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={isExperienceNote}
            onChange={(e) => setIsExperienceNote(e.target.checked)}
          />
          Bu bir deneyim notu
        </label>
        <Button type="submit" variant="primary" size="sm">
          {initial ? 'Kaydet' : 'Ekle'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Vazgeç
        </Button>
      </form>
    </Card>
  )
}

function SectionChip({
  uid,
  areaId,
  topicId,
  sections,
  section,
}: {
  uid: string
  areaId: string
  topicId: string
  /** Rename/silme işlemleri Firestore'a dizinin tamamını yazdığı için konunun güncel bölüm listesi. */
  sections: TopicSection[]
  section: TopicSection
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(section.title)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName) inputRef.current?.focus()
  }, [editingName])

  async function handleRename() {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== section.title) {
      await renameTopicSection(uid, areaId, topicId, sections, section.id, trimmed)
    } else {
      setNameDraft(section.title)
    }
    setEditingName(false)
  }

  if (editingName) {
    return (
      <input
        ref={inputRef}
        value={nameDraft}
        onChange={(e) => setNameDraft(e.target.value)}
        onBlur={() => void handleRename()}
        onKeyDown={(e) => e.key === 'Enter' && void handleRename()}
        className="rounded-full border border-border bg-bg px-2.5 py-1 text-xs text-text"
      />
    )
  }

  return (
    <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-secondary">
      <button type="button" onClick={() => setEditingName(true)} className="hover:text-text">
        {section.title}
      </button>
      {confirmingDelete ? (
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void deleteTopicSection(uid, areaId, topicId, sections, section.id)}
            className="text-danger"
          >
            Sil
          </button>
          <button type="button" onClick={() => setConfirmingDelete(false)} className="hover:text-text">
            Vazgeç
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          aria-label={`${section.title} bölümünü sil`}
          className="hover:text-danger"
        >
          <X size={SMALL_ICON_SIZE} />
        </button>
      )}
    </span>
  )
}

function InlineTextForm({
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  placeholder: string
  submitLabel: string
  onSubmit: (value: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!value.trim()) return
    onSubmit(value)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text"
      />
      <Button type="submit" variant="primary" size="sm">
        {submitLabel}
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Vazgeç
      </Button>
    </form>
  )
}
