import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addMinutes, addWeeks, differenceInMinutes, format, subDays } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Bot, CalendarRange, ChevronLeft, ChevronRight, Wand2 } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useTaskHierarchy } from '../../hooks/useTaskHierarchy'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { useRoutinesStore } from '../../stores/routinesStore'
import { useSettingsStore } from '../../stores/settingsStore'
import {
  createTask,
  createTasksBatch,
  deleteTask,
  newTaskId,
  updateTaskFields,
  updateTaskStatus,
} from '../../services/repositories/tasksRepository'
import { weekRange } from '../../lib/dateRange'
import { buildAutoPlan, type AutoPlan } from '../../lib/autoPlan'
import {
  constraintWindow,
  routineOccurrences,
  scheduleWeek,
  scheduledMinutesFor,
  weeklyLeafGoals,
} from '../../lib/autoPlanner'
import { overlapsRange } from '../../lib/taskHierarchy'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/Button'
import type { Task } from '../../types/domain'
import { WeekGrid } from './WeekGrid'
import { PoolPanel } from './PoolPanel'
import { RoutinesPanel } from './RoutinesPanel'
import { AutoPlanPreview } from './AutoPlanPreview'

const ICON_SIZE = 16
const LAST_DAY_OFFSET = 1

/**
 * Haftalık program: günler × saatler ızgarası. Sabit program (rutinler) her hafta görünür;
 * bu haftanın hedefleri havuzdan sürüklenir ya da "Otomatik planla" ile bağımlılık ve bitiş
 * tarihlerine uyarak boş saatlere dağıtılır.
 */
export function ProgramPage() {
  const uid = useUid()
  const { tasks, index } = useTaskHierarchy()
  const areas = useLifeAreasStore((s) => s.areas)
  const routines = useRoutinesStore((s) => s.routines)
  const settings = useSettingsStore((s) => s.settings)
  const { dayStartHour, dayEndHour, weekStartsOn } = settings.calendarTime
  const blockMinutes = settings.planningEngine.autoBlockMinutes

  const [referenceDate, setReferenceDate] = useState(new Date())
  const [plan, setPlan] = useState<AutoPlan | null>(null)
  const [applying, setApplying] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'info' | 'warning'; text: string } | null>(null)

  const week = weekRange(referenceDate, weekStartsOn)
  const weekStartMs = week.start.getTime()

  const blocks = useMemo(
    () => tasks.filter((t) => t.scale === 'hour' && overlapsRange(t, week.start, week.end)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hafta, başlangıç zamanıyla belirlenir
    [tasks, weekStartMs],
  )
  const poolGoals = useMemo(
    () => weeklyLeafGoals(tasks, week).sort((a, b) => a.endAt.localeCompare(b.endAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hafta, başlangıç zamanıyla belirlenir
    [tasks, weekStartMs],
  )
  const occurrences = useMemo(
    () => routineOccurrences(routines, week),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hafta, başlangıç zamanıyla belirlenir
    [routines, weekStartMs],
  )

  const titleOf = (block: Task) => block.title
  const allBlocksOf = (goalId: string) =>
    tasks
      .filter((b) => b.parentTaskId === goalId && b.scale === 'hour')
      .map((b) => ({ start: new Date(b.startAt), end: new Date(b.endAt) }))

  /** Bağımlılığı ihlal eden yerleşime izin verilir (kullanıcı son sözü söyler) ama uyarılır. */
  function warnIfViolates(goal: Task | undefined, start: Date, end: Date) {
    if (!goal) return
    const w = constraintWindow({ task: goal, index, blocksOf: allBlocksOf, week, now: week.start })
    const reasons: string[] = []
    if (start < w.earliestStart) reasons.push('öncül bağımlılığı bitmeden/başlamadan başlıyor')
    if (end > new Date(goal.endAt)) reasons.push('hedefin bitiş tarihinden sonra bitiyor')
    if (reasons.length) {
      setNotice({
        tone: 'warning',
        text: `"${goal.title}": ${reasons.join(', ')}. Yine de yerleştirildi.`,
      })
    } else {
      setNotice(null)
    }
  }

  async function placeBlock(goal: Task, start: Date, minutes: number) {
    const end = addMinutes(start, minutes)
    warnIfViolates(goal, start, end)
    await createTask(uid, {
      title: goal.title,
      scale: 'hour',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      parentTaskId: goal.id,
      bufferMinutes: 0,
      detailLevel: 'detailed',
    })
  }

  function handleAutoPlace(goal: Task) {
    const { blocks: placed, unmet } = scheduleWeek({
      tasks,
      routines,
      week,
      now: new Date(),
      dayStartHour,
      dayEndHour,
      blockMinutes,
      demands: [{ taskId: goal.id, minutes: blockMinutes }],
      newId: () => newTaskId(uid),
    })
    if (placed.length === 0) {
      setNotice({
        tone: 'warning',
        text: `"${goal.title}": ${unmet[0]?.reason ?? 'uygun boşluk yok'}.`,
      })
      return
    }
    setNotice(null)
    void createTasksBatch(uid, placed)
  }

  function runAutoPlan() {
    setNotice(null)
    setPlan(
      buildAutoPlan({
        tasks,
        areas,
        routines,
        week,
        now: new Date(),
        settings,
        newId: () => newTaskId(uid),
      }),
    )
  }

  async function applyPlan() {
    if (!plan) return
    setApplying(true)
    await createTasksBatch(uid, [...plan.breakdown, ...plan.blocks])
    setApplying(false)
    setPlan(null)
    setNotice({
      tone: 'info',
      text: `Robota ${plan.blocks.length} yeni görev verildi${
        plan.breakdown.length ? `, ${plan.breakdown.length} alt hedef oluşturuldu` : ''
      }.`,
    })
  }

  const lastDay = subDays(week.end, LAST_DAY_OFFSET)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={CalendarRange}
        title="Haftalık Program"
        subtitle={`${format(week.start, 'd MMM', { locale: tr })} – ${format(lastDay, 'd MMM yyyy', { locale: tr })}`}
        actions={
          <>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReferenceDate((d) => addWeeks(d, -1))}
                aria-label="Önceki hafta"
              >
                <ChevronLeft size={ICON_SIZE} />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setReferenceDate(new Date())}>
                Bu hafta
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReferenceDate((d) => addWeeks(d, 1))}
                aria-label="Sonraki hafta"
              >
                <ChevronRight size={ICON_SIZE} />
              </Button>
            </div>
            <Button variant="primary" size="sm" onClick={runAutoPlan}>
              <Wand2 size={ICON_SIZE} />
              Otomatik planla
            </Button>
          </>
        }
      />

      {plan && (
        <AutoPlanPreview
          plan={plan}
          applying={applying}
          onApply={() => void applyPlan()}
          onCancel={() => setPlan(null)}
        />
      )}
      {notice && (
        <p
          role="status"
          className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            notice.tone === 'warning'
              ? 'border-warning/40 bg-warning/10 text-text'
              : 'border-success/40 bg-success/10 text-text'
          }`}
        >
          {notice.text}
          {notice.tone === 'info' && (
            <Link
              to="/robot"
              className="flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <Bot size={ICON_SIZE} />
              Robota git
            </Link>
          )}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <PoolPanel
          goals={poolGoals}
          index={index}
          scheduledMinutes={(id) => scheduledMinutesFor(id, tasks, week)}
          onAutoPlace={handleAutoPlace}
        />
        <WeekGrid
          week={week}
          dayStartHour={dayStartHour}
          dayEndHour={dayEndHour}
          blocks={blocks}
          routines={occurrences}
          ghostBlocks={plan?.blocks ?? []}
          titleOf={titleOf}
          onDropPool={(goalId, start) => {
            const goal = index.get(goalId)
            if (goal) void placeBlock(goal, start, blockMinutes)
          }}
          onMoveBlock={(block, start) => {
            const minutes = differenceInMinutes(new Date(block.endAt), new Date(block.startAt))
            const end = addMinutes(start, minutes)
            warnIfViolates(
              block.parentTaskId ? index.get(block.parentTaskId) : undefined,
              start,
              end,
            )
            void updateTaskFields(uid, block.id, {
              startAt: start.toISOString(),
              endAt: end.toISOString(),
            })
          }}
          onResizeBlock={(block, end) => {
            warnIfViolates(
              block.parentTaskId ? index.get(block.parentTaskId) : undefined,
              new Date(block.startAt),
              end,
            )
            void updateTaskFields(uid, block.id, { endAt: end.toISOString() })
          }}
          onToggleDone={(block) =>
            void updateTaskStatus(uid, block.id, block.status === 'done' ? 'planned' : 'done')
          }
          onDelete={(block) => void deleteTask(uid, block.id)}
        />
      </div>

      <RoutinesPanel />
    </div>
  )
}
