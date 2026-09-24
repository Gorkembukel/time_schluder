import type { ReactNode } from 'react'

type Variant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-border/60 text-text-secondary',
}

export function Badge({
  variant = 'neutral',
  children,
}: {
  variant?: Variant
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  )
}
