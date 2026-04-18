// OnboardingFlow — v2 orchestrator.
// Routes the user through 13 steps (11 of which capture data, 2 are chrome).
// Progress bar = row of Lumo footprints. Every step has Lumo + speech bubble.
// Optional steps surface a "skip for now" button (handled by children).
//
// State: a running Partial<UserProgramProfile> draft + completedSteps set.
// Validation: the final confirm screen hands the Zod-parsed profile up.

import { useState } from 'react'
import {
  UserProgramProfileSchema,
  primaryGoalToLegacyGoal,
  type UserProgramProfile,
  type PrimaryGoal,
  type AestheticPreference,
  type ExerciseDislike as ExerciseDislikeValue,
} from '../../types/profile'
import type { MuscleGroup } from '../../types/plan'
import { FootprintProgress } from './FootprintProgress'
import { StepWelcome } from './StepWelcome'
import { StepPrimaryGoal } from './StepPrimaryGoal'
import { StepMusclePriority } from './StepMusclePriority'
import { StepAesthetic } from './StepAesthetic'
import { StepSpecificTarget } from './StepSpecificTarget'
import { StepSessions } from './StepSessions'
import { StepEquipment } from './StepEquipment'
import { StepTrainingAge } from './StepTrainingAge'
import { StepBodyInfo } from './StepBodyInfo'
import { StepInjuries } from './StepInjuries'
import { StepDislikes } from './StepDislikes'
import { StepPostureNotes } from './StepPostureNotes'
import { StepConfirm } from './StepConfirm'

type PartialProfile = Partial<UserProgramProfile>

interface Props {
  onComplete: (p: UserProgramProfile) => void
}

// Canonical step order. Keep the ids readable so debugging is easy.
const STEPS = [
  'welcome',
  'primary_goal',
  'muscle_priority',
  'aesthetic',
  'specific_target',
  'sessions',
  'equipment',
  'training_age',
  'body_info',
  'injuries',
  'dislikes',
  'posture',
  'confirm',
] as const
type StepId = (typeof STEPS)[number]

export function OnboardingFlow({ onComplete }: Props) {
  const [stepIdx, setStepIdx] = useState<number>(0)
  const [draft, setDraft] = useState<PartialProfile>({
    injuries: [],
    equipment: [],
    posture_notes: '',
    muscle_priority: [],
    exercise_dislikes: [],
  })
  const [completed, setCompleted] = useState<ReadonlySet<number>>(new Set())

  const stepId: StepId = STEPS[stepIdx]!
  // Back button is suppressed on welcome (no prior step) and on confirm
  // (force the user to use explicit edit paths rather than re-run steps).
  const canGoBack = stepIdx > 0 && stepId !== 'confirm'

  const markComplete = (i: number) => {
    if (completed.has(i)) return
    const next = new Set(completed)
    next.add(i)
    setCompleted(next)
  }

  const advance = (patch: PartialProfile) => {
    const merged = { ...draft, ...patch }
    setDraft(merged)
    markComplete(stepIdx)
    if (stepIdx < STEPS.length - 1) setStepIdx(stepIdx + 1)
  }

  const back = () => {
    if (canGoBack) setStepIdx(stepIdx - 1)
  }

  const finalize = () => {
    // Build a complete profile: derive legacy `goal` from primary_goal when
    // present, otherwise fall back to the default. Required defaults are
    // filled here so Zod always passes (optional fields stay undefined).
    const primary = draft.primary_goal
    const legacyGoal = primary
      ? primaryGoalToLegacyGoal(primary)
      : (draft.goal ?? 'general_fitness')
    const complete: UserProgramProfile = {
      goal: legacyGoal,
      sessions_per_week: draft.sessions_per_week ?? 3,
      training_age_months: draft.training_age_months ?? 0,
      equipment: (draft.equipment && draft.equipment.length > 0
        ? draft.equipment
        : ['bodyweight_only']) as UserProgramProfile['equipment'],
      injuries: draft.injuries ?? [],
      time_budget_min: draft.time_budget_min ?? 45,
      sex: draft.sex ?? 'prefer_not_to_say',
      posture_notes: draft.posture_notes ?? '',
      primary_goal: primary,
      muscle_priority:
        draft.muscle_priority && draft.muscle_priority.length > 0
          ? draft.muscle_priority
          : undefined,
      aesthetic_preference:
        draft.aesthetic_preference && draft.aesthetic_preference !== 'none'
          ? draft.aesthetic_preference
          : undefined,
      specific_target:
        draft.specific_target && draft.specific_target.length > 0
          ? draft.specific_target
          : undefined,
      exercise_dislikes:
        draft.exercise_dislikes && draft.exercise_dislikes.length > 0
          ? draft.exercise_dislikes
          : undefined,
      want_demo_videos: draft.want_demo_videos,
      age: draft.age,
      weight_kg: draft.weight_kg,
      height_cm: draft.height_cm,
      first_name: draft.first_name,
    }
    const parsed = UserProgramProfileSchema.safeParse(complete)
    if (!parsed.success) {
      console.warn(
        'onboarding completion validation failed',
        parsed.error.message,
      )
      // Fall back to primary_goal step rather than a random jump — that's
      // the most likely source of missing hard data.
      setStepIdx(STEPS.indexOf('primary_goal'))
      return
    }
    onComplete(parsed.data)
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'var(--lumo-bg)',
        color: 'var(--lumo-text)',
      }}
    >
      <div className="max-w-lg mx-auto px-4 pt-4 pb-8 safe-top safe-bottom">
        <div className="flex items-center justify-between mb-3">
          {canGoBack ? (
            <button
              type="button"
              onClick={back}
              className="min-h-[40px] px-3 rounded-xl text-sm font-semibold"
              style={{
                background: 'var(--lumo-raised)',
                border: '1px solid var(--lumo-border)',
                color: 'var(--lumo-text-sec)',
              }}
              aria-label="Go back"
              data-testid="onboarding-back"
            >
              Back
            </button>
          ) : (
            <div style={{ minHeight: 40 }} />
          )}
          <FootprintProgress
            totalSteps={STEPS.length}
            currentStep={stepIdx}
            completedSteps={completed}
          />
          <div style={{ minHeight: 40, minWidth: 40 }} />
        </div>

        <div data-testid={`onboarding-step-${stepId}`}>
          {stepId === 'welcome' && (
            <StepWelcome onNext={() => advance({})} />
          )}
          {stepId === 'primary_goal' && (
            <StepPrimaryGoal
              value={draft.primary_goal}
              onNext={(primary_goal: PrimaryGoal) =>
                advance({ primary_goal })
              }
            />
          )}
          {stepId === 'muscle_priority' && (
            <StepMusclePriority
              value={draft.muscle_priority}
              onNext={(muscle_priority: MuscleGroup[]) =>
                advance({ muscle_priority })
              }
              onSkip={() => advance({ muscle_priority: [] })}
            />
          )}
          {stepId === 'aesthetic' && (
            <StepAesthetic
              value={draft.aesthetic_preference}
              onNext={(aesthetic_preference: AestheticPreference) =>
                advance({ aesthetic_preference })
              }
              onSkip={() => advance({ aesthetic_preference: 'none' })}
            />
          )}
          {stepId === 'specific_target' && (
            <StepSpecificTarget
              value={draft.specific_target}
              onNext={(specific_target: string) => advance({ specific_target })}
              onSkip={() => advance({ specific_target: '' })}
            />
          )}
          {stepId === 'sessions' && (
            <StepSessions
              value={{
                sessions_per_week: draft.sessions_per_week,
                time_budget_min: draft.time_budget_min,
              }}
              onNext={(patch) => advance(patch)}
            />
          )}
          {stepId === 'equipment' && (
            <StepEquipment
              value={draft.equipment}
              onNext={(equipment) => advance({ equipment })}
            />
          )}
          {stepId === 'training_age' && (
            <StepTrainingAge
              value={draft.training_age_months}
              onNext={(training_age_months) =>
                advance({ training_age_months })
              }
            />
          )}
          {stepId === 'body_info' && (
            <StepBodyInfo
              value={{
                age: draft.age,
                sex: draft.sex,
                weight_kg: draft.weight_kg,
                height_cm: draft.height_cm,
              }}
              onNext={(patch) => advance(patch)}
            />
          )}
          {stepId === 'injuries' && (
            <StepInjuries
              value={draft.injuries}
              onNext={(injuries) => advance({ injuries })}
            />
          )}
          {stepId === 'dislikes' && (
            <StepDislikes
              value={draft.exercise_dislikes}
              onNext={(exercise_dislikes: ExerciseDislikeValue[]) =>
                advance({ exercise_dislikes })
              }
              onSkip={() => advance({ exercise_dislikes: [] })}
            />
          )}
          {stepId === 'posture' && (
            <StepPostureNotes
              value={draft.posture_notes}
              onNext={(posture_notes) => advance({ posture_notes })}
              onSkip={() => advance({ posture_notes: '' })}
            />
          )}
          {stepId === 'confirm' && (
            <StepConfirm
              draft={draft}
              onNext={() => {
                markComplete(stepIdx)
                finalize()
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
