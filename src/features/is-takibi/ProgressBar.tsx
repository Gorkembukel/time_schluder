const PERCENT = 100

/** Roll-up ilerleme çubuğu; `ratio` 0–1. */
export function ProgressBar({ ratio, label }: { ratio: number; label: string }) {
  const percent = Math.round(ratio * PERCENT)
  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={PERCENT}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/60"
      >
        <div
          className="h-full rounded-full bg-primary transition-all motion-safe:duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[0.7rem] text-text-secondary">%{percent}</span>
    </div>
  )
}
