interface Props {
  value?: number
  onNext: (sessions: number) => void
}

const OPTIONS = [3, 4, 5, 6] as const

export function StepFrequency({ value, onNext }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">How many sessions per week?</h1>
      <p className="text-zinc-500 mb-6">
        Be honest about what you'll actually show up for.
      </p>
      <div className="grid gap-3">
        {OPTIONS.map((n) => {
          const selected = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onNext(n)}
              aria-pressed={selected}
              className={`min-h-[56px] p-4 rounded-2xl text-left border-2 transition active:scale-[0.98] ${
                selected
                  ? 'border-brand bg-brand/10 ring-2 ring-brand/50'
                  : 'border-border-subtle bg-surface-raised'
              }`}
            >
              <div className="font-bold">{n} sessions / week</div>
              <div className="text-sm text-zinc-400">
                {n === 3 && 'Plenty of recovery, great for beginners'}
                {n === 4 && 'A balanced cadence for most people'}
                {n === 5 && 'Serious volume — plan recovery days'}
                {n === 6 && 'High volume, requires good sleep & nutrition'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
