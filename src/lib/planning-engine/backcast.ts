import { differenceInCalendarDays } from 'date-fns'

const MINUTES_PER_HOUR = 60

export interface Allocation<T extends string = string> {
  id: T
  weight: number
}

export interface CapacityAllocationResult<T extends string = string> {
  id: T
  allocatedMinutes: number
}

export interface CapacityDistribution<T extends string = string> {
  totalCapacityMinutes: number
  bufferMinutes: number
  allocations: CapacityAllocationResult<T>[]
}

/**
 * Backcasting'in çekirdek işlemi: toplam kapasiteden tampon oranı düşülür,
 * kalan ağırlıklara (ör. hayat alanı önceliği) orantılı dağıtılır. Bu tek
 * seviyeli işlem; 3 yıl→yıl→ay→hafta→gün geçişlerinin her biri için ayrı ayrı
 * çağrılarak kademeli (top-down) bütçeleme elde edilir — bkz.
 * docs/decisions/0004-planlama-motoru.md.
 */
export function distributeCapacity<T extends string = string>(
  totalCapacityMinutes: number,
  bufferRatio: number,
  allocations: Allocation<T>[],
): CapacityDistribution<T> {
  const bufferMinutes = totalCapacityMinutes * bufferRatio
  const distributableMinutes = totalCapacityMinutes - bufferMinutes
  const totalWeight = allocations.reduce((sum, a) => sum + a.weight, 0)

  const results = allocations.map((a) => ({
    id: a.id,
    allocatedMinutes: totalWeight > 0 ? (a.weight / totalWeight) * distributableMinutes : 0,
  }))

  return { totalCapacityMinutes, bufferMinutes, allocations: results }
}

/** Bir günün kullanılabilir kapasitesi (Ayarlar'daki gün başlangıç/bitiş saatine göre). */
export function dailyCapacityMinutes(dayStartHour: number, dayEndHour: number): number {
  return (dayEndHour - dayStartHour) * MINUTES_PER_HOUR
}

/**
 * `[periodStart, periodEnd)` aralığının toplam kapasitesi — takvim gün sayısı ×
 * günlük kapasite. Hafta/ay/yıl/3-yıl gibi çok günlü periyotlar için kullanılır.
 */
export function periodCapacityMinutes(
  periodStart: Date,
  periodEnd: Date,
  dayStartHour: number,
  dayEndHour: number,
): number {
  const days = differenceInCalendarDays(periodEnd, periodStart)
  return days * dailyCapacityMinutes(dayStartHour, dayEndHour)
}

/**
 * Bir periyodun kapasitesini hesaplayıp hayat alanı/hedef ağırlıklarına göre
 * dağıtan üst düzey yardımcı — tek çağrıda "bu ayın kapasitesi şu hedeflere
 * nasıl dağılır" sorusuna cevap verir.
 */
export function backcastAllocation<T extends string = string>(
  periodStart: Date,
  periodEnd: Date,
  dayStartHour: number,
  dayEndHour: number,
  bufferRatio: number,
  allocations: Allocation<T>[],
): CapacityDistribution<T> {
  const totalCapacityMinutes = periodCapacityMinutes(
    periodStart,
    periodEnd,
    dayStartHour,
    dayEndHour,
  )
  return distributeCapacity(totalCapacityMinutes, bufferRatio, allocations)
}
