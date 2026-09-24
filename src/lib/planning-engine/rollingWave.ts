import { differenceInCalendarDays } from 'date-fns'
import type { DetailLevel, PlanningScale } from '../../types/domain'

/**
 * Rolling wave planning: bir plan öğesi, başlangıç tarihi bugüne göre kendi
 * ölçeğinin detaylandırma penceresi (gün) içindeyse "detailed", değilse
 * "rough" kabul edilir. Pencere kullanıcı ayarından gelir (bkz.
 * config/constants.ts DEFAULT_SETTINGS.planningEngine.detailWindowDays) —
 * burada hardcode edilmez. bkz. docs/decisions/0004-planlama-motoru.md.
 */
export function determineDetailLevel(
  scale: PlanningScale,
  itemStartAt: Date,
  today: Date,
  detailWindowDays: Record<PlanningScale, number>,
): DetailLevel {
  const daysUntilStart = differenceInCalendarDays(itemStartAt, today)
  return daysUntilStart <= detailWindowDays[scale] ? 'detailed' : 'rough'
}

export interface RollingWaveItem {
  id: string
  scale: PlanningScale
  startAt: Date
  detailLevel: DetailLevel
}

export interface RollingWaveTransition {
  id: string
  previousLevel: DetailLevel
  currentLevel: DetailLevel
  /** true ise: öğe "rough"tan "detailed"e geçti, alt görevlere kırılması gerekiyor (kullanıcıya işaretlenmeli) */
  enteredDetailWindow: boolean
}

/**
 * Öğe listesini bugüne göre yeniden değerlendirir (her gün/her review'da
 * çağrılması beklenir) ve seviyesi değişenleri döner. UI, `enteredDetailWindow`
 * true olanları kullanıcıya "bu artık detaylandırılmalı" diye işaretler.
 */
export function evaluateRollingWave(
  items: RollingWaveItem[],
  today: Date,
  detailWindowDays: Record<PlanningScale, number>,
): RollingWaveTransition[] {
  const transitions: RollingWaveTransition[] = []
  for (const item of items) {
    const currentLevel = determineDetailLevel(item.scale, item.startAt, today, detailWindowDays)
    if (currentLevel === item.detailLevel) continue
    transitions.push({
      id: item.id,
      previousLevel: item.detailLevel,
      currentLevel,
      enteredDetailWindow: item.detailLevel === 'rough' && currentLevel === 'detailed',
    })
  }
  return transitions
}
