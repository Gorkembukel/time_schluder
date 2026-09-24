/** Firestore'dan veri gelirken düz "Yükleniyor…" metni yerine kullanılan iskelet blok — Müşteri personası, bkz. ADR 0007. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton-pulse rounded-lg bg-border ${className}`} />
}

export function SkeletonLines({ count, className = '' }: { count: number; className?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`h-4 ${className}`} />
      ))}
    </div>
  )
}
