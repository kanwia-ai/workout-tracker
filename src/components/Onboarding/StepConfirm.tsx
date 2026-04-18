// StepConfirm — Lumo reads back what was captured. Button = generate plan.

import { useMemo } from 'react'
import { StepChrome } from './StepChrome'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'
import type { UserProgramProfile, PrimaryGoal, AestheticPreference, ExerciseDislike } from '../../types/profile'

interface Props {
  draft: Partial<UserProgramProfile>
  onNext: () => void
  cheek?: CheekLevel
}

const PRIMARY_GOAL_LABELS: Record<PrimaryGoal, string> = {
  build_muscle: 'Build muscle',
  get_stronger: 'Get stronger',
  lean_and_strong: 'Lean & strong',
  fat_loss: 'Fat loss',
  mobility: 'Mobility / rehab',
  athletic: 'Athletic',
  general_fitness: 'General fitness',
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

const AESTHETIC_LABELS: Record<AestheticPreference, string> = {
  toned_lean: 'Toned & lean',
  strong_defined: 'Strong & defined',
  athletic: 'Athletic',
  balanced: 'Balanced',
  none: 'No preference',
}

const DISLIKE_LABELS: Record<ExerciseDislike, string> = {
  burpees: 'burpees',
  running: 'running',
  jumping: 'jumping',
  overhead_pressing: 'overhead pressing',
  high_rep_cardio: 'high-rep cardio',
  hex_bar: 'hex bar',
  battle_ropes: 'battle ropes',
  bike_sprints: 'bike sprints',
  rowing_machine: 'rowing machine',
  kettlebell_swings: 'kettlebell swings',
  box_jumps: 'box jumps',
}

function experienceLabel(months?: number): string {
  if (months === undefined) return '—'
  if (months < 6) return `New (${months} mo)`
  if (months < 24) return `Some experience (${months} mo)`
  return `Experienced (${months} mo)`
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex justify-between items-start gap-4 py-3"
      style={{ borderBottom: '1px solid var(--lumo-border)' }}
    >
      <span className="text-sm" style={{ color: 'var(--lumo-text-sec)' }}>
        {label}
      </span>
      <span
        className="text-right font-semibold"
        style={{ color: 'var(--lumo-text)' }}
      >
        {children}
      </span>
    </div>
  )
}

export function StepConfirm({ draft, onNext, cheek = DEFAULT_CHEEK }: Props) {
  const name = draft.first_name?.trim() || 'friend'
  const bubble = useMemo(
    () => pickCopy('onboardingConfirm', cheek, undefined, { name }),
    [cheek, name],
  )

  const equipmentText =
    draft.equipment && draft.equipment.length > 0
      ? draft.equipment.map((e) => EQUIPMENT_LABELS[e]).join(', ')
      : '—'

  const injuriesText =
    draft.injuries && draft.injuries.length > 0
      ? `${draft.injuries.length} noted`
      : 'None'

  const dislikesText =
    draft.exercise_dislikes && draft.exercise_dislikes.length > 0
      ? draft.exercise_dislikes.map((d) => DISLIKE_LABELS[d]).join(', ')
      : 'None'

  const priorityText =
    draft.muscle_priority && draft.muscle_priority.length > 0
      ? draft.muscle_priority.join(', ')
      : 'Balanced'

  const goalLabel = draft.primary_goal
    ? PRIMARY_GOAL_LABELS[draft.primary_goal]
    : draft.goal
      ? GOAL_LABELS[draft.goal]
      : '—'

  return (
    <StepChrome
      lumoState="cheer"
      bubbleText={bubble}
      title="Does this look right?"
      subtitle="Double-check before we generate. You can edit later in Settings."
    >
      <div
        className="p-4 rounded-2xl mb-5"
        style={{
          background: 'var(--lumo-raised)',
          border: '2px solid var(--lumo-border)',
        }}
      >
        <Row label="Goal">{goalLabel}</Row>
        {draft.aesthetic_preference &&
          draft.aesthetic_preference !== 'none' && (
            <Row label="Aesthetic">
              {AESTHETIC_LABELS[draft.aesthetic_preference]}
            </Row>
          )}
        {draft.specific_target && (
          <Row label="Target">{draft.specific_target}</Row>
        )}
        <Row label="Priority muscles">{priorityText}</Row>
        <Row label="Sessions / week">{draft.sessions_per_week ?? '—'}</Row>
        <Row label="Session length">
          {draft.time_budget_min ? `${draft.time_budget_min} min` : '—'}
        </Row>
        <Row label="Experience">{experienceLabel(draft.training_age_months)}</Row>
        <Row label="Equipment">{equipmentText}</Row>
        <Row label="Injuries">{injuriesText}</Row>
        <Row label="Avoid">{dislikesText}</Row>
        {draft.age !== undefined && <Row label="Age">{draft.age}</Row>}
        <Row label="Sex">{draft.sex ? SEX_LABELS[draft.sex] : '—'}</Row>
        {draft.weight_kg !== undefined && (
          <Row label="Weight">{draft.weight_kg} kg</Row>
        )}
        {draft.height_cm !== undefined && (
          <Row label="Height">{draft.height_cm} cm</Row>
        )}
        {draft.posture_notes && draft.posture_notes.length > 0 && (
          <Row label="Notes">{draft.posture_notes}</Row>
        )}
      </div>

      {draft.injuries && draft.injuries.length > 0 && (
        <div
          className="p-4 rounded-2xl mb-5"
          style={{
            background: 'var(--lumo-raised)',
            border: '2px solid var(--lumo-border)',
          }}
        >
          <div
            className="text-xs uppercase tracking-wide font-bold mb-2"
            style={{ color: 'var(--lumo-text-ter)' }}
          >
            Injuries detail
          </div>
          <ul className="grid gap-1 text-sm">
            {draft.injuries.map((inj, i) => (
              <li key={i} style={{ color: 'var(--lumo-text)' }}>
                <span className="font-semibold">{inj.part}</span>
                <span style={{ color: 'var(--lumo-text-sec)' }}>
                  {' '}
                  — {inj.severity}
                </span>
                {inj.note ? (
                  <span style={{ color: 'var(--lumo-text-sec)' }}>
                    {' '}
                    ({inj.note})
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold active:scale-[0.98]"
        style={{ background: 'var(--brand)', color: 'var(--lumo-bg)' }}
      >
        Save and generate my plan
      </button>
    </StepChrome>
  )
}
