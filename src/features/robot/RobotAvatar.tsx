export type RobotMood = 'working' | 'waiting' | 'idle' | 'celebrating'

const MOOD_EYE_CLASS: Record<RobotMood, string> = {
  working: 'fill-primary',
  waiting: 'fill-warning',
  idle: 'fill-text-secondary',
  celebrating: 'fill-success',
}

/** Kullanıcının robotu — ruh hali bugünkü görev durumundan türetilir. Dekoratiftir (aria-hidden). */
export function RobotAvatar({ mood }: { mood: RobotMood }) {
  const eye = MOOD_EYE_CLASS[mood]
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden
      className={`h-28 w-28 shrink-0 ${mood === 'celebrating' ? 'motion-safe:animate-bounce' : ''}`}
    >
      <line x1="60" y1="8" x2="60" y2="24" className="stroke-border" strokeWidth="4" />
      <circle
        cx="60"
        cy="8"
        r="6"
        className={`${eye} ${mood === 'working' ? 'motion-safe:animate-pulse' : ''}`}
      />
      <rect
        x="22"
        y="24"
        width="76"
        height="56"
        rx="16"
        className="fill-surface stroke-border"
        strokeWidth="4"
      />
      {mood === 'idle' ? (
        <>
          <rect x="38" y="48" width="14" height="4" rx="2" className={eye} />
          <rect x="68" y="48" width="14" height="4" rx="2" className={eye} />
        </>
      ) : (
        <>
          <circle cx="45" cy="50" r="7" className={eye} />
          <circle cx="75" cy="50" r="7" className={eye} />
        </>
      )}
      {mood === 'celebrating' || mood === 'working' ? (
        <path
          d="M44 64 Q60 76 76 64"
          className="stroke-text"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <line
          x1="46"
          y1="67"
          x2="74"
          y2="67"
          className="stroke-text"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}
      <rect
        x="34"
        y="84"
        width="52"
        height="28"
        rx="10"
        className="fill-surface stroke-border"
        strokeWidth="4"
      />
      <circle cx="60" cy="98" r="5" className={eye} />
      <rect x="10" y="44" width="10" height="20" rx="5" className="fill-border" />
      <rect x="100" y="44" width="10" height="20" rx="5" className="fill-border" />
    </svg>
  )
}
