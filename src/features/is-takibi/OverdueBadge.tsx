import { AlertTriangle } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { isOverdue } from '../../lib/taskHierarchy'
import { OVERDUE_LABEL, type Task } from '../../types/domain'

const ICON_SIZE = 12

/** Bitiş tarihi geçmiş ve tamamlanmamış işlerde otomatik gösterilen işaret. */
export function OverdueBadge({ task }: { task: Task }) {
  if (!isOverdue(task, new Date())) return null
  return (
    <Badge variant="danger">
      <AlertTriangle size={ICON_SIZE} />
      {OVERDUE_LABEL}
    </Badge>
  )
}
