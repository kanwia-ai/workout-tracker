import { useState } from 'react'
import { Equipment, type UserProgramProfile } from '../../types/profile'

type EquipmentValue = UserProgramProfile['equipment'][number]

interface Props {
  value?: EquipmentValue[]
  onNext: (equipment: EquipmentValue[]) => void
}

const LABELS: Record<EquipmentValue, { title: string; blurb: string }> = {
  full_gym: { title: 'Full gym', blurb: 'Racks, machines, free weights' },
  home_weights: { title: 'Home weights', blurb: 'Dumbbells, kettlebells, etc.' },
  bands_only: { title: 'Bands only', blurb: 'Resistance bands, no weights' },
  bodyweight_only: { title: 'Bodyweight only', blurb: 'No equipment at all' },
  cable_machine: { title: 'Cable machine', blurb: 'Adjustable cable tower' },
  barbell: { title: 'Barbell', blurb: 'Barbell + plates at minimum' },
}

const ALL_OPTIONS = Equipment.options as readonly EquipmentValue[]

export function StepEquipment({ value, onNext }: Props) {
  const [selected, setSelected] = useState<Set<EquipmentValue>>(
    () => new Set(value ?? [])
  )

  const toggle = (id: EquipmentValue) => {
    setSelected((prev) => {
      const nxt = new Set(prev)
      if (nxt.has(id)) nxt.delete(id)
      else nxt.add(id)
      return nxt
    })
  }

  const disabled = selected.size === 0

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">What equipment do you have?</h1>
      <p className="text-zinc-500 mb-6">
        Pick every option that applies — we'll only program what's in your toolbox.
      </p>
      <div className="grid gap-3 mb-6">
        {ALL_OPTIONS.map((id) => {
          const isOn = selected.has(id)
          const meta = LABELS[id]
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              aria-pressed={isOn}
              className={`min-h-[56px] p-4 rounded-2xl text-left border-2 transition active:scale-[0.98] flex items-center gap-3 ${
                isOn
                  ? 'border-brand bg-brand/10 ring-2 ring-brand/50'
                  : 'border-border-subtle bg-surface-raised'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                  isOn ? 'bg-brand border-brand text-black' : 'border-zinc-500'
                }`}
                aria-hidden="true"
              >
                {isOn && <span className="text-xs font-black">✓</span>}
              </div>
              <div>
                <div className="font-bold">{meta.title}</div>
                <div className="text-sm text-zinc-400">{meta.blurb}</div>
              </div>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onNext(Array.from(selected))}
        className={`w-full min-h-[56px] p-4 rounded-2xl font-bold transition ${
          disabled
            ? 'bg-surface-raised text-zinc-500 cursor-not-allowed'
            : 'bg-brand text-black active:scale-[0.98]'
        }`}
      >
        Next
      </button>
    </div>
  )
}
