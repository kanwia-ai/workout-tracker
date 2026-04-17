import { z } from 'zod'

export const Goal = z.enum(['glutes', 'strength', 'longevity', 'aesthetics', 'rehab', 'general_fitness'])
export const Equipment = z.enum(['full_gym', 'home_weights', 'bands_only', 'bodyweight_only', 'cable_machine', 'barbell'])
export const Severity = z.enum(['avoid', 'modify', 'ok'])
export const BodyPart = z.enum([
  'left_meniscus', 'right_meniscus', 'lower_back', 'hip_flexors',
  'left_shoulder', 'right_shoulder', 'left_trap', 'right_trap',
  'wrist', 'ankle', 'neck', 'elbow', 'other',
])
export const Sex = z.enum(['female', 'male', 'prefer_not_to_say'])

export const InjurySchema = z.object({
  part: BodyPart,
  severity: Severity,
  note: z.string().max(200).optional(),
})

export const UserProgramProfileSchema = z.object({
  goal: Goal,
  sessions_per_week: z.number().int().min(1).max(7),
  training_age_months: z.number().int().min(0).max(600),
  equipment: z.array(Equipment).min(1),
  injuries: z.array(InjurySchema),
  time_budget_min: z.number().int().min(15).max(180),
  sex: Sex,
  posture_notes: z.string().max(500),
})

export type UserProgramProfile = z.infer<typeof UserProgramProfileSchema>
