import type { UserProgramProfile } from '../../types/profile'

interface Props {
  draft: Partial<UserProgramProfile>
  onNext: () => void
}

const GOAL_LABELS: Record<NonNullable<UserProgramProfile['goal']>, string> = {
  glutes: 'Glute focus',
  strength: 'Strength',
  longevity: 'Longevity',
  aesthetics: 'Aesthetics',
  rehab: 'Rehab',
  general_fitness: 'General fitness',
}

const EQUIPMENT_LABELS: Record<UserProgramProfile['equipment'][number], string> = {
  full_gym: 'Full gym',
  home_weights: 'Home weights',
  bands_only: 'Bands only',
  bodyweight_only: 'Bodyweight only',
  cable_machine: 'Cable machine',
  barbell: 'Barbell',
}

const SEX_LABELS: Record<UserProgramProfile['sex'], string> = {
  female: 'Female',
  male: 'Male',
  prefer_not_to_say: 'Prefer not to say',
}

function experienceLabel(months?: number): string {
  if (months === undefined) return '—'
  if (months < 6) return `New (${months} mo)`
  if (months < 24) return `Some experience (${months} mo)`
  return `Experienced (${months} mo)`
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-3 border-b border-border-subtle last:border-b-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-right font-semibold">{children}</span>
    </div>
  )
}

export function StepConfirm({ draft, onNext }: Props) {
  const equipmentText =
    draft.equipment && draft.equipment.length > 0
      ? draft.equipment.map((e) => EQUIPMENT_LABELS[e]).join(', ')
      : '—'

  const injuriesText =
    draft.injuries && draft.injuries.length > 0
      ? `${draft.injuries.length} noted`
      : 'None'

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Does this look right?</h1>
      <p className="text-zinc-500 mb-6">
        Double-check before we generate your plan. You can redo onboarding later.
      </p>

      <div className="p-4 rounded-2xl border-2 border-border-subtle bg-surface-raised mb-6">
        <Row label="Goal">
          {draft.goal ? GOAL_LABELS[draft.goal] : '—'}
        </Row>
        <Row label="Sessions / week">
          {draft.sessions_per_week ?? '—'}
        </Row>
        <Row label="Experience">
          {experienceLabel(draft.training_age_months)}
        </Row>
        <Row label="Equipment">{equipmentText}</Row>
        <Row label="Injuries">{injuriesText}</Row>
        <Row label="Time budget">
          {draft.time_budget_min ? `${draft.time_budget_min} min` : '—'}
        </Row>
        <Row label="Sex">
          {draft.sex ? SEX_LABELS[draft.sex] : '—'}
        </Row>
        <Row label="Notes">
          {draft.posture_notes && draft.posture_notes.length > 0
            ? draft.posture_notes
            : 'None'}
        </Row>
      </div>

      {draft.injuries && draft.injuries.length > 0 && (
        <div className="p-4 rounded-2xl border-2 border-border-subtle bg-surface-raised mb-6">
          <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">
            Injuries detail
          </div>
          <ul className="grid gap-1 text-sm">
            {draft.injuries.map((inj, i) => (
              <li key={i}>
                <span className="font-semibold">{inj.part}</span>
                <span className="text-zinc-400"> — {inj.severity}</span>
                {inj.note ? <span className="text-zinc-400"> ({inj.note})</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold bg-brand text-black active:scale-[0.98]"
      >
        Save and generate my plan
      </button>
    </div>
  )
}
