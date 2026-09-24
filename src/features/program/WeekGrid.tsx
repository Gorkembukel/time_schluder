import { useState, type DragEvent, type PointerEvent } from 'react'
import { addDays, addMinutes, differenceInMinutes, format, isSameDay, isToday } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Check, Trash2 } from 'lucide-react'
import type { DateRange } from '../../lib/dateRange'
import { SLOT_ALIGN_MINUTES, type RoutineOccurrence } from '../../lib/autoPlanner'
import type { Task } from '../../types/domain'

export const POOL_DRAG_MIME = 'application/x-time-schluder-pool'
const BLOCK_DRAG_MIME = 'application/x-time-schluder-block'

/** Izgarada bir saatin piksel yüksekliği — blok yüksekliği süresiyle orantılıdır. */
const HOUR_ROW_PX = 48
const MINUTES_PER_HOUR = 60
const ICON_SIZE = 12
const TIME_FORMAT = 'HH:mm'
/** Bu yükseklikten kısa bloklarda saat satırı gizlenir (başlık sığsın). */
const COMPACT_BLOCK_PX = 30

function snap(minutes: number): number {
  return Math.round(minutes / SLOT_ALIGN_MINUTES) * SLOT_ALIGN_MINUTES
}

interface GridProps {
  week: DateRange
  dayStartHour: number
  dayEndHour: number
  blocks: Task[]
  routines: RoutineOccurrence[]
  /** Otomatik plan önizlemesi — kesikli çerçeveyle çizilir. */
  ghostBlocks: Task[]
  titleOf: (block: Task) => string
  onDropPool: (goalId: string, start: Date) => void
  onMoveBlock: (block: Task, start: Date) => void
  onResizeBlock: (block: Task, end: Date) => void
  onToggleDone: (block: Task) => void
  onDelete: (block: Task) => void
}

export function WeekGrid(props: GridProps) {
  const { week, dayStartHour, dayEndHour } = props
  const days = Array.from({ length: 7 }, (_, i) => addDays(week.start, i))
  const hours = Array.from({ length: dayEndHour - dayStartHour }, (_, i) => dayStartHour + i)
  const gridHeight = hours.length * HOUR_ROW_PX

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
      <div className="grid min-w-[44rem] grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
        <div />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`border-b border-l border-border px-2 py-2 text-center text-xs font-medium ${
              isToday(day) ? 'text-primary' : 'text-text-secondary'
            }`}
          >
            {format(day, 'EEE d', { locale: tr })}
          </div>
        ))}

        <div className="relative" style={{ height: gridHeight }}>
          {hours.map((h, i) => (
            <span
              key={h}
              className="absolute right-1 -translate-y-1/2 text-[0.65rem] text-text-secondary"
              style={{ top: i * HOUR_ROW_PX }}
            >
              {i > 0 && `${String(h).padStart(2, '0')}:00`}
            </span>
          ))}
        </div>
        {days.map((day) => (
          <DayColumn key={day.toISOString()} day={day} height={gridHeight} {...props} />
        ))}
      </div>
    </div>
  )
}

function DayColumn({
  day,
  height,
  dayStartHour,
  blocks,
  routines,
  ghostBlocks,
  titleOf,
  onDropPool,
  onMoveBlock,
  onResizeBlock,
  onToggleDone,
  onDelete,
}: GridProps & { day: Date; height: number }) {
  const [dragOver, setDragOver] = useState(false)
  const dayOrigin = new Date(day)
  dayOrigin.setHours(dayStartHour, 0, 0, 0)

  const topOf = (date: Date) =>
    (differenceInMinutes(date, dayOrigin) / MINUTES_PER_HOUR) * HOUR_ROW_PX
  const heightOf = (start: Date, end: Date) =>
    (differenceInMinutes(end, start) / MINUTES_PER_HOUR) * HOUR_ROW_PX

  function minutesAt(clientY: number, element: HTMLElement): number {
    const y = clientY - element.getBoundingClientRect().top
    return snap((y / HOUR_ROW_PX) * MINUTES_PER_HOUR)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const poolGoalId = e.dataTransfer.getData(POOL_DRAG_MIME)
    if (poolGoalId) {
      onDropPool(poolGoalId, addMinutes(dayOrigin, minutesAt(e.clientY, e.currentTarget)))
      return
    }
    const raw = e.dataTransfer.getData(BLOCK_DRAG_MIME)
    if (!raw) return
    const { id, grabOffsetMinutes } = JSON.parse(raw) as { id: string; grabOffsetMinutes: number }
    const block = blocks.find((b) => b.id === id)
    if (!block) return
    const minutes = minutesAt(e.clientY, e.currentTarget) - snap(grabOffsetMinutes)
    onMoveBlock(block, addMinutes(dayOrigin, minutes))
  }

  const dayBlocks = blocks.filter((b) => isSameDay(new Date(b.startAt), day))
  const dayGhosts = ghostBlocks.filter((b) => isSameDay(new Date(b.startAt), day))
  const dayRoutines = routines.filter((r) => isSameDay(r.start, day))

  return (
    <div
      role="region"
      aria-label={format(day, 'EEEE d MMMM', { locale: tr })}
      onDragOver={(e) => {
        if (
          e.dataTransfer.types.includes(POOL_DRAG_MIME) ||
          e.dataTransfer.types.includes(BLOCK_DRAG_MIME)
        ) {
          e.preventDefault()
          setDragOver(true)
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`relative border-l border-border ${dragOver ? 'bg-primary/5' : ''}`}
      style={{
        height,
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_ROW_PX - 1}px, var(--color-border) ${HOUR_ROW_PX - 1}px, var(--color-border) ${HOUR_ROW_PX}px)`,
      }}
    >
      {dayRoutines.map((r) => (
        <div
          key={`${r.routine.id}-${r.start.toISOString()}`}
          className="absolute inset-x-0.5 overflow-hidden rounded-md border border-border px-1.5 py-0.5 text-[0.65rem] text-text-secondary"
          style={{
            top: topOf(r.start),
            height: heightOf(r.start, r.end),
            backgroundImage:
              'repeating-linear-gradient(45deg, var(--color-border) 0 4px, transparent 4px 8px)',
          }}
          title={`${r.routine.title} (sabit program)`}
        >
          <span className="rounded bg-surface/80 px-0.5 font-medium text-text">
            {r.routine.title}
          </span>
        </div>
      ))}

      {dayGhosts.map((g) => (
        <div
          key={g.id}
          aria-hidden
          className="absolute inset-x-0.5 overflow-hidden rounded-md border-2 border-dashed border-primary/60 bg-primary/5 px-1.5 py-0.5 text-[0.65rem] text-primary"
          style={{
            top: topOf(new Date(g.startAt)),
            height: heightOf(new Date(g.startAt), new Date(g.endAt)),
          }}
        >
          {titleOf(g)}
        </div>
      ))}

      {dayBlocks.map((block) => (
        <GridBlock
          key={block.id}
          block={block}
          top={topOf(new Date(block.startAt))}
          height={heightOf(new Date(block.startAt), new Date(block.endAt))}
          title={titleOf(block)}
          onResize={onResizeBlock}
          onToggleDone={onToggleDone}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function GridBlock({
  block,
  top,
  height,
  title,
  onResize,
  onToggleDone,
  onDelete,
}: {
  block: Task
  top: number
  height: number
  title: string
  onResize: (block: Task, end: Date) => void
  onToggleDone: (block: Task) => void
  onDelete: (block: Task) => void
}) {
  // Boyutlandırma sırasında yerel önizleme; bırakınca kaydedilir.
  const [previewHeight, setPreviewHeight] = useState<number | null>(null)
  const done = block.status === 'done'
  const shownHeight = previewHeight ?? height
  const start = new Date(block.startAt)
  const previewEnd = addMinutes(start, snap((shownHeight / HOUR_ROW_PX) * MINUTES_PER_HOUR))

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setPreviewHeight(height)
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (previewHeight === null) return
    const blockTop = e.currentTarget.parentElement!.getBoundingClientRect().top
    const minHeight = (SLOT_ALIGN_MINUTES / MINUTES_PER_HOUR) * HOUR_ROW_PX
    setPreviewHeight(Math.max(minHeight, e.clientY - blockTop))
  }
  function onPointerUp() {
    if (previewHeight === null) return
    setPreviewHeight(null)
    if (previewEnd.getTime() !== new Date(block.endAt).getTime()) onResize(block, previewEnd)
  }

  return (
    <article
      aria-label={`${title}, ${format(start, TIME_FORMAT)}–${format(previewEnd, TIME_FORMAT)}`}
      draggable
      onDragStart={(e) => {
        const offsetPx = e.clientY - e.currentTarget.getBoundingClientRect().top
        e.dataTransfer.setData(
          BLOCK_DRAG_MIME,
          JSON.stringify({
            id: block.id,
            grabOffsetMinutes: (offsetPx / HOUR_ROW_PX) * MINUTES_PER_HOUR,
          }),
        )
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={`group absolute inset-x-0.5 flex cursor-grab flex-col overflow-hidden rounded-md border px-1.5 py-0.5 text-[0.7rem] shadow-sm active:cursor-grabbing ${
        done
          ? 'border-success/40 bg-success/15 text-text-secondary line-through'
          : 'border-primary/40 bg-primary/15 text-text'
      }`}
      style={{ top, height: shownHeight }}
    >
      <span className="truncate font-medium">{title}</span>
      {shownHeight >= COMPACT_BLOCK_PX && (
        <span className="text-[0.65rem] text-text-secondary">
          {format(start, TIME_FORMAT)}–{format(previewEnd, TIME_FORMAT)}
        </span>
      )}
      <div className="absolute right-0.5 top-0.5 hidden gap-0.5 group-focus-within:flex group-hover:flex">
        <button
          type="button"
          onClick={() => onToggleDone(block)}
          aria-label={done ? `${title}: tamamlanmadı olarak işaretle` : `${title}: tamamla`}
          className="rounded bg-surface p-0.5 text-success shadow-sm"
        >
          <Check size={ICON_SIZE} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(block)}
          aria-label={`${title}: bloğu sil`}
          className="rounded bg-surface p-0.5 text-danger shadow-sm"
        >
          <Trash2 size={ICON_SIZE} />
        </button>
      </div>
      <div
        role="separator"
        aria-label={`${title}: bitiş saatini sürükleyerek değiştir`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize bg-primary/0 hover:bg-primary/40"
      />
    </article>
  )
}
