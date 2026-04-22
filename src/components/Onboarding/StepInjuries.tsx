// StepInjuries — required safety step. User must either declare injuries or
// explicitly acknowledge "none". Logic preserved from v1; styling is Lumo'd
// (CSS vars, speech bubble, brand tokens).

import { useRef, useState, useMemo } from 'react'
import { StepChrome } from './StepChrome'
import { BodyPart, Severity, type UserProgramProfile } from '../../types/profile'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'
import type { LumoState } from '../Lumo'

type Injury = UserProgramProfile['injuries'][number]
type BodyPartValue = Injury['part']
type SeverityValue = Injury['severity']

interface InjuryRow extends Injury {
  __rowId: string
}

interface Props {
  value?: Injury[]
  onNext: (injuries: Injury[]) => void
  cheek?: CheekLevel
}

const BODY_PART_LABELS: Record<BodyPartValue, string> = {
  left_meniscus: 'Left meniscus',
  right_meniscus: 'Right meniscus',
  left_knee: 'Left knee',
  right_knee: 'Right knee',
  lower_back: 'Lower back',
  upper_back: 'Upper back',
  hip_flexors: 'Hip flexors',
  left_shoulder: 'Left shoulder',
  right_shoulder: 'Right shoulder',
  left_trap: 'Left trap',
  right_trap: 'Right trap',
  wrist: 'Wrist',
  ankle: 'Ankle',
  neck: 'Neck',
  elbow: 'Elbow',
  other: 'Other',
}

const SEVERITY_LABELS: Record<SeverityValue, string> = {
  avoid: 'Avoid loading it',
  modify: 'Modify exercises',
  chronic: 'Chronic / ongoing',
  ok: 'Mostly fine',
}

const BODY_PART_OPTIONS = BodyPart.options as readonly BodyPartValue[]
const SEVERITY_OPTIONS = Severity.options as readonly SeverityValue[]

function makeRowId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function emptyInjury(): InjuryRow {
  return {
    __rowId: makeRowId(),
    part: BODY_PART_OPTIONS[0],
    severity: 'modify',
    note: '',
  }
}

export function StepInjuries({ value, onNext, cheek = DEFAULT_CHEEK }: Props) {
  const idCounter = useRef(0)
  const [injuries, setInjuries] = useState<InjuryRow[]>(() => {
    if (value && value.length > 0) {
      return value.map((inj) => ({ __rowId: makeRowId(), ...inj }))
    }
    return [emptyInjury()]
  })
  void idCounter
  const bubble = useMemo(
    () => pickCopy('onboardingInjuries', cheek),
    [cheek],
  )

  const updateRow = (rowId: string, patch: Partial<Injury>) => {
    setInjuries((rows) =>
      rows.map((r) => (r.__rowId === rowId ? { ...r, ...patch } : r)),
    )
  }

  const removeRow = (rowId: string) => {
    setInjuries((rows) => rows.filter((r) => r.__rowId !== rowId))
  }

  const addRow = () => {
    setInjuries((rows) => [...rows, emptyInjury()])
  }

  const skipAll = () => {
    onNext([])
  }

  const submit = () => {
    const cleaned: Injury[] = injuries.map((r) => {
      const out: Injury = { part: r.part, severity: r.severity }
      if (r.note && r.note.trim().length > 0) out.note = r.note.trim()
      return out
    })
    onNext(cleaned)
  }

  // Lumo reacts sadly if the user has >=3 issues. Otherwise points at the
  // user to signal "tell me" / acknowledgement of a body region.
  const lumoState: LumoState = injuries.length >= 3 ? 'sad' : 'pointing'

  return (
    <StepChrome
      lumoState={lumoState}
      bubbleText={bubble}
      title="Any injuries we should respect?"
      subtitle="This one's important — nothing tweaky is okay to miss. Add each, or tap 'none'."
    >
      <button
        type="button"
        onClick={skipAll}
        className="w-full min-h-[48px] mb-5 p-3 rounded-2xl font-semibold active:scale-[0.98]"
        style={{
          background: 'var(--lumo-raised)',
          border: '2px dashed var(--lumo-border)',
          color: 'var(--lumo-text)',
        }}
        data-testid="step-injuries-none"
      >
        I don't have any — skip
      </button>

      <div className="grid gap-4 mb-4">
        {injuries.map((row, idx) => (
          <div
            key={row.__rowId}
            className="p-4 rounded-2xl grid gap-3"
            style={{
              background: 'var(--lumo-raised)',
              border: '2px solid var(--lumo-border)',
              color: 'var(--lumo-text)',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs uppercase tracking-wide font-bold"
                style={{ color: 'var(--lumo-text-ter)' }}
              >
                Injury {idx + 1}
              </span>
              {injuries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.__rowId)}
                  className="text-sm min-h-[44px] px-2"
                  style={{ color: 'var(--lumo-text-sec)' }}
                  aria-label={`Remove injury ${idx + 1}`}
                >
                  Remove
                </button>
              )}
            </div>

            <label className="block">
              <span
                className="block text-sm mb-1"
                style={{ color: 'var(--lumo-text-sec)' }}
              >
                Body part
              </span>
              <select
                value={row.part}
                onChange={(e) =>
                  updateRow(row.__rowId, { part: e.target.value as BodyPartValue })
                }
                className="w-full min-h-[48px] px-3 rounded-xl"
                style={{
                  background: 'var(--lumo-bg)',
                  border: '1.5px solid var(--lumo-border)',
                  color: 'var(--lumo-text)',
                }}
              >
                {BODY_PART_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {BODY_PART_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span
                className="block text-sm mb-1"
                style={{ color: 'var(--lumo-text-sec)' }}
              >
                Severity
              </span>
              <select
                value={row.severity}
                onChange={(e) =>
                  updateRow(row.__rowId, { severity: e.target.value as SeverityValue })
                }
                className="w-full min-h-[48px] px-3 rounded-xl"
                style={{
                  background: 'var(--lumo-bg)',
                  border: '1.5px solid var(--lumo-border)',
                  color: 'var(--lumo-text)',
                }}
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span
                className="block text-sm mb-1"
                style={{ color: 'var(--lumo-text-sec)' }}
              >
                Note{' '}
                <span style={{ color: 'var(--lumo-text-ter)' }}>(optional)</span>
              </span>
              <input
                type="text"
                value={row.note ?? ''}
                onChange={(e) => updateRow(row.__rowId, { note: e.target.value })}
                maxLength={200}
                placeholder="e.g. flares with deep squats"
                className="w-full min-h-[48px] px-3 rounded-xl"
                style={{
                  background: 'var(--lumo-bg)',
                  border: '1.5px solid var(--lumo-border)',
                  color: 'var(--lumo-text)',
                }}
              />
            </label>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="w-full min-h-[48px] mb-4 p-3 rounded-2xl font-semibold active:scale-[0.98]"
        style={{
          background: 'transparent',
          border: '2px dashed var(--lumo-border)',
          color: 'var(--lumo-text-sec)',
        }}
      >
        + Add another
      </button>

      <button
        type="button"
        onClick={submit}
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold active:scale-[0.98]"
        style={{ background: 'var(--brand)', color: 'var(--lumo-bg)' }}
      >
        Next
      </button>
    </StepChrome>
  )
}
