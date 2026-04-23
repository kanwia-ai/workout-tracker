// ProgrammingDirectives — output of the interpretation pass.
//
// The interpretation pass reads a UserProgramProfile and produces structured
// clinical directives that downstream rule-based planning modules consume.
// The goal: move clinical reasoning OUT of one giant LLM prompt and into a
// layered system (rules-first, LLM-fallback for novel inputs).
//
// Design principle: avoidance ≠ recovery. Every injury directive includes a
// progression_arc that ENDS at full-ROM loading by block end; constraints
// loosen week-by-week. Severity controls the starting stage, not whether the
// pattern is banned forever.

import { z } from 'zod'

// ─── Session types ──────────────────────────────────────────────────────────
// Session-scoped directives fire on matching session types. A meniscus rehab
// directive only tightens `lower_squat_focus` / `lower_hinge_focus` sessions;
// upper-body days pass through untouched.
export const SessionTypeSchema = z.enum([
  'lower_squat_focus',
  'lower_hinge_focus',
  'upper_push',
  'upper_pull',
  'full_body_a',
  'full_body_b',
  'conditioning',
  'rehab_mobility',
])
export type SessionType = z.infer<typeof SessionTypeSchema>

// ─── Protocol IDs ───────────────────────────────────────────────────────────
// One id per rehab-protocols/*.yaml file. Matches every onboarding body-part
// option (left/right variants share a protocol and pass a unilateral flag).
// 'other' falls through to LLM free-text interpretation → matched_protocol=null.
export const ProtocolIdSchema = z.enum([
  'lower_back',
  'meniscus',
  'shoulder',
  'knee_pfp',          // patellofemoral pain / general anterior knee
  'hip_flexors',
  'upper_back',
  'trap',
  'elbow',
  'wrist',
  'ankle',
  'neck',
])
export type ProtocolId = z.infer<typeof ProtocolIdSchema>

// ─── Rep scheme bias (goal interpretation) ──────────────────────────────────
export const RepSchemeBiasSchema = z.object({
  main_compounds: z.tuple([z.number().int(), z.number().int()]),  // e.g. [3, 6]
  accessories: z.tuple([z.number().int(), z.number().int()]),     // e.g. [6, 10]
  finishers: z.tuple([z.number().int(), z.number().int()]),       // e.g. [10, 15]
})
export type RepSchemeBias = z.infer<typeof RepSchemeBiasSchema>

export const GoalDirectivesSchema = z.object({
  aesthetic: z.enum(['athletic', 'hypertrophy', 'endurance', 'general']),
  primary_adaptation: z.enum(['strength_power', 'size', 'work_capacity', 'mixed']),
  rep_scheme_bias: RepSchemeBiasSchema,
  intensity_bias: z.string(),
  cardio_policy: z.enum(['minimal', 'separated', 'integrated', 'aggressive']),
})
export type GoalDirectives = z.infer<typeof GoalDirectivesSchema>

// ─── Week shape ─────────────────────────────────────────────────────────────
export const WeekShapeSchema = z.object({
  sessions_per_week: z.number().int().min(1).max(7),
  template: z.array(SessionTypeSchema).min(1),
  session_spacing: z.enum(['alternating', 'ppl', 'upper_lower', 'custom']),
  cardio_days: z.array(z.enum(['standalone', 'post_upper', 'rest_day', 'none'])),
})
export type WeekShape = z.infer<typeof WeekShapeSchema>

// ─── Session-scoped injury directive ────────────────────────────────────────
export const SessionDirectiveSchema = z.object({
  priority_work: z.array(z.string()),
  modifications: z.array(z.string()),
  warmup_focus: z.array(z.string()),
  pair_with: z.array(z.string()),
  avoid_on_this_session: z.array(z.string()),
})
export type SessionDirective = z.infer<typeof SessionDirectiveSchema>

// ─── Progression arc ────────────────────────────────────────────────────────
// Week-by-week variant progression. Ends at full-ROM target.
export const ProgressionStageSchema = z.object({
  week_range: z.tuple([z.number().int(), z.number().int()]),
  allowed_variants: z.array(z.string()),
  target_at_end: z.string(),
  rep_scheme_override: RepSchemeBiasSchema.pick({ accessories: true })
    .shape.accessories.nullable(),
})
export type ProgressionStage = z.infer<typeof ProgressionStageSchema>

// ─── Injury directive ──────────────────────────────────────────────────────
export const InjuryDirectiveSchema = z.object({
  source: z.string(),                    // e.g. "left_meniscus" or "lower_back"
  matched_protocol: ProtocolIdSchema.nullable(),
  severity: z.enum(['acute', 'rehab', 'chronic', 'modify', 'ok']),
  stage_weeks: z.number().int().min(0),  // weeks into rehab at plan start
  unilateral_side: z.enum(['left', 'right']).nullable(),
  rationale: z.string(),
  global_avoid: z.array(z.string()),
  per_session_type: z.record(SessionTypeSchema, SessionDirectiveSchema),
  progression_arc: z.array(ProgressionStageSchema),
  recovery_target: z.string(),
})
export type InjuryDirective = z.infer<typeof InjuryDirectiveSchema>

// ─── Root-cause flag (interpretation of notes / posture / chronic patterns) ─
export const RootCauseFlagSchema = z.object({
  observation: z.string(),               // "chronic lower back pain + desk job"
  likely_cause: z.string(),              // "weak glute med + tight hip flexors"
  priority_work: z.array(z.string()),
  avoid_under_load: z.array(z.string()),
  do_not_ban: z.array(z.string()),       // e.g. ["squat", "deadlift"]
  why_not_banned: z.string(),
})
export type RootCauseFlag = z.infer<typeof RootCauseFlagSchema>

// ─── Progression narrative (phase-level, not per-injury) ────────────────────
export const WeeklyProgressionSchema = z.object({
  wk1_2: z.string(),
  wk3_4: z.string(),
  wk5: z.string(),
  wk6: z.string(),
})
export type WeeklyProgression = z.infer<typeof WeeklyProgressionSchema>

// ─── Top-level directives ──────────────────────────────────────────────────
export const ProgrammingDirectivesSchema = z.object({
  goal: GoalDirectivesSchema,
  week_shape: WeekShapeSchema,
  injury_directives: z.array(InjuryDirectiveSchema),
  root_causes: z.array(RootCauseFlagSchema),
  progression: WeeklyProgressionSchema,
  // Meta: record how the directives were produced so telemetry can audit.
  source: z.enum(['rules', 'llm', 'hybrid']),
  unhandled_inputs: z.array(z.string()),  // inputs that produced no directive
})
export type ProgrammingDirectives = z.infer<typeof ProgrammingDirectivesSchema>

// ─── Body part → protocol mapping ──────────────────────────────────────────
// Used by the rule-based interpreter. The planner still checks this at runtime
// to warn on drift between onboarding options and available protocols.
export const BODY_PART_TO_PROTOCOL: Record<string, ProtocolId | null> = {
  lower_back: 'lower_back',
  upper_back: 'upper_back',
  hip_flexors: 'hip_flexors',
  left_meniscus: 'meniscus',
  right_meniscus: 'meniscus',
  left_knee: 'knee_pfp',
  right_knee: 'knee_pfp',
  left_shoulder: 'shoulder',
  right_shoulder: 'shoulder',
  left_trap: 'trap',
  right_trap: 'trap',
  wrist: 'wrist',
  ankle: 'ankle',
  neck: 'neck',
  elbow: 'elbow',
  other: null,  // falls through to LLM interpretation
}

// ─── Unilateral side extraction ────────────────────────────────────────────
// `left_meniscus` → 'left', `right_knee` → 'right', `lower_back` → null.
export function extractUnilateralSide(bodyPart: string): 'left' | 'right' | null {
  if (bodyPart.startsWith('left_')) return 'left'
  if (bodyPart.startsWith('right_')) return 'right'
  return null
}
