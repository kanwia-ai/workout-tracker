// DO NOT rename fields or enum values — the Gemini prompt and the edge-function
// JSON Schema mirror reference these identifiers verbatim. Adding values is safe.
import { z } from 'zod'
import { MuscleGroup } from './plan'

export const Goal = z.enum(['glutes', 'strength', 'longevity', 'aesthetics', 'rehab', 'general_fitness'])

// PrimaryGoal: the 7 research-backed goal buckets that drive the architecture
// table (see docs/research/00-MASTER-SYNTHESIS.md). This supersedes `Goal`
// from onboarding forward; `goal` is preserved for back-compat so stored
// profiles (and the existing Gemini prompt) keep loading cleanly.
export const PrimaryGoal = z.enum([
  'build_muscle',
  'get_stronger',
  'lean_and_strong',
  'fat_loss',
  'mobility',
  'athletic',
  'general_fitness',
])
export type PrimaryGoal = z.infer<typeof PrimaryGoal>

// AestheticPreference — what "good" looks like to the user. Optional; feeds
// muscle-priority weighting in Pass 3 but never overrides safety rules.
// `muscle_size_bulk` added 2026-04 for "muscle bear" users — prioritize
// hypertrophy-heavy, compound-dominant work with arm + shoulder emphasis.
export const AestheticPreference = z.enum([
  'toned_lean',
  'strong_defined',
  'athletic',
  'muscle_size_bulk',
  'balanced',
  'none',
])
export type AestheticPreference = z.infer<typeof AestheticPreference>

// Units preference — controls input widgets and display strings. Stored on
// the profile so Settings and Home can honor it without re-asking. Internal
// storage is always metric (single source of truth); `units` only affects UX.
export const Units = z.enum(['imperial', 'metric'])
export type Units = z.infer<typeof Units>

// ExerciseDislike — multi-select pool of things the user wants zero of. The
// pool filter downweights these; banned (injury) exercises still win.
export const ExerciseDislike = z.enum([
  'burpees',
  'running',
  'jumping',
  'overhead_pressing',
  'high_rep_cardio',
  'hex_bar',
  'battle_ropes',
  'bike_sprints',
  'rowing_machine',
  'kettlebell_swings',
  'box_jumps',
])
export type ExerciseDislike = z.infer<typeof ExerciseDislike>

export const Equipment = z.enum(['full_gym', 'home_weights', 'bands_only', 'bodyweight_only', 'cable_machine', 'barbell'])
// 'chronic' covers ongoing conditions that shape programming but aren't acute (e.g., chronic lower back pain).
export const Severity = z.enum(['avoid', 'modify', 'chronic', 'ok'])
export const BodyPart = z.enum([
  'left_meniscus', 'right_meniscus', 'left_knee', 'right_knee',
  'lower_back', 'upper_back', 'hip_flexors',
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
  // Legacy required field — kept so back-compat loaders, tests, and the
  // current edge function all continue to accept profiles. For new profiles
  // this is derived from `primary_goal` via `primaryGoalToLegacyGoal`.
  goal: Goal,
  sessions_per_week: z.number().int().min(1).max(7),
  training_age_months: z.number().int().min(0).max(600),
  equipment: z.array(Equipment).min(1),
  injuries: z.array(InjurySchema),
  time_budget_min: z.number().int().min(15).max(180),
  sex: Sex,
  posture_notes: z.string().max(500),

  // ── NEW v2 fields (all optional; missing → sensible defaults) ──────────
  /**
   * 7-goal taxonomy from MASTER-SYNTHESIS (single). When present, supersedes
   * `goal`. Kept for back-compat; `primary_goals` is the new preferred shape
   * (multi-select, max 2). When both are present, `primary_goals[0]` wins.
   */
  primary_goal: PrimaryGoal.optional(),
  /**
   * Multi-select primary goals — up to 2. First entry is the dominant goal
   * (drives split / rep ranges); second adds secondary emphasis. Lets users
   * combine e.g. "get_stronger" + "build_muscle" instead of having to pick
   * the hybrid `lean_and_strong` bucket.
   */
  primary_goals: z.array(PrimaryGoal).min(1).max(2).optional(),
  /** Ordered highest→lowest priority muscles. Empty = balanced. */
  muscle_priority: z.array(MuscleGroup).optional(),
  /** What "good" looks like — weight hint for Pass 3. */
  aesthetic_preference: AestheticPreference.optional(),
  /** Free-text target, e.g. "first pull-up" or "glutes by June". */
  specific_target: z.string().max(200).optional(),
  /** Multi-select of things the user wants to avoid. */
  exercise_dislikes: z.array(ExerciseDislike).optional(),
  /** Show auto-playing exercise demos? */
  want_demo_videos: z.boolean().optional(),
  /** Optional demographic — used for volume-calibration overlay. */
  age: z.number().int().min(13).max(99).optional(),
  /** Optional — used for %1RM estimates + load prescription. */
  weight_kg: z.number().min(30).max(300).optional(),
  /** Optional — future height-based calibration. */
  height_cm: z.number().min(100).max(250).optional(),
  /** Display name for session rationales / Lumo greetings. */
  first_name: z.string().max(50).optional(),
  /**
   * Active lifting minutes (work only, rest between sets NOT counted). When
   * present, the planner uses this — not `time_budget_min` — to cap the set
   * count per session. `time_budget_min` stays around so legacy profiles and
   * the Settings screen still render; new profiles mirror `active_minutes`
   * into it at save time so downstream code can read either.
   */
  active_minutes: z.number().int().min(15).max(180).optional(),
  /**
   * Display preference for weight + height units. Internal storage is always
   * metric; this controls UI widgets and formatted output. Defaults to
   * 'imperial' for new profiles (US-first); legacy profiles without the key
   * are back-filled to 'metric' on load so nothing silently switches.
   */
  units: Units.optional(),
})

export type UserProgramProfile = z.infer<typeof UserProgramProfileSchema>

/**
 * Map the new 7-value `primary_goal` down to the legacy `goal` enum so the
 * existing Gemini prompt keeps working during migration. Pure, total.
 */
export function primaryGoalToLegacyGoal(pg: PrimaryGoal): z.infer<typeof Goal> {
  switch (pg) {
    case 'build_muscle':
      return 'aesthetics'
    case 'get_stronger':
      return 'strength'
    case 'lean_and_strong':
      return 'aesthetics'
    case 'fat_loss':
      return 'general_fitness'
    case 'mobility':
      return 'rehab'
    case 'athletic':
      return 'strength'
    case 'general_fitness':
      return 'general_fitness'
  }
}

/**
 * Inverse: infer a `primary_goal` from the legacy `goal` field so a v1
 * profile (loaded from storage) doesn't look blank in the new UI. Pure.
 */
export function legacyGoalToPrimaryGoal(g: z.infer<typeof Goal>): PrimaryGoal {
  switch (g) {
    case 'glutes':
      return 'build_muscle'
    case 'strength':
      return 'get_stronger'
    case 'longevity':
      return 'general_fitness'
    case 'aesthetics':
      return 'build_muscle'
    case 'rehab':
      return 'mobility'
    case 'general_fitness':
      return 'general_fitness'
  }
}
