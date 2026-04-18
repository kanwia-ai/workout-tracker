// Builds the Gemini prompt for the `generate_plan` op.
//
// The prompt embeds the user's profile plus a slimmed exercise pool. Gemini is
// constrained to the `mesocycleSchema` via responseSchema on the caller side,
// so we don't need to restate the shape here — we focus on *behavioral* rules
// the schema can't express (substitutions, recovery spacing, progression, etc).
//
// IMPORTANT: `exercisePool` is untrusted client-provided data. The caller must
// validate shape and cap size before invoking this builder.

export interface ExercisePoolEntry {
  id: string
  name: string
  primaryMuscles: string[]
  equipment: string | null
}

export interface BuildPlanPromptInput {
  profile: unknown
  exercisePool: ExercisePoolEntry[]
  weeks: number
}

export function buildPlanPrompt(input: BuildPlanPromptInput): string {
  const { profile, exercisePool, weeks } = input
  return `You are a strength coach. Build a ${weeks}-week training block for the user below.

HARD RULES (must all be satisfied):
- Only use exercises from the provided pool. Reference them by their exact id in the library_id field.
- The exercise name field must match the pool entry's name verbatim — do not rewrite or paraphrase.
- Never program the same major muscle group on consecutive calendar days. Enforce a minimum of 48 hours between hard sessions targeting the same primary muscle group, and 72 hours between heavy sessions for the same group in a single week.
- MENISCUS: if the profile lists left_meniscus or right_meniscus with severity "avoid", "modify", or "chronic", do NOT include deep squats, deep lunges, pistol squats, or plyometric jumps. Substitute with terminal knee extensions (TKEs), step-ups (low box), partial-ROM leg extensions, Spanish squats, hip thrusts, glute bridges, and hip abduction/adduction work. Keep knee flexion under ~90 degrees on loaded bilateral work.
- LOWER BACK: if lower_back is listed with severity "avoid", "modify", or "chronic", do NOT program loaded spinal flexion (e.g., conventional deadlifts from the floor at max load, weighted sit-ups, jefferson curls). Prefer hip-hinge patterns with moderate load (Romanian deadlifts, kettlebell swings, 45-degree back extensions), plus core anti-extension/anti-rotation work (dead bugs, bird dogs, pallof press).
- SHOULDER: if a shoulder is listed as "avoid" or "modify", skip barbell overhead press and upright rows; prefer landmine press, neutral-grip dumbbell press, and scapular-stability accessories.
- Respect the equipment list strictly. If the user selected only bands_only or bodyweight_only, no barbell, cable, or machine entries. If full_gym is present, the full pool is fair game. If bands_only is the only entry, every exercise must be band-compatible.
- Honor sessions_per_week exactly. A ${weeks}-week block at N sessions/week yields N * ${weeks} total sessions.
- Each session must fit within the user's time_budget_min (include ~2-3 min rest per working set in your estimate).
- RIR RANGES:
  - Beginners (training_age_months < 6): RIR 2-3 across all weeks.
  - Intermediates (6-24 months): RIR 1-3 early, 1-2 mid-block.
  - Experienced (24+ months): RIR 0-2 in later weeks of the block.
- PROGRESSION:
  - Week 1 is moderate volume (a break-in week, not a max-effort week).
  - Add reps first across weeks 2-${weeks - 1}, then load. Keep exercise selection mostly stable so the user can track progress.
  - The LAST week of the block is a deload: ~60% of working-set volume, same intensity/RIR.
- Populate session.focus with the primary muscle groups hit (from the MuscleGroup enum). Titles should be concrete (e.g., "Lower A — hip hinge + glute accessory"), not generic (no "Day 1", "Workout A").
- DAY-OF-WEEK ASSIGNMENT RULES:
  - Every session MUST have a day_of_week field (0=Monday through 6=Sunday).
  - Across a week, place sessions so the SAME major muscle group gets at least
    48h of recovery. 72h for big compounds (squat, deadlift patterns).
  - With N sessions/week, pick N days from Mon-Sun that satisfy the above.
    Example distributions:
      3/wk: 0,2,4 (Mon/Wed/Fri) or 1,3,5 (Tue/Thu/Sat)
      4/wk: 0,1,3,4 (Mon/Tue/Thu/Fri) with Wed + weekend as rest
      5/wk: 0,1,2,4,5 (Mon/Tue/Wed/Fri/Sat)
      6/wk: 0,1,2,3,4,5
  - The pattern should repeat across all weeks unless a deload week
    explicitly shifts it.
  - Assignments must be unique within a week (no two sessions on same day).
- RATIONALE RULES:
  - Every session gets a rationale field: one short sentence (≤280 chars)
    explaining why the session is placed HERE on this day, what muscle group
    it targets, and how it relates to the prior/next session's recovery.
  - Example: "Lower A on Monday. Fresh week, full quad/glute capacity. 48h
    separation from Thursday's Lower B lets the big compounds recover."
- status must be "upcoming" for every generated session.
- Set length_weeks to exactly ${weeks}.
- Generate a UUID-like stable id for the mesocycle and for each session (any unique string is fine; the client does not parse them).
- intended_date is optional; omit it unless you have a specific reason to set one.

USER PROFILE:
${JSON.stringify(profile, null, 2)}

EXERCISE POOL (${exercisePool.length} entries — each has id, name, primaryMuscles, equipment):
${JSON.stringify(exercisePool)}

Return the plan as JSON matching the provided schema. Do not include any prose outside the JSON.`
}
