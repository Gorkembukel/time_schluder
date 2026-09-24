/**
 * Merkezi varsayılan ayarlar katmanı. `config-audit` skill'i, kullanıcı tarafından
 * değiştirilebilmesi gereken bir değerin kod içinde başka bir yerde sabitlenip
 * sabitlenmediğini bu dosyayla karşılaştırarak denetler (bkz. .claude/skills/config-audit).
 * Buradaki değerler yalnızca ilk kurulum / Ayarlar sayfası varsayılanlarıdır —
 * gerçek değerler kullanıcı ayarlarından (Firestore) okunur.
 */
import type { PlanningScale, Theme } from '../types/domain'

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
