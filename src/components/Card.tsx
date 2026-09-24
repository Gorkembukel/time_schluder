import type { HTMLAttributes } from 'react'

/** Padding kasıtlı olarak burada değil — her kullanım kendi className'iyle verir (çakışan utility stacking'den kaçınmak için). */
export function Card({
  interactive = false,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface shadow-sm ${
        interactive
          ? 'cursor-pointer transition-all motion-safe:duration-150 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md'
          : ''
      } ${className}`}
      {...props}
    />
  )
}
