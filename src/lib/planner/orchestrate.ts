// orchestratePlan — Phase 5 client-side orchestrator.
//
// Composes the full plan-generation pipeline into a single call:
//
//   profile → interpretProfile → buildMesocycle → Mesocycle
//
// No LLM calls. No edge function. Zero API cost per regeneration. Runs
// synchronously in the client, returning a validated Mesocycle ready to
// persist.
//
// Why this exists: the previous pipeline made ONE giant Anthropic call
// asking a Claude Opus prompt to do everything — filter exercises by
// injury, assign days, pick rep schemes, sequence accessories, write
// rationales — and bill every generation to the user's API balance (a
// single Opus plan cost ~$2, and the app had no retry caps). This
// orchestrator replaces that with deterministic clinical logic.
//
// The edge function / Anthropic path is kept available for callers that
// want LLM-voice rationales; the orchestrator's output stays schema-
// compatible with that path so the app can A/B between them.

import { MesocycleSchema, type Mesocycle } from '../../types/plan'
import type { UserProgramProfile } from '../../types/profile'
import { interpretProfile } from './interpretProfile'
import { buildMesocycle } from './buildMesocycle'
import type { ProgrammingDirectives } from '../../types/directives'

export interface OrchestrationResult {
  mesocycle: Mesocycle
  directives: ProgrammingDirectives
  source: 'local_planner'
}

export function orchestratePlan(
  profile: UserProgramProfile,
  userId: string,
  lengthWeeks = 6,
): OrchestrationResult {
  const directives = interpretProfile(profile)
  const built = buildMesocycle(directives, lengthWeeks)

  // Adapt BuiltMesocycle → Mesocycle (the existing persistence schema).
  const draft = {
    id: built.id,
    user_id: userId,
    generated_at: built.generated_at,
    length_weeks: built.length_weeks,
    sessions: built.sessions,
    profile_snapshot: profile,
  }

  const result = MesocycleSchema.safeParse(draft)
  if (!result.success) {
    throw new Error(
      `orchestratePlan: built mesocycle failed validation — ${result.error.message}`,
    )
  }

  return {
    mesocycle: result.data,
    directives,
    source: 'local_planner',
  }
}
