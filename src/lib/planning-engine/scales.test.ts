import { describe, expect, it } from 'vitest'
import { format } from 'date-fns'
import { coarserScale, finerScale, hourRange, scalePeriodRange, year3Range, yearRange } from './scales'

const ISO_DATE = 'yyyy-MM-dd'

describe('yearRange', () => {
  it('yılın ilk gününden bir sonraki yılın ilk gününe kadar aralık döner', () => {
    const { start, end } = yearRange(new Date(2026, 5, 15))
    expect(format(start, ISO_DATE)).toBe('2026-01-01')
    expect(format(end, ISO_DATE)).toBe('2027-01-01')
  })
})

describe('year3Range', () => {
  it('3 yıllık aralık döner', () => {
    const { start, end } = year3Range(new Date(2026, 5, 15))
    expect(format(start, ISO_DATE)).toBe('2026-01-01')
    expect(format(end, ISO_DATE)).toBe('2029-01-01')
  })
})

describe('hourRange', () => {
  it('saatin başından bir sonraki saate kadar aralık döner', () => {
    const { start, end } = hourRange(new Date(2026, 0, 1, 14, 37))
    expect(start.getHours()).toBe(14)
    expect(start.getMinutes()).toBe(0)
    expect(end.getHours()).toBe(15)
  })
})

describe('scalePeriodRange', () => {
  it('her ölçek için doğru aralık fonksiyonuna delege eder', () => {
    const date = new Date(2026, 2, 15)
    expect(scalePeriodRange('year3', date, 1)).toEqual(year3Range(date))
    expect(scalePeriodRange('year', date, 1)).toEqual(yearRange(date))
    expect(scalePeriodRange('hour', date, 1)).toEqual(hourRange(date))
  })
})

describe('finerScale / coarserScale', () => {
  it('sıradaki daha ince ölçeği döner', () => {
    expect(finerScale('year3')).toBe('year')
    expect(finerScale('month')).toBe('week')
    expect(finerScale('hour')).toBeNull()
  })

  it('sıradaki daha kaba ölçeği döner', () => {
    expect(coarserScale('hour')).toBe('day')
    expect(coarserScale('year')).toBe('year3')
    expect(coarserScale('year3')).toBeNull()
  })
})
