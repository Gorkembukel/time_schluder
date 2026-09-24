import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { differenceInMinutes, format } from 'date-fns'
import { Award, Bot, Check, Flame, Play, Sparkles, TimerReset, Zap } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useTaskHierarchy } from '../../hooks/useTaskHierarchy'
import { useRoutinesStore } from '../../stores/routinesStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { updateTaskFields, updateTaskStatus } from '../../services/repositories/tasksRepository'
import { computeRobotStats, taskXp } from '../../lib/gamification'
import { findNextSlot } from '../../lib/autoPlanner'
import { weekRange } from '../../lib/dateRange'
import type { TaskIndex } from '../../lib/taskHierarchy'
import { PageHeader } from '../../components/PageHeader'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import type { Task } from '../../types/domain'
import { TaskBreadcrumb } from '../is-takibi/TaskBreadcrumb'
import { ProgressBar } from '../is-takibi/ProgressBar'
import { RobotAvatar, type RobotMood } from './RobotAvatar'

const ICON_SIZE = 14
const TIME_FORMAT = 'HH:mm'
/** Ekrandaki "şimdi"nin yenilenme aralığı — şu anki görev ve kuyruk dakikada bir güncellenir. */
const CLOCK_TICK_MS = 30_000
/** "+XP" kutlamasının ekranda kalma süresi. */
const CELEBRATION_MS = 2500

/**
 * Oyunlaştırılmış görev konsolu: kullanıcı planı yapar, robotu (kendisi) görevleri kuyruktan tek
 * tek alır. XP/seviye/seri/rozetler tamamen mevcut veriden hesaplanır — ek girdi yok.
 */
export function RobotPage() {
  const uid = useUid()
  const { tasks, index } = useTaskHierarchy()
  const routines = useRoutinesStore((s) => s.routines)
  const { dayStartHour, dayEndHour, weekStartsOn } = useSettingsStore(
    (s) => s.settings.calendarTime,
  )
  const [now, setNow] = useState(() => new Date())
  const [celebration, setCelebration] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), CLOCK_TICK_MS)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    if (!celebration) return
    const id = setTimeout(() => setCelebration(null), CELEBRATION_MS)
    return () => clearTimeout(id)
  }, [celebration])

  const stats = useMemo(() => computeRobotStats(tasks, now), [tasks, now])
  const missed = stats.todayBlocks.filter((t) => t.status !== 'done' && new Date(t.endAt) <= now)
  const next = stats.queue[0]

  const mood: RobotMood = stats.current
    ? 'working'
    : stats.todayBlocks.length > 0 && stats.todayDoneCount === stats.todayBlocks.length
      ? 'celebrating'
      : next
        ? 'waiting'
        : 'idle'

  const speech = stats.current
    ? `Şu an "${stats.current.title}" üzerindeyim. Bitince "Tamamla"ya bas, XP'yi kapayım!`
    : mood === 'celebrating'
      ? 'Bugünün tüm görevleri bitti. Harika iş çıkardık!'
      : next
        ? `Sıradaki görevim "${next.title}", ${format(new Date(next.startAt), TIME_FORMAT)}'de başlıyor.`
        : stats.todayBlocks.length === 0
          ? 'Bugün için görevim yok. Program\'da "Otomatik planla"ya bas, ben hallederim.'
          : 'Bugünün kalan görevlerini kaçırdık. Onları ertele, ben yeni saatlere taşıyayım.'

  async function complete(task: Task) {
    const xp = taskXp({ ...task, status: 'done', completedAt: new Date().toISOString() })
    await updateTaskStatus(uid, task.id, 'done')
    setCelebration(`+${xp} XP · "${task.title}" tamamlandı`)
  }

  async function postpone(task: Task) {
    const minutes = differenceInMinutes(new Date(task.endAt), new Date(task.startAt))
    const slot = findNextSlot({
      tasks,
      routines,
      from: new Date(),
      minutes,
      excludeId: task.id,
      weekOf: (d) => weekRange(d, weekStartsOn),
      dayStartHour,
      dayEndHour,
    })
    if (!slot) {
      setNotice(`"${task.title}" için bu ve sonraki hafta boş yer bulamadım.`)
      return
    }
    await updateTaskFields(uid, task.id, {
      startAt: slot.start.toISOString(),
      endAt: slot.end.toISOString(),
    })
    setNotice(`"${task.title}" → ${format(slot.start, 'd MMM HH:mm')}'e ertelendi.`)
  }

  const levelSpan = stats.nextLevelXp - stats.levelStartXp
  const levelRatio = levelSpan > 0 ? (stats.totalXp - stats.levelStartXp) / levelSpan : 0

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Bot}
        title="Robot"
        subtitle="Planı sen yap, görevleri robotun tek tek alsın"
      />

      <Card className="flex flex-col items-center gap-4 p-5 sm:flex-row sm:items-start">
        <RobotAvatar mood={mood} />
        <div className="flex w-full flex-col gap-3">
          <p className="relative rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text">
            {speech}
          </p>
          <div>
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span className="font-semibold text-text">Seviye {stats.level}</span>
              <span>
                {stats.totalXp} / {stats.nextLevelXp} XP
              </span>
            </div>
            <ProgressBar ratio={levelRatio} label="Sonraki seviyeye ilerleme" />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Stat icon={Flame} label={`${stats.streak} günlük seri`} />
            <Stat icon={Zap} label={`Bugün +${stats.todayXp} XP`} />
            <Stat
              icon={Check}
              label={`Bugün ${stats.todayDoneCount}/${stats.todayBlocks.length} görev`}
            />
          </div>
        </div>
      </Card>

      {celebration && (
        <p
          role="status"
          className="flex items-center gap-2 self-center rounded-full bg-success/15 px-4 py-2 text-sm font-semibold text-success motion-safe:animate-bounce"
        >
          <Sparkles size={ICON_SIZE} />
          {celebration}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
        >
          {notice}
        </p>
      )}

      {stats.current && (
        <Card className="border-primary/50 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-primary">
            Şu anki görev
          </h2>
          <MissionRow
            task={stats.current}
            index={index}
            now={now}
            onStart={() => void updateTaskStatus(uid, stats.current!.id, 'in-progress')}
            onComplete={() => void complete(stats.current!)}
            onPostpone={() => void postpone(stats.current!)}
            highlighted
          />
        </Card>
      )}

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-text">Görev kuyruğu</h2>
        {stats.queue.length === 0 ? (
          stats.todayBlocks.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="Robotun bugün boşta"
              description="Program sayfasında Otomatik planla ile haftanın görevlerini ver."
            />
          ) : (
            <p className="mt-2 text-sm text-text-secondary">Bugün için sırada görev kalmadı.</p>
          )
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {stats.queue.map((task) => (
              <li key={task.id}>
                <MissionRow
                  task={task}
                  index={index}
                  now={now}
                  onComplete={() => void complete(task)}
                  onPostpone={() => void postpone(task)}
                />
              </li>
            ))}
          </ul>
        )}
        <Link to="/program" className="mt-3 inline-block text-xs text-primary hover:underline">
          Haftalık programa git
        </Link>
      </Card>

      {missed.length > 0 && (
        <Card className="border-warning/40 p-5">
          <h2 className="text-sm font-semibold text-text">Kaçırılanlar</h2>
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {missed.map((task) => (
              <li key={task.id}>
                <MissionRow
                  task={task}
                  index={index}
                  now={now}
                  onComplete={() => void complete(task)}
                  onPostpone={() => void postpone(task)}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text">
          <Award size={ICON_SIZE} className="text-primary" />
          Rozetler
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stats.badges.map((b) => (
            <li
              key={b.id}
              className={`rounded-lg border p-3 text-xs ${
                b.earned ? 'border-success/40 bg-success/10' : 'border-border opacity-60'
              }`}
            >
              <p className="font-semibold text-text">
                {b.earned ? '🏅' : '🔒'} {b.label}
              </p>
              <p className="text-text-secondary">{b.description}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function Stat({ icon: Icon, label }: { icon: typeof Flame; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-border/60 px-2.5 py-1 text-text">
      <Icon size={ICON_SIZE} className="text-primary" />
      {label}
    </span>
  )
}

function MissionRow({
  task,
  index,
  now,
  highlighted = false,
  onStart,
  onComplete,
  onPostpone,
}: {
  task: Task
  index: TaskIndex
  now: Date
  highlighted?: boolean
  onStart?: () => void
  onComplete: () => void
  onPostpone: () => void
}) {
  const start = new Date(task.startAt)
  const end = new Date(task.endAt)
  const total = end.getTime() - start.getTime()
  const elapsed =
    total > 0 ? Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / total)) : 0

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <TaskBreadcrumb task={task} index={index} />
        <p className={`font-medium text-text ${highlighted ? 'text-base' : 'text-sm'}`}>
          {task.title}
        </p>
        <p className="text-xs text-text-secondary">
          {format(start, TIME_FORMAT)}–{format(end, TIME_FORMAT)}
          {task.status === 'in-progress' && ' · devam ediyor'}
        </p>
        {highlighted && (
          <div className="mt-2 w-56">
            <ProgressBar ratio={elapsed} label="Görev süresinin geçen kısmı" />
          </div>
        )}
      </div>
      <div className="flex gap-1">
        {onStart && task.status === 'planned' && (
          <Button variant="secondary" size="sm" onClick={onStart}>
            <Play size={ICON_SIZE} />
            Başla
          </Button>
        )}
        <Button variant="primary" size="sm" onClick={onComplete}>
          <Check size={ICON_SIZE} />
          Tamamla
        </Button>
        <Button variant="ghost" size="sm" onClick={onPostpone}>
          <TimerReset size={ICON_SIZE} />
          Ertele
        </Button>
      </div>
    </div>
  )
}
