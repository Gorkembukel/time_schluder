export const PLANNING_SCALES = ['year3', 'year', 'month', 'week', 'day', 'hour'] as const
export type PlanningScale = (typeof PLANNING_SCALES)[number]

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

export interface LifeArea {
  id: string
  name: string
  order: number
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

export const TASK_STATUSES = ['planned', 'in-progress', 'done', 'delayed'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

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
