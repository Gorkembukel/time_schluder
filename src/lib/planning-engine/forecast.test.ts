import { describe, expect, it } from 'vitest'
import { computeForecastDeviations } from './forecast'

describe('computeForecastDeviations', () => {
  it('bütçe altındaki kullanım için exceedsThreshold false döner', () => {
    const result = computeForecastDeviations(
      [{ id: 'a', allocatedMinutes: 100 }],
      [{ id: 'a', actualMinutes: 90 }],
      0.2,
    )
    expect(result[0]).toMatchObject({
      plannedMinutes: 100,
      actualMinutes: 90,
      deviationMinutes: -10,
      exceedsThreshold: false,
    })
  })

  it('eşiği aşan sapmayı exceedsThreshold true ile işaretler', () => {
    const result = computeForecastDeviations(
      [{ id: 'a', allocatedMinutes: 100 }],
      [{ id: 'a', actualMinutes: 150 }],
      0.2,
    )
    expect(result[0]).toMatchObject({
      deviationMinutes: 50,
      deviationRatio: 0.5,
      exceedsThreshold: true,
    })
  })

  it('gerçekleşme kaydı olmayan öğe için actualMinutes 0 kabul edilir', () => {
    const result = computeForecastDeviations([{ id: 'a', allocatedMinutes: 100 }], [], 0.2)
    expect(result[0]).toMatchObject({ actualMinutes: 0, deviationRatio: -1, exceedsThreshold: true })
  })

  it('planlanan 0 iken gerçekleşme varsa sapma oranı 1 kabul edilir', () => {
    const result = computeForecastDeviations(
      [{ id: 'a', allocatedMinutes: 0 }],
      [{ id: 'a', actualMinutes: 30 }],
      0.2,
    )
    expect(result[0]).toMatchObject({ deviationRatio: 1, exceedsThreshold: true })
  })
})
