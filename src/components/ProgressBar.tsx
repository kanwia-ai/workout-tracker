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
    <div className="bg-surface-raised border border-border-subtle rounded-2xl p-3.5">
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="text-xl">{emoji}</span>
        <div className="flex-1">
          <div className="font-bold text-[15px]">{title}</div>
          <div className="text-[11px] text-zinc-500">~{estMinutes} min</div>
        </div>
        <span className="text-sm text-zinc-400 font-semibold">{current}/{total}</span>
      </div>

      <div className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: complete ? '#4ade80' : '#f97316',
          }}
        />
      </div>

      {complete && (
        <div className="text-success text-[13px] font-bold mt-2 text-center">
          Workout complete! 🔥
        </div>
      )}
    </div>
  )
}
