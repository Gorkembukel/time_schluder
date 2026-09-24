import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { ListTodo } from 'lucide-react'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { Badge } from '../../components/Badge'
import { Skeleton } from '../../components/Skeleton'
import type { Task } from '../../types/domain'

const DISPLAY_LIMIT = 6
const DATE_FORMAT = 'd MMM, EEE'

/** `tasks` çağıran tarafından zaten hazırlanmış (durum filtrelenmiş, tarih sıralı) gelir — burada tekrar Firestore aboneliği açılmaz. */
export function UpcomingTasksCard({ tasks, loading }: { tasks: Task[]; loading: boolean }) {
  const areas = useLifeAreasStore((s) => s.areas)
  const visible = tasks.slice(0, DISPLAY_LIMIT)
  const areaName = (id?: string) => areas.find((a) => a.id === id)?.name

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-text">Yaklaşan görevler</h2>
      {loading ? (
        <div className="mt-3">
          <Skeleton className="h-14" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Yaklaşan görev yok"
          description="Takvim'den yeni görev ekleyebilirsin."
        />
      ) : (
        <>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {visible.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-text">{task.title}</p>
                  {areaName(task.lifeAreaId) && (
                    <Badge variant="neutral">{areaName(task.lifeAreaId)}</Badge>
                  )}
                </div>
                <span className="shrink-0 text-xs text-text-secondary">
                  {format(new Date(task.startAt), DATE_FORMAT, { locale: tr })}
                </span>
              </li>
            ))}
          </ul>
          {tasks.length > DISPLAY_LIMIT && (
            <p className="mt-2 text-xs text-text-secondary">
              +{tasks.length - DISPLAY_LIMIT} görev daha — Takvim'de gör
            </p>
          )}
        </>
      )}
    </Card>
  )
}
