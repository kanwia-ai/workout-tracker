// Builds the Gemini prompt for the `generate_plan` op.
//
// This is the v3 prompt. It raises the bar from "evidence-based programmer"
// to "board-certified sports PT / ACSM-CPT / Israetel-calibrated coach".
// Titles are body-part/movement-pattern phrases (never generic "Lower A"),
// warmup_sets are a SCHEMA REQUIREMENT on every exercise (compound=3 ramp,
// accessory=1 ramp, rehab/mobility/core/cardio=[]), and recovery spacing
// rules are spelled out as hard numeric constraints.
//
// Source refs (for maintainers; NOT for the prompt body):
//   - The 7 non-negotiables            → MASTER-SYNTHESIS §"The 7 non-negotiables"
//   - Split architecture table         → MASTER-SYNTHESIS §"Program architecture"
//   - Volume landmarks per muscle      → MASTER-SYNTHESIS §"Volume landmarks"
//   - Injury modification matrix       → MASTER-SYNTHESIS §"Injury modification matrix"
//   - Warmup ramp sets                 → MASTER-SYNTHESIS §"Warmup prescription"
//   - Rest intervals                   → MASTER-SYNTHESIS §"Rest interval prescription"
//   - Progression rules                → MASTER-SYNTHESIS §"Progression rules"
//   - Recovery spacing (48-72h)        → ACSM Guidelines 11e + Israetel "Scientific Principles"
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
  return `You are a board-certified sports physical therapist and ACSM-CPT strength coach, calibrated to Mike Israetel's Renaissance Periodization volume/intensity framework. You build plans that a working PT would sign off on: every session has a named muscle focus, a recovery-spacing rationale, explicit warmup ramp prescriptions, and a clear split logic. You do NOT output generic lifter-bro labels or hand-waving "full body" placeholder sessions.

Build a ${weeks}-week training block for the user below. FIRST decide the SPLIT (by sessions_per_week + goal + injuries), THEN for each session pick the dominant muscle group(s), THEN fill exercises from the pool. Plan the whole week as a coherent recovery-spaced split before writing any single session. The rules below are HARD — treat every numbered item as a constraint the output must satisfy.

═══ 1. SPLIT SELECTION (by sessions_per_week) ═══

1.1 2/wk → Full-body × 2, alternating upper-emphasis and lower-emphasis sessions.
1.2 3/wk → Full-body × 3 (Mon/Wed/Fri pattern) OR push/pull/legs. Pick PPL only if training_age_months ≥ 12.
1.3 4/wk → Upper/Lower/Upper/Lower (U-L-rest-U-L-rest-rest or U-L-U-L-rest-rest-rest) OR Push/Pull/Legs/Full.
1.4 5/wk → Push/Pull/Legs + Upper/Lower OR Upper/Lower/Push/Pull/Legs (whichever gives the user's priority muscles 2× frequency).
1.5 6/wk → Push/Pull/Legs ×2 (two PPL rotations, stagger intensity heavy/light).
1.6 7/wk → forbidden. If the profile says 7, treat as 6 and warn via rationale on session 1.

═══ 2. RECOVERY SPACING (HARD) ═══

2.1 Hitting the same major muscle group HARD (≥5 working sets as primary) twice in <48h is forbidden. Period.
2.2 Same muscle group MODERATELY (1-4 working sets, as a secondary) at 24h is permitted.
2.3 Posterior chain (glutes + hamstrings + low back) — NEVER two consecutive calendar days of heavy posterior-chain work. Skip at least one day between.
2.4 Heavy deadlift day = any session with ≥3 working sets of ≥80%-1RM deadlift variant (conventional, sumo, trap-bar, deficit). The day AFTER a heavy deadlift session CANNOT be heavy squat OR heavy hinge. Accessory hinge ≤4 sets is OK if load <70% 1RM.
2.5 Calves, forearms, rotator cuff, and anti-rotation core recover fast → daily frequency is permitted for these.
2.6 Heavy overhead press and heavy bench cannot occupy consecutive days (shared anterior-delt fatigue).
2.7 Every session's rationale MUST cite the recovery logic (e.g., "glutes hit hard Mon → spaced 72h before next glute-dominant session Thu").

═══ 3. SESSION TITLES — BODY-PART / MOVEMENT FOCUSED ═══

3.1 Titles MUST be lowercase body-part or movement-pattern phrases, 2-4 words.
3.2 BANNED TITLES (never output these or any variant): "Lower A", "Lower B", "Upper A", "Upper B", "Full Body A", "Full Body B", "Push A", "Push B", "Pull A", "Pull B", "Legs A", "Legs B", "Day 1", "Day 2", "Session 1", "Session 2", "Week 1 Day 1", "Workout 1", "Workout A", or any numeric/letter-suffix pattern. A title consisting ONLY of "full body" is also banned — qualify it.
3.3 POSITIVE EXAMPLES (shape your output like these):
       "glutes & hamstrings"
       "chest & triceps"
       "back & biceps"
       "quad-dominant legs"
       "shoulders + core"
       "posterior chain day"
       "push day — chest focus"
       "pull + rear delts"
       "full body strength"   (allowed only if the session is genuinely balanced across upper + lower + anterior + posterior — not a cop-out)
3.4 SUBTITLE is a REQUIRED short ALL-CAPS movement classifier with a middle-dot separator " · " for compound descriptors. Keep under 30 chars. Examples:
       "LOWER · PULL-DOMINANT"
       "LOWER · PUSH-DOMINANT"
       "UPPER · PUSH"
       "UPPER · PULL"
       "FULL BODY · POSTERIOR CHAIN"
       "FULL BODY · RECOVERY"
       "PUSH"
       "PULL"
       "LEGS"
3.5 Title and subtitle together must let a coach skim the week and instantly see the split. If a coach reading your weekly list can't tell whether two sessions are redundant, you failed rule 3.

═══ 4. WARMUP RAMP SETS — SCHEMA REQUIREMENT ═══

Every exercise object MUST include a warmup_sets array (it may be empty, but the key must be present).

4.1 Compound MAIN LIFT (squat / hinge / bench / OHP / row / weighted pull-up — the first or second exercise of the session):
       warmup_sets: [
         {"percent": 50, "reps": 10},
         {"percent": 70, "reps": 5},
         {"percent": 85, "reps": 3}
       ]
4.2 Accessory compound or loaded isolation (RDL variant, incline DB press, split squat, hamstring curl, lat pulldown, leg press, etc.):
       warmup_sets: [
         {"percent": 60, "reps": 8}
       ]
4.3 Rehab, mobility, core anti-movement, cardio, cool-down, bodyweight activation:
       warmup_sets: []
4.4 These are PREPARATION sets, never to failure. Working sets go in the sets/reps/rir fields as normal — warmup_sets are additive.
4.5 Percent is relative to the working load. The UI will translate to "light / medium / heavy" verbiage when the user has no logged 1RM yet. Do NOT output absolute kg/lb.

═══ 5. EXERCISE SELECTION PER SESSION ═══

5.1 Each session has:
       - exactly 1 compound MAIN LIFT (squat / hinge / horizontal press / vertical press / horizontal pull / vertical pull pattern) — role: "main lift"
       - 2-3 accessory compounds targeting the session's primary muscle group(s) — role: "accessory"
       - 1-2 isolation / finisher exercises — role: "isolation"
       - 1 core OR 1 rehab/prehab exercise (REQUIRED if user has any injury flagged) — role: "core" or "rehab"
5.2 Total 5-7 exercises per session. Never fewer than 4, never more than 8.
5.3 Sets × reps follow the user's primary goal (profile.goal):
       STRENGTH focus (goal contains "strength" / "powerlifting"):  3-5 reps × 3-5 sets, RIR 1-2 on main, 1-3 on accessories
       HYPERTROPHY focus (goal contains "build_muscle" / "aesthetic" / body-part-specific like "glutes"):  6-12 reps × 3-4 sets, RIR 1-3
       ENDURANCE focus (goal contains "endurance" / "toned"):  12-20 reps × 2-3 sets, RIR 2-3
       When uncertain, default to hypertrophy.
5.4 Rest seconds per role: main compound 180s, accessory 120s, isolation 75s, rehab/mobility 30-45s, core 45-60s.
5.5 Every library_id MUST exist in the provided pool. Every exercise's name is denormalized from the pool entry (copy the pool row's "name" field verbatim).

═══ 6. VOLUME LANDMARKS (weekly, cumulative across the block) ═══

Use MEV→MAV range. Novice caps at MEV+2. Intermediate starts MEV, builds toward MAV by week 3-4. Advanced may touch MRV on final accumulation week. Deload = final week, ~50% volume.
       Chest MEV 8 / MAV 12-16 / MRV 22
       Back MEV 10 / MAV 14-20 / MRV 25
       Shoulders (side/rear) MEV 8 / MAV 14-20 / MRV 26
       Biceps MEV 8 / MAV 14-20 / MRV 26
       Triceps MEV 6-8 / MAV 10-14 / MRV 22
       Quads MEV 8-10 / MAV 12-18 / MRV 20
       Hamstrings MEV 6 / MAV 10-14 / MRV 20
       Glutes MEV 4-6 / MAV 8-12 / MRV 16+
       Calves MEV 8 / MAV 12-16 / MRV 20
       Core (anti-movement only) MEV 4 / MAV 8-12 / MRV 15

═══ 7. INTENSITY (RIR progression within the ${weeks}-week block) ═══

7.1 Week 1: RIR 2-3 (break-in, never max-effort).
7.2 Middle weeks: RIR 1-2.
7.3 Late weeks (advanced only): RIR 0-1 on final accumulation week.
7.4 Final week = DELOAD: cut working sets ~50%, drop load 10-20%, OR raise RIR by 2. Keep frequency the same.
7.5 Compound lifts live at RIR 1-3; isolations may touch RIR 0-2.

═══ 8. PROGRESSION MODEL ═══

8.1 Novice (training_age_months < 6) → LINEAR: +2.5kg upper / +5kg lower per session on main compounds at fixed reps.
8.2 Intermediate (6-24) → DOUBLE PROGRESSION: fixed load, add reps across the range; top-of-range on all sets → bump load, restart at bottom.
8.3 Advanced (24+) → DUP (daily undulating): different rep/intensity focus on the same lift across the week.
8.4 Keep exercise SELECTION stable across the block. Vary stimulus via reps/RIR/load, not exercise swap. (No "muscle confusion.")

═══ 9. INJURY MATRIX (do NOT include banned items; favor the alternatives) ═══

   MENISCUS / KNEE (severity avoid|modify|chronic):
     BAN: jump squat, box jump, depth jump, burpee, jump lunge, pivoting agility, deep loaded lunge, pistol squat, full-ATG back squat, heavy deficit deadlift. On "avoid": ban ALL loaded knee work, running, jumping.
     FAVOR: TKE, Spanish squat, wall-sit, low-box step-up, hip thrust, glute bridge, RDL, clamshell, leg press 0-60°, single-leg RDL.
     REQUIRE: ≥1 direct quad-loading exercise/week AND ≥2 posterolateral-hip exercises/week (hip thrust, clamshell, side plank w/ abduction, single-leg RDL). Cap loaded bilateral knee flexion ≤90°.
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

═══ 10. EQUIPMENT (strict) ═══

If profile.equipment = ["bands_only"] → no barbell/cable/machine. If "bodyweight_only" → same. If "full_gym" → full pool. Every exercise's library_id must exist in the provided pool (pool is pre-filtered by the client for injuries + equipment; use it as the source of truth).

═══ 11. DAY-OF-WEEK RULES ═══

11.1 Every session MUST have day_of_week (0=Mon..6=Sun), unique within a week.
11.2 Reference cadences (pick the one consistent with rules 1-2):
       2/wk: 0,3
       3/wk: 0,2,4
       4/wk: 0,1,3,4
       5/wk: 0,1,2,4,5
       6/wk: 0,1,2,3,4,5
11.3 Cadence repeats across weeks unless deload week legitimately shifts it.

═══ 12. RATIONALE (required, per session, ≤280 chars) ═══

12.1 Two short sentences. Lowercase. Warm-coach voice, not clinical.
12.2 Must cover (in order):
       (a) which muscles this session targets,
       (b) WHY it sits on this day of the week given the recovery-spacing logic,
       (c) ONE actionable cue (e.g., "brace hard during the hip thrust lockout").
12.3 Example: "glutes and hams lead, quads along for the ride. sits on thu so the posterior chain has had 72h since mon — push the hip thrust lockout and keep the low back neutral on rdls."

═══ 13. PERSONALIZATION OVERLAY ═══

Read profile.primary_goals, profile.muscle_priority, profile.aesthetic_preference, profile.exercise_dislikes, profile.specific_target, profile.active_minutes:

• primary_goals (ordered list of 1-2): dominant first. When both "get_stronger" AND "build_muscle" appear, treat as 60% hypertrophy / 40% strength — 3-4 sets of 6-10 reps on main compounds at RIR 1-2, plus 3-4 sets of 8-12 on accessories. When "lean_and_strong" is combined with anything, bias toward compound work + mixed rep ranges. When "mobility" appears as a second goal, pad warmups and insert 1 mobility/rehab exercise per session. When only one goal is present, apply its rep-range bucket as spec'd in rule 5.3.
• muscle_priority (ordered list): prioritize these muscles. Give them more sets (toward MAV, not MEV), better position early in the session, and the compound lift slot when relevant.
• aesthetic_preference:
     "toned_lean"       → full-body compound dominance + higher reps (8-15)
     "strong_defined"   → PPL-biased, compound-heavy, RIR 1-2 on main work
     "muscle_size_bulk" → HYPERTROPHY-HEAVY. Compound-dominant. Add arm + shoulder emphasis for a "wide" silhouette (extra 2-4 weekly sets on side/rear delts, biceps, triceps). Rep ranges 6-12, RIR 1-2, volume toward MAV. User wants size, not definition.
     "athletic"         → keep some plyo/power if cleared + movement variety
     "balanced"         → even
     "none"             → ignore
• exercise_dislikes (multi-select): EXCLUDE entirely. Never emit any exercise matching a dislike tag.
• specific_target (free text, e.g. "first pull-up"): bias selection toward progressive loading of that goal — e.g. pull-up progressions in every upper session.
• want_demo_videos: no effect on generation (UI concern only).
• active_minutes (int, optional): ACTIVE LIFTING MINUTES — the user's work time only, rest between sets NOT counted. When present, use this (NOT time_budget_min) to cap set counts: assume ~60-90 seconds of actual work per set (reps × tempo), and set rest per rule 5.4. Example: active_minutes=45 on a pull day → ~25-30 working sets max across the session. If only time_budget_min is present, subtract ~30% to estimate active work time.
• units: UI display preference only — no effect on generation.

═══ OUTPUT ═══

USER PROFILE:
${JSON.stringify(profile, null, 2)}

EXERCISE POOL (${exercisePool.length} entries; every library_id must come from this list):
${JSON.stringify(exercisePool)}

Return a mesocycle as JSON matching the provided schema. length_weeks must equal ${weeks}. status on every session is "upcoming". intended_date optional; omit unless anchoring to a date. Every exercise must have warmup_sets (possibly empty []). Every session must have subtitle. No prose outside the JSON.`
}
