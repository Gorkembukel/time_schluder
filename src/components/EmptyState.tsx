import type { LucideIcon } from 'lucide-react'

const ICON_SIZE = 22

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-border/50 text-text-secondary">
        <Icon size={ICON_SIZE} />
      </div>
      <p className="text-sm font-medium text-text">{title}</p>
      {description && <p className="max-w-xs text-xs text-text-secondary">{description}</p>}
    </div>
  )
}
