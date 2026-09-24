import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, Compass, Info, OctagonAlert } from 'lucide-react'
import { useTasksStore } from '../../stores/tasksStore'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { useSettingsStore } from '../../stores/settingsStore'
import {
  computeCapacityGuidance,
  formatHours,
  type AreaCapacity,
  type Suggestion,
} from '../../lib/capacityGuidance'
import type { DateRange } from '../../lib/dateRange'
import { Card } from '../../components/Card'
import { PLANNING_SCALE_LABELS, type PlanningScale } from '../../types/domain'

const ICON_SIZE = 14
const PERCENT = 100
/** Varsayılan olarak gösterilen öneri sayısı; fazlası "tümünü göster" ile açılır. */
const COLLAPSED_SUGGESTION_COUNT = 4
const MARKER_WIDTH_PX = 2

const SEVERITY_STYLE: Record<Suggestion['severity'], { icon: typeof Info; className: string }> = {
  danger: { icon: OctagonAlert, className: 'text-danger' },
  warning: { icon: AlertTriangle, className: 'text-warning' },
  info: { icon: Info, className: 'text-primary' },
}

/**
 * Backcast + forecast yönlendirme paneli. Kullanıcıdan girdi istemez; dönem için kapasiteyi,
 * hayat alanı bütçelerini, gerçekleşen/planlı süreyi hesaplar ve ne yapılması gerektiğini söyler.
 */
export function GuidancePanel({
  period,
  periodScale,
}: {
  period: DateRange
  periodScale: PlanningScale
}) {
  const tasks = useTasksStore((s) => s.tasks)
  const areas = useLifeAreasStore((s) => s.areas)
  const calendarTime = useSettingsStore((s) => s.settings.calendarTime)
  const engine = useSettingsStore((s) => s.settings.planningEngine)
  const [showAll, setShowAll] = useState(false)

  const periodStartMs = period.start.getTime()
  const periodEndMs = period.end.getTime()
  const guidance = useMemo(
    () =>
      computeCapacityGuidance({
        tasks,
        areas,
        period: { start: new Date(periodStartMs), end: new Date(periodEndMs) },
        periodScale,
        now: new Date(),
        settings: {
          dayStartHour: calendarTime.dayStartHour,
          dayEndHour: calendarTime.dayEndHour,
          bufferRatio: engine.bufferRatio,
          plannableRatio: engine.plannableRatio,
          forecastDeviationThreshold: engine.forecastDeviationThreshold,
          priorityWeights: engine.priorityWeights,
        },
      }),
    [tasks, areas, periodStartMs, periodEndMs, periodScale, calendarTime, engine],
  )

  const visibleSuggestions = showAll
    ? guidance.suggestions
    : guidance.suggestions.slice(0, COLLAPSED_SUGGESTION_COUNT)
  const activeAreas = guidance.areas.filter((a) => a.allocatedMinutes > 0 || a.projectedMinutes > 0)

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text">
          <Compass size={ICON_SIZE} className="text-primary" />
          {PLANNING_SCALE_LABELS[periodScale]} rehberi
        </h2>
        <p className="text-xs text-text-secondary">
          Kapasite {formatHours(guidance.totalCapacityMinutes)} · tampon{' '}
          {formatHours(guidance.bufferMinutes)} · dönemin %
          {Math.round(guidance.elapsedRatio * PERCENT)}'i geçti
        </p>
      </div>

      {guidance.suggestions.length === 0 ? (
        <p className="mt-3 text-sm text-success">Plan dengede. Bu dönem için önerim yok.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {visibleSuggestions.map((s, i) => {
            const style = SEVERITY_STYLE[s.severity]
            return (
              <li
                key={`${s.kind}-${s.areaId ?? ''}-${s.taskId ?? ''}-${i}`}
                className="flex gap-2 text-sm text-text"
              >
                <style.icon size={ICON_SIZE} className={`mt-0.5 shrink-0 ${style.className}`} />
                <span>{s.message}</span>
              </li>
            )
          })}
        </ul>
      )}
      {guidance.suggestions.length > COLLAPSED_SUGGESTION_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ChevronDown size={ICON_SIZE} className={showAll ? 'rotate-180' : ''} />
          {showAll ? 'Daha az göster' : `Tüm önerileri göster (${guidance.suggestions.length})`}
        </button>
      )}

      {activeAreas.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          {activeAreas.map((row) => (
            <AreaBudgetRow key={row.areaId} row={row} />
          ))}
          <p className="text-[0.7rem] text-text-secondary">
            Koyu dolgu: tamamlanan · açık dolgu: planlı · siyah çizgi: bütçe · turuncu çizgi: bugüne
            kadar beklenen. Bütçe, açık hedef sayısı × alan önceliğine göre otomatik dağıtılır.
          </p>
        </div>
      )}
    </Card>
  )
}

function AreaBudgetRow({ row }: { row: AreaCapacity }) {
  // Çubuğun ölçeği bütçe ile projeksiyonun büyüğü — aşım görsel olarak taşmadan görünür.
  const scale = Math.max(row.allocatedMinutes, row.projectedMinutes, 1)
  const pct = (minutes: number) => `${(minutes / scale) * PERCENT}%`
  // Çizgi işaretleri sağ kenarda kırpılmasın diye kendi genişliği kadar sola kaydırılır.
  const markerLeft = (minutes: number) => `calc(${pct(minutes)} - ${MARKER_WIDTH_PX}px)`

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-text">{row.areaName}</span>
        <span className="text-text-secondary">
          {formatHours(row.actualMinutes)} yapıldı · {formatHours(row.scheduledMinutes)} planlı /
          bütçe {formatHours(row.allocatedMinutes)}
        </span>
      </div>
      <div
        role="img"
        aria-label={`${row.areaName}: bütçe ${formatHours(row.allocatedMinutes)}, yapılan ${formatHours(row.actualMinutes)}, planlı ${formatHours(row.scheduledMinutes)}`}
        className="relative mt-1 h-2 overflow-hidden rounded-full bg-border/60"
      >
        <div
          className="absolute inset-y-0 left-0 flex"
          style={{ width: pct(row.projectedMinutes) }}
        >
          <div
            className="h-full bg-primary"
            style={{
              width: `${row.projectedMinutes > 0 ? (row.actualMinutes / row.projectedMinutes) * PERCENT : 0}%`,
            }}
          />
          <div className="h-full flex-1 bg-primary/35" />
        </div>
        {row.allocatedMinutes > 0 && (
          <>
            <div
              className="absolute inset-y-0 w-0.5 bg-text"
              style={{ left: markerLeft(row.allocatedMinutes) }}
            />
            <div
              className="absolute inset-y-0 w-0.5 bg-warning"
              style={{ left: markerLeft(row.expectedToDateMinutes) }}
            />
          </>
        )}
      </div>
    </div>
  )
}
