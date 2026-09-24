import { describe, expect, it } from 'vitest'
import { format } from 'date-fns'
import { dayRange, monthRange, toDateFnsWeekStartsOn, weekRange } from './dateRange'

const ISO_DATE = 'yyyy-MM-dd'
const ISO_MONTH = 'yyyy-MM'

describe('toDateFnsWeekStartsOn', () => {
  it('ISO Pazartesi(1) → date-fns 1 çevirir', () => {
    expect(toDateFnsWeekStartsOn(1)).toBe(1)
  })

  it('ISO Pazar(7) → date-fns 0 çevirir', () => {
    expect(toDateFnsWeekStartsOn(7)).toBe(0)
  })
})

describe('dayRange', () => {
  it('günün (yerel) başlangıcından ertesi güne kadar dışlayıcı aralık döner', () => {
    const { start, end } = dayRange(new Date(2026, 2, 15, 14, 30))
    expect(format(start, ISO_DATE)).toBe('2026-03-15')
    expect(format(end, ISO_DATE)).toBe('2026-03-16')
  })
})

describe('weekRange', () => {
  it('Pazartesi başlangıçlı 7 günlük aralık döner', () => {
    // 2026-03-15 bir Pazar
    const { start, end } = weekRange(new Date(2026, 2, 15), 1)
    expect(start.getDay()).toBe(1) // Pazartesi
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBe(7)
  })
})

describe('monthRange', () => {
  it('ayın ilk gününden bir sonraki ayın ilk gününe kadar aralık döner', () => {
    const { start, end } = monthRange(new Date(2026, 2, 15))
    expect(format(start, ISO_MONTH)).toBe('2026-03')
    expect(format(end, ISO_MONTH)).toBe('2026-04')
  })
})
