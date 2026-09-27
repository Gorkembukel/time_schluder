import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  ArrowLeft,
  GitBranchPlus,
  Lock,
  Maximize,
  Maximize2,
  Minimize2,
  Plus,
  Shapes,
  Trash2,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useTaskHierarchy } from '../../hooks/useTaskHierarchy'
import { useCanvasDraft } from '../../hooks/useCanvasDraft'
import { useSettingsStore } from '../../stores/settingsStore'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import {
  createTasksBatch,
  newTaskId,
  updateTaskDependencies,
  updateTaskFields,
} from '../../services/repositories/tasksRepository'
import { saveCanvasDraft } from '../../services/repositories/canvasDraftsRepository'
import { BREAKDOWN_SCALES, planBreakdown } from '../../lib/autoPlanner'
import { finerScale, YEAR3_SPAN_YEARS } from '../../lib/planning-engine'
import { checkDependencyLink, withDependency } from '../../lib/dependencyLinking'
import {
  boundingRange,
  dependencyEdgeSides,
  gridLines,
  inferDependencyType,
  inferScaleFromDuration,
  layoutNodes,
  panView,
  timeRatio,
  zoomView,
  type EdgeSide as LibEdgeSide,
  type GridLine,
} from '../../lib/canvasLayout'
import type { DateRange } from '../../lib/dateRange'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { DEFAULT_AREA_COLOR } from '../hayat-alanlari/AreaCard'
import {
  PLANNING_SCALE_LABELS,
  TASK_KINDS,
  type CanvasDraft,
  type CanvasDraftEdge,
  type CanvasDraftNode,
  type CanvasDraftPoolItem,
  type PlanningScale,
  type Task,
  type TaskKind,
} from '../../types/domain'

type Side = 'left' | 'right'
function toLibSide(side: Side): LibEdgeSide {
  return side === 'left' ? 'start' : 'end'
}

interface ContextLevel {
  contextId: string
  scale: PlanningScale
  parentTaskId?: string
  label: string
}

interface Point {
  x: number
  y: number
}

const HOUR_MS = 3_600_000
const MIN_VIEW_DURATION_MS = 2 * HOUR_MS
/** Zoom/pan'ın izin verdiği "şimdi"nin her iki yönündeki asgari genişlik — az veri varken bile serbestçe gezinilebilsin. */
const WORLD_SPAN_YEARS = 10
const WHEEL_ZOOM_IN_FACTOR = 0.87
const WHEEL_ZOOM_OUT_FACTOR = 1 / WHEEL_ZOOM_IN_FACTOR
const BUTTON_ZOOM_IN_FACTOR = 0.6
const BUTTON_ZOOM_OUT_FACTOR = 1 / BUTTON_ZOOM_IN_FACTOR
const CENTER_RATIO = 0.5
const PERCENT = 100

const LANE_HEIGHT_PX = 56
const NODE_HEIGHT_PX = 44
const NODE_TOP_OFFSET_PX = (LANE_HEIGHT_PX - NODE_HEIGHT_PX) / 2
const CURVE_OFFSET_PX = 36
const HANDLE_SIZE_PX = 10
/** Bağlantı çizgisine tıklayarak kaldırmak için görünmez, geniş bir "hit" alanı — ince çizgiye tam isabet gerektirmesin. */
const EDGE_HIT_WIDTH_PX = 14
const ICON_SIZE = 14
const DEFAULT_ACCENT_COLOR = '#f5a524'
const DEFAULT_HOURS = 4
const MIN_NODE_WIDTH_PX = 64
const GHOST_WIDTH_PX = 90
const GHOST_HALF_WIDTH_PX = GHOST_WIDTH_PX / 2
const MILESTONE_SIZE_PX = 18
const MILESTONE_DURATION_MS = 60_000
const MIN_RESIZE_HOURS = 0.25
const CANVAS_GAP_PX = 16
const MIN_CANVAS_HEIGHT_PX = 240
const EXPANDED_MIN_CANVAS_HEIGHT_PX = 640

function curvePath(from: Point, to: Point): string {
  return `M ${from.x},${from.y} C ${from.x + CURVE_OFFSET_PX},${from.y} ${to.x - CURVE_OFFSET_PX},${to.y} ${to.x},${to.y}`
}

function twoTone(areaColor: string, accentColor: string): string {
  return `linear-gradient(135deg, ${areaColor} 50%, ${accentColor} 50%)`
}

function gridLabel(line: GridLine): string {
  switch (line.unit) {
    case 'year':
      return format(line.date, 'yyyy')
    case 'month':
      return format(line.date, 'LLL yyyy', { locale: tr })
    case 'week':
    case 'day':
      return format(line.date, 'd MMM', { locale: tr })
    case 'hour':
      return format(line.date, 'HH:mm')
  }
}

function connectedDraftGroup(
  startId: string,
  nodes: CanvasDraftNode[],
  edges: CanvasDraftEdge[],
): CanvasDraftNode[] {
  const nodeIds = new Set(nodes.map((n) => n.id))
  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    if (!nodeIds.has(edge.fromId) || !nodeIds.has(edge.toId)) continue
    ;(adjacency.get(edge.fromId) ?? adjacency.set(edge.fromId, []).get(edge.fromId)!).push(edge.toId)
    ;(adjacency.get(edge.toId) ?? adjacency.set(edge.toId, []).get(edge.toId)!).push(edge.fromId)
  }
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const seen = new Set<string>()
  const stack = [startId]
  const group: CanvasDraftNode[] = []
  while (stack.length > 0) {
    const id = stack.pop() as string
    if (seen.has(id)) continue
    seen.add(id)
    const node = byId.get(id)
    if (!node) continue
    group.push(node)
    for (const neighbour of adjacency.get(id) ?? []) if (!seen.has(neighbour)) stack.push(neighbour)
  }
  return group
}

/**
 * Görsel Planlama Kanvası ("task-organizer-kanvas"): bir hayat alanının (ya da bir işin
 * alt-kanvasının) taslak görev zincirini kurduğunuz ve gerçek işlere kilitlediğiniz alan.
 * Üstte taslak şerit (havuzdan sürüklenen, henüz tarihe bağlanmamış, kanvasa sabit kutucuklar);
 * altta, aynı sürekli zaman ekseninde, kilitli/gerçek işlerin zaman çizelgesi. Bkz.
 * `lib/canvasLayout.ts` (saf zoom/pan/lane hesapları) ve `services/repositories/canvasDraftsRepository.ts`.
 */
export function PlanningCanvas({ areaId }: { areaId: string }) {
  const uid = useUid()
  const settings = useSettingsStore((s) => s.settings)
  const area = useLifeAreasStore((s) => s.areas.find((a) => a.id === areaId))
  const areaColor = area?.color ?? DEFAULT_AREA_COLOR
  const { tasks, index, children } = useTaskHierarchy()

  const [stack, setStack] = useState<ContextLevel[]>([
    { contextId: areaId, scale: 'year3', label: area?.name ?? 'Kanvas' },
  ])
  const currentLevel = stack[stack.length - 1]
  const { draft, loading: draftLoading } = useCanvasDraft(uid, currentLevel.contextId)

  const containerRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<{ clientX: number; view: DateRange } | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [view, setView] = useState<DateRange | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [connecting, setConnecting] = useState<{ id: string; side: Side; point: Point } | null>(
    null,
  )
  const [poolDrag, setPoolDrag] = useState<{ item: CanvasDraftPoolItem; point: Point } | null>(
    null,
  )
  const [previewRealDeltaMs, setPreviewRealDeltaMs] = useState<{
    taskId: string
    deltaMs: number
    y: number
  } | null>(null)
  const [previewResizeDeltaMs, setPreviewResizeDeltaMs] = useState<{
    taskId: string
    deltaMs: number
  } | null>(null)
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const realTasks: Task[] = useMemo(() => {
    // Ölçek artık süreden çıkarıldığı için kök seviyedeki işler tek bir ölçeğe (year3) bağlı
    // değil — hangi ölçekte kilitlenmişse o şekilde görünür.
    if (!currentLevel.parentTaskId) {
      return tasks.filter((t) => !t.parentTaskId && t.lifeAreaId === areaId)
    }
    return children.get(currentLevel.parentTaskId) ?? []
  }, [tasks, children, currentLevel, areaId])

  const bounds = useMemo(() => {
    const range = boundingRange(realTasks)
    if (range) return range
    // Boş bir alt-kanvasta varsayılan görünüm, üst işin kendi tarih aralığı olsun (rastgele
    // "şimdi + 3 yıl" değil) — kök kanvasta (üst iş yoksa) o varsayılana düşer.
    const parentTask = currentLevel.parentTaskId ? index.get(currentLevel.parentTaskId) : undefined
    if (parentTask) return { start: new Date(parentTask.startAt), end: new Date(parentTask.endAt) }
    const now = new Date()
    const fallbackEnd = new Date(now)
    fallbackEnd.setFullYear(fallbackEnd.getFullYear() + YEAR3_SPAN_YEARS)
    return { start: now, end: fallbackEnd }
  }, [realTasks, currentLevel, index])

  // Zoom/pan sınırı `bounds`tan (yalnızca kilitli işler) çok daha geniş: tek bir kısa iş
  // kilitlense bile, henüz kilitlenmemiş uzun bir taslağa ulaşmak için yeterince uzaklaşabilmelisiniz.
  const worldBounds = useMemo(() => {
    const now = new Date()
    const wideStart = new Date(now)
    wideStart.setFullYear(wideStart.getFullYear() - WORLD_SPAN_YEARS)
    const wideEnd = new Date(now)
    wideEnd.setFullYear(wideEnd.getFullYear() + WORLD_SPAN_YEARS)
    return {
      start: new Date(Math.min(wideStart.getTime(), bounds.start.getTime())),
      end: new Date(Math.max(wideEnd.getTime(), bounds.end.getTime())),
    }
  }, [bounds])

  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setContainerWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      const rect = el!.getBoundingClientRect()
      const cursorRatio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      const factor = e.deltaY < 0 ? WHEEL_ZOOM_IN_FACTOR : WHEEL_ZOOM_OUT_FACTOR
      setView((v) => zoomView(v ?? bounds, cursorRatio, factor, MIN_VIEW_DURATION_MS, worldBounds))
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [bounds, worldBounds])

  const currentView: DateRange = view ?? bounds
  const gridLinesInView = useMemo(
    () => gridLines(currentView, settings.calendarTime.weekStartsOn),
    [currentView, settings.calendarTime.weekStartsOn],
  )

  function persistDraft(next: CanvasDraft) {
    void saveCanvasDraft(uid, currentLevel.contextId, next)
  }

  // ---- havuz ----
  function addPoolItem(title: string, hours: number, accentColor: string, kind: TaskKind) {
    persistDraft({
      ...draft,
      pool: [...draft.pool, { id: newTaskId(uid), title, hours, accentColor, kind }],
    })
  }
  function removePoolItem(id: string) {
    persistDraft({ ...draft, pool: draft.pool.filter((p) => p.id !== id) })
  }
  function updatePoolItem(id: string, fields: Partial<CanvasDraftPoolItem>) {
    persistDraft({
      ...draft,
      pool: draft.pool.map((p) => (p.id === id ? { ...p, ...fields } : p)),
    })
  }

  // ---- taslak düğümler ----
  function updateDraftNode(id: string, fields: Partial<CanvasDraftNode>) {
    persistDraft({
      ...draft,
      nodes: draft.nodes.map((n) => (n.id === id ? { ...n, ...fields } : n)),
    })
  }
  /** Kanvastan kaldırma = silme değil, havuza geri dönüş — bağlantıları da (yanlışlıkla kurulmuş olabilir) temizler. */
  function returnDraftNodeToPool(id: string) {
    const node = draft.nodes.find((n) => n.id === id)
    if (!node) return
    persistDraft({
      pool: [...draft.pool, { id: node.id, title: node.title, hours: node.hours, accentColor: node.accentColor, kind: node.kind }],
      nodes: draft.nodes.filter((n) => n.id !== id),
      edges: draft.edges.filter((e) => e.fromId !== id && e.toId !== id),
    })
  }

  /** Bir bağlantıyı kaldırır — taslak-taslak kenarıysa taslaktan, gerçek bir bağımlılıksa Task.dependencies'ten. */
  function removeDraftEdge(edge: CanvasDraftEdge) {
    persistDraft({ ...draft, edges: draft.edges.filter((e) => e !== edge) })
  }
  function removeRealDependency(successor: Task, predecessorId: string) {
    void updateTaskDependencies(
      uid,
      successor.id,
      successor.dependencies.filter((d) => d.taskId !== predecessorId),
    )
  }

  // ---- konum çözümleme: taslaklar ve gerçek işler AYNI serbest kanvasta (artifact'teki gibi) ----
  // Gerçek bir iş sürüklenip bırakıldıysa kendi dikey konumunu (canvasY) hatırlar; hiç
  // sürüklenmemiş olanlar (ör. kanvas dışında oluşturulmuş) çakışmayı önlemek için otomatik
  // lane'lere sığdırılır, en alta (mevcut her şeyin altına) yerleştirilir.
  const realLayoutAll = useMemo(() => layoutNodes(realTasks, currentView), [realTasks, currentView])
  const realTasksNeedingAutoY = useMemo(
    () => realTasks.filter((t) => t.canvasY == null),
    [realTasks],
  )
  const autoLayout = useMemo(
    () => layoutNodes(realTasksNeedingAutoY, currentView),
    [realTasksNeedingAutoY, currentView],
  )
  const explicitMaxY = Math.max(
    0,
    ...draft.nodes.map((n) => n.y),
    ...realTasks.filter((t) => t.canvasY != null).map((t) => t.canvasY as number),
  )
  const autoLaneTop = explicitMaxY > 0 ? explicitMaxY + NODE_HEIGHT_PX + CANVAS_GAP_PX : 0
  const autoLaneCount = autoLayout.reduce((max, n) => Math.max(max, n.lane + 1), 0)
  const totalHeight = Math.max(
    MIN_CANVAS_HEIGHT_PX,
    autoLaneTop + autoLaneCount * LANE_HEIGHT_PX + CANVAS_GAP_PX,
  )

  interface Resolved {
    x: number
    width: number
    y: number
  }
  const resolvedById = new Map<string, Resolved>()
  for (const node of draft.nodes) {
    const isMilestone = node.kind === 'milestone'
    resolvedById.set(node.id, {
      x: node.x,
      width: isMilestone
        ? 0
        : Math.max(
            MIN_NODE_WIDTH_PX,
            (node.hours * HOUR_MS) /
              ((currentView.end.getTime() - currentView.start.getTime()) / Math.max(containerWidth, 1)),
          ),
      y: Math.max(0, node.y),
    })
  }
  const autoLaneByTaskId = new Map(autoLayout.map((n) => [n.task.id, n.lane]))
  for (const rn of realLayoutAll) {
    const task = rn.task
    const y =
      task.canvasY ??
      autoLaneTop + (autoLaneByTaskId.get(task.id) ?? 0) * LANE_HEIGHT_PX + NODE_TOP_OFFSET_PX
    resolvedById.set(task.id, {
      x: rn.left * containerWidth,
      width: task.kind === 'milestone' ? 0 : rn.width * containerWidth,
      y,
    })
  }

  function portPoint(id: string, side: Side): Point | null {
    const r = resolvedById.get(id)
    if (!r) return null
    return { x: r.x + (side === 'right' ? r.width : 0), y: r.y + NODE_HEIGHT_PX / 2 }
  }

  // ---- bağlantı kurma ----
  function commitConnection(fromId: string, fromSide: Side, toId: string, toSide: Side) {
    if (fromId === toId) return
    const fromIsReal = realTasks.some((t) => t.id === fromId)
    const toIsReal = realTasks.some((t) => t.id === toId)
    if (fromIsReal && toIsReal) {
      const successor = index.get(toId)
      if (!successor) return
      const check = checkDependencyLink(tasks, fromId, toId)
      if (!check.ok) {
        setError(check.reason)
        return
      }
      const type = inferDependencyType(toLibSide(fromSide), toLibSide(toSide))
      void updateTaskDependencies(uid, toId, withDependency(successor, fromId, type))
      setError(null)
      return
    }
    const exists = draft.edges.some(
      (e) => e.fromId === fromId && e.toId === toId && e.fromSide === fromSide && e.toSide === toSide,
    )
    if (exists) return
    persistDraft({
      ...draft,
      edges: [...draft.edges, { fromId, toId, fromSide, toSide }],
    })
    setError(null)
  }

  function handlePortPointerDown(e: ReactPointerEvent<HTMLButtonElement>, id: string, side: Side) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setConnecting({ id, side, point: { x: e.clientX - rect.left, y: e.clientY - rect.top } })
  }
  function handlePortPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!connecting) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setConnecting({ ...connecting, point: { x: e.clientX - rect.left, y: e.clientY - rect.top } })
  }
  function handlePortPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!connecting) return
    const target = document.elementFromPoint(e.clientX, e.clientY)
    const targetEl = target?.closest<HTMLElement>('[data-canvas-id]')
    setConnecting(null)
    if (!targetEl?.dataset.canvasId) return
    const targetId = targetEl.dataset.canvasId
    if (targetId === connecting.id) return
    const targetRect = targetEl.getBoundingClientRect()
    const toSide: Side = e.clientX - targetRect.left < targetRect.width / 2 ? 'left' : 'right'
    commitConnection(connecting.id, connecting.side, targetId, toSide)
  }

  // ---- taslak düğümü sürükleme (bağlı kilitsiz zincir birlikte, kanvasta piksel olarak) ----
  function handleDraftBodyPointerDown(e: ReactPointerEvent<HTMLDivElement>, node: CanvasDraftNode) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const startClientX = e.clientX
    const startClientY = e.clientY
    const group = connectedDraftGroup(node.id, draft.nodes, draft.edges).map((n) => ({
      id: n.id,
      startX: n.x,
      startY: n.y,
    }))
    let latest = draft
    function onMove(ev: PointerEvent) {
      const deltaX = ev.clientX - startClientX
      const deltaY = ev.clientY - startClientY
      latest = {
        ...latest,
        nodes: latest.nodes.map((n) => {
          const g = group.find((x) => x.id === n.id)
          if (!g) return n
          return {
            ...n,
            x: g.startX + deltaX,
            y: Math.max(0, g.startY + deltaY),
          }
        }),
      }
      persistDraft(latest)
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ---- gerçek işi sürükleyerek yeniden zamanlama (önizleme; bırakınca kaydedilir) ----
  function handleRealBodyPointerDown(e: ReactPointerEvent<HTMLDivElement>, task: Task) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const startClientX = e.clientX
    const startClientY = e.clientY
    const startY = resolvedById.get(task.id)?.y ?? 0
    const durationMs = currentView.end.getTime() - currentView.start.getTime()
    const mpp = containerWidth > 0 ? durationMs / containerWidth : 0
    setPreviewRealDeltaMs({ taskId: task.id, deltaMs: 0, y: startY })
    function onMove(ev: PointerEvent) {
      setPreviewRealDeltaMs({
        taskId: task.id,
        deltaMs: (ev.clientX - startClientX) * mpp,
        y: Math.max(0, startY + (ev.clientY - startClientY)),
      })
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setPreviewRealDeltaMs((prev) => {
        if (prev && (Math.abs(prev.deltaMs) >= 1 || prev.y !== startY)) {
          const newStart = new Date(new Date(task.startAt).getTime() + prev.deltaMs)
          const newEnd = new Date(new Date(task.endAt).getTime() + prev.deltaMs)
          void updateTaskFields(uid, task.id, {
            startAt: newStart.toISOString(),
            endAt: newEnd.toISOString(),
            canvasY: prev.y,
          })
        }
        return null
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ---- taslak kutucuğu sağ kenarından yatayda boyutlandırma: süre (ve dolayısıyla ölçek) canlı değişir ----
  function handleDraftResizePointerDown(e: ReactPointerEvent<HTMLDivElement>, node: CanvasDraftNode) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const startClientX = e.clientX
    const startHours = node.hours
    const durationMs = currentView.end.getTime() - currentView.start.getTime()
    const mpp = containerWidth > 0 ? durationMs / containerWidth : 0
    let latest = draft
    function onMove(ev: PointerEvent) {
      const deltaHours = ((ev.clientX - startClientX) * mpp) / HOUR_MS
      const hours = Math.max(MIN_RESIZE_HOURS, startHours + deltaHours)
      latest = {
        ...latest,
        nodes: latest.nodes.map((n) => (n.id === node.id ? { ...n, hours } : n)),
      }
      persistDraft(latest)
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ---- gerçek işi sağ kenarından boyutlandırma: bitiş tarihi ve buna bağlı ölçek güncellenir ----
  function handleRealResizePointerDown(e: ReactPointerEvent<HTMLDivElement>, task: Task) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const startClientX = e.clientX
    const durationMs = currentView.end.getTime() - currentView.start.getTime()
    const mpp = containerWidth > 0 ? durationMs / containerWidth : 0
    setPreviewResizeDeltaMs({ taskId: task.id, deltaMs: 0 })
    function onMove(ev: PointerEvent) {
      setPreviewResizeDeltaMs({ taskId: task.id, deltaMs: (ev.clientX - startClientX) * mpp })
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setPreviewResizeDeltaMs((prev) => {
        if (prev && Math.abs(prev.deltaMs) >= 1) {
          const start = new Date(task.startAt)
          const minEnd = new Date(start.getTime() + MIN_RESIZE_HOURS * HOUR_MS)
          const requestedEnd = new Date(new Date(task.endAt).getTime() + prev.deltaMs)
          const end = requestedEnd < minEnd ? minEnd : requestedEnd
          const scale = inferScaleFromDuration(end.getTime() - start.getTime(), settings.canvas.scaleThresholds)
          void updateTaskFields(uid, task.id, { endAt: end.toISOString(), scale })
        }
        return null
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ---- havuzdan kanvasa sürükle (snap yok) ----
  function handlePoolPointerDown(e: ReactPointerEvent<HTMLElement>, item: CanvasDraftPoolItem) {
    e.preventDefault()
    setPoolDrag({ item, point: { x: e.clientX, y: e.clientY } })
    function onMove(ev: PointerEvent) {
      setPoolDrag({ item, point: { x: ev.clientX, y: ev.clientY } })
    }
    function onUp(ev: PointerEvent) {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const rect = containerRef.current?.getBoundingClientRect()
      setPoolDrag(null)
      if (!rect) return
      const overCanvas =
        ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom
      if (!overCanvas) return
      const x = ev.clientX - rect.left - GHOST_HALF_WIDTH_PX
      const y = Math.max(0, ev.clientY - rect.top - NODE_HEIGHT_PX / 2)
      persistDraft({
        pool: draft.pool.filter((p) => p.id !== item.id),
        nodes: [
          ...draft.nodes,
          { id: item.id, title: item.title, hours: item.hours, x, y, accentColor: item.accentColor, kind: item.kind },
        ],
        edges: draft.edges,
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ---- pan (boşluğu sürükle) ----
  function handleContainerPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    e.currentTarget.setPointerCapture(e.pointerId)
    panRef.current = { clientX: e.clientX, view: currentView }
  }
  function handleContainerPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!panRef.current || containerWidth === 0) return
    const { clientX, view: startView } = panRef.current
    const deltaMs = (-(e.clientX - clientX) * (startView.end.getTime() - startView.start.getTime())) / containerWidth
    setView(panView(startView, deltaMs, worldBounds))
  }
  function handleContainerPointerUp() {
    panRef.current = null
  }

  // ---- kilitle: taslağı gerçek bir işe dönüştürür ----
  async function lockDraftNode(node: CanvasDraftNode) {
    const isMilestone = node.kind === 'milestone'
    const startAt = new Date(currentView.start.getTime() + (node.x / Math.max(containerWidth, 1)) * (currentView.end.getTime() - currentView.start.getTime()))
    const endAt = new Date(startAt.getTime() + (isMilestone ? MILESTONE_DURATION_MS : node.hours * HOUR_MS))
    // Kilometre taşının süresi yok — bulunduğu kanvas seviyesine (bağlama) aittir. Görevin ölçeği
    // ise hangi derinlikte oluşturulduğundan bağımsız, kendi süresinden çıkarılır.
    const scale = isMilestone
      ? currentLevel.scale
      : inferScaleFromDuration(node.hours * HOUR_MS, settings.canvas.scaleThresholds)
    const id = newTaskId(uid)
    const newTask: Task = {
      id,
      title: node.title,
      scale,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      parentTaskId: currentLevel.parentTaskId,
      lifeAreaId: currentLevel.parentTaskId ? undefined : areaId,
      status: 'planned',
      dependencies: [],
      bufferMinutes: 0,
      detailLevel: 'detailed',
      accentColor: node.accentColor,
      kind: node.kind,
      canvasY: node.y,
    }

    // Bu taslağa değen kenarları çöz: karşı taraf gerçek bir işse hemen bağımlılığa dönüştür,
    // hâlâ taslaksa kenarı yeni gerçek id'yle güncelleyip taslakta bırak (o taraf kilitlenince tamamlanır).
    const remainingEdges: CanvasDraftEdge[] = []
    for (const edge of draft.edges) {
      const touches = edge.fromId === node.id || edge.toId === node.id
      if (!touches) {
        remainingEdges.push(edge)
        continue
      }
      const otherId = edge.fromId === node.id ? edge.toId : edge.fromId
      const otherIsReal = realTasks.some((t) => t.id === otherId)
      if (otherIsReal) {
        const predecessorId = edge.fromId === node.id ? id : otherId
        const successorId = edge.fromId === node.id ? otherId : id
        const successorTask = successorId === id ? newTask : index.get(successorId)
        if (successorTask) {
          const type = inferDependencyType(toLibSide(edge.fromSide), toLibSide(edge.toSide))
          if (successorId === id) {
            newTask.dependencies = withDependency(newTask, predecessorId, type)
          } else {
            void updateTaskDependencies(uid, successorId, withDependency(successorTask, predecessorId, type))
          }
        }
      } else {
        remainingEdges.push({
          fromId: edge.fromId === node.id ? id : edge.fromId,
          toId: edge.toId === node.id ? id : edge.toId,
          fromSide: edge.fromSide,
          toSide: edge.toSide,
        })
      }
    }

    await createTasksBatch(uid, [newTask])
    persistDraft({
      pool: draft.pool,
      nodes: draft.nodes.filter((n) => n.id !== node.id),
      edges: remainingEdges,
    })
  }

  async function handleBreakdown(task: Task) {
    const drafts = planBreakdown({
      tasks,
      now: new Date(),
      weekStartsOn: settings.calendarTime.weekStartsOn,
      detailWindowDays: settings.planningEngine.detailWindowDays,
      newId: () => newTaskId(uid),
      rootIds: [task.id],
    })
    if (drafts.length === 0) {
      setError(`"${task.title}": kırılacak yeni dönem yok.`)
      return
    }
    setError(null)
    await createTasksBatch(uid, drafts)
  }

  function enterSubCanvas(task: Task) {
    const childScale = finerScale(task.scale)
    if (!childScale) return
    setStack((s) => [...s, { contextId: task.id, scale: childScale, parentTaskId: task.id, label: task.title }])
    setView(null)
  }
  function exitToLevel(i: number) {
    setStack((s) => s.slice(0, i + 1))
    setView(null)
  }

  function zoomByButton(factor: number) {
    setView((v) => zoomView(v ?? bounds, CENTER_RATIO, factor, MIN_VIEW_DURATION_MS, worldBounds))
  }

  const nowRatio = timeRatio(new Date(), currentView)
  const showNow = new Date() >= currentView.start && new Date() <= currentView.end

  return (
    <div
      className={
        expanded
          ? 'fixed inset-4 z-50 flex flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-2xl'
          : 'flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-text-secondary">
          {stack.map((level, i) => (
            <span key={level.contextId} className="flex items-center gap-1">
              {i > 0 && <span>›</span>}
              {i === stack.length - 1 ? (
                <span className="font-semibold text-text">{level.label}</span>
              ) : (
                <button type="button" onClick={() => exitToLevel(i)} className="hover:text-text">
                  {level.label}
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {stack.length > 1 && (
            <Button variant="ghost" size="sm" onClick={() => exitToLevel(stack.length - 2)}>
              <ArrowLeft size={ICON_SIZE} />
              Yukarı çık
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => zoomByButton(BUTTON_ZOOM_OUT_FACTOR)}>
            <ZoomOut size={ICON_SIZE} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => zoomByButton(BUTTON_ZOOM_IN_FACTOR)}>
            <ZoomIn size={ICON_SIZE} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setView(bounds)}>
            <Maximize size={ICON_SIZE} />
            Tümünü gör
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <Minimize2 size={ICON_SIZE} /> : <Maximize2 size={ICON_SIZE} />}
            {expanded ? 'Küçült' : 'Büyüt'}
          </Button>
        </div>
      </div>

      {error && (
        <p role="status" className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs text-text">
          {error}
        </p>
      )}

      <PoolPanel
        pool={draft.pool}
        loading={draftLoading}
        areaColor={areaColor}
        editingPoolId={editingPoolId}
        showAddForm={showAddForm}
        onToggleAddForm={() => setShowAddForm((v) => !v)}
        onAdd={(title, hours, accentColor, kind) => {
          addPoolItem(title, hours, accentColor, kind)
          setShowAddForm(false)
        }}
        onStartEdit={setEditingPoolId}
        onCancelEdit={() => setEditingPoolId(null)}
        onSaveEdit={(id, fields) => {
          updatePoolItem(id, fields)
          setEditingPoolId(null)
        }}
        onRemove={removePoolItem}
        onPointerDownItem={handlePoolPointerDown}
      />

      <div
        ref={containerRef}
        onPointerDown={handleContainerPointerDown}
        onPointerMove={handleContainerPointerMove}
        onPointerUp={handleContainerPointerUp}
        className="relative cursor-grab overflow-hidden rounded-lg border border-border bg-bg/40 active:cursor-grabbing"
        style={{ height: expanded ? Math.max(totalHeight, EXPANDED_MIN_CANVAS_HEIGHT_PX) : totalHeight }}
      >
        {gridLinesInView.map((line) => (
          <div
            key={line.date.toISOString()}
            aria-hidden
            className="absolute inset-y-0 border-l border-dashed border-border/70"
            style={{ left: `${timeRatio(line.date, currentView) * PERCENT}%` }}
          >
            <span className="absolute top-1 left-1 whitespace-nowrap text-[0.65rem] text-text-secondary">
              {gridLabel(line)}
            </span>
          </div>
        ))}

        {showNow && (
          <div
            aria-hidden
            className="absolute inset-y-0 border-l border-dashed border-primary/50"
            style={{ left: `${nowRatio * PERCENT}%` }}
          />
        )}

        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            <marker id="canvas-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" className="fill-text-secondary" />
            </marker>
          </defs>
          {draft.edges.map((edge) => {
            const from = portPoint(edge.fromId, edge.fromSide)
            const to = portPoint(edge.toId, edge.toSide)
            if (!from || !to) return null
            const d = curvePath(from, to)
            return (
              <g key={`${edge.fromId}-${edge.toId}`} className="group">
                <path
                  d={d}
                  stroke="transparent"
                  strokeWidth={EDGE_HIT_WIDTH_PX}
                  className="pointer-events-auto cursor-pointer"
                  onClick={() => removeDraftEdge(edge)}
                >
                  <title>Bağlantıyı kaldır</title>
                </path>
                <path
                  d={d}
                  className="pointer-events-none fill-none stroke-text-secondary transition-colors group-hover:stroke-danger"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  markerEnd="url(#canvas-arrow)"
                />
              </g>
            )
          })}
          {realTasks.flatMap((task) =>
            task.dependencies
              .map((dep) => {
                const sides = dependencyEdgeSides(dep.type)
                const from = portPoint(dep.taskId, sides.fromSide === 'start' ? 'left' : 'right')
                const to = portPoint(task.id, sides.toSide === 'start' ? 'left' : 'right')
                if (!from || !to) return null
                const d = curvePath(from, to)
                return (
                  <g key={`${dep.taskId}-${task.id}`} className="group">
                    <path
                      d={d}
                      stroke="transparent"
                      strokeWidth={EDGE_HIT_WIDTH_PX}
                      className="pointer-events-auto cursor-pointer"
                      onClick={() => removeRealDependency(task, dep.taskId)}
                    >
                      <title>Bağlantıyı kaldır</title>
                    </path>
                    <path
                      d={d}
                      className="pointer-events-none fill-none stroke-text-secondary transition-colors group-hover:stroke-danger"
                      strokeWidth={1.5}
                      markerEnd="url(#canvas-arrow)"
                    />
                  </g>
                )
              })
              .filter(Boolean),
          )}
          {connecting &&
            (() => {
              const from = portPoint(connecting.id, connecting.side)
              if (!from) return null
              return (
                <path
                  d={curvePath(from, connecting.point)}
                  className="fill-none stroke-primary"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
              )
            })()}
        </svg>

        {draft.nodes.map((node) => {
          if (editingDraftId === node.id) {
            return (
              <DraftEditForm
                key={node.id}
                node={node}
                resolved={resolvedById.get(node.id)}
                onCancel={() => setEditingDraftId(null)}
                onSave={(fields) => {
                  updateDraftNode(node.id, fields)
                  setEditingDraftId(null)
                }}
              />
            )
          }
          const r = resolvedById.get(node.id)
          if (!r) return null
          const isMilestone = node.kind === 'milestone'
          const background = twoTone(areaColor, node.accentColor ?? DEFAULT_ACCENT_COLOR)
          const lockedAt = format(
            new Date(
              currentView.start.getTime() +
                (node.x / Math.max(containerWidth, 1)) *
                  (currentView.end.getTime() - currentView.start.getTime()),
            ),
            'd MMM',
            { locale: tr },
          )
          const actions = (
            <div className="absolute right-0.5 top-0.5 hidden gap-0.5 group-hover:flex">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingDraftId(node.id)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label={`${node.title}: düzenle`}
                className="rounded bg-surface p-0.5 text-text-secondary shadow-sm hover:text-primary"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void lockDraftNode(node)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label={`${node.title}: kilitle (${lockedAt} tarihine)`}
                title="Kilitle: o an cetvelin altındaki tarihe bağla, gerçek bir işe dönüştür"
                className="rounded bg-surface p-0.5 text-text-secondary shadow-sm hover:text-primary"
              >
                <Lock size={ICON_SIZE} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  returnDraftNodeToPool(node.id)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label={`${node.title}: havuza döndür`}
                title="Kanvastan kaldır, havuza geri döndür"
                className="rounded bg-surface p-0.5 text-text-secondary shadow-sm hover:text-danger"
              >
                <Undo2 size={ICON_SIZE} />
              </button>
            </div>
          )

          if (isMilestone) {
            return (
              <div
                key={node.id}
                data-canvas-id={node.id}
                onPointerDown={(e) => handleDraftBodyPointerDown(e, node)}
                className="group absolute flex cursor-grab items-center gap-1.5 active:cursor-grabbing"
                style={{ left: r.x - MILESTONE_SIZE_PX / 2, top: r.y }}
              >
                <NodePorts id={node.id} onPortDown={handlePortPointerDown} onPortMove={handlePortPointerMove} onPortUp={handlePortPointerUp} />
                <div
                  className="rotate-45 rounded-sm border border-dashed border-text-secondary/60 shadow-sm"
                  style={{ width: MILESTONE_SIZE_PX, height: MILESTONE_SIZE_PX, background }}
                />
                <div className="whitespace-nowrap rounded bg-surface/90 px-1.5 py-0.5 text-xs text-text shadow-sm">
                  {node.title} <span className="text-text-secondary">· taslak</span>
                </div>
                {actions}
              </div>
            )
          }

          return (
            <div
              key={node.id}
              data-canvas-id={node.id}
              onPointerDown={(e) => handleDraftBodyPointerDown(e, node)}
              className="group absolute flex cursor-grab flex-col justify-center overflow-hidden rounded-md border border-dashed border-text-secondary/50 px-2 py-1 text-xs text-text shadow-sm active:cursor-grabbing"
              style={{
                left: r.x,
                top: r.y,
                width: r.width,
                height: NODE_HEIGHT_PX,
                background,
              }}
            >
              <NodePorts id={node.id} onPortDown={handlePortPointerDown} onPortMove={handlePortPointerMove} onPortUp={handlePortPointerUp} />
              <span className="truncate font-medium">{node.title}</span>
              <span className="truncate text-[0.65rem]">
                {node.hours.toFixed(2).replace(/\.?0+$/, '')}s ·{' '}
                {
                  PLANNING_SCALE_LABELS[
                    inferScaleFromDuration(node.hours * HOUR_MS, settings.canvas.scaleThresholds)
                  ]
                }
              </span>
              <div
                role="separator"
                aria-label={`${node.title}: süreyi (ve ölçeği) değiştirmek için sağa/sola sürükle`}
                onPointerDown={(e) => handleDraftResizePointerDown(e, node)}
                className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize hover:bg-primary/40"
              />
              {actions}
            </div>
          )
        })}

        {realLayoutAll.map(({ task }) => {
          const r = resolvedById.get(task.id)
          if (!r) return null
          const isMilestone = task.kind === 'milestone'
          const previewing = previewRealDeltaMs?.taskId === task.id
          const previewPx = previewing && containerWidth > 0 ? previewRealDeltaMs.deltaMs : 0
          const topPx = previewing ? previewRealDeltaMs.y : r.y
          const resizingPx =
            previewResizeDeltaMs?.taskId === task.id && containerWidth > 0 ? previewResizeDeltaMs.deltaMs : 0
          const now = new Date()
          const isActiveNow = now >= new Date(task.startAt) && now < new Date(task.endAt)
          const canBreakDown = !isMilestone && task.status !== 'done' && BREAKDOWN_SCALES.includes(task.scale)
          const canOpen = !isMilestone && finerScale(task.scale) !== null
          const metaText = isMilestone
            ? format(new Date(task.startAt), 'd MMM', { locale: tr })
            : `${PLANNING_SCALE_LABELS[task.scale]} · ${format(new Date(task.startAt), 'd MMM', { locale: tr })}`
          const actions = (
            <div className="absolute right-0.5 top-0.5 hidden gap-0.5 group-hover:flex">
              {canBreakDown && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleBreakdown(task)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label={`${task.title}: planı parçala`}
                  title="Planı parçala (alt dönemlere böl)"
                  className="rounded bg-surface p-0.5 text-text-secondary shadow-sm hover:text-primary"
                >
                  <GitBranchPlus size={ICON_SIZE} />
                </button>
              )}
              {canOpen && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    enterSubCanvas(task)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label={`${task.title}: içine gir`}
                  title="İçine gir (alt-kanvas)"
                  className="rounded bg-surface p-0.5 text-text-secondary shadow-sm hover:text-primary"
                >
                  <Maximize size={ICON_SIZE} />
                </button>
              )}
            </div>
          )
          const background = twoTone(areaColor, task.accentColor ?? DEFAULT_ACCENT_COLOR)
          const statusClass =
            task.status === 'done' ? 'border-success/50 opacity-70 line-through' : 'border-primary/40'

          if (isMilestone) {
            return (
              <div
                key={task.id}
                data-canvas-id={task.id}
                onPointerDown={(e) => handleRealBodyPointerDown(e, task)}
                className={`group absolute flex cursor-grab items-center gap-1.5 active:cursor-grabbing ${isActiveNow ? 'active-now-pulse' : ''}`}
                style={{ left: r.x + previewPx - MILESTONE_SIZE_PX / 2, top: topPx }}
              >
                <NodePorts id={task.id} onPortDown={handlePortPointerDown} onPortMove={handlePortPointerMove} onPortUp={handlePortPointerUp} />
                <div
                  className={`rotate-45 rounded-sm border shadow-sm ${statusClass}`}
                  style={{ width: MILESTONE_SIZE_PX, height: MILESTONE_SIZE_PX, background }}
                />
                <div className="whitespace-nowrap rounded bg-surface/90 px-1.5 py-0.5 text-xs text-text shadow-sm">
                  {task.title} <span className="text-text-secondary">· {metaText}</span>
                </div>
                {actions}
              </div>
            )
          }

          return (
            <div
              key={task.id}
              data-canvas-id={task.id}
              onPointerDown={(e) => handleRealBodyPointerDown(e, task)}
              className={`group absolute flex cursor-grab flex-col justify-center overflow-hidden rounded-md border px-2 py-1 text-xs text-text shadow-sm active:cursor-grabbing ${statusClass} ${isActiveNow ? 'active-now-pulse' : ''}`}
              style={{
                left: r.x + previewPx,
                top: topPx,
                width: Math.max(MIN_NODE_WIDTH_PX, r.width + resizingPx),
                height: NODE_HEIGHT_PX,
                background,
              }}
            >
              <NodePorts id={task.id} onPortDown={handlePortPointerDown} onPortMove={handlePortPointerMove} onPortUp={handlePortPointerUp} />
              <span className="truncate font-medium">{task.title}</span>
              <span className="truncate text-[0.65rem]">{metaText}</span>
              <div
                role="separator"
                aria-label={`${task.title}: bitiş süresini (ve ölçeği) değiştirmek için sağa/sola sürükle`}
                onPointerDown={(e) => handleRealResizePointerDown(e, task)}
                className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize hover:bg-primary/40"
              />
              {actions}
            </div>
          )
        })}

        {realTasks.length === 0 && draft.nodes.length === 0 && draft.pool.length === 0 && !draftLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <EmptyState
              icon={Shapes}
              title="Bu bölümde henüz iş yok"
              description="Yukarıdan bir görev ekleyip aşağıdaki zaman şeridine sürükleyin, kilitleyin."
            />
          </div>
        )}
      </div>

      {poolDrag && (
        <div
          className="pointer-events-none fixed z-50 flex flex-col justify-center rounded-md border border-dashed px-2 py-1 text-xs text-text shadow-lg"
          style={{
            left: poolDrag.point.x - GHOST_HALF_WIDTH_PX,
            top: poolDrag.point.y - NODE_HEIGHT_PX / 2,
            width: GHOST_WIDTH_PX,
            height: NODE_HEIGHT_PX,
            background: twoTone(areaColor, poolDrag.item.accentColor ?? DEFAULT_ACCENT_COLOR),
          }}
        >
          <span className="truncate font-medium">{poolDrag.item.title}</span>
          <span className="text-[0.65rem]">{poolDrag.item.hours}s</span>
        </div>
      )}
    </div>
  )
}

function NodePorts({
  id,
  onPortDown,
  onPortMove,
  onPortUp,
}: {
  id: string
  onPortDown: (e: ReactPointerEvent<HTMLButtonElement>, id: string, side: Side) => void
  onPortMove: (e: ReactPointerEvent<HTMLButtonElement>) => void
  onPortUp: (e: ReactPointerEvent<HTMLButtonElement>) => void
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Öncül olarak bağlamak için sürükle (başlangıç kenarı)"
        onPointerDown={(e) => onPortDown(e, id, 'left')}
        onPointerMove={onPortMove}
        onPointerUp={onPortUp}
        className="absolute -left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-primary bg-surface opacity-0 group-hover:opacity-100"
        style={{ width: HANDLE_SIZE_PX, height: HANDLE_SIZE_PX }}
      />
      <button
        type="button"
        aria-label="Öncül olarak bağlamak için sürükle (bitiş kenarı)"
        onPointerDown={(e) => onPortDown(e, id, 'right')}
        onPointerMove={onPortMove}
        onPointerUp={onPortUp}
        className="absolute -right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-primary bg-surface opacity-0 group-hover:opacity-100"
        style={{ width: HANDLE_SIZE_PX, height: HANDLE_SIZE_PX }}
      />
    </>
  )
}

function PoolPanel({
  pool,
  loading,
  areaColor,
  editingPoolId,
  showAddForm,
  onToggleAddForm,
  onAdd,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
  onPointerDownItem,
}: {
  pool: CanvasDraftPoolItem[]
  loading: boolean
  areaColor: string
  editingPoolId: string | null
  showAddForm: boolean
  onToggleAddForm: () => void
  onAdd: (title: string, hours: number, accentColor: string, kind: TaskKind) => void
  onStartEdit: (id: string) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string, fields: Partial<CanvasDraftPoolItem>) => void
  onRemove: (id: string) => void
  onPointerDownItem: (e: ReactPointerEvent<HTMLElement>, item: CanvasDraftPoolItem) => void
}) {
  const [title, setTitle] = useState('')
  const [hours, setHours] = useState(String(DEFAULT_HOURS))
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR)
  const [kind, setKind] = useState<TaskKind>('task')
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showAddForm) titleInputRef.current?.focus()
  }, [showAddForm])

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-bg/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Havuz</h3>
        <Button variant="ghost" size="sm" onClick={onToggleAddForm}>
          <Plus size={ICON_SIZE} />
          Havuza ekle
        </Button>
      </div>

      {showAddForm && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const trimmed = title.trim()
            if (!trimmed) return
            onAdd(trimmed, Number(hours) || DEFAULT_HOURS, accentColor, kind)
            setTitle('')
            setHours(String(DEFAULT_HOURS))
          }}
        >
          <div className="flex rounded-lg border border-border p-0.5 text-xs">
            {TASK_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-md px-2 py-1 ${kind === k ? 'bg-primary text-primary-text' : 'text-text-secondary'}`}
              >
                {k === 'task' ? 'Görev' : 'Kilometre taşı'}
              </button>
            ))}
          </div>
          <input
            ref={titleInputRef}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Görev adı"
            className="min-w-[10rem] flex-1 rounded-lg border border-border bg-bg px-2 py-1 text-sm text-text"
          />
          {kind === 'task' && (
            <input
              type="number"
              min={0.5}
              step={0.5}
              required
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              aria-label="Süre (saat)"
              className="w-20 rounded-lg border border-border bg-bg px-2 py-1 text-sm text-text"
            />
          )}
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            title="Bu görev için renk"
            className="h-8 w-9 cursor-pointer rounded border border-border bg-bg p-0.5"
          />
          <Button type="submit" variant="primary" size="sm">
            Ekle
          </Button>
        </form>
      )}

      {pool.length === 0 && !loading ? (
        <p className="text-xs text-text-secondary">
          Havuz boş. Yukarıdan bir görev ekleyip aşağıdaki kanvasa sürükleyin.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {pool.map((item) =>
            editingPoolId === item.id ? (
              <PoolEditForm key={item.id} item={item} onCancel={onCancelEdit} onSave={onSaveEdit} />
            ) : (
              <li
                key={item.id}
                onPointerDown={(e) => onPointerDownItem(e, item)}
                className="group flex cursor-grab items-center gap-1.5 rounded-lg border border-dashed border-text-secondary/50 px-2 py-1 text-xs text-text active:cursor-grabbing"
                style={{ background: twoTone(areaColor, item.accentColor ?? DEFAULT_ACCENT_COLOR) }}
              >
                {item.kind === 'milestone' && (
                  <span aria-hidden className="h-2 w-2 shrink-0 rotate-45 rounded-[1px] bg-text/70" />
                )}
                <span className="font-medium">{item.title}</span>
                {item.kind !== 'milestone' && <span className="opacity-80">{item.hours}s</span>}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onStartEdit(item.id)}
                  aria-label={`${item.title}: düzenle`}
                  className="ml-1 hidden rounded bg-surface p-0.5 text-text-secondary group-hover:block"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onRemove(item.id)}
                  aria-label={`${item.title}: sil`}
                  className="hidden rounded bg-surface p-0.5 text-text-secondary group-hover:block"
                >
                  <Trash2 size={ICON_SIZE} />
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}

function PoolEditForm({
  item,
  onCancel,
  onSave,
}: {
  item: CanvasDraftPoolItem
  onCancel: () => void
  onSave: (id: string, fields: Partial<CanvasDraftPoolItem>) => void
}) {
  const [title, setTitle] = useState(item.title)
  const [hours, setHours] = useState(String(item.hours))
  const [accentColor, setAccentColor] = useState(item.accentColor ?? DEFAULT_ACCENT_COLOR)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [])

  return (
    <li>
      <form
        className="flex items-center gap-1 rounded-lg border border-primary/50 bg-surface p-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(item.id, { title: title.trim() || item.title, hours: Number(hours) || item.hours, accentColor })
        }}
      >
        <input
          ref={titleInputRef}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-24 rounded border border-border bg-bg px-1.5 py-1 text-xs text-text"
        />
        {item.kind !== 'milestone' && (
          <input
            type="number"
            min={0.5}
            step={0.5}
            required
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-14 rounded border border-border bg-bg px-1.5 py-1 text-xs text-text"
          />
        )}
        <input
          type="color"
          value={accentColor}
          onChange={(e) => setAccentColor(e.target.value)}
          className="h-7 w-8 cursor-pointer rounded border border-border bg-bg p-0.5"
        />
        <button type="submit" className="rounded p-1 text-primary hover:bg-primary/10">
          ✓
        </button>
        <button type="button" onClick={onCancel} className="rounded p-1 text-text-secondary hover:bg-border/60">
          <X size={ICON_SIZE} />
        </button>
      </form>
    </li>
  )
}

function DraftEditForm({
  node,
  resolved,
  onCancel,
  onSave,
}: {
  node: CanvasDraftNode
  resolved?: { x: number; y: number; width: number }
  onCancel: () => void
  onSave: (fields: Partial<CanvasDraftNode>) => void
}) {
  const [title, setTitle] = useState(node.title)
  const [hours, setHours] = useState(String(node.hours))
  const [accentColor, setAccentColor] = useState(node.accentColor ?? DEFAULT_ACCENT_COLOR)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [])

  return (
    <form
      onPointerDown={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ title: title.trim() || node.title, hours: Number(hours) || node.hours, accentColor })
      }}
      className="absolute z-20 flex w-48 flex-col gap-1.5 rounded-md border border-primary bg-surface p-2 text-xs shadow-lg"
      style={{ left: resolved?.x ?? node.x, top: resolved?.y ?? node.y }}
    >
      <input
        ref={titleInputRef}
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded border border-border bg-bg px-1.5 py-1 text-xs text-text"
      />
      <div className="flex items-center gap-1">
        {node.kind !== 'milestone' && (
          <>
            <input
              type="number"
              min={0.5}
              step={0.5}
              required
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-16 rounded border border-border bg-bg px-1.5 py-1 text-xs text-text"
            />
            <span className="text-text-secondary">saat</span>
          </>
        )}
        <input
          type="color"
          value={accentColor}
          onChange={(e) => setAccentColor(e.target.value)}
          className="ml-auto h-6 w-7 cursor-pointer rounded border border-border bg-bg p-0.5"
        />
      </div>
      <div className="flex justify-end gap-1">
        <button type="button" onClick={onCancel} className="rounded p-1 text-text-secondary hover:bg-border/60">
          Vazgeç
        </button>
        <button type="submit" className="rounded p-1 text-primary hover:bg-primary/10">
          Kaydet
        </button>
      </div>
    </form>
  )
}
