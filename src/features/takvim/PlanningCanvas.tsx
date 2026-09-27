import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { format, subMilliseconds } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  ArrowLeft,
  GitBranchPlus,
  Lock,
  Maximize2,
  Plus,
  Shapes,
  Unlock,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
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
import { coarserScale, finerScale, scalePeriodRange } from '../../lib/planning-engine'
import { checkDependencyLink, withDependency } from '../../lib/dependencyLinking'
import { overlapsRange } from '../../lib/taskHierarchy'
import {
  dependencyEdgeSides,
  inferDependencyType,
  layoutNodes,
  subPeriodBoundaries,
  timeRatio,
  type CanvasNode,
  type EdgeSide,
} from '../../lib/canvasLayout'
import { playConnectSound } from '../../lib/canvasSound'
import type { DateRange } from '../../lib/dateRange'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { PLANNING_SCALE_LABELS, type PlanningScale, type Task } from '../../types/domain'
import { TaskBreadcrumb } from '../is-takibi/TaskBreadcrumb'
import type { HorizonScale } from './HorizonBoard'
import { GoalForm } from './GoalForm'

const LANE_HEIGHT_PX = 64
const NODE_HEIGHT_PX = 44
const NODE_TOP_OFFSET_PX = (LANE_HEIGHT_PX - NODE_HEIGHT_PX) / 2
const CURVE_OFFSET_PX = 36
const HANDLE_SIZE_PX = 10
const ICON_SIZE = 14
const MIN_CANVAS_HEIGHT_PX = 140
const PERCENT = 100

interface Point {
  x: number
  y: number
}

function nodeY(node: CanvasNode): number {
  return node.lane * LANE_HEIGHT_PX + NODE_TOP_OFFSET_PX + NODE_HEIGHT_PX / 2
}

function nodeX(node: CanvasNode, side: EdgeSide, containerWidth: number): number {
  const ratio = side === 'start' ? node.left : node.left + node.width
  return ratio * containerWidth
}

function curvePath(from: Point, to: Point): string {
  return `M ${from.x},${from.y} C ${from.x + CURVE_OFFSET_PX},${from.y} ${to.x - CURVE_OFFSET_PX},${to.y} ${to.x},${to.y}`
}

/**
 * Görsel Planlama Kanvası: hedefleri zaman eksenine yerleştirir (ölçek bandı = kesikli çizgiler),
 * sürükle-bağla ile FS/SS/FF/SF bağımlılığı kurar (kenar → kenar; bkz. canvasLayout), sürükleyerek
 * zamanını değiştirir (kilitli değilse), yerinde parçalar ve bir hedefin çocuklarına "girer" (drill-down).
 * Takvim sayfasında ağaç/liste görünümüne ek bir alternatiftir.
 */
export function PlanningCanvas({
  scale,
  referenceDate,
  weekStartsOn,
  onZoomIn,
  onZoomOut,
}: {
  scale: HorizonScale
  referenceDate: Date
  weekStartsOn: number
  onZoomIn: () => void
  onZoomOut: () => void
}) {
  const uid = useUid()
  const settings = useSettingsStore((s) => s.settings)
  const { tasks, index, children } = useTaskHierarchy()
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [connecting, setConnecting] = useState<{
    taskId: string
    side: EdgeSide
    point: Point
  } | null>(null)
  const [previewDeltaMs, setPreviewDeltaMs] = useState<{ taskId: string; deltaMs: number } | null>(
    null,
  )

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

  const focusTask = focusId ? index.get(focusId) : undefined
  // Bir hedefe "girildiğinde" (drill-down), o hedefin çocukları bir alt ölçekte gösterilir.
  const activeScale: PlanningScale = focusTask ? (finerScale(focusTask.scale) ?? focusTask.scale) : scale
  const activePeriod: DateRange = focusTask
    ? { start: new Date(focusTask.startAt), end: new Date(focusTask.endAt) }
    : scalePeriodRange(scale, referenceDate, weekStartsOn)
  const items: Task[] = focusTask
    ? (children.get(focusTask.id) ?? [])
    : tasks.filter((t) => t.scale === scale && overlapsRange(t, activePeriod.start, activePeriod.end))

  const nodes = layoutNodes(items, activePeriod)
  const boundaries = subPeriodBoundaries(activeScale, activePeriod, weekStartsOn)
  const laneCount = nodes.reduce((max, n) => Math.max(max, n.lane + 1), 1)
  const canvasHeight = Math.max(MIN_CANVAS_HEIGHT_PX, laneCount * LANE_HEIGHT_PX)
  const nodeById = new Map(nodes.map((n) => [n.task.id, n]))

  function commitConnection(predecessorId: string, successorId: string, side: {
    fromSide: EdgeSide
    toSide: EdgeSide
  }) {
    const successor = index.get(successorId)
    if (!successor) return
    const check = checkDependencyLink(tasks, predecessorId, successorId)
    if (!check.ok) {
      setError(check.reason)
      return
    }
    const type = inferDependencyType(side.fromSide, side.toSide)
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
    const startClientX = e.clientX
    e.currentTarget.dataset.dragStartX = String(startClientX)
    setPreviewDeltaMs({ taskId: task.id, deltaMs: 0 })
  }

  function handleBodyPointerMove(e: ReactPointerEvent<HTMLDivElement>, task: Task) {
    if (!previewDeltaMs || previewDeltaMs.taskId !== task.id || containerWidth === 0) return
    const startX = Number(e.currentTarget.dataset.dragStartX ?? e.clientX)
    const deltaPx = e.clientX - startX
    const periodMs = activePeriod.end.getTime() - activePeriod.start.getTime()
    const deltaMs = (deltaPx / containerWidth) * periodMs
    setPreviewDeltaMs({ taskId: task.id, deltaMs })
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

  async function handleBreakdown(task: Task) {
    const drafts = planBreakdown({
      tasks,
      now: new Date(),
      weekStartsOn,
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

  const canZoomIn = !focusTask && finerScale(scale) !== null
  const canZoomOut = !focusTask && coarserScale(scale) !== null

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {focusTask ? (
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFocusId(focusTask.parentTaskId ?? null)}
            >
              <ArrowLeft size={ICON_SIZE} />
              Yukarı çık
            </Button>
            <div className="min-w-0">
              <TaskBreadcrumb task={focusTask} index={index} />
              <p className="truncate text-sm font-medium text-text">{focusTask.title}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" onClick={onZoomOut} disabled={!canZoomOut}>
              <ZoomOut size={ICON_SIZE} />
            </Button>
            <span className="px-1 text-xs text-text-secondary">{PLANNING_SCALE_LABELS[scale]}</span>
            <Button variant="secondary" size="sm" onClick={onZoomIn} disabled={!canZoomIn}>
              <ZoomIn size={ICON_SIZE} />
            </Button>
          </div>
        )}
        <Button variant="primary" size="sm" onClick={() => setShowAddForm((v) => !v)}>
          <Plus size={ICON_SIZE} />
          İş ekle
        </Button>
      </div>

      {error && (
        <p role="status" className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs text-text">
          {error}
        </p>
      )}

      {showAddForm &&
        (() => {
          const childScale = focusTask ? finerScale(focusTask.scale) : scale
          if (!childScale || childScale === 'hour') return null
          return (
            <GoalForm
              uid={uid}
              scale={childScale}
              parentTaskId={focusTask?.id}
              defaultRange={{ start: activePeriod.start, end: subMilliseconds(activePeriod.end, 1) }}
              onDone={() => setShowAddForm(false)}
            />
          )
        })()}

      {items.length === 0 ? (
        <EmptyState
          icon={Shapes}
          title="Bu dönemde iş yok"
          description="Kutucukları birbirine sürükleyerek bağımlılık kurabilir, kilitleyebilir ya da içine girip alt dönemlere geçebilirsin."
        />
      ) : (
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-lg border border-border bg-bg/40"
          style={{ height: canvasHeight }}
        >
          {boundaries.map((b, i) => (
            <div
              key={i}
              aria-hidden
              className="absolute inset-y-0 border-l border-dashed border-border/70"
              style={{ left: `${timeRatio(b, activePeriod) * PERCENT}%` }}
            />
          ))}

          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <defs>
              <marker id="canvas-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" className="fill-text-secondary" />
              </marker>
            </defs>
            {items.flatMap((task) =>
              task.dependencies
                .map((dep) => {
                  const predecessor = nodeById.get(dep.taskId)
                  const successor = nodeById.get(task.id)
                  if (!predecessor || !successor) return null
                  const sides = dependencyEdgeSides(dep.type)
                  const from: Point = {
                    x: nodeX(predecessor, sides.fromSide, containerWidth),
                    y: nodeY(predecessor),
                  }
                  const to: Point = {
                    x: nodeX(successor, sides.toSide, containerWidth),
                    y: nodeY(successor),
                  }
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
            {connecting && (
              <path
                d={curvePath(
                  {
                    x: nodeX(nodeById.get(connecting.taskId)!, connecting.side, containerWidth),
                    y: nodeY(nodeById.get(connecting.taskId)!),
                  },
                  connecting.point,
                )}
                className="fill-none stroke-primary"
                strokeWidth={2}
                strokeDasharray="4 3"
              />
            )}
          </svg>

          {nodes.map((node) => {
            const task = node.task
            const preview = previewDeltaMs?.taskId === task.id ? previewDeltaMs.deltaMs : 0
            const previewRatio = containerWidth > 0 ? preview / containerWidth : 0
            const canBreakDown = task.status !== 'done' && BREAKDOWN_SCALES.includes(task.scale)
            const childScale = finerScale(task.scale)
            const canOpen = childScale !== null && childScale !== 'hour'
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
                  top: node.lane * LANE_HEIGHT_PX + NODE_TOP_OFFSET_PX,
                  height: NODE_HEIGHT_PX,
                }}
              >
                <button
                  type="button"
                  aria-label={`${task.title}: öncül olarak bağlamak için sürükle (başlangıç kenarı)`}
                  onPointerDown={(e) => handleHandlePointerDown(e, task.id, 'start')}
                  onPointerMove={handleHandlePointerMove}
                  onPointerUp={handleHandlePointerUp}
                  className="absolute -left-1 top-1/2 z-10 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-primary bg-surface opacity-0 group-hover:opacity-100"
                  style={{ width: HANDLE_SIZE_PX, height: HANDLE_SIZE_PX }}
                />
                <button
                  type="button"
                  aria-label={`${task.title}: öncül olarak bağlamak için sürükle (bitiş kenarı)`}
                  onPointerDown={(e) => handleHandlePointerDown(e, task.id, 'end')}
                  onPointerMove={handleHandlePointerMove}
                  onPointerUp={handleHandlePointerUp}
                  className="absolute -right-1 top-1/2 z-10 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-primary bg-surface opacity-0 group-hover:opacity-100"
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
                    aria-label={task.scaleLocked ? `${task.title}: kilidi aç` : `${task.title}: kilitle`}
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
                  {canOpen && (
                    <button
                      type="button"
                      onClick={() => setFocusId(task.id)}
                      aria-label={`${task.title}: içine gir`}
                      title="İçine gir (alt ölçek)"
                      className="rounded bg-surface p-0.5 text-text-secondary shadow-sm hover:text-primary"
                    >
                      <Maximize2 size={ICON_SIZE} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
