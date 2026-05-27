// Builds the Gemini prompt for the `generate_routine` op.
//
// A "routine" is short ancillary content — warmup, cooldown, or cardio block —
// attached to a main training session. The caller constrains Gemini to
// `routineSchema` via responseSchema, so this prompt focuses on *behavioral*
// rules the schema can't express (what kinds of movements fit each kind,
// evidence-backed dos and don'ts, how to respect the session's muscle focus).
//
// IMPORTANT: `profile` is untrusted client-provided data. The caller must
// validate shape before invoking this builder.
//
// v1.1 (2026-05-26): per docs/research/02-coaching-philosophy.md, cardio
// placement is now framed as a judgment from goal rather than a hard-coded
// "stack 10 min after lifting" rule. The minute budget the caller passes
// is a STARTING POINT — the prompt teaches when goal/intensity context
// should pull the volume up or down, and surfaces the cardio block as an
// opt-in tool rather than auto-prescribed work.

export type RoutineKind = 'warmup' | 'cooldown' | 'cardio'

export interface BuildRoutinePromptInput {
  profile: unknown
  sessionFocus: string[]
  kind: RoutineKind
  minutes: number
  focusTag?: string
}

export function buildRoutinePrompt(input: BuildRoutinePromptInput): string {
  const { profile, sessionFocus, kind, minutes, focusTag } = input

  const rulesByKind: Record<RoutineKind, string> = {
    warmup: `Dynamic mobility for ${minutes} min — NOT static stretching (research: Behm 2011 — static holds pre-strength reduce force output ~5%). Include hip/ankle/knee mobility, light cardio (brisk walk / bike / rower, 2-3 min), and activation work (banded glute bridges, scapular retractions, band pull-aparts).

Ramp-up sets — judgment, not a fixed count (per docs/research/02-coaching-philosophy.md §"Mind-muscle connection is real"):
  • If sessionFocus includes a heavy compound (squat, deadlift, bench, overhead press), include ramp-up sets. Starting point: 2-3 ramps for a true cold-start. Drop to 1-2 if the user has lifting context earlier in their day, OR if the compound is preceded by another compound that hit the same primary muscle (the muscle is already warm and connected).
  • For training_age_months ≤ 6 (beginner), lean toward 3 ramps so they find the pattern. For training_age_months ≥ 36, 1 ramp is often enough.
  • If the user's recent checkins flagged "didn't feel it" on this exercise, add a ramp set.
The default is the safe overshoot — but DON'T pad ramps when the body is clearly already warm.

Prefer movements that raise core temp, lubricate joints, and prime the primary movers for the working sets.`,
    cooldown: `Down-regulate for ${minutes} min. Open with 3-5 min of light walking or easy stationary bike, then static stretching targeting the muscle groups in sessionFocus. Hold each stretch 20-45 seconds. Keep it short — cooldown serves as a calm-down ritual + opportunity for mobility/static stretching the user couldn't do pre-workout. Doesn't accelerate physical recovery per Van Hooren & Peake 2018, but useful for psychological transition out of the session.`,
    cardio: `Cardio block for ${minutes} min — but the duration and placement are JUDGMENT from the user's goal, not a fixed prescription.

**Cardio placement — judgment from these principles** (per docs/research/02-coaching-philosophy.md §"Don't confuse the body"):
The body has a state. Heavy cardio before lifting puts the body in cardiovascular mode and degrades strength output. So:
  • If the user's goal is hypertrophy / strength / build_muscle / get_stronger: this cardio block is POST-strength (cooldown segment OR separate session). An EASY-pace pre-lift activation (5-min row / 5-min backwards walk) is fine ONLY if the user is still fresh after — surface as user toggle, not auto-included.
  • If the user's goal is fat loss / cutting: post-strength cardio works best (HR already elevated, supplements the deficit). Keep effort conversational — not intervals — when stacked into the same session as lifting.
  • If the user's goal is cardiovascular health: cardio can lead the session; the lifting after should be light enough that depleted strength doesn't matter.
  • If the user's goal is bulking / mass gain: don't add cardio — it competes with recovery. Prefer a brief walk/flush only.

Modality: Zone-2 (conversational effort) is the default. Prefer low-impact options: treadmill incline walk, stair master at a slow pace, stationary bike at conversational effort. Rower and assault bike are acceptable if the user tolerates them. Do NOT program high-intensity intervals when this block is stacked AFTER lifting — concurrent-training interference is real (small but modality-dependent), and the lifting session has already drawn from the recovery budget.

The ${minutes}-minute target is a STARTING POINT — if the user's goal calls for shorter (e.g. bulking: just a 5-min walk to flush), or longer (cardiovascular health: full Zone-2 dose), reason from the goal.`,
  }

  return `You are a strength coach designing ${kind} content for the user's session.

RULES:
- Respect the user's injuries (see profile): apply the same meniscus / lower-back / shoulder modifications used in the main program (no deep knee flexion on meniscus; no loaded spinal flexion on lower back; no barbell overhead / upright rows on shoulder).
- Tailor the selections to the sessionFocus muscle groups.
- Return 2-12 exercises sized for a ${minutes}-minute block.
- Each exercise must have a name plus EITHER duration_seconds (for holds, cardio intervals, isometrics) OR reps (for movement drills, mobility flows, activation work). Optional short notes when form cue matters.
- Title the routine in 4-6 words (e.g., "Lower-body dynamic warm-up", "Zone-2 bike flush").
- Do not invent equipment the user doesn't have — follow profile.equipment.

SPECIFIC TO THIS KIND:
${rulesByKind[kind]}

SESSION FOCUS: ${sessionFocus.join(', ') || '(none provided)'}
${focusTag ? `EXTRA FOCUS: ${focusTag}` : ''}

USER PROFILE:
${JSON.stringify(profile, null, 2)}

Return JSON matching the provided schema. Do not include any prose outside the JSON.`
}
