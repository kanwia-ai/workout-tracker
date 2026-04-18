// Builds the Gemini prompt for the `swap_exercise` op.
//
// Mid-workout substitution: we hand Gemini the current exercise, the session
// focus, the list of exercises already completed (or passed) in this session,
// the user profile (for injuries + equipment), and a slimmed exercise pool.
// The model returns exactly one replacement plus a short one-sentence reason.
//
// Gemini is constrained to `swapExerciseSchema` via responseSchema on the
// caller side, so we don't restate the shape here — we focus on the
// *behavioral* rules (same muscle group, no duplicate, honor injuries,
// equipment, pool-only, exactly one).
//
// IMPORTANT: `exercisePool` is untrusted client-provided data. The caller must
// validate shape and cap size before invoking this builder.

import type { ExercisePoolEntry } from './generatePlan.ts'

export const SWAP_REASONS = [
  'machine_busy',
  'too_hard',
  'too_easy',
  'injury_flare',
  'generic',
] as const

export type SwapReason = (typeof SWAP_REASONS)[number]

export function isSwapReason(value: unknown): value is SwapReason {
  return typeof value === 'string' && (SWAP_REASONS as readonly string[]).includes(value)
}

export interface BuildSwapPromptInput {
  profile: unknown
  currentExercise: unknown
  sessionFocus: string[]
  completedExercisesInSession: string[]
  exercisePool: ExercisePoolEntry[]
  reason: SwapReason | string
}

export function buildSwapPrompt(input: BuildSwapPromptInput): string {
  const {
    profile,
    currentExercise,
    sessionFocus,
    completedExercisesInSession,
    exercisePool,
    reason,
  } = input
  return `You are a strength coach substituting ONE exercise mid-workout for the user below.

HARD RULES (must all be satisfied):
- Target the SAME primary muscle group(s) as the original exercise. Do not drift to a different muscle (e.g., do not return a chest exercise when the original was a back exercise).
- Honor the user's injuries from the profile. MENISCUS ("avoid" / "modify" / "chronic"): no deep squats, deep lunges, pistol squats, or plyometric jumps; keep loaded bilateral knee flexion under ~90 degrees. LOWER BACK ("avoid" / "modify" / "chronic"): no loaded spinal flexion; prefer hip hinges with moderate load and anti-extension/anti-rotation core work. SHOULDER ("avoid" / "modify"): no barbell overhead press or upright rows; prefer landmine press or neutral-grip dumbbell press. If the swap reason is "injury_flare", bias further toward rehab-friendly options.
- Honor the user's equipment list strictly. If the user only has bands_only or bodyweight_only, do not return barbell, cable, or machine entries.
- Do NOT return any exercise whose name or library_id appears in the "already completed this session" list below. The replacement must be distinct from every exercise the user has already done in this session.
- Do NOT return the original exercise itself.
- Choose the replacement from the provided pool ONLY. The library_id field must exactly match an id from the pool. The name field must match that pool entry's name verbatim.
- Return EXACTLY ONE replacement. Populate sets / reps / rir / rest_seconds / role consistent with the original exercise's intent (accessory vs main lift, similar volume). If the reason is "too_hard", you may drop one set or widen the rep range; if "too_easy", you may add a set or tighten the rep range.
- The "reason" field is a single short sentence (<= 140 chars) explaining why this substitution works — mention the matched muscle group and any injury/equipment consideration.

SWAP REASON: ${reason}

ORIGINAL EXERCISE:
${JSON.stringify(currentExercise, null, 2)}

SESSION FOCUS (muscle groups): ${sessionFocus.join(', ') || '(none)'}

ALREADY COMPLETED THIS SESSION (do NOT suggest any of these):
${completedExercisesInSession.length > 0 ? completedExercisesInSession.map(e => `- ${e}`).join('\n') : '(none)'}

USER PROFILE:
${JSON.stringify(profile, null, 2)}

EXERCISE POOL (${exercisePool.length} entries — each has id, name, primaryMuscles, equipment):
${JSON.stringify(exercisePool)}

Return JSON matching the provided schema: { replacement: { library_id, name, sets, reps, rir, rest_seconds, role, notes? }, reason: "<one-sentence why this sub works>" }. Do not include any prose outside the JSON.`
}
