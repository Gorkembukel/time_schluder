import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../../config/constants'
import { mergeWithDefaults } from './settingsRepository'

describe('mergeWithDefaults', () => {
  it('eski dokümanda eksik olan yeni alt alanları varsayılanla doldurur', () => {
    // Önceki sürümde kaydedilmiş doküman: yeni alanlar hiç yok.
    const { detailWindowDays, majorChangeThreshold } = DEFAULT_SETTINGS.planningEngine
    const legacy = { planningEngine: { detailWindowDays, majorChangeThreshold, bufferRatio: 0.3 } }
    const merged = mergeWithDefaults(legacy as never)
    expect(merged.planningEngine.bufferRatio).toBe(0.3)
    expect(merged.planningEngine.plannableRatio).toBe(
      DEFAULT_SETTINGS.planningEngine.plannableRatio,
    )
    expect(merged.planningEngine.priorityWeights).toEqual(
      DEFAULT_SETTINGS.planningEngine.priorityWeights,
    )
  })

  it('bölüm hiç yoksa tamamen varsayılanı kullanır', () => {
    const stored = { appearance: { theme: 'dark' as const } }
    const merged = mergeWithDefaults(stored)
    expect(merged.appearance.theme).toBe('dark')
    expect(merged.calendarTime).toEqual(DEFAULT_SETTINGS.calendarTime)
  })
})
