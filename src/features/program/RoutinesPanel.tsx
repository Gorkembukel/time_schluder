import { useState, type FormEvent } from 'react'
import { ChevronRight, Plus, Repeat, Trash2 } from 'lucide-react'
import { useUid } from '../../app/UidContext'
import { useRoutinesStore } from '../../stores/routinesStore'
import { useLifeAreasStore } from '../../stores/lifeAreasStore'
import { createRoutine, deleteRoutine } from '../../services/repositories/routinesRepository'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'

const ICON_SIZE = 14
const inputClass = 'rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text'

/** ISO 8601 gün numaraları (1 = Pazartesi) ve kısa etiketleri. */
const WEEKDAY_SHORT: { iso: number; label: string }[] = [
  { iso: 1, label: 'Pzt' },
  { iso: 2, label: 'Sal' },
  { iso: 3, label: 'Çar' },
  { iso: 4, label: 'Per' },
  { iso: 5, label: 'Cum' },
  { iso: 6, label: 'Cmt' },
  { iso: 7, label: 'Paz' },
]

/**
 * Her hafta tekrar eden sabit program (ders programı, rutinler). Bir kez girilir, her haftanın
 * ızgarasında görünür ve otomatik dağıtım bu saatleri dolu sayar.
 */
export function RoutinesPanel() {
  const uid = useUid()
  const routines = useRoutinesStore((s) => s.routines)
  const areas = useLifeAreasStore((s) => s.areas)
  const [open, setOpen] = useState(routines.length === 0)
  const [title, setTitle] = useState('')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [lifeAreaId, setLifeAreaId] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!title.trim()) return
    if (weekdays.length === 0) {
      setError('En az bir gün seç.')
      return
    }
    if (endTime <= startTime) {
      setError('Bitiş saati başlangıçtan sonra olmalı.')
      return
    }
    await createRoutine(uid, {
      title: title.trim(),
      weekdays: [...weekdays].sort(),
      startTime,
      endTime,
      lifeAreaId: lifeAreaId || undefined,
    })
    setTitle('')
    setWeekdays([])
  }

  return (
    <Card className="p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-left text-sm font-semibold text-text"
      >
        <ChevronRight
          size={ICON_SIZE}
          className={`transition-transform motion-safe:duration-150 ${open ? 'rotate-90' : ''}`}
        />
        <Repeat size={ICON_SIZE} className="text-primary" />
        Sabit program
        <span className="font-normal text-text-secondary">
          (ders programı, rutinler — {routines.length} adet)
        </span>
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-3">
          {routines.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {routines.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-bg/50 py-1 pl-3 pr-1 text-xs"
                >
                  <span className="font-medium text-text">{r.title}</span>
                  <span className="text-text-secondary">
                    {r.weekdays.map((d) => WEEKDAY_SHORT[d - 1]?.label).join(', ')} · {r.startTime}–
                    {r.endTime}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void deleteRoutine(uid, r.id)}
                    aria-label={`${r.title} rutinini sil`}
                  >
                    <Trash2 size={ICON_SIZE} />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-text-secondary">
              Başlık
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ör. Diferansiyel Denklemler dersi"
                className={inputClass}
              />
            </label>
            <fieldset className="flex flex-col gap-1 text-xs text-text-secondary">
              <legend className="mb-1">Günler</legend>
              <div className="flex gap-1">
                {WEEKDAY_SHORT.map((d) => {
                  const active = weekdays.includes(d.iso)
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setWeekdays((w) => (active ? w.filter((x) => x !== d.iso) : [...w, d.iso]))
                      }
                      className={`rounded-md border px-1.5 py-1 ${
                        active
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-border text-text-secondary hover:text-text'
                      }`}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Başlangıç
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Bitiş
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Hayat alanı
              <select
                value={lifeAreaId}
                onChange={(e) => setLifeAreaId(e.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="primary" size="sm">
              <Plus size={ICON_SIZE} />
              Rutin ekle
            </Button>
            {error && <p className="w-full text-xs text-danger">{error}</p>}
          </form>
        </div>
      )}
    </Card>
  )
}
