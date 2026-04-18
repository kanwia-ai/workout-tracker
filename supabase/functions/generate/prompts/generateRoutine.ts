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
    warmup: `Dynamic mobility for ${minutes} min — NOT static stretching (research: Behm 2011 — static holds pre-strength reduce force output ~5%). Include hip/ankle/knee mobility, light cardio (brisk walk / bike / rower, 2-3 min), and activation work (banded glute bridges, scapular retractions, band pull-aparts). End with 2-3 ramp-up sets if sessionFocus includes a heavy compound (squat, deadlift, bench, overhead press). Prefer movements that raise core temp, lubricate joints, and prime the primary movers for the working sets.`,
    cooldown: `Down-regulate for ${minutes} min. Open with 3-5 min of light walking or easy stationary bike, then static stretching targeting the muscle groups in sessionFocus. Hold each stretch 20-45 seconds. Keep it short — cool-downs have minimal hypertrophy value (Van Hooren & Peake 2018 review found no significant recovery benefit beyond ritual); this block is for parasympathetic shift and a clean end to the session, not for extra training stimulus.`,
    cardio: `Zone-2 or interval cardio for ${minutes} min. Do NOT program high-intensity intervals if this will interfere with lifting — cap total post-strength cardio around ~10 min to avoid the concurrent-training interference effect (Wilson 2012 meta-analysis — endurance work within the same session blunts strength/hypertrophy gains, especially when running is the modality). Prefer low-impact options: treadmill incline walk, stair master at a slow pace, stationary bike at conversational effort. Rower and assault bike are acceptable if the user tolerates them.`,
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
