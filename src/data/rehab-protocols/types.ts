// Rehab protocol schema.
//
// Each protocol is a typed TypeScript module exporting a `Protocol` object.
// Consumed by the planner at plan-build time to merge clinical directives
// into InjuryDirectives. Every field is derived from peer-reviewed clinical
// literature; citations are REQUIRED on every protocol to ensure the system
// ships evidence-based progressions, not vibes.
//
// Severity axis: one protocol file handles all four onboarding severities
// (avoid / modify / chronic / ok) via the `by_severity` block.

import { z } from 'zod'
import { ProtocolIdSchema, SessionTypeSchema } from '../../types/directives'

// ─── Citation ──────────────────────────────────────────────────────────────
export const CitationSchema = z.object({
  authors: z.string(),      // "Logerstedt DS, Snyder-Mackler L et al."
  year: z.number().int().min(1980).max(2030),
  title: z.string(),
  journal: z.string().optional(),
  url: z.string().url().optional(),
  note: z.string().optional(),
})
export type Citation = z.infer<typeof CitationSchema>

// ─── Warmup element ────────────────────────────────────────────────────────
export const WarmupElementSchema = z.object({
  name: z.string(),
  duration_sec: z.number().int().min(15).max(900).optional(),
  reps: z.number().int().min(1).max(30).optional(),
  sets: z.number().int().min(1).max(5).optional(),
  cue: z.string().optional(),
  // Optional structured params for specific modalities (treadmill etc)
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
})
export type WarmupElement = z.infer<typeof WarmupElementSchema>

// ─── Stage (rehab progression) ─────────────────────────────────────────────
export const StageSchema = z.object({
  id: z.string(),
  target_weeks: z.tuple([z.number().int(), z.number().int()]),  // [1, 2]
  gate_criteria: z.array(z.string()),                            // pain_under_3_of_10 etc.
  allowed_main_variants: z.array(z.string()),
  banned_variants: z.array(z.string()).default([]),
  warmup_protocol: z.array(WarmupElementSchema),
  rep_scheme_override: z
    .tuple([z.number().int(), z.number().int()])
    .nullable()
    .default(null),
  rationale: z.string(),
})
export type Stage = z.infer<typeof StageSchema>

// ─── Per-session accessory priorities ──────────────────────────────────────
export const AccessoryPrioritySchema = z.object({
  exercise_pattern: z.string(),
  reason: z.string(),
})
export type AccessoryPriority = z.infer<typeof AccessoryPrioritySchema>

export const PerSessionAccessoriesSchema = z.object({
  priority: z.array(AccessoryPrioritySchema).default([]),
  decompression_pair: z.array(AccessoryPrioritySchema).default([]),
  avoid: z.array(z.string()).default([]),
})
export type PerSessionAccessories = z.infer<typeof PerSessionAccessoriesSchema>

// ─── Chronic-management block ──────────────────────────────────────────────
// For 'chronic' severity. Not a time-boxed progression — a management
// strategy that attacks root cause while allowing full pattern training.
export const ChronicManagementSchema = z.object({
  priority_work: z.array(z.string()),
  daily_correctives: z.array(z.string()).default([]),
  avoid_under_load: z.array(z.string()).default([]),
  do_not_ban: z.array(z.string()).default([]),
  why_not_banned: z.string(),
})
export type ChronicManagement = z.infer<typeof ChronicManagementSchema>

// ─── OK-severity watch-outs ────────────────────────────────────────────────
// User has healed but wants the plan to be cautious on certain patterns.
export const OkWatchoutSchema = z.object({
  watch_out: z.array(z.string()),
  regression_if_pain: z.array(z.string()),
})
export type OkWatchout = z.infer<typeof OkWatchoutSchema>

// ─── Avoid-severity block ──────────────────────────────────────────────────
// Acute — user is not cleared for loaded work on this region. Planner hard-
// filters anything loading the affected area while this is active.
export const AvoidBlockSchema = z.object({
  hard_ban_patterns: z.array(z.string()),
  permitted_adjacent_work: z.array(z.string()).default([]),
  see_professional_after_days: z.number().int().optional(),
  rationale: z.string(),
})
export type AvoidBlock = z.infer<typeof AvoidBlockSchema>

// ─── Per-session directive ─────────────────────────────────────────────────
export const ProtocolSessionDirectiveSchema = z.object({
  warmup_focus: z.array(z.string()).default([]),
  priority_work: z.array(z.string()).default([]),
  modifications: z.array(z.string()).default([]),
  pair_with: z.array(z.string()).default([]),
  avoid_on_this_session: z.array(z.string()).default([]),
})
export type ProtocolSessionDirective = z.infer<typeof ProtocolSessionDirectiveSchema>

// ─── Top-level Protocol ────────────────────────────────────────────────────
export const ProtocolSchema = z.object({
  id: ProtocolIdSchema,
  title: z.string(),
  summary: z.string(),

  citations: z.array(CitationSchema).min(1),  // peer-reviewed or clinical-guideline

  // Severity-differentiated clinical strategy.
  by_severity: z.object({
    avoid: AvoidBlockSchema.optional(),
    rehab: z
      .object({
        stages: z.array(StageSchema).min(1),
      })
      .optional(),
    chronic: ChronicManagementSchema.optional(),
    ok: OkWatchoutSchema.optional(),
  }),

  // How this injury affects each session type. Using `partialRecord` so a
  // protocol that only cares about legs can omit push/pull entries entirely.
  per_session_type: z.partialRecord(
    SessionTypeSchema,
    ProtocolSessionDirectiveSchema,
  ),

  // Accessories the planner should prefer on sessions loading this area.
  // Partial record — most protocols only define accessories for a couple
  // session types (e.g. meniscus for lower_squat only).
  per_session_accessories: z
    .partialRecord(SessionTypeSchema, PerSessionAccessoriesSchema)
    .default({}),

  // Notes for the UI / user-facing explanation.
  user_facing: z.object({
    what_this_plan_does: z.string(),
    what_to_report: z.array(z.string()),       // symptom thresholds that mean step back
    when_to_see_professional: z.string(),
  }),
})
export type Protocol = z.infer<typeof ProtocolSchema>

// ─── Helpers ───────────────────────────────────────────────────────────────
export function validateProtocol(raw: unknown): Protocol {
  return ProtocolSchema.parse(raw)
}
