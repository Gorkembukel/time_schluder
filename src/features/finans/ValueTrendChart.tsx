import { useCallback, useId, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Card } from '../../components/Card'
import { FX_UNITS, FX_UNIT_LABELS, formatFxValue, valueInUnit, type FxUnit } from '../../lib/fxValue'
import type { FinanceCategory, FinanceTransaction } from '../../types/domain'

const CHART_WIDTH = 640
const CHART_HEIGHT = 240
const PADDING_LEFT_MIN = 56
/** BTC gibi uzun ondalıklı etiketler sola taşabildiğinden, en uzun Y ekseni etiketine göre genişler. */
const Y_LABEL_CHAR_WIDTH = 6
const PADDING_RIGHT = 16
const PADDING_TOP = 16
const PADDING_BOTTOM = 28
const Y_TICK_COUNT = 4
const LINE_WIDTH = 2
const TOTAL_LINE_WIDTH = 2.5
const MARKER_RADIUS = 4
const MARKER_RING_WIDTH = 2
const TOOLTIP_WIDTH = 190
const TOOLTIP_PADDING = 10
const TOOLTIP_HEADER_HEIGHT = 16
const TOOLTIP_ROW_HEIGHT = 15
const TOOLTIP_GAP = 10
const TOOLTIP_DATE_Y_OFFSET = 6
const TOOLTIP_SWATCH_RADIUS = 3
const TOOLTIP_SWATCH_X_OFFSET = 3
const TOOLTIP_TEXT_X_OFFSET = 11
const TOOLTIP_SWATCH_Y_OFFSET = -4
const AXIS_LABEL_GAP = 6
const ISO_DATE_LENGTH = 10
const X_LABEL_BASELINE_OFFSET = 8
const DIMMED_OPACITY = 0.35
/** Genel bakışta tek tek çizilecek kategori sayısı üst sınırı — geri kalanı "Diğer kategoriler"nde toplanır (bkz. dataviz skill, "Past three/four, fold to Other"). */
const MAX_CATEGORY_LINES = 4
/** Grafik kategorik serisi — dataviz skill validated default paletin ilk 4 slotu (bkz. tokens.css). */
const CATEGORICAL_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)']
const OTHER_SERIES_COLOR = 'var(--color-text-secondary)'
const TOTAL_EXPENSE_COLOR = 'var(--color-danger)'
const TOTAL_INCOME_COLOR = 'var(--color-success)'
const SINGLE_SERIES_COLOR = 'var(--color-primary)'
const OTHER_CATEGORY_LABEL = 'Diğer kategoriler'
const TOTAL_EXPENSE_LABEL = 'Toplam gider'
const TOTAL_INCOME_LABEL = 'Toplam gelir'
/** "Temiz" Y ekseni adımları (1/2/5/10 × 10'un kuvveti) — grafik ekseni kuralı, kullanıcı ayarı değil. */
// eslint-disable-next-line no-magic-numbers -- 1/2/5/10 yuvarlama merdiveni standart bir eksen kuralıdır
const NICE_STEPS = [1, 2, 5, 10]
const LOG10_BASE = 10

type Mode = 'single' | 'overview'

const MODE_LABELS: Record<Mode, string> = {
  single: 'Tek tek',
  overview: 'Birleşik',
}

interface SeriesPoint {
  date: string
  value: number
}

interface Series {
  id: string
  label: string
  color: string
  points: SeriesPoint[]
}

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

/** İşlemleri tarihe göre sıralayıp seçilen birimdeki kümülatif toplamını noktalar olarak döner. */
function cumulativeSeries(transactions: FinanceTransaction[], unit: FxUnit): SeriesPoint[] {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))
  let running = 0
  const points: SeriesPoint[] = []
  for (const tx of sorted) {
    const value = valueInUnit(tx, unit)
    if (value === null) continue
    running += value
    points.push({ date: tx.date, value: running })
  }
  return points
}

/** Kategori id'lerini, verilen birimdeki toplam değerine göre büyükten küçüğe sıralar. */
function rankCategoryIds(byCategory: Map<string, FinanceTransaction[]>, unit: FxUnit): string[] {
  return [...byCategory.entries()]
    .map(([id, txs]) => ({
      id,
      total: txs.reduce((sum, tx) => sum + (valueInUnit(tx, unit) ?? 0), 0),
    }))
    .sort((a, b) => b.total - a.total)
    .map((entry) => entry.id)
}

/** Kümülatif toplam bir basamak fonksiyonudur (yalnızca işlem anında değişir) — düz çizgi yerine "step-after" çizilir. */
function stepPath(points: SeriesPoint[], xOf: (date: string) => number, yOf: (value: number) => number): string {
  if (points.length === 0) return ''
  let d = `M${xOf(points[0].date)},${yOf(points[0].value)}`
  for (let i = 1; i < points.length; i += 1) {
    d += ` H${xOf(points[i].date)} V${yOf(points[i].value)}`
  }
  d += ` H${CHART_WIDTH - PADDING_RIGHT}`
  return d
}

/** Verilen tarihte serinin o ana kadarki (basamak fonksiyonundaki) değeri — sonraki noktaya kadar sabit kalır. */
function valueAsOf(points: SeriesPoint[], dateIso: string): number | null {
  let result: number | null = null
  for (const p of points) {
    if (p.date > dateIso) break
    result = p.value
  }
  return result
}

/**
 * Seçilen birime (USD/gram altın/BTC) göre işlemlerin zaman içindeki kümülatif değer değişimini
 * gösterir — "tek tek" seçilen tek bir kategorinin kendi çizgisini, "birleşik" toplam gider/gelir
 * çizgileriyle birlikte en büyük kategorileri aynı grafikte gösterir (kalan kategoriler "Diğer
 * kategoriler"nde toplanır). bkz. kullanıcı isteği, docs/decisions/0006 fxSnapshot.
 */
export function ValueTrendChart({
  title,
  transactions,
  categories,
  emptyText,
}: {
  title: string
  transactions: FinanceTransaction[]
  categories: FinanceCategory[]
  emptyText: string
}) {
  const [unit, setUnit] = useState<FxUnit>('usd')
  const [mode, setMode] = useState<Mode>('overview')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [hoverX, setHoverX] = useState<number | null>(null)
  const titleId = useId()

  const categoryName = useCallback(
    (id: string) => categories.find((c) => c.id === id)?.name ?? id,
    [categories],
  )

  const byCategory = useMemo(() => {
    const map = new Map<string, FinanceTransaction[]>()
    for (const tx of transactions) {
      const list = map.get(tx.categoryId) ?? []
      list.push(tx)
      map.set(tx.categoryId, list)
    }
    return map
  }, [transactions])

  const rankedCategoryIds = useMemo(() => rankCategoryIds(byCategory, unit), [byCategory, unit])
  const activeCategoryId = selectedCategoryId || rankedCategoryIds[0] || ''

  const seriesList: Series[] = useMemo(() => {
    if (mode === 'single') {
      if (!activeCategoryId) return []
      return [
        {
          id: activeCategoryId,
          label: categoryName(activeCategoryId),
          color: SINGLE_SERIES_COLOR,
          points: cumulativeSeries(byCategory.get(activeCategoryId) ?? [], unit),
        },
      ]
    }
    const series: Series[] = []
    const expenseTx = transactions.filter((tx) => tx.type === 'expense')
    const incomeTx = transactions.filter((tx) => tx.type === 'income')
    if (expenseTx.length > 0) {
      series.push({ id: '__expense', label: TOTAL_EXPENSE_LABEL, color: TOTAL_EXPENSE_COLOR, points: cumulativeSeries(expenseTx, unit) })
    }
    if (incomeTx.length > 0) {
      series.push({ id: '__income', label: TOTAL_INCOME_LABEL, color: TOTAL_INCOME_COLOR, points: cumulativeSeries(incomeTx, unit) })
    }
    const top = rankedCategoryIds.slice(0, MAX_CATEGORY_LINES)
    const rest = rankedCategoryIds.slice(MAX_CATEGORY_LINES)
    top.forEach((categoryId, i) => {
      series.push({
        id: categoryId,
        label: categoryName(categoryId),
        color: CATEGORICAL_COLORS[i],
        points: cumulativeSeries(byCategory.get(categoryId) ?? [], unit),
      })
    })
    if (rest.length > 0) {
      const restTx = rest.flatMap((categoryId) => byCategory.get(categoryId) ?? [])
      series.push({ id: '__other', label: OTHER_CATEGORY_LABEL, color: OTHER_SERIES_COLOR, points: cumulativeSeries(restTx, unit) })
    }
    return series
  }, [mode, activeCategoryId, byCategory, rankedCategoryIds, unit, transactions, categoryName])

  const skippedCount = useMemo(
    () => transactions.filter((tx) => valueInUnit(tx, unit) === null).length,
    [transactions, unit],
  )

  const allPoints = seriesList.flatMap((s) => s.points)
  const maxValue = niceMax(Math.max(0, ...allPoints.map((p) => p.value)))
  const yTicks = Array.from({ length: Y_TICK_COUNT + 1 }, (_, i) => (maxValue * i) / Y_TICK_COUNT)
  const longestYLabelLength = Math.max(0, ...yTicks.map((t) => formatFxValue(t, unit).length))
  const paddingLeft = Math.max(PADDING_LEFT_MIN, longestYLabelLength * Y_LABEL_CHAR_WIDTH + AXIS_LABEL_GAP)

  const plotWidth = CHART_WIDTH - paddingLeft - PADDING_RIGHT
  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM
  const dateTimes = allPoints.map((p) => new Date(p.date).getTime())
  const minTime = dateTimes.length > 0 ? Math.min(...dateTimes) : 0
  const maxTime = dateTimes.length > 0 ? Math.max(...dateTimes) : 0
  const timeSpan = maxTime - minTime

  function xOf(date: string): number {
    if (timeSpan <= 0) return paddingLeft + plotWidth / 2
    const ratio = (new Date(date).getTime() - minTime) / timeSpan
    return paddingLeft + ratio * plotWidth
  }

  function yOf(value: number): number {
    const ratio = maxValue === 0 ? 0 : value / maxValue
    return PADDING_TOP + plotHeight - ratio * plotHeight
  }

  function dateAtX(px: number): string {
    const ratio = plotWidth === 0 ? 0 : (px - paddingLeft) / plotWidth
    const clamped = Math.min(1, Math.max(0, ratio))
    return new Date(minTime + clamped * timeSpan).toISOString().slice(0, ISO_DATE_LENGTH)
  }

  function handlePointerMove(event: ReactPointerEvent<SVGRectElement>) {
    if (allPoints.length === 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const px = ((event.clientX - rect.left) / rect.width) * CHART_WIDTH
    setHoverX(Math.min(Math.max(px, paddingLeft), CHART_WIDTH - PADDING_RIGHT))
  }

  const hoveredDate = hoverX !== null ? dateAtX(hoverX) : null
  const hoveredRows =
    hoveredDate !== null
      ? seriesList
          .map((s) => ({ series: s, value: valueAsOf(s.points, hoveredDate) }))
          .filter((row): row is { series: Series; value: number } => row.value !== null)
      : []
  const tooltipHeight = TOOLTIP_PADDING * 2 + TOOLTIP_HEADER_HEIGHT + hoveredRows.length * TOOLTIP_ROW_HEIGHT

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        <div className="flex flex-wrap items-center gap-1.5">
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
            {(['single', 'overview'] as const).map((m) => (
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
          {mode === 'single' && rankedCategoryIds.length > 0 && (
            <select
              value={activeCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text"
            >
              {rankedCategoryIds.map((id) => (
                <option key={id} value={id}>
                  {categoryName(id)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {transactions.length === 0 || seriesList.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">{emptyText}</p>
      ) : (
        <>
          <svg
            role="img"
            aria-labelledby={titleId}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="mt-3 w-full text-text-secondary"
            onPointerLeave={() => setHoverX(null)}
          >
            <title id={titleId}>{`${title} — ${FX_UNIT_LABELS[unit]} cinsinden, ${MODE_LABELS[mode].toLowerCase()} görünüm`}</title>
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={paddingLeft}
                  x2={CHART_WIDTH - PADDING_RIGHT}
                  y1={yOf(tick)}
                  y2={yOf(tick)}
                  stroke="currentColor"
                  strokeOpacity={0.15}
                  strokeWidth={1}
                />
                <text x={paddingLeft - AXIS_LABEL_GAP} y={yOf(tick)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="currentColor">
                  {formatFxValue(tick, unit)}
                </text>
              </g>
            ))}

            {timeSpan > 0 && (
              <>
                <text x={paddingLeft} y={CHART_HEIGHT - X_LABEL_BASELINE_OFFSET} fontSize={10} fill="currentColor" textAnchor="start">
                  {formatDateShort(new Date(minTime).toISOString())}
                </text>
                <text x={CHART_WIDTH - PADDING_RIGHT} y={CHART_HEIGHT - X_LABEL_BASELINE_OFFSET} fontSize={10} fill="currentColor" textAnchor="end">
                  {formatDateShort(new Date(maxTime).toISOString())}
                </text>
              </>
            )}

            {seriesList.map((series) => {
              const isDimmed = hoveredDate !== null && valueAsOf(series.points, hoveredDate) === null
              return (
                <g key={series.id} opacity={isDimmed ? DIMMED_OPACITY : 1}>
                  <path
                    d={stepPath(series.points, xOf, yOf)}
                    fill="none"
                    stroke={series.color}
                    strokeWidth={series.id === '__expense' || series.id === '__income' ? TOTAL_LINE_WIDTH : LINE_WIDTH}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {series.points.map((p) => (
                    <circle
                      key={p.date + p.value}
                      cx={xOf(p.date)}
                      cy={yOf(p.value)}
                      r={MARKER_RADIUS}
                      fill={series.color}
                      stroke="var(--color-surface)"
                      strokeWidth={MARKER_RING_WIDTH}
                    />
                  ))}
                </g>
              )
            })}

            {hoverX !== null && (
              <line x1={hoverX} x2={hoverX} y1={PADDING_TOP} y2={CHART_HEIGHT - PADDING_BOTTOM} stroke="currentColor" strokeOpacity={0.3} strokeWidth={1} />
            )}

            <rect
              x={paddingLeft}
              y={PADDING_TOP}
              width={plotWidth}
              height={plotHeight}
              fill="transparent"
              onPointerMove={handlePointerMove}
              onPointerDown={handlePointerMove}
            />

            {hoverX !== null && hoveredDate !== null && hoveredRows.length > 0 && (
              <g
                transform={`translate(${Math.min(Math.max(hoverX - TOOLTIP_WIDTH / 2, paddingLeft), CHART_WIDTH - PADDING_RIGHT - TOOLTIP_WIDTH)}, ${PADDING_TOP + TOOLTIP_GAP})`}
                pointerEvents="none"
              >
                <rect width={TOOLTIP_WIDTH} height={tooltipHeight} rx={8} fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth={1} />
                <text x={TOOLTIP_PADDING} y={TOOLTIP_PADDING + TOOLTIP_DATE_Y_OFFSET} fontSize={10} fill="var(--color-text-secondary)">
                  {formatDateLong(hoveredDate)}
                </text>
                {hoveredRows.map((row, i) => (
                  <g key={row.series.id} transform={`translate(0, ${TOOLTIP_PADDING + TOOLTIP_HEADER_HEIGHT + i * TOOLTIP_ROW_HEIGHT})`}>
                    <circle cx={TOOLTIP_PADDING + TOOLTIP_SWATCH_X_OFFSET} cy={TOOLTIP_SWATCH_Y_OFFSET} r={TOOLTIP_SWATCH_RADIUS} fill={row.series.color} />
                    <text x={TOOLTIP_PADDING + TOOLTIP_TEXT_X_OFFSET} y={0} fontSize={10} fill="var(--color-text)">
                      {row.series.label}: {formatFxValue(row.value, unit)}
                    </text>
                  </g>
                ))}
              </g>
            )}
          </svg>

          {seriesList.length >= 2 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {seriesList.map((series) => (
                <div key={series.id} className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />
                  {series.label}
                </div>
              ))}
            </div>
          )}

          {skippedCount > 0 && (
            <p className="mt-2 text-xs text-text-secondary">
              {skippedCount} işlem bu birim için kur bilgisi içermediğinden grafikte gösterilmiyor.
            </p>
          )}

          <table className="sr-only">
            <caption>{title}</caption>
            <thead>
              <tr>
                <th>Seri</th>
                <th>Tarih</th>
                <th>{FX_UNIT_LABELS[unit]}</th>
              </tr>
            </thead>
            <tbody>
              {seriesList.flatMap((series) =>
                series.points.map((p) => (
                  <tr key={`${series.id}-${p.date}`}>
                    <td>{series.label}</td>
                    <td>{formatDateLong(p.date)}</td>
                    <td>{formatFxValue(p.value, unit)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </>
      )}
    </Card>
  )
}
