// StepEquipment — multi-select equipment. Required. Reskinned to CSS vars,
// Lumo speech bubble on top, brand tokens everywhere.

import { useMemo, useState } from 'react'
import { StepChrome } from './StepChrome'
import { Equipment, type UserProgramProfile } from '../../types/profile'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'

type EquipmentValue = UserProgramProfile['equipment'][number]

interface Props {
  value?: EquipmentValue[]
  onNext: (equipment: EquipmentValue[]) => void
  cheek?: CheekLevel
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

export function StepEquipment({ value, onNext, cheek = DEFAULT_CHEEK }: Props) {
  const [selected, setSelected] = useState<Set<EquipmentValue>>(
    () => new Set(value ?? []),
  )
  const bubble = useMemo(
    () => pickCopy('onboardingEquipment', cheek),
    [cheek],
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
    <StepChrome
      lumoState="curious"
      bubbleText={bubble}
      title="What equipment do you have?"
      subtitle="Pick every option — we'll only program what's in your toolbox."
    >
      <div className="grid gap-3 mb-5">
        {ALL_OPTIONS.map((id) => {
          const isOn = selected.has(id)
          const meta = LABELS[id]
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              aria-pressed={isOn}
              className="min-h-[56px] p-4 rounded-2xl text-left transition active:scale-[0.98] flex items-center gap-3"
              style={{
                background: isOn
                  ? 'color-mix(in srgb, var(--brand) 14%, var(--lumo-raised))'
                  : 'var(--lumo-raised)',
                border: `2px solid ${isOn ? 'var(--brand)' : 'var(--lumo-border)'}`,
                color: 'var(--lumo-text)',
              }}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                style={{
                  background: isOn ? 'var(--brand)' : 'transparent',
                  border: `2px solid ${isOn ? 'var(--brand)' : 'var(--lumo-text-ter)'}`,
                  color: isOn ? 'var(--lumo-bg)' : 'transparent',
                }}
                aria-hidden="true"
              >
                {isOn && <span className="text-xs font-black">✓</span>}
              </div>
              <div>
                <div className="font-bold">{meta.title}</div>
                <div
                  className="text-sm"
                  style={{ color: 'var(--lumo-text-sec)' }}
                >
                  {meta.blurb}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onNext(Array.from(selected))}
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold transition"
        style={{
          background: disabled ? 'var(--lumo-overlay)' : 'var(--brand)',
          color: disabled ? 'var(--lumo-text-ter)' : 'var(--lumo-bg)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        Next
      </button>
    </StepChrome>
  )
}
