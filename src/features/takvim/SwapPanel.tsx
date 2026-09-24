import { useState } from 'react'
import { swapTasks, type SwapResult } from '../../lib/planning-engine'
import { applyTaskChanges } from '../../services/repositories/tasksRepository'
import type { Task } from '../../types/domain'

const selectClass = 'rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text'

/** requirements.md §4.6: aynı hafta içindeki iki görevi yer değiştirme. swap.ts hiçbir şeyi otomatik uygulamaz — önizleme zorunlu. */
export function SwapPanel({ uid, tasks }: { uid: string; tasks: Task[] }) {
  const [taskIdA, setTaskIdA] = useState('')
  const [taskIdB, setTaskIdB] = useState('')
  const [result, setResult] = useState<SwapResult | null>(null)
  const [applying, setApplying] = useState(false)

  if (tasks.length < 2) return null

  function handlePreview() {
    if (!taskIdA || !taskIdB || taskIdA === taskIdB) return
    setResult(swapTasks(tasks, taskIdA, taskIdB))
  }

  async function handleApply() {
    if (!result) return
    setApplying(true)
    await applyTaskChanges(uid, result.changes)
    setApplying(false)
    setResult(null)
    setTaskIdA('')
    setTaskIdB('')
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-text">Görev takası</p>
      <p className="mt-1 text-xs text-text-secondary">
        Bu haftadan iki görev seç, zamanlarını birbirleriyle değiştir.
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <select
          value={taskIdA}
          onChange={(e) => {
            setTaskIdA(e.target.value)
            setResult(null)
          }}
          className={selectClass}
        >
          <option value="">Görev A…</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <select
          value={taskIdB}
          onChange={(e) => {
            setTaskIdB(e.target.value)
            setResult(null)
          }}
          className={selectClass}
        >
          <option value="">Görev B…</option>
          {tasks
            .filter((t) => t.id !== taskIdA)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
        </select>
        <button
          type="button"
          onClick={handlePreview}
          disabled={!taskIdA || !taskIdB}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary disabled:opacity-50"
        >
          Önizle
        </button>
      </div>

      {result && (
        <div className="mt-3">
          {result.isValid ? (
            <p className="text-xs text-success">Çakışma yok, uygulanabilir.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {result.violations.map((v) => (
                <li key={`${v.fromTaskId}-${v.toTaskId}-${v.type}`} className="text-xs text-warning">
                  {v.message}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={applying}
              onClick={() => void handleApply()}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-text disabled:opacity-60"
            >
              {result.isValid ? 'Takas et' : 'Yine de uygula'}
            </button>
            <button type="button" onClick={() => setResult(null)} className="text-xs text-text-secondary">
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
