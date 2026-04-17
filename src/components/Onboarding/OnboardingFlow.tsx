import { useState } from 'react'
import { UserProgramProfileSchema, type UserProgramProfile } from '../../types/profile'
import { StepGoal } from './StepGoal'

type PartialProfile = Partial<UserProgramProfile>

interface Props {
  onComplete: (p: UserProgramProfile) => void
}

const STEPS = [
  'goal',
  'frequency',
  'experience',
  'equipment',
  'injuries',
  'time_sex',
  'posture',
  'confirm',
] as const

type StepName = (typeof STEPS)[number]

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState<StepName>('goal')
  const [draft, setDraft] = useState<PartialProfile>({ injuries: [], equipment: [] })

  const idx = STEPS.indexOf(step)
  const totalSteps = STEPS.length
  const progress = Math.round(((idx + 1) / totalSteps) * 100)

  const next = (patch: PartialProfile) => {
    const merged = { ...draft, ...patch }
    setDraft(merged)
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1])
      return
    }
    // Final step — validate before handing off. Failure jumps back to step 0
    // so the user can correct missing fields instead of silently crashing
    // downstream inside saveProfileLocal.
    const parsed = UserProgramProfileSchema.safeParse(merged)
    if (!parsed.success) {
      console.warn('onboarding completion validation failed', parsed.error.message)
      setStep(STEPS[0])
      return
    }
    onComplete(parsed.data)
  }

  return (
    <div className="min-h-screen bg-surface p-4 max-w-lg mx-auto">
      <div className="h-1 bg-surface-raised rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-brand transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      {step === 'goal' && (
        <StepGoal value={draft.goal} onNext={(goal) => next({ goal })} />
      )}
      {step === 'frequency' && <div>TODO — StepFrequency</div>}
      {step === 'experience' && <div>TODO — StepExperience</div>}
      {step === 'equipment' && <div>TODO — StepEquipment</div>}
      {step === 'injuries' && <div>TODO — StepInjuries</div>}
      {step === 'time_sex' && <div>TODO — StepTimeAndSex</div>}
      {step === 'posture' && <div>TODO — StepPosture</div>}
      {step === 'confirm' && <div>TODO — StepConfirm</div>}
    </div>
  )
}
