import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { GitBranchPlus, Lock, Maximize, Plus, Shapes, Unlock, ZoomIn, ZoomOut } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useTaskHierarchy } from '../../hooks/useTaskHierarchy'
import { useSettingsStore } from '../../stores/settingsStore'
import {
  createTasksBatch,
  newTaskId,
  updateTaskDependencies,
  updateTaskFields,
  updateTaskLock,
} from '../../services/repositories/tasksRepository'
import { BREAKDOWN_SCALES, planBreakdown } from '../../lib/autoPlanner'
import { checkDependencyLink, withDependency } from '../../lib/dependencyLinking'
import { playConnectSound } from '../../lib/canvasSound'
import { effectiveLifeAreaId, overlapsRange } from '../../lib/taskHierarchy'
import {
  boundingRange,
  dependencyEdgeSides,
  inferDependencyType,
  layoutNodes,
  panView,
  timeRatio,
  zoomView,
  type CanvasNode,
  type EdgeSide,
} from '../../lib/canvasLayout'
import type { DateRange } from '../../lib/dateRange'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import {
  PLANNING_SCALES,
  PLANNING_SCALE_LABELS,
  type PlanningScale,
  type Task,
} from '../../types/domain'
import { GoalForm } from '../takvim/GoalForm'

const LANE_HEIGHT_PX = 56
const NODE_HEIGHT_PX = 40
const NODE_TOP_OFFSET_PX = (LANE_HEIGHT_PX - NODE_HEIGHT_PX) / 2
const CURVE_OFFSET_PX = 36
const HANDLE_SIZE_PX = 10
const ICON_SIZE = 14
const LABEL_COLUMN_PX = 64
const PERCENT = 100

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOUR_MS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND
const MIN_VIEW_DURATION_HOURS = 2
const MIN_VIEW_DURATION_MS = MIN_VIEW_DURATION_HOURS * HOUR_MS
const WHEEL_ZOOM_IN_FACTOR = 0.85
const WHEEL_ZOOM_OUT_FACTOR = 1 / WHEEL_ZOOM_IN_FACTOR
const BUTTON_ZOOM_IN_FACTOR = 0.6
const BUTTON_ZOOM_OUT_FACTOR = 1 / BUTTON_ZOOM_IN_FACTOR
const DEFAULT_WINDOW_YEARS = 3
const CENTER_RATIO = 0.5

interface Point {
  x: number
  y: number
}

interface RowLayout {
  scale: PlanningScale
  nodes: CanvasNode[]
  top: number
  height: number
}

function curvePath(from: Point, to: Point): string {
  return `M ${from.x},${from.y} C ${from.x + CURVE_OFFSET_PX},${from.y} ${to.x - CURVE_OFFSET_PX},${to.y} ${to.x},${to.y}`
}

/**
 * Görsel Planlama Kanvası: bir hayat alanının tüm işlerini (3 Yıl'dan Saat'e, sabit ölçek
 * "swimlane"leri halinde) TEK, sürekli bir zaman ekseninde gösterir. Harita gibi zoom/pan
 * edilir — ayrı bir ölçek sekmesi ya da "içine gir" adımı yoktur, zoom'un kendisi derinliği
 * belirler. Sürükle-bağla ile FS/SS/FF/SF bağımlılığı kurulur, sürükleyerek zaman değişir
 * (kilitli değilse), kutu üzerinden "planı parçala" tetiklenir. Bkz. `lib/canvasLayout.ts`.
 */
export function PlanningCanvas({ areaId }: { areaId: string }) {
  const uid = useUid()
  const settings = useSettingsStore((s) => s.settings)
  const { tasks, index } = useTaskHierarchy()
  const containerRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<{ clientX: number; view: DateRange } | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [view, setView] = useState<DateRange | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addScale, setAddScale] = useState<PlanningScale>('year3')
  const [showAddForm, setShowAddForm] = useState(false)
  const [connecting, setConnecting] = useState<{
    taskId: string
    side: EdgeSide
    point: Point
  } | null>(null)
  const [previewDeltaMs, setPreviewDeltaMs] = useState<{ taskId: string; deltaMs: number } | null>(
    null,
  )

  const areaTasks = useMemo(
    () => tasks.filter((t) => effectiveLifeAreaId(t, index) === areaId),
    [tasks, index, areaId],
  )
  const bounds = useMemo(() => {
    const range = boundingRange(areaTasks)
    if (range) return range
    const now = new Date()
    const fallbackEnd = new Date(now)
    fallbackEnd.setFullYear(fallbackEnd.getFullYear() + DEFAULT_WINDOW_YEARS)
    return { start: now, end: fallbackEnd }
  }, [areaTasks])

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
      setView((v) => zoomView(v ?? bounds, cursorRatio, factor, MIN_VIEW_DURATION_MS, bounds))
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [bounds])

  // `view`, kullanıcı zoom/pan yapana kadar null'dur — o ana kadar her render'da alanın güncel
  // sınırlarına (bounds) düşer, veri yüklendikçe otomatik genişler. Kullanıcı etkileşince kalıcı olur.
  const currentView: DateRange = view ?? bounds

  const rows: RowLayout[] = PLANNING_SCALES.reduce<RowLayout[]>((acc, scale) => {
    const items = areaTasks.filter(
      (t) => t.scale === scale && overlapsRange(t, currentView.start, currentView.end),
    )
    const nodes = layoutNodes(items, currentView)
    const laneCount = nodes.reduce((max, n) => Math.max(max, n.lane + 1), 1)
    const height = laneCount * LANE_HEIGHT_PX
    const previous = acc[acc.length - 1]
    const top = previous ? previous.top + previous.height : 0
    return [...acc, { scale, nodes, top, height }]
  }, [])
  const totalHeight = rows.reduce((sum, r) => sum + r.height, 0)

  const nodeByTaskId = new Map<string, { node: CanvasNode; top: number }>()
  for (const row of rows) {
    for (const node of row.nodes) nodeByTaskId.set(node.task.id, { node, top: row.top })
  }

  function nodeCenter(taskId: string, side: EdgeSide): Point | null {
    const entry = nodeByTaskId.get(taskId)
    if (!entry) return null
    const ratio = side === 'start' ? entry.node.left : entry.node.left + entry.node.width
    return {
      x: ratio * containerWidth,
      y: entry.top + entry.node.lane * LANE_HEIGHT_PX + NODE_TOP_OFFSET_PX + NODE_HEIGHT_PX / 2,
    }
  }

  function commitConnection(
    predecessorId: string,
    successorId: string,
    sides: { fromSide: EdgeSide; toSide: EdgeSide },
  ) {
    const successor = index.get(successorId)
    if (!successor) return
    const check = checkDependencyLink(tasks, predecessorId, successorId)
    if (!check.ok) {
      setError(check.reason)
      return
    }
    const type = inferDependencyType(sides.fromSide, sides.toSide)
    void updateTaskDependencies(uid, successorId, withDependency(successor, predecessorId, type))
    if (settings.canvas.soundEnabled) playConnectSound()
    setError(null)
  }

  function handleHandlePointerDown(
    e: ReactPointerEvent<HTMLButtonElement>,
    taskId: string,
    side: EdgeSide,
  ) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setConnecting({ taskId, side, point: { x: e.clientX - rect.left, y: e.clientY - rect.top } })
  }

  function handleHandlePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!connecting) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setConnecting({ ...connecting, point: { x: e.clientX - rect.left, y: e.clientY - rect.top } })
  }

  function handleHandlePointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!connecting) return
    const target = document.elementFromPoint(e.clientX, e.clientY)
    const targetEl = target?.closest<HTMLElement>('[data-canvas-task-id]')
    setConnecting(null)
    if (!targetEl) return
    const targetId = targetEl.dataset.canvasTaskId
    if (!targetId || targetId === connecting.taskId) return
    const targetRect = targetEl.getBoundingClientRect()
    const toSide: EdgeSide = e.clientX - targetRect.left < targetRect.width / 2 ? 'start' : 'end'
    commitConnection(connecting.taskId, targetId, { fromSide: connecting.side, toSide })
  }

  function handleBodyPointerDown(e: ReactPointerEvent<HTMLDivElement>, task: Task) {
    if (task.scaleLocked) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.dataset.dragStartX = String(e.clientX)
    setPreviewDeltaMs({ taskId: task.id, deltaMs: 0 })
  }

  function handleBodyPointerMove(e: ReactPointerEvent<HTMLDivElement>, task: Task) {
    if (!previewDeltaMs || previewDeltaMs.taskId !== task.id || containerWidth === 0) return
    const startX = Number(e.currentTarget.dataset.dragStartX ?? e.clientX)
    const deltaPx = e.clientX - startX
    const durationMs = currentView.end.getTime() - currentView.start.getTime()
    setPreviewDeltaMs({ taskId: task.id, deltaMs: (deltaPx / containerWidth) * durationMs })
  }

  function handleBodyPointerUp(task: Task) {
    if (!previewDeltaMs || previewDeltaMs.taskId !== task.id) return
    const deltaMs = previewDeltaMs.deltaMs
    setPreviewDeltaMs(null)
    if (Math.abs(deltaMs) < 1) return
    const newStart = new Date(new Date(task.startAt).getTime() + deltaMs)
    const newEnd = new Date(new Date(task.endAt).getTime() + deltaMs)
    void updateTaskFields(uid, task.id, {
      startAt: newStart.toISOString(),
      endAt: newEnd.toISOString(),
    })
  }

  function handleContainerPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    e.currentTarget.setPointerCapture(e.pointerId)
    panRef.current = { clientX: e.clientX, view: currentView }
  }

  function handleContainerPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!panRef.current || containerWidth === 0) return
    const { clientX, view: startView } = panRef.current
    const deltaPx = e.clientX - clientX
    const durationMs = startView.end.getTime() - startView.start.getTime()
    const deltaMs = -(deltaPx / containerWidth) * durationMs
    setView(panView(startView, deltaMs, bounds))
  }

  function handleContainerPointerUp() {
    panRef.current = null
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

  function zoomByButton(factor: number) {
    setView((v) => zoomView(v ?? bounds, CENTER_RATIO, factor, MIN_VIEW_DURATION_MS, bounds))
  }

  const nowRatio = timeRatio(new Date(), currentView)
  const showNow = new Date() >= currentView.start && new Date() <= currentView.end

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
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
        </div>
        <div className="flex items-center gap-1">
          <select
            value={addScale}
            onChange={(e) => setAddScale(e.target.value as PlanningScale)}
            className="rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text"
            aria-label="Eklenecek işin ölçeği"
          >
            {PLANNING_SCALES.map((s) => (
              <option key={s} value={s}>
                {PLANNING_SCALE_LABELS[s]}
              </option>
            ))}
          </select>
          <Button variant="primary" size="sm" onClick={() => setShowAddForm((v) => !v)}>
            <Plus size={ICON_SIZE} />
            İş ekle
          </Button>
        </div>
      </div>

      {error && (
        <p
          role="status"
          className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs text-text"
        >
          {error}
        </p>
      )}

      {showAddForm && (
        <GoalForm
          uid={uid}
          scale={addScale}
          defaultLifeAreaId={areaId}
          defaultRange={currentView}
          onDone={() => setShowAddForm(false)}
        />
      )}

      {areaTasks.length === 0 ? (
        <EmptyState
          icon={Shapes}
          title="Bu hayat alanında henüz iş yok"
          description="Yukarıdaki 'İş ekle' ile bir 3 Yıllık hedef oluşturarak başlayabilirsin."
        />
      ) : (
        <div className="flex">
          <div className="flex shrink-0 flex-col" style={{ width: LABEL_COLUMN_PX }}>
            {rows.map((row) => (
              <div
                key={row.scale}
                className="flex items-start px-1 pt-1 text-[0.65rem] font-medium uppercase tracking-wide text-text-secondary"
                style={{ height: row.height }}
              >
                {PLANNING_SCALE_LABELS[row.scale]}
              </div>
            ))}
          </div>

          <div
            ref={containerRef}
            onPointerDown={handleContainerPointerDown}
            onPointerMove={handleContainerPointerMove}
            onPointerUp={handleContainerPointerUp}
            className="relative flex-1 cursor-grab overflow-hidden rounded-lg border border-border bg-bg/40 active:cursor-grabbing"
            style={{ height: totalHeight }}
          >
            {rows.slice(1).map((row) => (
              <div
                key={row.scale}
                aria-hidden
                className="absolute inset-x-0 border-t border-border/60"
                style={{ top: row.top }}
              />
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
              {areaTasks.flatMap((task) =>
                task.dependencies
                  .map((dep) => {
                    const sides = dependencyEdgeSides(dep.type)
                    const from = nodeCenter(dep.taskId, sides.fromSide)
                    const to = nodeCenter(task.id, sides.toSide)
                    if (!from || !to) return null
                    return (
                      <path
                        key={`${dep.taskId}-${task.id}`}
                        d={curvePath(from, to)}
                        className="fill-none stroke-text-secondary"
                        strokeWidth={1.5}
                        markerEnd="url(#canvas-arrow)"
                      />
                    )
                  })
                  .filter(Boolean),
              )}
              {connecting &&
                (() => {
                  const from = nodeCenter(connecting.taskId, connecting.side)
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

            {rows.map((row) =>
              row.nodes.map((node) => {
                const task = node.task
                const preview = previewDeltaMs?.taskId === task.id ? previewDeltaMs.deltaMs : 0
                const previewRatio = containerWidth > 0 ? preview / containerWidth : 0
                const canBreakDown = task.status !== 'done' && BREAKDOWN_SCALES.includes(task.scale)
                return (
                  <div
                    key={task.id}
                    data-canvas-task-id={task.id}
                    onPointerDown={(e) => handleBodyPointerDown(e, task)}
                    onPointerMove={(e) => handleBodyPointerMove(e, task)}
                    onPointerUp={() => handleBodyPointerUp(task)}
                    className={`group absolute flex flex-col justify-center overflow-hidden rounded-md border px-2 py-1 text-xs shadow-sm ${
                      task.status === 'done'
                        ? 'border-success/40 bg-success/15 text-text-secondary line-through'
                        : 'border-primary/40 bg-primary/15 text-text'
                    } ${task.scaleLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
                    style={{
                      left: `${(node.left + previewRatio) * PERCENT}%`,
                      width: `${node.width * PERCENT}%`,
                      top: row.top + node.lane * LANE_HEIGHT_PX + NODE_TOP_OFFSET_PX,
                      height: NODE_HEIGHT_PX,
                    }}
                  >
                    <button
                      type="button"
                      aria-label={`${task.title}: öncül olarak bağlamak için sürükle (başlangıç kenarı)`}
                      onPointerDown={(e) => handleHandlePointerDown(e, task.id, 'start')}
                      onPointerMove={handleHandlePointerMove}
                      onPointerUp={handleHandlePointerUp}
                      className="absolute -left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-primary bg-surface opacity-0 group-hover:opacity-100"
                      style={{ width: HANDLE_SIZE_PX, height: HANDLE_SIZE_PX }}
                    />
                    <button
                      type="button"
                      aria-label={`${task.title}: öncül olarak bağlamak için sürükle (bitiş kenarı)`}
                      onPointerDown={(e) => handleHandlePointerDown(e, task.id, 'end')}
                      onPointerMove={handleHandlePointerMove}
                      onPointerUp={handleHandlePointerUp}
                      className="absolute -right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-primary bg-surface opacity-0 group-hover:opacity-100"
                      style={{ width: HANDLE_SIZE_PX, height: HANDLE_SIZE_PX }}
                    />

                    <span className="truncate font-medium">{task.title}</span>
                    <span className="truncate text-[0.65rem] text-text-secondary">
                      {format(new Date(task.startAt), 'd MMM', { locale: tr })}
                    </span>

                    <div className="absolute right-0.5 top-0.5 hidden gap-0.5 group-hover:flex">
                      <button
                        type="button"
                        onClick={() => void updateTaskLock(uid, task.id, !task.scaleLocked)}
                        aria-label={
                          task.scaleLocked ? `${task.title}: kilidi aç` : `${task.title}: kilitle`
                        }
                        title={task.scaleLocked ? 'Kilidi aç' : 'Kilitle (zamanı sabitle)'}
                        className="rounded bg-surface p-0.5 text-text-secondary shadow-sm hover:text-primary"
                      >
                        {task.scaleLocked ? <Lock size={ICON_SIZE} /> : <Unlock size={ICON_SIZE} />}
                      </button>
                      {canBreakDown && (
                        <button
                          type="button"
                          onClick={() => void handleBreakdown(task)}
                          aria-label={`${task.title}: planı parçala`}
                          title="Planı parçala (alt dönemlere böl)"
                          className="rounded bg-surface p-0.5 text-text-secondary shadow-sm hover:text-primary"
                        >
                          <GitBranchPlus size={ICON_SIZE} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              }),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
