import { addDays, format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { AlertTriangle, Clock, LayoutDashboard, ListTodo, Wallet } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useTasksInRange } from '../../hooks/useTasksInRange'
import { useTransactions } from '../../hooks/useTransactions'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { useFinanceCategoriesStore } from '../../stores/financeCategoriesStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { dayRange, weekRange } from '../../lib/dateRange'
import { formatTRY } from '../../lib/format'
import { buildBreakdown } from '../../lib/financeBreakdown'
import { PageHeader } from '../../components/PageHeader'
import { StatTile } from '../../components/StatTile'
import { MagnitudeBreakdown } from '../finans/MagnitudeBreakdown'
import { UpcomingTasksCard } from './UpcomingTasksCard'
import { LifeAreaProgressCard } from './LifeAreaProgressCard'
import { GuidancePanel } from '../rehber/GuidancePanel'

const ISO_MONTH_LENGTH = 7

function currentMonthPrefix(): string {
  return new Date().toISOString().slice(0, ISO_MONTH_LENGTH)
}

export function DashboardPage() {
  const uid = useUid()
  const today = new Date()
  const areas = useLifeAreasStore((s) => s.areas)
  const categories = useFinanceCategoriesStore((s) => s.categories)
  const upcomingWindowDays = useSettingsStore((s) => s.settings.dashboard.upcomingWindowDays)
  const weekStartsOn = useSettingsStore((s) => s.settings.calendarTime.weekStartsOn)
  const { transactions } = useTransactions(uid)

  const { start: todayStart } = dayRange(today)
  const todayEnd = addDays(todayStart, 1)
  const windowEnd = addDays(todayStart, upcomingWindowDays)
  const { tasks, loading: tasksLoading } = useTasksInRange(
    uid,
    todayStart.toISOString(),
    windowEnd.toISOString(),
  )

  const todayTaskCount = tasks.filter((t) => t.startAt < todayEnd.toISOString()).length
  const upcomingTasks = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => a.startAt.localeCompare(b.startAt))

  const monthPrefix = currentMonthPrefix()
  const monthTransactions = transactions.filter((tx) => tx.date.startsWith(monthPrefix))
  const monthIncome = monthTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amountTRY, 0)
  const monthExpenses = monthTransactions.filter((tx) => tx.type === 'expense')
  const monthExpenseTotal = monthExpenses.reduce((sum, tx) => sum + tx.amountTRY, 0)
  const netTotal = monthIncome - monthExpenseTotal

  const overBudgetCount = categories.filter((c) => {
    if (c.kind !== 'expense' || !c.monthlyBudgetTRY) return false
    const actual = monthExpenses
      .filter((tx) => tx.categoryId === c.id)
      .reduce((sum, tx) => sum + tx.amountTRY, 0)
    return actual > c.monthlyBudgetTRY
  }).length

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id
  const categoryBreakdown = buildBreakdown(monthExpenses, (tx) => tx.categoryId, categoryName)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={LayoutDashboard}
        title="Genel Bakış"
        subtitle={format(today, 'd MMMM yyyy, EEEE', { locale: tr })}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Clock}
          label="Bugünkü görevler"
          value={String(todayTaskCount)}
          variant="primary"
        />
        <StatTile
          icon={ListTodo}
          label={`Önümüzdeki ${upcomingWindowDays} gün`}
          value={String(upcomingTasks.length)}
          hint="tamamlanmamış görev"
        />
        <StatTile
          icon={Wallet}
          label="Bu ay net"
          value={formatTRY(netTotal)}
          variant={netTotal >= 0 ? 'success' : 'danger'}
        />
        <StatTile
          icon={AlertTriangle}
          label="Bütçe aşımı"
          value={String(overBudgetCount)}
          hint={overBudgetCount > 0 ? 'kategori bütçeyi aştı' : 'hepsi limit içinde'}
          variant={overBudgetCount > 0 ? 'danger' : 'success'}
        />
      </div>

      <GuidancePanel period={weekRange(today, weekStartsOn)} periodScale="week" />

      <div className="grid gap-4 md:grid-cols-2">
        <UpcomingTasksCard tasks={upcomingTasks} loading={tasksLoading} />
        <LifeAreaProgressCard uid={uid} areas={areas} />
      </div>

      <MagnitudeBreakdown
        title="Bu ay kategoriye göre dağılım"
        items={categoryBreakdown}
        emptyText="Bu ay henüz gider girilmedi."
      />
    </div>
  )
}
