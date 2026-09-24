import type { CapacityAllocationResult } from './backcast'

export interface ActualUsage<T extends string = string> {
  id: T
  actualMinutes: number
}

export interface ForecastDeviation<T extends string = string> {
  id: T
  plannedMinutes: number
  actualMinutes: number
  /** actual - planned (pozitifse bütçe aşımı, negatifse kullanılmayan kapasite) */
  deviationMinutes: number
  /** actual/planned - 1 (planned 0 ise ve actual > 0 ise 1 kabul edilir — "tamamen sapma") */
  deviationRatio: number
  exceedsThreshold: boolean
}

/**
 * Forecasting: gerçekleşen (tamamlanan görev) sürelerini backcast'in planladığı
 * bütçeyle karşılaştırır (bottom-up). `deviationThresholdRatio` aşılan öğeler
 * `exceedsThreshold: true` ile işaretlenir — çağıran taraf (UI veya
 * recalculate.ts) bunu üst ölçekleri yeniden dengelemek için tetikleyici olarak
 * kullanır. bkz. docs/decisions/0004-planlama-motoru.md.
 */
export function computeForecastDeviations<T extends string = string>(
  planned: CapacityAllocationResult<T>[],
  actuals: ActualUsage<T>[],
  deviationThresholdRatio: number,
): ForecastDeviation<T>[] {
  const actualById = new Map(actuals.map((a) => [a.id, a.actualMinutes]))

  return planned.map(({ id, allocatedMinutes }) => {
    const actualMinutes = actualById.get(id) ?? 0
    const deviationMinutes = actualMinutes - allocatedMinutes
    const deviationRatio =
      allocatedMinutes > 0 ? deviationMinutes / allocatedMinutes : actualMinutes > 0 ? 1 : 0

    return {
      id,
      plannedMinutes: allocatedMinutes,
      actualMinutes,
      deviationMinutes,
      deviationRatio,
      exceedsThreshold: Math.abs(deviationRatio) > deviationThresholdRatio,
    }
  })
}
