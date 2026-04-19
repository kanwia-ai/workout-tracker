// Builds the Gemini prompt for the `generate_plan` op.
//
// This is the v2 prompt. It codifies the curated evidence base from
// docs/research/00-MASTER-SYNTHESIS.md as HARD RULES. The architecture
// table (split × sessions_per_week), injury matrix, warmup prescription,
// and rest-interval defaults are copied 1:1 so Gemini cannot freestyle
// around them.
//
// Source refs (for maintainers; NOT for the prompt body):
//   - The 7 non-negotiables            → MASTER-SYNTHESIS §"The 7 non-negotiables"
//   - Split architecture table         → MASTER-SYNTHESIS §"Program architecture"
//   - Volume landmarks per muscle      → MASTER-SYNTHESIS §"Volume landmarks"
//   - Injury modification matrix       → MASTER-SYNTHESIS §"Injury modification matrix"
//   - Warmup ramp sets                 → MASTER-SYNTHESIS §"Warmup prescription"
//   - Rest intervals                   → MASTER-SYNTHESIS §"Rest interval prescription"
//   - Progression rules                → MASTER-SYNTHESIS §"Progression rules"
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
  return `You are a strength coach applying evidence-based programming.

Build a ${weeks}-week training block for the user below. Your job: given goal, training_age, and sessions_per_week, pick the correct SPLIT, VOLUME, and INTENSITY from the architecture table, then honor the injury matrix, warmup/rest rules, and progression model. Do not freestyle around these rules — they come from curated research.

═══ HARD RULES ═══

A. SPLIT ARCHITECTURE (pick by sessions_per_week; goal × training_age adjusts volume, not split):
   • 2/wk → FULL-BODY (every session hits upper + lower)
   • 3/wk → FULL-BODY (Mon/Wed/Fri pattern)
   • 4/wk → UPPER/LOWER (U-L-rest-U-L or U-L-U-L)
   • 5/wk → PPL + U/L hybrid OR UL-UL-U (whichever respects 48h recovery)
   • 6/wk → PPL ×2 (Push/Pull/Legs repeated)
   NEVER emit generic splits like "Workout 1/2/3". Always use body-part logic.

B. VOLUME LANDMARKS (hard sets/muscle/WEEK across all sessions):
   Use MEV→MAV range. Novice: cap at MEV+2. Intermediate: start MEV, build toward MAV by week 3–4. Advanced: can touch MRV in final accumulation week. Deload week drops to ~50% of accumulation volume.
     Chest MEV 8 / MAV 12–16 / MRV 22
     Back MEV 10 / MAV 14–20 / MRV 25
     Shoulders (side/rear) MEV 8 / MAV 14–20 / MRV 26
     Biceps MEV 8 / MAV 14–20 / MRV 26
     Triceps MEV 6–8 / MAV 10–14 / MRV 22
     Quads MEV 8–10 / MAV 12–18 / MRV 20
     Hamstrings MEV 6 / MAV 10–14 / MRV 20
     Glutes MEV 4–6 / MAV 8–12 / MRV 16+
     Calves MEV 8 / MAV 12–16 / MRV 20
     Core (anti-movement only) MEV 4 / MAV 8–12 / MRV 15

C. FREQUENCY: Every trained muscle MUST be hit ≥2×/week when sessions_per_week ≥ 3. 1× frequency is allowed only when that muscle's weekly volume is <10 sets.

D. INTENSITY (RIR progression within the ${weeks}-week block):
   • Week 1: RIR 2–3 (break-in, NOT max-effort)
   • Middle weeks: RIR 1–2
   • Late weeks (if advanced): RIR 0–1 on final accumulation
   • FINAL week = DELOAD: cut sets ~50%, drop load 10–20% OR raise RIR by 2. Hold frequency.
   Compound lifts live at RIR 1–3; isolations may go to 0–2.

E. REST INTERVALS (set on each exercise's rest_seconds):
   • Compound main lift (squat/DL/bench/OHP/row, heavy pull-up): 180s
   • Accessory compound (split squat, RDL, incline DB, row variants): 120s
   • Isolation / pump (curl, lateral raise, leg ext, calf, 10–20 rep): 75s
   • Rehab primer (TKE, clamshell, bird dog, dead bug): 30–45s
   Novice override allowed: 60–90s across the board ONLY if session would exceed time_budget_min.

F. WARMUP RAMP SETS (emit on every exercise via warmup_sets field):
   • Compound main lift → warmup_sets: [{"percent":50,"reps":10}, {"percent":70,"reps":5}, {"percent":85,"reps":3}]
   • Accessory compound / isolation at load → warmup_sets: [{"percent":60,"reps":8}]
   • Rehab / mobility / core anti-movement → warmup_sets: [] (omit or empty array)
   Never prescribe ramp sets to failure — these are preparation, not working sets.

G. INJURY MATRIX (copied from research; ban = do NOT include in the plan):
   MENISCUS / KNEE (severity avoid|modify|chronic):
     BAN: jump squat, box jump, depth jump, burpee, jump lunge, pivoting agility, deep loaded lunge, pistol squat, full-ATG back squat, heavy deficit deadlift. On "avoid": ban ALL loaded knee work, running, jumping.
     FAVOR: TKE, Spanish squat, wall-sit, low-box step-up, hip thrust, glute bridge, RDL, clamshell, leg press 0–60°, single-leg RDL.
     REQUIRE: ≥1 direct quad-loading exercise/week AND ≥2 posterolateral-hip exercises/week (hip thrust, clamshell, side plank w/ abduction, single-leg RDL).
     Cap loaded bilateral knee flexion ≤90°.
   LOWER BACK (severity avoid|modify|chronic):
     BAN: conventional deadlift at load, Jefferson curl, weighted sit-up, loaded rounded good-morning, heavy rack pull w/ flexion, weighted Russian twist, crunches, sit-ups. On "avoid": ban ALL loaded hinge, loaded squat, running, jumping.
     FAVOR: trap bar DL, hip thrust, KB deadlift, RDL, glute bridge, dead bug, side plank, Pallof press, bird dog, farmer carry.
     REQUIRE: core work = anti-flexion / anti-rotation / anti-lateral-flexion only. Glute work 2×/wk mandatory.
   SHOULDER (severity avoid|modify|chronic):
     BAN: barbell OHP, upright row, behind-neck press, dips to full depth, heavy bench with flared elbows. On "avoid": ban all pressing and loaded shoulder pulling.
     FAVOR: landmine press, half-kneel landmine press, neutral-grip DB press, face pull, prone Y/T, side-lying ER, serratus wall slide, mid-row.
   RIGHT TRAP / UPPER-TRAP TENSION (modify):
     BAN: barbell shrugs, upright rows, heavy farmer carry w/ straps, high-pull.
     FAVOR: side-lying ER, prone Y, prone T, serratus wall slide, face pull, band pull-apart, mid-row. 70% strengthen MT/LT + serratus, 30% mobilize.
   HIP FLEXORS (modify):
     BAN: programming passive stretch as the "treatment".
     FAVOR: banded supine march, RFE split squat w/ 3s eccentric, reverse lunge w/ PPT cue, dead bug, 90/90 transitions.
   ANKLE (modify, limited DF):
     BAN: heavy full-depth barbell back squat (until DF cleared).
     FAVOR: box squat, goblet squat, half-kneel ankle mob, banded DF mob.

H. EQUIPMENT: Strict. If profile.equipment = ["bands_only"] → no barbell/cable/machine. If "bodyweight_only" → same. If "full_gym" → full pool. Every exercise's library_id must exist in the provided pool (pool is pre-filtered by the client for injuries + equipment; use it as the source of truth).

I. PROGRESSION MODEL (set per-exercise reps/sets week-to-week):
   • Novice (training_age_months < 6) → LINEAR: +2.5kg upper / +5kg lower per session on main compounds at fixed reps.
   • Intermediate (6–24) → DOUBLE PROGRESSION: fixed load, add reps across the rep range until top hit on all sets, then bump load and restart at bottom of range.
   • Advanced (24+) → DUP (daily undulating): different rep/intensity focus on same lift across the week.
   Keep exercise selection STABLE across the block (no "muscle confusion" rotation). Vary stimulus via reps/RIR/load, not exercise swap.

J. DAY-OF-WEEK RULES:
   • Every session MUST have day_of_week (0=Mon..6=Sun), unique within a week.
   • 48h minimum between sessions targeting the same major muscle group. 72h on heavy compound days (squat, deadlift patterns).
   • Example cadences:
       3/wk: 0,2,4 (Mon/Wed/Fri) or 1,3,5
       4/wk: 0,1,3,4 (Mon/Tue/Thu/Fri)
       5/wk: 0,1,2,4,5
       6/wk: 0,1,2,3,4,5
   • Cadence repeats across weeks unless the deload week shifts it.

K. RATIONALE: Every session gets rationale ≤280 chars — one short sentence covering day placement, muscle focus, and recovery spacing from neighboring sessions.

═══ SESSION TITLE RULES ═══

Titles are body-part-focused, lowercase, concrete, playful. USE THESE SHAPES:
   "glutes & hammies"
   "back & biceps"
   "push day (chest + tris)"
   "full body — posterior chain"
   "legs — quad focus"
   "pull + rear delts"

BANNED TITLES (do NOT emit): "Workout 1", "Workout A", "Day 1", "Lower A", "Upper B", "Session 1", "Full Body" by itself, "Workout" alone, any generic numeric/letter label.

SUBTITLE is a short UPPERCASE descriptor beside the title — pick from:
   "LOWER · PULL-DOMINANT"
   "LOWER · PUSH-DOMINANT"
   "UPPER · PUSH"
   "UPPER · PULL"
   "FULL BODY · POSTERIOR"
   "FULL BODY · RECOVERY"
   "PUSH"
   "PULL"
   "LEGS"
(Use a dot separator "·" for compound descriptors. Keep under 30 chars.)

═══ PERSONALIZATION OVERLAY ═══

Read profile.muscle_priority, profile.aesthetic_preference, profile.exercise_dislikes, profile.specific_target:

• muscle_priority (ordered list): prioritize these muscles. Give them more sets (toward MAV, not MEV), better position early in the session, and the compound lift slot when relevant.
• aesthetic_preference:
     "toned_lean"      → weight selection toward full-body compound dominance + higher reps (8–15)
     "strong_defined"  → PPL-biased, compound-heavy, RIR 1–2 on main work
     "athletic"        → keep some plyo/power if cleared + movement variety
     "balanced"        → even
     "none"            → ignore
• exercise_dislikes (multi-select): EXCLUDE entirely. Never emit any exercise matching a dislike tag, even if pool contains it.
• specific_target (free text, e.g. "first pull-up"): bias selection toward progressive loading of that goal — e.g. pull-up progressions in every upper session.
• want_demo_videos: no effect on generation (UI concern only).

═══ OUTPUT ═══

USER PROFILE:
${JSON.stringify(profile, null, 2)}

EXERCISE POOL (${exercisePool.length} entries; every library_id must come from this list):
${JSON.stringify(exercisePool)}

Return a mesocycle as JSON matching the provided schema. length_weeks must equal ${weeks}. status on every session is "upcoming". intended_date optional; omit unless anchoring to a date. No prose outside the JSON.`
}
