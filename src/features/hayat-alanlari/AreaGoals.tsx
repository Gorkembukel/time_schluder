import { Link } from 'react-router-dom'
import { format, subMilliseconds } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useTaskHierarchy } from '../../hooks/useTaskHierarchy'
import { effectiveLifeAreaId, rollupProgress } from '../../lib/taskHierarchy'
import { Badge } from '../../components/Badge'
import { PLANNING_SCALE_LABELS, TASK_STATUS_LABELS } from '../../types/domain'
import { OverdueBadge } from '../is-takibi/OverdueBadge'
import { ProgressBar } from '../is-takibi/ProgressBar'

const DATE_FORMAT = 'MMM yyyy'
const ONE_MS = 1

/**
 * Bir hayat alanının kök hedefleri: alana bağlı olup ebeveyni olmayan (ya da ebeveyni başka alanda
 * olan) işler. Alt işlerin ilerlemesi bu hedeflere toplanır (roll-up).
 */
export function AreaGoals({ areaId }: { areaId: string }) {
  const { tasks, index, children } = useTaskHierarchy()

  const roots = tasks
    .filter((t) => effectiveLifeAreaId(t, index) === areaId)
    .filter((t) => {
      const parent = t.parentTaskId ? index.get(t.parentTaskId) : undefined
      return !parent || effectiveLifeAreaId(parent, index) !== areaId
    })
    .sort((a, b) => a.startAt.localeCompare(b.startAt))

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Hedefler
        </h3>
        <Link to="/takvim" className="text-xs text-primary hover:underline">
          Takvim'de planla
        </Link>
      </div>
      {roots.length === 0 ? (
        <p className="mt-2 text-sm text-text-secondary">
          Bu alana bağlı hedef yok. Takvim'in 3 Yıl / Yıl sekmesinden bu alanı seçerek hedef
          ekleyebilirsin.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {roots.map((goal) => (
            <li key={goal.id} className="rounded-lg border border-border bg-bg/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-text">{goal.title}</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="primary">{PLANNING_SCALE_LABELS[goal.scale]}</Badge>
                  <Badge variant={goal.status === 'done' ? 'success' : 'neutral'}>
                    {TASK_STATUS_LABELS[goal.status]}
                  </Badge>
                  <OverdueBadge task={goal} />
                  <span className="text-xs text-text-secondary">
                    {format(new Date(goal.startAt), DATE_FORMAT, { locale: tr })} –{' '}
                    {format(subMilliseconds(new Date(goal.endAt), ONE_MS), DATE_FORMAT, {
                      locale: tr,
                    })}
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <ProgressBar
                  ratio={rollupProgress(goal, children)}
                  label={`${goal.title} ilerlemesi`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
