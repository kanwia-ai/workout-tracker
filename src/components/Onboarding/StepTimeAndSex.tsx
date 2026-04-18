import { useState } from 'react'
import { Sex, type UserProgramProfile } from '../../types/profile'

type SexValue = UserProgramProfile['sex']

interface Props {
  value?: { time_budget_min?: number; sex?: SexValue }
  onNext: (patch: { time_budget_min: number; sex: SexValue }) => void
}

const SEX_LABELS: Record<SexValue, string> = {
  female: 'Female',
  male: 'Male',
  prefer_not_to_say: 'Prefer not to say',
}

const SEX_OPTIONS = Sex.options as readonly SexValue[]

export function StepTimeAndSex({ value, onNext }: Props) {
  const [minutes, setMinutes] = useState<number>(value?.time_budget_min ?? 60)
  const [sex, setSex] = useState<SexValue | undefined>(value?.sex)

  const canSubmit = sex !== undefined

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Time budget & you</h1>
      <p className="text-zinc-500 mb-6">
        How long per session, and a quick demographic so intensity scales right.
      </p>

      <div className="mb-8 p-4 rounded-2xl border-2 border-border-subtle bg-surface-raised">
        <div className="flex items-baseline justify-between mb-3">
          <span className="font-bold">Session length</span>
          <span className="text-brand font-extrabold text-lg">{minutes} min</span>
        </div>
        <input
          type="range"
          min={15}
          max={120}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="w-full accent-brand"
          aria-label="Session length in minutes"
        />
        <div className="flex justify-between text-xs text-zinc-500 mt-1">
          <span>15</span>
          <span>120</span>
        </div>
      </div>

      <fieldset className="mb-8">
        <legend className="font-bold mb-2">Sex</legend>
        <div className="grid gap-3">
          {SEX_OPTIONS.map((id) => {
            const selected = sex === id
            return (
              <label
                key={id}
                className={`flex items-center gap-3 min-h-[56px] p-4 rounded-2xl border-2 transition cursor-pointer ${
                  selected
                    ? 'border-brand bg-brand/10 ring-2 ring-brand/50'
                    : 'border-border-subtle bg-surface-raised'
                }`}
              >
                <input
                  type="radio"
                  name="sex"
                  value={id}
                  checked={selected}
                  onChange={() => setSex(id)}
                  className="accent-brand"
                />
                <span className="font-bold">{SEX_LABELS[id]}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => canSubmit && onNext({ time_budget_min: minutes, sex: sex! })}
        className={`w-full min-h-[56px] p-4 rounded-2xl font-bold transition ${
          canSubmit
            ? 'bg-brand text-black active:scale-[0.98]'
            : 'bg-surface-raised text-zinc-500 cursor-not-allowed'
        }`}
      >
        Next
      </button>
    </div>
  )
}
