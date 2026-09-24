import { useState } from 'react'
import { addDays, addMonths, addWeeks, format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useSettingsStore } from '../../stores/settingsStore'
import { DayAgenda } from './DayAgenda'
import { WeekView } from './WeekView'
import { MonthView } from './MonthView'

type ViewMode = 'day' | 'week' | 'month'

const VIEW_LABELS: Record<ViewMode, string> = { day: 'Gün', week: 'Hafta', month: 'Ay' }

function stepDate(date: Date, view: ViewMode, direction: 1 | -1): Date {
  if (view === 'day') return addDays(date, direction)
  if (view === 'week') return addWeeks(date, direction)
  return addMonths(date, direction)
}

const HEADER_FORMAT: Record<ViewMode, string> = {
  day: 'd MMMM yyyy, EEEE',
  week: "'Hafta' — d MMMM yyyy",
  month: 'MMMM yyyy',
}

export function TakvimPage() {
  const weekStartsOn = useSettingsStore((s) => s.settings.calendarTime.weekStartsOn)
  const [view, setView] = useState<ViewMode>('week')
  const [referenceDate, setReferenceDate] = useState(new Date())

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Takvim</h1>
          <p className="text-sm text-text-secondary">
            {format(referenceDate, HEADER_FORMAT[view], { locale: tr })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-full border border-border bg-surface p-1">
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  view === mode ? 'bg-primary text-primary-text' : 'text-text-secondary'
                }`}
              >
                {VIEW_LABELS[mode]}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setReferenceDate((d) => stepDate(d, view, -1))}
              className="rounded-lg border border-border px-2.5 py-1 text-sm text-text-secondary"
              aria-label="Önceki"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setReferenceDate(new Date())}
              className="rounded-lg border border-border px-2.5 py-1 text-sm text-text-secondary"
            >
              Bugün
            </button>
            <button
              type="button"
              onClick={() => setReferenceDate((d) => stepDate(d, view, 1))}
              className="rounded-lg border border-border px-2.5 py-1 text-sm text-text-secondary"
              aria-label="Sonraki"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {view === 'day' && <DayAgenda date={referenceDate} />}
      {view === 'week' && (
        <WeekView
          referenceDate={referenceDate}
          weekStartsOn={weekStartsOn}
          onSelectDay={(day) => {
            setReferenceDate(day)
            setView('day')
          }}
        />
      )}
      {view === 'month' && (
        <MonthView
          referenceDate={referenceDate}
          weekStartsOn={weekStartsOn}
          onSelectDay={(day) => {
            setReferenceDate(day)
            setView('day')
          }}
        />
      )}
    </div>
  )
}
