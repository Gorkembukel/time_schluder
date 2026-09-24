import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'

type Variant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

const ICON_CLASSES: Record<Variant, string> = {
  neutral: 'bg-border/60 text-text-secondary',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
}

const ICON_SIZE = 18

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  variant = 'neutral',
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  variant?: Variant
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ICON_CLASSES[variant]}`}
      >
        <Icon size={ICON_SIZE} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="truncate text-lg font-semibold text-text">{value}</p>
        {hint && <p className="text-xs text-text-secondary">{hint}</p>}
      </div>
    </Card>
  )
}
