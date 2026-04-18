import { useRef, useState } from 'react'
import { BodyPart, Severity, type UserProgramProfile } from '../../types/profile'

type Injury = UserProgramProfile['injuries'][number]
type BodyPartValue = Injury['part']
type SeverityValue = Injury['severity']

// Internal row shape carries a stable React key so add/remove doesn't reuse
// DOM nodes between different rows (which breaks focus + IME state on <input>).
interface InjuryRow extends Injury {
  __rowId: string
}

interface Props {
  value?: Injury[]
  onNext: (injuries: Injury[]) => void
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
  return { __rowId: makeRowId(), part: BODY_PART_OPTIONS[0], severity: 'modify', note: '' }
}

export function StepInjuries({ value, onNext }: Props) {
  const idCounter = useRef(0)
  const [injuries, setInjuries] = useState<InjuryRow[]>(() => {
    if (value && value.length > 0) {
      return value.map((inj) => ({ __rowId: makeRowId(), ...inj }))
    }
    return [emptyInjury()]
  })
  // Reference idCounter so TS doesn't drop the ref when crypto.randomUUID is present.
  void idCounter

  const updateRow = (rowId: string, patch: Partial<Injury>) => {
    setInjuries((rows) =>
      rows.map((r) => (r.__rowId === rowId ? { ...r, ...patch } : r))
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
    // Strip __rowId + empty notes so the payload matches the zod schema.
    const cleaned: Injury[] = injuries.map((r) => {
      const out: Injury = { part: r.part, severity: r.severity }
      if (r.note && r.note.trim().length > 0) out.note = r.note.trim()
      return out
    })
    onNext(cleaned)
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Any injuries we should know about?</h1>
      <p className="text-zinc-500 mb-6">
        Anything tweaky, flared, or off-limits. We'll program around it.
      </p>

      <button
        type="button"
        onClick={skipAll}
        className="w-full min-h-[48px] mb-6 p-3 rounded-2xl border-2 border-border-subtle bg-surface-raised font-semibold active:scale-[0.98]"
      >
        I don't have any — skip
      </button>

      <div className="grid gap-4 mb-4">
        {injuries.map((row, idx) => (
          <div
            key={row.__rowId}
            className="p-4 rounded-2xl border-2 border-border-subtle bg-surface-raised grid gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-zinc-400">
                Injury {idx + 1}
              </span>
              {injuries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.__rowId)}
                  className="text-sm text-zinc-400 hover:text-zinc-200 min-h-[44px] px-2"
                  aria-label={`Remove injury ${idx + 1}`}
                >
                  Remove
                </button>
              )}
            </div>

            <label className="block">
              <span className="block text-sm text-zinc-400 mb-1">Body part</span>
              <select
                value={row.part}
                onChange={(e) =>
                  updateRow(row.__rowId, { part: e.target.value as BodyPartValue })
                }
                className="w-full min-h-[48px] px-3 rounded-xl bg-surface border border-border-subtle"
              >
                {BODY_PART_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {BODY_PART_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-sm text-zinc-400 mb-1">Severity</span>
              <select
                value={row.severity}
                onChange={(e) =>
                  updateRow(row.__rowId, { severity: e.target.value as SeverityValue })
                }
                className="w-full min-h-[48px] px-3 rounded-xl bg-surface border border-border-subtle"
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-sm text-zinc-400 mb-1">
                Note <span className="text-zinc-500">(optional)</span>
              </span>
              <input
                type="text"
                value={row.note ?? ''}
                onChange={(e) => updateRow(row.__rowId, { note: e.target.value })}
                maxLength={200}
                placeholder="e.g. flares with deep squats"
                className="w-full min-h-[48px] px-3 rounded-xl bg-surface border border-border-subtle"
              />
            </label>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="w-full min-h-[48px] mb-4 p-3 rounded-2xl border-2 border-dashed border-border-subtle bg-surface-raised/60 font-semibold active:scale-[0.98]"
      >
        + Add another
      </button>

      <button
        type="button"
        onClick={submit}
        className="w-full min-h-[56px] p-4 rounded-2xl font-bold bg-brand text-black active:scale-[0.98]"
      >
        Next
      </button>
    </div>
  )
}
