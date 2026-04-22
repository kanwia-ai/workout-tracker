interface ProgressBarProps {
  current: number
  total: number
  emoji: string
  title: string
  estMinutes: number
}

export function ProgressBar({ current, total, emoji, title, estMinutes }: ProgressBarProps) {
  const pct = total > 0 ? (current / total) * 100 : 0
  const complete = pct === 100

  return (
    <div
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        borderRadius: 22,
        padding: 14,
      }}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="text-xl">{emoji}</span>
        <div className="flex-1">
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--lumo-text)',
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--lumo-text-ter)' }}>
            ~{estMinutes} min
          </div>
        </div>
        <span
          className="tabular-nums"
          style={{ fontSize: 14, color: 'var(--lumo-text-sec)', fontWeight: 600 }}
        >
          {current}/{total}
        </span>
      </div>

      <div
        style={{
          height: 6,
          background: 'var(--lumo-overlay)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <div
          className="transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 8,
            background: complete ? 'var(--accent-mint)' : 'var(--brand)',
          }}
        />
      </div>

      {complete && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            marginTop: 8,
            textAlign: 'center',
            color: 'var(--accent-mint)',
            fontFamily: "'Fraunces', Georgia, serif",
            fontStyle: 'italic',
          }}
        >
          workout complete!
        </div>
      )}
    </div>
  )
}
