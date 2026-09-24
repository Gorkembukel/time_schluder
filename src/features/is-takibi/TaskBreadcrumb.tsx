import { ChevronRight } from 'lucide-react'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { ancestorsOf, effectiveLifeAreaId, type TaskIndex } from '../../lib/taskHierarchy'
import { PLANNING_SCALE_LABELS, type Task } from '../../types/domain'

const ICON_SIZE = 10

/** Hayat alanı › 3 Yıl › Yıl › … izlenebilirlik izi (görevin kendisi hariç). */
export function TaskBreadcrumb({ task, index }: { task: Task; index: TaskIndex }) {
  const areaId = effectiveLifeAreaId(task, index)
  const areaName = useLifeAreasStore((s) => s.areas.find((a) => a.id === areaId)?.name)
  const ancestors = ancestorsOf(task, index).reverse()
  if (!areaName && ancestors.length === 0) return null

  return (
    <nav
      aria-label="Hiyerarşi"
      className="flex min-w-0 flex-wrap items-center gap-0.5 text-[0.7rem] text-text-secondary"
    >
      {areaName && <span className="font-medium text-primary">{areaName}</span>}
      {ancestors.map((a, i) => (
        <span key={a.id} className="flex min-w-0 items-center gap-0.5">
          {(areaName || i > 0) && <ChevronRight size={ICON_SIZE} className="shrink-0" />}
          <span className="truncate" title={`${PLANNING_SCALE_LABELS[a.scale]}: ${a.title}`}>
            {a.title}
          </span>
        </span>
      ))}
    </nav>
  )
}
