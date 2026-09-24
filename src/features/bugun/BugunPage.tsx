import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Clock } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { DayAgenda } from '../takvim/DayAgenda'

export function BugunPage() {
  const today = new Date()

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        icon={Clock}
        title="Bugün"
        subtitle={format(today, 'd MMMM yyyy, EEEE', { locale: tr })}
      />
      <DayAgenda date={today} />
    </section>
  )
}
