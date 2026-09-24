/**
 * Merkezi varsayılan ayarlar katmanı. `config-audit` skill'i, kullanıcı tarafından
 * değiştirilebilmesi gereken bir değerin kod içinde başka bir yerde sabitlenip
 * sabitlenmediğini bu dosyayla karşılaştırarak denetler (bkz. .claude/skills/config-audit).
 * Buradaki değerler yalnızca ilk kurulum / Ayarlar sayfası varsayılanlarıdır —
 * gerçek değerler kullanıcı ayarlarından (Firestore) okunur.
 */
import type { LifeAreaPriority, PlanningScale, Theme } from '../types/domain'

export interface Settings {
  general: {
    language: string
    currency: string
  }
  calendarTime: {
    /** ISO 8601: 1 = Pazartesi */
    weekStartsOn: number
    dayStartHour: number
    dayEndHour: number
  }
  planningEngine: {
    /** Rolling wave detaylandırma penceresi (gün cinsinden). Kullanıcı onboarding'de değiştirir. */
    detailWindowDays: Record<PlanningScale, number>
    bufferRatio: number
    /** Gün başlangıç–bitiş arasındaki sürenin hedeflere ayrılabilecek oranı (kapasite = gün × saat × bu oran). */
    plannableRatio: number
    /** Forecast sapmasının uyarıya dönüştüğü oran (ör. 0.25 = %25 geride/ileride). */
    forecastDeviationThreshold: number
    /** Backcast'te hayat alanı önceliğinin ağırlık çarpanı. */
    priorityWeights: Record<LifeAreaPriority, number>
    /** Otomatik dağıtımın ve havuzdan sürüklemenin oluşturduğu zaman bloğu uzunluğu (dk). */
    autoBlockMinutes: number
    majorChangeThreshold: {
      affectedTaskCount: number
      criticalPathChanged: boolean
    }
  }
  appearance: {
    theme: Theme
  }
  reviewRhythms: {
    daily: boolean
    weekly: boolean
    monthly: boolean
    yearly: boolean
  }
  dashboard: {
    /** Genel Bakış'taki "yaklaşan görevler" listesinin kaç gün ileriyi kapsayacağı. */
    upcomingWindowDays: number
  }
}

export const DEFAULT_SETTINGS: Settings = {
  general: {
    language: 'tr',
    currency: 'TRY',
  },
  calendarTime: {
    weekStartsOn: 1,
    dayStartHour: 6,
    dayEndHour: 23,
  },
  planningEngine: {
    detailWindowDays: {
      year3: 365,
      year: 90,
      month: 7,
      week: 2,
      day: 1,
      hour: 0,
    },
    bufferRatio: 0.15,
    plannableRatio: 0.35,
    forecastDeviationThreshold: 0.25,
    priorityWeights: { low: 0.5, normal: 1, high: 2 },
    autoBlockMinutes: 60,
    majorChangeThreshold: {
      affectedTaskCount: 3,
      criticalPathChanged: true,
    },
  },
  appearance: {
    theme: 'system',
  },
  reviewRhythms: {
    daily: true,
    weekly: true,
    monthly: true,
    yearly: true,
  },
  dashboard: {
    upcomingWindowDays: 7,
  },
}
