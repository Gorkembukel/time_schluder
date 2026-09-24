import { useState, type DragEvent } from 'react'
import { Link2, X } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useTasksStore } from '../../stores/tasksStore'
import { updateTaskDependencies } from '../../services/repositories/tasksRepository'
import {
  DEPENDENCY_TYPE_DESCRIPTIONS,
  checkDependencyLink,
  withDependency,
} from '../../lib/dependencyLinking'
import type { TaskIndex } from '../../lib/taskHierarchy'
import { DEPENDENCY_TYPES, type DependencyType, type Task } from '../../types/domain'

/**
 * Sürükle-bırak bağımlılık tanımlama: bir işin 🔗 tutamacını başka bir işin üzerine bırak →
 * tür seç (FS/SS/FF/SF). Bırakılan iş, sürüklenen işe bağımlı olur (sürüklenen = öncül).
 * Durum taşıma sürüklemesinden ayrı bir MIME tipi kullanılır, böylece Pano kolonları etkilenmez.
 */
export const DEPENDENCY_DRAG_MIME = 'application/x-time-schluder-dependency'

const ICON_SIZE = 12
const CHIP_ICON_SIZE = 10

export function DependencyHandle({ task }: { task: Task }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.stopPropagation()
        e.dataTransfer.setData(DEPENDENCY_DRAG_MIME, task.id)
        e.dataTransfer.effectAllowed = 'link'
      }}
      aria-label={`"${task.title}" işini başka bir işe bağlamak için sürükle`}
      title="Bağımlılık için sürükleyip başka bir işin üzerine bırak"
      className="cursor-grab rounded p-1 text-text-secondary hover:bg-border/60 hover:text-primary"
    >
      <Link2 size={ICON_SIZE} />
    </button>
  )
}

function isDependencyDrag(event: DragEvent) {
  return event.dataTransfer.types.includes(DEPENDENCY_DRAG_MIME)
}

/** Bir kartı bağımlılık bırakma hedefi yapar. Dönen `targetProps` kart kök elemanına yayılır. */
export function useDependencyDropTarget(task: Task) {
  const [isOver, setIsOver] = useState(false)
  const [pendingPredecessorId, setPendingPredecessorId] = useState<string | null>(null)

  const targetProps = {
    onDragOver: (e: DragEvent) => {
      if (!isDependencyDrag(e)) return
      e.preventDefault()
      e.stopPropagation()
      setIsOver(true)
    },
    onDragLeave: () => setIsOver(false),
    onDrop: (e: DragEvent) => {
      if (!isDependencyDrag(e)) return
      e.preventDefault()
      e.stopPropagation()
      setIsOver(false)
      const predecessorId = e.dataTransfer.getData(DEPENDENCY_DRAG_MIME)
      if (predecessorId && predecessorId !== task.id) setPendingPredecessorId(predecessorId)
    },
  }

  return {
    isOver,
    targetProps,
    pendingPredecessorId,
    clearPending: () => setPendingPredecessorId(null),
  }
}

export function DependencyTypePicker({
  successor,
  predecessorId,
  onDone,
}: {
  successor: Task
  predecessorId: string
  onDone: () => void
}) {
  const uid = useUid()
  const tasks = useTasksStore((s) => s.tasks)
  const [lag, setLag] = useState('0')
  const predecessor = tasks.find((t) => t.id === predecessorId)
  const check = checkDependencyLink(tasks, predecessorId, successor.id)

  async function choose(type: DependencyType) {
    await updateTaskDependencies(
      uid,
      successor.id,
      withDependency(successor, predecessorId, type, Number(lag) || 0),
    )
    onDone()
  }

  return (
    <div
      role="dialog"
      aria-label="Bağımlılık türü seç"
      className="flex flex-col gap-2 rounded-lg border border-primary/50 bg-bg p-2 text-xs"
    >
      <p className="text-text">
        <strong>{predecessor?.title ?? '?'}</strong> → <strong>{successor.title}</strong>
      </p>
      {check.ok ? (
        <>
          <div className="grid grid-cols-2 gap-1">
            {DEPENDENCY_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => void choose(type)}
                className="rounded-md border border-border px-2 py-1 text-left hover:border-primary hover:bg-primary/10"
              >
                <span className="font-semibold text-primary">{type}</span>{' '}
                <span className="text-text-secondary">
                  {predecessor?.title ?? 'Öncül'} {DEPENDENCY_TYPE_DESCRIPTIONS[type]}
                </span>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-text-secondary">
            Gecikme (dk)
            <input
              type="number"
              value={lag}
              onChange={(e) => setLag(e.target.value)}
              className="w-16 rounded border border-border bg-surface px-1.5 py-0.5 text-text"
            />
          </label>
        </>
      ) : (
        <p className="text-danger">{check.reason}</p>
      )}
      <button
        type="button"
        onClick={onDone}
        className="self-start text-text-secondary hover:text-text"
      >
        Vazgeç
      </button>
    </div>
  )
}

/** Bir işin öncülleri (bağımlı olduğu işler) — tür etiketiyle, kaldırılabilir. */
export function DependencyChips({ task, index }: { task: Task; index: TaskIndex }) {
  const uid = useUid()
  if (task.dependencies.length === 0) return null

  return (
    <ul aria-label="Bağımlılıklar" className="flex flex-wrap gap-1">
      {task.dependencies.map((dep) => (
        <li
          key={dep.taskId}
          className="flex items-center gap-0.5 rounded-full bg-border/60 py-0.5 pl-2 pr-0.5 text-[0.65rem] text-text-secondary"
        >
          <span className="font-semibold">{dep.type}</span>
          <span className="max-w-[8rem] truncate">
            {index.get(dep.taskId)?.title ?? 'silinmiş iş'}
          </span>
          <button
            type="button"
            onClick={() =>
              void updateTaskDependencies(
                uid,
                task.id,
                task.dependencies.filter((d) => d.taskId !== dep.taskId),
              )
            }
            aria-label={`${index.get(dep.taskId)?.title ?? 'silinmiş iş'} bağımlılığını kaldır`}
            className="rounded-full p-0.5 hover:bg-danger/10 hover:text-danger"
          >
            <X size={CHIP_ICON_SIZE} />
          </button>
        </li>
      ))}
    </ul>
  )
}
