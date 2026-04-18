// StepBodyInfo — age, sex, weight (optional), height (optional).
// Age + sex required for volume-calibration overlay. Weight+height optional.

import { useMemo, useState } from 'react'
import { StepChrome } from './StepChrome'
import { Sex, type UserProgramProfile } from '../../types/profile'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'

type SexValue = UserProgramProfile['sex']

interface Value {
  age?: number
  sex?: SexValue
  weight_kg?: number
  height_cm?: number
}

interface Props {
  value?: Value
  onNext: (patch: Required<Pick<Value, 'sex'>> & Value) => void
  cheek?: CheekLevel
}

const SEX_LABELS: Record<SexValue, string> = {
  female: 'Female',
  male: 'Male',
  prefer_not_to_say: 'Prefer not to say',
}

const SEX_OPTIONS = Sex.options as readonly SexValue[]

function toNumOrUndef(s: string): number | undefined {
  if (s.trim() === '') return undefined
  const n = Number(s)
  if (!Number.isFinite(n)) return undefined
  return n
}

export function StepBodyInfo({ value, onNext, cheek = DEFAULT_CHEEK }: Props) {
  const [age, setAge] = useState<string>(value?.age ? String(value.age) : '')
  const [sex, setSex] = useState<SexValue | undefined>(value?.sex)
  const [weight, setWeight] = useState<string>(
    value?.weight_kg ? String(value.weight_kg) : '',
  )
  const [height, setHeight] = useState<string>(
    value?.height_cm ? String(value.height_cm) : '',
  )
  const bubble = useMemo(
    () => pickCopy('onboardingGoal', cheek),
    [cheek],
  )

  const ageNum = toNumOrUndef(age)
  const ageValid = ageNum !== undefined && ageNum >= 13 && ageNum <= 99
  const canSubmit = sex !== undefined && ageValid

  return (
    <StepChrome
      lumoState="sleepy"
      bubbleText={bubble}
      title="A bit about you"
      subtitle="For intensity calibration. Weight + height are optional."
    >
      <div className="grid gap-4 mb-5">
        <label className="block">
          <span
            className="block text-sm font-bold mb-1"
            style={{ color: 'var(--lumo-text)' }}
          >
            Age
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={13}
            max={99}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full min-h-[52px] px-4 rounded-2xl"
            style={{
              background: 'var(--lumo-raised)',
              border: '2px solid var(--lumo-border)',
              color: 'var(--lumo-text)',
            }}
            aria-label="Age"
            aria-invalid={age.length > 0 && !ageValid}
          />
        </label>

        <fieldset>
          <legend
            className="text-sm font-bold mb-2"
            style={{ color: 'var(--lumo-text)' }}
          >
            Sex
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {SEX_OPTIONS.map((id) => {
              const isOn = sex === id
              return (
                <label
                  key={id}
                  className="flex items-center justify-center min-h-[52px] p-2 rounded-2xl text-sm font-semibold text-center cursor-pointer"
                  style={{
                    background: isOn
                      ? 'color-mix(in srgb, var(--brand) 14%, var(--lumo-raised))'
                      : 'var(--lumo-raised)',
                    border: `2px solid ${isOn ? 'var(--brand)' : 'var(--lumo-border)'}`,
                    color: 'var(--lumo-text)',
                  }}
                >
                  <input
                    type="radio"
                    name="sex"
                    value={id}
                    checked={isOn}
                    onChange={() => setSex(id)}
                    className="sr-only"
                  />
                  {SEX_LABELS[id]}
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span
              className="block text-sm font-bold mb-1"
              style={{ color: 'var(--lumo-text)' }}
            >
              Weight (kg)
              <span
                className="font-normal ml-1"
                style={{ color: 'var(--lumo-text-ter)' }}
              >
                optional
              </span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={30}
              max={300}
              step={0.5}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full min-h-[52px] px-4 rounded-2xl"
              style={{
                background: 'var(--lumo-raised)',
                border: '2px solid var(--lumo-border)',
                color: 'var(--lumo-text)',
              }}
              aria-label="Weight in kilograms"
            />
          </label>
          <label className="block">
            <span
              className="block text-sm font-bold mb-1"
              style={{ color: 'var(--lumo-text)' }}
            >
              Height (cm)
              <span
                className="font-normal ml-1"
                style={{ color: 'var(--lumo-text-ter)' }}
              >
                optional
              </span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={100}
              max={250}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full min-h-[52px] px-4 rounded-2xl"
              style={{
                background: 'var(--lumo-raised)',
                border: '2px solid var(--lumo-border)',
                color: 'var(--lumo-text)',
              }}
              aria-label="Height in centimeters"
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => {
          if (!canSubmit) return
          const out: Value & Required<Pick<Value, 'sex'>> = { sex: sex!, age: ageNum }
          const w = toNumOrUndef(weight)
          if (w !== undefined && w >= 30 && w <= 300) out.weight_kg = w
          const h = toNumOrUndef(height)
          if (h !== undefined && h >= 100 && h <= 250) out.height_cm = h
          onNext(out)
        }}
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold transition"
        style={{
          background: canSubmit ? 'var(--brand)' : 'var(--lumo-overlay)',
          color: canSubmit ? 'var(--lumo-bg)' : 'var(--lumo-text-ter)',
        }}
        data-testid="step-body-info-next"
      >
        Next
      </button>
    </StepChrome>
  )
}
