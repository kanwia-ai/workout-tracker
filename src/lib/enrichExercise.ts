// ─── Claude-powered exercise enrichment ──────────────────────────────────────
//
// After Gemini extracts structured exercise data from a YouTube URL, we hand
// it off to Claude (via the `enrich_exercise` edge op) for a second pass:
//
//   1. Map the variant to a rehab-protocol compatibility list — e.g. "this
//      Bulgarian split squat is compatible with meniscus and hip_flexors".
//   2. Suggest a progression and a regression in the SAME movement pattern
//      (e.g. "step-up onto a lower box" / "rear-foot-elevated split squat
//      with dumbbells").
//   3. Generate a one-sentence rationale for why this fits the user's profile.
//
// This layer is narrow: Sonnet, not Opus. The input is small (already-
// structured JSON) and the output is bounded — perfect for Sonnet's speed.
//
// DEPLOYMENT: the edge function op this calls is CODE-ONLY until Kyra ships
// it. Expect a 400 "unknown op: enrich_exercise" until the `generate` edge
// function is redeployed.

import { z } from 'zod'
import { callEdge } from './generate'
import type { AnalyzedExercise } from './gemini'
import type { ProtocolId } from '../types/directives'

// ─── Types ───────────────────────────────────────────────────────────────────

// Constrained so the client-side filter layer (which also keys on these ids)
// doesn't see novel strings.
const PROTOCOL_ID_ENUM: readonly ProtocolId[] = [
  'lower_back',
  'meniscus',
  'shoulder',
  'knee_pfp',
  'hip_flexors',
  'upper_back',
  'trap',
  'elbow',
  'wrist',
  'ankle',
  'neck',
] as const

export const EnrichedExerciseSchema = z.object({
  compatible_protocols: z.array(z.enum(PROTOCOL_ID_ENUM)),
  contraindicated_protocols: z.array(z.enum(PROTOCOL_ID_ENUM)),
  progression: z.object({
    name: z.string(),
    why: z.string(),
  }),
  regression: z.object({
    name: z.string(),
    why: z.string(),
  }),
  rationale: z.string(),
})

export type EnrichedExercise = z.infer<typeof EnrichedExerciseSchema>

// ─── Optional profile context ────────────────────────────────────────────────
// The edge op accepts a minimal slice of the user's profile so Claude's
// rationale can reference it. We don't pass the whole profile to keep tokens
// cheap and to avoid coupling this client-side path to profile schema drift.
export interface EnrichProfileContext {
  injuries?: string[]      // e.g. ["left_meniscus", "lower_back"]
  goal?: string             // e.g. "athletic"
  training_age?: string     // e.g. "intermediate"
  equipment?: string[]      // user-available equipment
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Enrich a Gemini-extracted exercise with protocol compatibility,
 * progression/regression, and a one-line rationale. Throws on edge failure;
 * callers should catch and decide whether to degrade gracefully (the YouTube
 * import flow still works without enrichment).
 */
export async function enrichExercise(
  exercise: AnalyzedExercise,
  profile?: EnrichProfileContext,
): Promise<EnrichedExercise> {
  return callEdge(
    'enrich_exercise',
    { exercise, profile: profile ?? null },
    EnrichedExerciseSchema,
  )
}
