import { useState, type DragEvent } from 'react'
import type { Task } from '../../types/domain'

/** Bağımlılık sürüklemesinin MIME tipi — Pano'daki durum taşıma sürüklemesinden ayrıdır. */
export const DEPENDENCY_DRAG_MIME = 'application/x-time-schluder-dependency'

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
