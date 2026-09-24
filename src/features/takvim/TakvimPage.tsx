import { useState } from 'react'
import { addDays, addMonths, addWeeks, format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/Button'
import { DayAgenda } from './DayAgenda'
import { WeekView } from './WeekView'
import { MonthView } from './MonthView'

type ViewMode = 'day' | 'week' | 'month'

const VIEW_LABELS: Record<ViewMode, string> = { day: 'Gün', week: 'Hafta', month: 'Ay' }
const ICON_SIZE = 16

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
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={CalendarDays}
        title="Takvim"
        subtitle={format(referenceDate, HEADER_FORMAT[view], { locale: tr })}
        actions={
          <>
            <div className="flex gap-1 rounded-full border border-border bg-surface p-1">
              {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    view === mode
                      ? 'bg-primary text-primary-text'
                      : 'text-text-secondary hover:text-text'
                  }`}
                >
                  {VIEW_LABELS[mode]}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReferenceDate((d) => stepDate(d, view, -1))}
                aria-label="Önceki"
              >
                <ChevronLeft size={ICON_SIZE} />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setReferenceDate(new Date())}>
                Bugün
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReferenceDate((d) => stepDate(d, view, 1))}
                aria-label="Sonraki"
              >
                <ChevronRight size={ICON_SIZE} />
              </Button>
            </div>
          </>
        }
      />

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
