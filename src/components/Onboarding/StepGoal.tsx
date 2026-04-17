import type { UserProgramProfile } from '../../types/profile'

type Goal = UserProgramProfile['goal']

const OPTIONS: { id: Goal; title: string; blurb: string }[] = [
  { id: 'glutes', title: 'Glute focus', blurb: 'Grow and strengthen glutes' },
  { id: 'strength', title: 'Strength', blurb: 'Get stronger across the board' },
  { id: 'longevity', title: 'Longevity', blurb: 'Train for long-term health' },
  { id: 'aesthetics', title: 'Aesthetics', blurb: 'Muscle tone and definition' },
  { id: 'rehab', title: 'Rehab', blurb: 'Recover from injuries safely' },
  { id: 'general_fitness', title: 'General fitness', blurb: 'A well-rounded plan' },
]

interface Props {
  value?: Goal
  onNext: (g: Goal) => void
}

export function StepGoal({ value, onNext }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">What's your main goal?</h1>
      <p className="text-zinc-500 mb-6">
        Pick the one that feels closest — we can tune later.
      </p>
      <div className="grid gap-3">
        {OPTIONS.map((opt) => {
          const selected = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onNext(opt.id)}
              className={`p-4 rounded-2xl text-left border transition ${
                selected
                  ? 'border-brand bg-brand/10'
                  : 'border-border-subtle bg-surface-raised'
              }`}
            >
              <div className="font-bold">{opt.title}</div>
              <div className="text-sm text-zinc-500">{opt.blurb}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
