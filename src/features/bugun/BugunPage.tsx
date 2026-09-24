import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { DayAgenda } from '../takvim/DayAgenda'

export function BugunPage() {
  const today = new Date()

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Bugün</h1>
        <p className="text-sm text-text-secondary">{format(today, 'd MMMM yyyy, EEEE', { locale: tr })}</p>
      </div>
      <DayAgenda date={today} />
    </section>
  )
}
