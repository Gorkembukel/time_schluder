import { useState } from 'react'
import { AlertTriangle, ArrowLeftRight, CheckCircle2 } from 'lucide-react'
import { swapTasks, type SwapResult } from '../../lib/planning-engine'
import { applyTaskChanges } from '../../services/repositories/tasksRepository'
import type { Task } from '../../types/domain'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'

const selectClass = 'rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text'
const ICON_SIZE = 14

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
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-text">
        <ArrowLeftRight size={ICON_SIZE} className="text-primary" />
        Görev takası
      </p>
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
        <Button variant="secondary" size="sm" onClick={handlePreview} disabled={!taskIdA || !taskIdB}>
          Önizle
        </Button>
      </div>

      {result && (
        <div className="mt-3">
          {result.isValid ? (
            <p className="flex items-center gap-1 text-xs text-success">
              <CheckCircle2 size={ICON_SIZE} />
              Çakışma yok, uygulanabilir.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {result.violations.map((v) => (
                <li
                  key={`${v.fromTaskId}-${v.toTaskId}-${v.type}`}
                  className="flex items-start gap-1.5 text-xs text-warning"
                >
                  <AlertTriangle size={ICON_SIZE} className="mt-0.5 shrink-0" />
                  {v.message}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex gap-2">
            <Button variant="primary" size="sm" disabled={applying} onClick={() => void handleApply()}>
              {result.isValid ? 'Takas et' : 'Yine de uygula'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
              Vazgeç
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
