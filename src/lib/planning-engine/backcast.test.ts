import { describe, expect, it } from 'vitest'
import {
  backcastAllocation,
  dailyCapacityMinutes,
  distributeCapacity,
  periodCapacityMinutes,
} from './backcast'

describe('distributeCapacity', () => {
  it('tamponu düşer, kalanı ağırlığa göre orantılı dağıtır', () => {
    const result = distributeCapacity(7140, 0.15, [
      { id: 'a', weight: 1 },
      { id: 'b', weight: 2 },
    ])
    expect(result.bufferMinutes).toBeCloseTo(1071)
    expect(result.allocations).toEqual([
      { id: 'a', allocatedMinutes: 2023 },
      { id: 'b', allocatedMinutes: 4046 },
    ])
  })

  it('toplam ağırlık 0 ise tüm tahsisler 0 döner', () => {
    const result = distributeCapacity(1000, 0.1, [{ id: 'a', weight: 0 }])
    expect(result.allocations[0].allocatedMinutes).toBe(0)
  })
})

describe('dailyCapacityMinutes', () => {
  it('gün başlangıç/bitiş saatinden dakika hesaplar', () => {
    expect(dailyCapacityMinutes(6, 23)).toBe(1020)
  })
})

describe('periodCapacityMinutes', () => {
  it('7 günlük bir periyodun kapasitesini hesaplar', () => {
    const start = new Date(2026, 0, 1)
    const end = new Date(2026, 0, 8)
    expect(periodCapacityMinutes(start, end, 6, 23)).toBe(7 * 1020)
  })
})

describe('backcastAllocation', () => {
  it('periyot kapasitesini hesaplayıp hedeflere dağıtır (uçtan uca)', () => {
    const start = new Date(2026, 0, 1)
    const end = new Date(2026, 0, 8) // 7 gün
    const result = backcastAllocation(start, end, 6, 23, 0.15, [
      { id: 'a', weight: 1 },
      { id: 'b', weight: 2 },
    ])
    expect(result.totalCapacityMinutes).toBe(7140)
    expect(result.allocations).toEqual([
      { id: 'a', allocatedMinutes: 2023 },
      { id: 'b', allocatedMinutes: 4046 },
    ])
  })
})
