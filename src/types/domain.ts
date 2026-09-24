export const PLANNING_SCALES = ['year3', 'year', 'month', 'week', 'day', 'hour'] as const
export type PlanningScale = (typeof PLANNING_SCALES)[number]

export const PLANNING_SCALE_LABELS: Record<PlanningScale, string> = {
  year3: '3 Yıl',
  year: 'Yıl',
  month: 'Ay',
  week: 'Hafta',
  day: 'Gün',
  hour: 'Saat',
}

export const REQUIREMENT_TYPES = [
  'bilgi',
  'beceri',
  'iliski-ag',
  'finansal-kaynak',
  'varlik-arac',
  'belge-yetkinlik',
  'aliskanlik',
  'saglik-enerji',
  'deneyim',
] as const
export type RequirementType = (typeof REQUIREMENT_TYPES)[number]

export const REQUIREMENT_TYPE_LABELS: Record<RequirementType, string> = {
  bilgi: 'Bilgi',
  beceri: 'Beceri',
  'iliski-ag': 'İlişki/Ağ',
  'finansal-kaynak': 'Finansal Kaynak',
  'varlik-arac': 'Varlık/Araç',
  'belge-yetkinlik': 'Belge/Yetkinlik',
  aliskanlik: 'Alışkanlık',
  'saglik-enerji': 'Sağlık/Enerji',
  deneyim: 'Deneyim',
}

export const DEPENDENCY_TYPES = ['FS', 'SS', 'FF', 'SF'] as const
export type DependencyType = (typeof DEPENDENCY_TYPES)[number]

export type Theme = 'light' | 'dark' | 'system'

export type ReviewScale = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type TransactionType = 'income' | 'expense'

export type NeedWant = 'need' | 'want'

/** Hayat alanı önceliği — backcast ağırlığının çarpanı (Ayarlar > Planlama Motoru). Opsiyonel; yoksa `normal`. */
export const LIFE_AREA_PRIORITIES = ['low', 'normal', 'high'] as const
export type LifeAreaPriority = (typeof LIFE_AREA_PRIORITIES)[number]

export const LIFE_AREA_PRIORITY_LABELS: Record<LifeAreaPriority, string> = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
}

export interface LifeArea {
  id: string
  name: string
  order: number
  priority?: LifeAreaPriority
  createdAt: string
  updatedAt: string
}

export interface Requirement {
  id: string
  lifeAreaId: string
  name: string
  type: RequirementType
  targetMetric: number
  currentValue: number
  unit: string
  createdAt: string
  updatedAt: string
}

export interface TaskDependency {
  taskId: string
  type: DependencyType
  lagMinutes: number
}

export type DetailLevel = 'detailed' | 'rough'

/**
 * İş akışı (workflow) durumları — Kanban panosunun kolonlarıdır (bkz. .claude/personas/jira-developer.md).
 * "Gecikti" bir durum değildir: bitiş tarihi geçmiş ve tamamlanmamış işlerde `isOverdue` ile hesaplanan bir işarettir.
 */
export const TASK_STATUSES = ['planned', 'in-progress', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  planned: 'Planlandı',
  'in-progress': 'Devam ediyor',
  done: 'Tamamlandı',
}

export const OVERDUE_LABEL = 'Gecikti'

export interface Task {
  id: string
  title: string
  scale: PlanningScale
  startAt: string
  endAt: string
  parentTaskId?: string
  lifeAreaId?: string
  requirementId?: string
  status: TaskStatus
  dependencies: TaskDependency[]
  bufferMinutes: number
  detailLevel: DetailLevel
  /** Gerçekleşen süre (dk). Opsiyonel — yoksa forecast planlanan süreyi kullanır (minimum girdi ilkesi). */
  actualMinutes?: number
  /** Tamamlandı'ya geçtiği an (oyunlaştırma: seri ve zamanında bitirme bonusu için). */
  completedAt?: string
}

/**
 * Her hafta tekrar eden sabit blok (ders programı, rutin). Haftalık programda dolu kabul edilir;
 * otomatik dağıtım bu saatlere iş yerleştirmez. Saatler yerel "HH:mm".
 */
export interface Routine {
  id: string
  title: string
  /** ISO 8601 gün numaraları: 1 = Pazartesi … 7 = Pazar */
  weekdays: number[]
  startTime: string
  endTime: string
  lifeAreaId?: string
  createdAt: string
}

export interface FxSnapshot {
  usdRate: number | null
  goldGramPriceTRY: number | null
  btcPriceTRY: number | null
  source: 'api' | 'manual'
  fetchedAt: string
}

export interface FinanceTransaction {
  id: string
  type: TransactionType
  amountTRY: number
  categoryId: string
  date: string
  description: string
  lifeAreaId?: string
  requirementId?: string
  needWant?: NeedWant
  fxSnapshot: FxSnapshot
}

export interface FinanceCategory {
  id: string
  name: string
  kind: TransactionType
  parentCategoryId?: string
  order: number
  isDefault: boolean
  /** Aylık bütçe hedefi (TRY) — yalnızca gider kategorilerinde anlamlı, opsiyonel */
  monthlyBudgetTRY?: number
}
