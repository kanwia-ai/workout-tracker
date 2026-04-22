// StepBodyInfo — age, sex, weight (optional), height (optional).
// Age + sex required for volume-calibration overlay. Weight+height optional.
//
// Units toggle added 2026-04: user picks imperial (lb, ft/in) or metric
// (kg, cm). Default is imperial. Internal storage stays metric — we convert
// on submit and record `units` on the profile so other screens can honor
// the preference via `formatWeight` / `formatHeight` in lib/units.ts.

import { useMemo, useState } from 'react'
import { StepChrome } from './StepChrome'
import { Sex, type Units, type UserProgramProfile } from '../../types/profile'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'
import {
  cmToFtIn,
  ftInToCm,
  kgToLb,
  lbToKg,
} from '../../lib/units'

type SexValue = UserProgramProfile['sex']

interface Value {
  age?: number
  sex?: SexValue
  weight_kg?: number
  height_cm?: number
  units?: Units
}

interface Props {
  value?: Value
  onNext: (
    patch: Required<Pick<Value, 'sex'>> &
      Value &
      Required<Pick<Value, 'units'>>,
  ) => void
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
  const [units, setUnits] = useState<Units>(value?.units ?? 'imperial')
  const [age, setAge] = useState<string>(value?.age ? String(value.age) : '')
  const [sex, setSex] = useState<SexValue | undefined>(value?.sex)

  // Weight fields — hold separate strings for imperial (lb) and metric (kg)
  // so switching the toggle doesn't clobber what the user typed. We convert
  // from the stored value on mount to seed whichever field is active.
  const seededLb = value?.weight_kg ? kgToLb(value.weight_kg) : undefined
  const seededHeightFtIn = value?.height_cm ? cmToFtIn(value.height_cm) : undefined
  const [weightLb, setWeightLb] = useState<string>(
    seededLb !== undefined ? String(Math.round(seededLb)) : '',
  )
  const [weightKg, setWeightKg] = useState<string>(
    value?.weight_kg ? String(value.weight_kg) : '',
  )
  const [heightFt, setHeightFt] = useState<string>(
    seededHeightFtIn ? String(seededHeightFtIn.ft) : '',
  )
  const [heightIn, setHeightIn] = useState<string>(
    seededHeightFtIn ? String(seededHeightFtIn.in) : '',
  )
  const [heightCm, setHeightCm] = useState<string>(
    value?.height_cm ? String(value.height_cm) : '',
  )

  const bubble = useMemo(
    () => pickCopy('onboardingBodyStats', cheek),
    [cheek],
  )

  const ageNum = toNumOrUndef(age)
  const ageValid = ageNum !== undefined && ageNum >= 13 && ageNum <= 99
  const canSubmit = sex !== undefined && ageValid

  // Resolve the entered weight + height back to canonical metric so the
  // profile always stores a single source of truth.
  const resolveWeightKg = (): number | undefined => {
    if (units === 'metric') {
      const kg = toNumOrUndef(weightKg)
      return kg !== undefined && kg >= 30 && kg <= 300 ? kg : undefined
    }
    const lb = toNumOrUndef(weightLb)
    if (lb === undefined) return undefined
    const kg = lbToKg(lb)
    return kg !== undefined && kg >= 30 && kg <= 300 ? kg : undefined
  }

  const resolveHeightCm = (): number | undefined => {
    if (units === 'metric') {
      const cm = toNumOrUndef(heightCm)
      return cm !== undefined && cm >= 100 && cm <= 250 ? cm : undefined
    }
    const ft = toNumOrUndef(heightFt)
    const inches = toNumOrUndef(heightIn)
    const cm = ftInToCm(ft, inches)
    return cm !== undefined && cm >= 100 && cm <= 250 ? cm : undefined
  }

  return (
    <StepChrome
      lumoState="curious"
      bubbleText={bubble}
      title="A bit about you"
      subtitle="For intensity calibration. Weight + height are optional."
    >
      {/* Units toggle — segmented control, sticky-top feel. */}
      <div
        className="flex items-center gap-2 p-1 rounded-full mb-5"
        role="tablist"
        aria-label="Units"
        style={{
          background: 'var(--lumo-raised)',
          border: '1.5px solid var(--lumo-border)',
        }}
        data-testid="step-body-info-units"
      >
        {(['imperial', 'metric'] as const).map((u) => {
          const isOn = units === u
          return (
            <button
              key={u}
              type="button"
              role="tab"
              aria-selected={isOn}
              onClick={() => setUnits(u)}
              className="flex-1 min-h-[40px] rounded-full text-sm font-semibold transition"
              style={{
                background: isOn ? 'var(--brand)' : 'transparent',
                color: isOn ? 'var(--lumo-bg)' : 'var(--lumo-text-sec)',
              }}
              data-testid={`step-body-info-units-${u}`}
            >
              {u === 'imperial' ? 'Imperial (lb, ft/in)' : 'Metric (kg, cm)'}
            </button>
          )
        })}
      </div>

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

        {units === 'imperial' ? (
          <div className="grid gap-3">
            <label className="block">
              <span
                className="block text-sm font-bold mb-1"
                style={{ color: 'var(--lumo-text)' }}
              >
                Weight (lb)
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
                min={66}
                max={660}
                step={1}
                value={weightLb}
                onChange={(e) => setWeightLb(e.target.value)}
                className="w-full min-h-[52px] px-4 rounded-2xl"
                style={{
                  background: 'var(--lumo-raised)',
                  border: '2px solid var(--lumo-border)',
                  color: 'var(--lumo-text)',
                }}
                aria-label="Weight in pounds"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span
                  className="block text-sm font-bold mb-1"
                  style={{ color: 'var(--lumo-text)' }}
                >
                  Height (ft)
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
                  min={3}
                  max={8}
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  className="w-full min-h-[52px] px-4 rounded-2xl"
                  style={{
                    background: 'var(--lumo-raised)',
                    border: '2px solid var(--lumo-border)',
                    color: 'var(--lumo-text)',
                  }}
                  aria-label="Height in feet"
                />
              </label>
              <label className="block">
                <span
                  className="block text-sm font-bold mb-1"
                  style={{ color: 'var(--lumo-text)' }}
                >
                  Height (in)
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={11}
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  className="w-full min-h-[52px] px-4 rounded-2xl"
                  style={{
                    background: 'var(--lumo-raised)',
                    border: '2px solid var(--lumo-border)',
                    color: 'var(--lumo-text)',
                  }}
                  aria-label="Height in inches"
                />
              </label>
            </div>
          </div>
        ) : (
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
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
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
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
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
        )}
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => {
          if (!canSubmit) return
          const out: Value &
            Required<Pick<Value, 'sex'>> &
            Required<Pick<Value, 'units'>> = {
            sex: sex!,
            age: ageNum,
            units,
          }
          const w = resolveWeightKg()
          if (w !== undefined) out.weight_kg = w
          const h = resolveHeightCm()
          if (h !== undefined) out.height_cm = h
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
