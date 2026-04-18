interface Props {
  value?: number
  onNext: (months: number) => void
}

const OPTIONS: { months: number; title: string; blurb: string }[] = [
  { months: 3, title: 'New to lifting', blurb: 'Less than 6 months of consistent training' },
  { months: 12, title: 'Some experience', blurb: '6 months to 2 years of training' },
  { months: 36, title: 'Experienced', blurb: '2+ years of consistent training' },
]

export function StepExperience({ value, onNext }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">How much lifting experience?</h1>
      <p className="text-zinc-500 mb-6">
        This shapes intensity and exercise selection.
      </p>
      <div className="grid gap-3">
        {OPTIONS.map((opt) => {
          const selected = value === opt.months
          return (
            <button
              key={opt.months}
              type="button"
              onClick={() => onNext(opt.months)}
              aria-pressed={selected}
              className={`min-h-[56px] p-4 rounded-2xl text-left border-2 transition active:scale-[0.98] ${
                selected
                  ? 'border-brand bg-brand/10 ring-2 ring-brand/50'
                  : 'border-border-subtle bg-surface-raised'
              }`}
            >
              <div className="font-bold">{opt.title}</div>
              <div className="text-sm text-zinc-400">{opt.blurb}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
