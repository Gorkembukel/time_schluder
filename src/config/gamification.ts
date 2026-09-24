import type { PlanningScale } from '../types/domain'

/**
 * Oyunlaştırma kuralları (oyun tasarımı sabitleri — kullanıcı ayarı değildir, tüm kullanıcılar
 * için aynı ekonomi). Değiştirmek dengeyi etkiler; testler `lib/gamification.test.ts`'te.
 */
export const GAMIFICATION = {
  /** Tamamlanan her çalışma dakikası için XP (10 dk = 1 XP). */
  xpPerMinute: 0.1,
  /** Bir hedef/görev tamamlandığında ölçeğine göre ek XP. */
  scaleBonus: { hour: 0, day: 20, week: 50, month: 150, year: 500, year3: 1500 } satisfies Record<
    PlanningScale,
    number
  >,
  /** Bitiş tarihinden önce tamamlanan işlere çarpan. */
  onTimeMultiplier: 1.2,
  /** Seviye eşiği: seviye L için gereken toplam XP = base × (L − 1)². */
  levelBaseXp: 50,
} as const

export interface BadgeRule {
  id: string
  label: string
  description: string
}

export const BADGES: BadgeRule[] = [
  { id: 'first-block', label: 'İlk vardiya', description: 'İlk zaman bloğunu tamamla' },
  { id: 'streak-3', label: 'Isınma turu', description: '3 günlük seri' },
  { id: 'streak-7', label: 'Kesintisiz hafta', description: '7 günlük seri' },
  { id: 'hours-10', label: '10 saat motor', description: 'Toplam 10 saat tamamla' },
  { id: 'week-goal', label: 'Haftayı devirdin', description: 'Bir haftalık hedefi tamamla' },
  { id: 'month-goal', label: 'Ay sonu teslimi', description: 'Bir aylık hedefi tamamla' },
  { id: 'year-goal', label: 'Yıllık görev', description: 'Bir yıllık hedefi tamamla' },
]
