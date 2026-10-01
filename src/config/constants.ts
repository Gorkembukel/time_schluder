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
  requirements: {
    /** Boşluk analizinde "ilerlemesi düşük" sayılacak yüzde eşiği (bkz. docs/decisions/0011). */
    gapProgressThresholdPercent: number
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
  canvas: {
    /** Görsel Planlama Kanvası'nda bağlantı kurulunca ses çalınsın mı. */
    soundEnabled: boolean
    /**
     * Bir görev kutucuğunun yatayda kapladığı süreye göre hangi ölçeğe (3 yıl/yıl/ay/hafta/gün/saat)
     * yuvarlanacağını belirleyen eşikler — kutucuğu sürükleyip boyutlandırdıkça bu eşiklere göre
     * ölçek etiketi canlı güncellenir.
     */
    scaleThresholds: {
      year3Days: number
      yearDays: number
      monthDays: number
      weekDays: number
      dayHours: number
    }
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
  requirements: {
    gapProgressThresholdPercent: 40,
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
  canvas: {
    soundEnabled: true,
    // Bitişik ölçeklerin tipik sürelerinin geometrik ortalaması (ör. yıl3(1095g) ve yıl(365g)
    // arası √(1095×365)≈632g) — bkz. docs/decisions, kullanıcı Ayarlar'dan değiştirebilir.
    scaleThresholds: {
      year3Days: 632,
      yearDays: 104,
      monthDays: 14.5,
      weekDays: 2.6,
      dayHours: 4.9,
    },
  },
}
