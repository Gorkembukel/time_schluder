import { useId, useMemo, useState } from 'react'
import { Card } from '../../components/Card'
import { FX_UNITS, FX_UNIT_LABELS, formatFxValue, valueInUnit, type FxUnit } from '../../lib/fxValue'
import type { FinanceTransaction } from '../../types/domain'

const CHART_WIDTH = 640
const CHART_HEIGHT = 220
const PADDING_LEFT = 56
const PADDING_RIGHT = 16
const PADDING_TOP = 16
const PADDING_BOTTOM = 28
const Y_TICK_COUNT = 4
const MARKER_RADIUS = 4
const MARKER_RING_WIDTH = 2
const LINE_WIDTH = 2
const TOOLTIP_WIDTH = 150
const TOOLTIP_HEIGHT = 44
const TOOLTIP_GAP = 10
const AXIS_LABEL_GAP = 6
const X_LABEL_BASELINE_OFFSET = 8
const DIMMED_MARKER_OPACITY = 0.5
/** "Temiz" Y ekseni adımları (1/2/5/10 × 10'un kuvveti) — grafik ekseni kuralı, kullanıcı ayarı değil. */
// eslint-disable-next-line no-magic-numbers -- 1/2/5/10 yuvarlama merdiveni standart bir eksen kuralıdır
const NICE_STEPS = [1, 2, 5, 10]
const LOG10_BASE = 10

type Mode = 'individual' | 'cumulative'

const MODE_LABELS: Record<Mode, string> = {
  individual: 'Tek tek',
  cumulative: 'Birleşik',
}

interface Point {
  id: string
  date: string
  value: number
  label: string
}

/** Y ekseni tiklerini "temiz" sayılara yuvarlar (bkz. dataviz skill, marks-and-anatomy). */
function niceMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = LOG10_BASE ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = NICE_STEPS.find((candidate) => normalized <= candidate) ?? LOG10_BASE
  return step * magnitude
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
}

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

/**
 * Seçilen birime (USD/gram altın/BTC) göre işlemlerin zaman içindeki değer değişimini gösterir —
 * "tek tek" her işlemi ayrı bir nokta olarak (bağlanmaz, çünkü bağımsız olaylardır), "birleşik"
 * kümülatif toplamı çizgi olarak çizer (bkz. kullanıcı isteği, docs/decisions/0006 fxSnapshot).
 */
export function ValueTrendChart({
  title,
  transactions,
  emptyText,
  defaultMode = 'individual',
}: {
  title: string
  transactions: FinanceTransaction[]
  emptyText: string
  defaultMode?: Mode
}) {
  const [unit, setUnit] = useState<FxUnit>('usd')
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const titleId = useId()

  const { points, skippedCount } = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))
    let skipped = 0
    const raw: Point[] = []
    for (const tx of sorted) {
      const value = valueInUnit(tx, unit)
      if (value === null) {
        skipped += 1
        continue
      }
      raw.push({ id: tx.id, date: tx.date, value, label: tx.description || 'İşlem' })
    }
    if (mode === 'individual') return { points: raw, skippedCount: skipped }
    let running = 0
    const cumulative = raw.map((p) => {
      running += p.value
      return { ...p, value: running }
    })
    return { points: cumulative, skippedCount: skipped }
  }, [transactions, unit, mode])

  const plotWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT
  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM
  const minTime = points.length > 0 ? new Date(points[0].date).getTime() : 0
  const maxTime = points.length > 0 ? new Date(points[points.length - 1].date).getTime() : 0
  const timeSpan = maxTime - minTime
  const maxValue = niceMax(Math.max(0, ...points.map((p) => p.value)))

  function xOf(date: string): number {
    if (timeSpan <= 0) return PADDING_LEFT + plotWidth / 2
    const ratio = (new Date(date).getTime() - minTime) / timeSpan
    return PADDING_LEFT + ratio * plotWidth
  }

  function yOf(value: number): number {
    const ratio = maxValue === 0 ? 0 : value / maxValue
    return PADDING_TOP + plotHeight - ratio * plotHeight
  }

  function handlePointerMove(event: React.PointerEvent<SVGRectElement>) {
    if (points.length === 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const pointerX = ((event.clientX - rect.left) / rect.width) * CHART_WIDTH
    let nearest = 0
    let nearestDistance = Infinity
    points.forEach((p, i) => {
      const distance = Math.abs(xOf(p.date) - pointerX)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = i
      }
    })
    setHoverIndex(nearest)
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.date)},${yOf(p.value)}`).join(' ')
  const yTicks = Array.from({ length: Y_TICK_COUNT + 1 }, (_, i) => (maxValue * i) / Y_TICK_COUNT)

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        <div className="flex flex-wrap gap-1.5">
          <div className="flex overflow-hidden rounded-lg border border-border">
            {FX_UNITS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`px-2 py-1 text-xs font-medium transition-colors ${
                  unit === u ? 'bg-primary text-primary-text' : 'bg-bg text-text-secondary'
                }`}
              >
                {FX_UNIT_LABELS[u]}
              </button>
            ))}
          </div>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {(['individual', 'cumulative'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-2 py-1 text-xs font-medium transition-colors ${
                  mode === m ? 'bg-primary text-primary-text' : 'bg-bg text-text-secondary'
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {points.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">{emptyText}</p>
      ) : (
        <>
          <svg
            role="img"
            aria-labelledby={titleId}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="mt-3 w-full text-text-secondary"
            onPointerLeave={() => setHoverIndex(null)}
          >
            <title id={titleId}>{`${title} — ${FX_UNIT_LABELS[unit]} cinsinden, ${MODE_LABELS[mode].toLowerCase()} görünüm`}</title>
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PADDING_LEFT}
                  x2={CHART_WIDTH - PADDING_RIGHT}
                  y1={yOf(tick)}
                  y2={yOf(tick)}
                  stroke="currentColor"
                  strokeOpacity={0.15}
                  strokeWidth={1}
                />
                <text x={PADDING_LEFT - AXIS_LABEL_GAP} y={yOf(tick)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="currentColor">
                  {formatFxValue(tick, unit)}
                </text>
              </g>
            ))}

            <text x={xOf(points[0].date)} y={CHART_HEIGHT - X_LABEL_BASELINE_OFFSET} fontSize={10} fill="currentColor" textAnchor="start">
              {formatDateShort(points[0].date)}
            </text>
            {points.length > 1 && (
              <text
                x={xOf(points[points.length - 1].date)}
                y={CHART_HEIGHT - X_LABEL_BASELINE_OFFSET}
                fontSize={10}
                fill="currentColor"
                textAnchor="end"
              >
                {formatDateShort(points[points.length - 1].date)}
              </text>
            )}

            {mode === 'cumulative' && (
              <path d={linePath} fill="none" className="text-primary" stroke="currentColor" strokeWidth={LINE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
            )}

            {points.map((p, i) => (
              <circle
                key={p.id}
                cx={xOf(p.date)}
                cy={yOf(p.value)}
                r={MARKER_RADIUS}
                className="text-primary"
                fill="currentColor"
                stroke="var(--color-surface)"
                strokeWidth={MARKER_RING_WIDTH}
                opacity={hoverIndex === null || hoverIndex === i ? 1 : DIMMED_MARKER_OPACITY}
              />
            ))}

            {hoverIndex !== null && (
              <line
                x1={xOf(points[hoverIndex].date)}
                x2={xOf(points[hoverIndex].date)}
                y1={PADDING_TOP}
                y2={CHART_HEIGHT - PADDING_BOTTOM}
                stroke="currentColor"
                strokeOpacity={0.3}
                strokeWidth={1}
              />
            )}

            <rect
              x={PADDING_LEFT}
              y={PADDING_TOP}
              width={plotWidth}
              height={plotHeight}
              fill="transparent"
              onPointerMove={handlePointerMove}
              onPointerDown={handlePointerMove}
            />

            {hovered && (
              <g
                transform={`translate(${Math.min(
                  Math.max(xOf(hovered.date) - TOOLTIP_WIDTH / 2, PADDING_LEFT),
                  CHART_WIDTH - PADDING_RIGHT - TOOLTIP_WIDTH,
                )}, ${Math.max(yOf(hovered.value) - TOOLTIP_HEIGHT - TOOLTIP_GAP, PADDING_TOP)})`}
                pointerEvents="none"
              >
                <rect
                  width={TOOLTIP_WIDTH}
                  height={TOOLTIP_HEIGHT}
                  rx={8}
                  fill="var(--color-surface)"
                  stroke="var(--color-border)"
                  strokeWidth={1}
                />
                <text x={10} y={17} fontSize={10} fill="var(--color-text-secondary)">
                  {formatDateLong(hovered.date)}
                </text>
                <text x={10} y={32} fontSize={11} fontWeight={600} fill="var(--color-text)">
                  {formatFxValue(hovered.value, unit)}
                </text>
              </g>
            )}
          </svg>

          {skippedCount > 0 && (
            <p className="mt-2 text-xs text-text-secondary">
              {skippedCount} işlem bu birim için kur bilgisi içermediğinden grafikte gösterilmiyor.
            </p>
          )}

          <table className="sr-only">
            <caption>{title}</caption>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Açıklama</th>
                <th>{FX_UNIT_LABELS[unit]}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateLong(p.date)}</td>
                  <td>{p.label}</td>
                  <td>{formatFxValue(p.value, unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  )
}
