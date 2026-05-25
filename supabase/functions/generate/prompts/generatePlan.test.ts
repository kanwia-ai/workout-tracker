// Prompt-string contract test for the plan-generation v3 prompt.
//
// The prompt in generatePlan.ts codifies the curated research from
// docs/research/00-MASTER-SYNTHESIS.md as HARD RULES (architecture table,
// volume landmarks, warmup prescription, injury matrix). This test asserts
// those clauses are present in the emitted prompt string so a future refactor
// doesn't silently drop them.
//
// We stringify with stable inputs and grep — prompts are text; drift is
// visible if these keywords disappear.

import { describe, it, expect } from 'vitest'
import { buildPlanPrompt, type ExercisePoolEntry } from './generatePlan'

const POOL: ExercisePoolEntry[] = [
  { id: 'fedb:hip-thrust', name: 'Barbell Hip Thrust', primaryMuscles: ['glutes'], equipment: 'barbell' },
  { id: 'fedb:rdl', name: 'Romanian Deadlift', primaryMuscles: ['hamstrings', 'glutes'], equipment: 'barbell' },
  { id: 'fedb:back-squat', name: 'Back Squat', primaryMuscles: ['quads', 'glutes'], equipment: 'barbell' },
]

const PROFILE = {
  goal: 'aesthetics',
  sessions_per_week: 4,
  training_age_months: 12,
  equipment: ['full_gym'],
  injuries: [{ part: 'left_meniscus', severity: 'modify' }, { part: 'lower_back', severity: 'modify' }],
  time_budget_min: 60,
  sex: 'female',
  posture_notes: 'desk worker',
  primary_goal: 'build_muscle',
  muscle_priority: ['glutes', 'hamstrings'],
  aesthetic_preference: 'build_muscle',
  exercise_dislikes: ['burpees'],
  specific_target: 'first pull-up',
}

describe('buildPlanPrompt (v3)', () => {
  const prompt = buildPlanPrompt({ profile: PROFILE, exercisePool: POOL, weeks: 6 })

  it('opens with the PT / ACSM-CPT / Israetel role statement', () => {
    expect(prompt).toMatch(/You are a board-certified sports physical therapist and ACSM-CPT strength coach/)
    expect(prompt).toMatch(/Mike Israetel's Renaissance Periodization/)
    expect(prompt).toMatch(/every session has a named muscle focus, a recovery-spacing rationale/)
  })

  it('includes the 6-week length in the brief', () => {
    expect(prompt).toContain('6-week training block')
    expect(prompt).toContain('length_weeks must equal 6')
  })

  it('codifies the split architecture table by sessions_per_week', () => {
    expect(prompt).toMatch(/2\/wk\s*→\s*Full-body × 2/)
    expect(prompt).toMatch(/3\/wk\s*→\s*Full-body × 3/)
    expect(prompt).toMatch(/4\/wk\s*→\s*Upper\/Lower\/Upper\/Lower/)
    expect(prompt).toMatch(/5\/wk\s*→\s*Push\/Pull\/Legs \+ Upper\/Lower/)
    expect(prompt).toMatch(/6\/wk\s*→\s*Push\/Pull\/Legs ×2/)
  })

  it('lists volume landmarks (MEV/MAV/MRV) per muscle', () => {
    expect(prompt).toContain('Chest MEV 8')
    expect(prompt).toContain('Back MEV 10')
    expect(prompt).toContain('Glutes MEV 4')
    expect(prompt).toContain('Quads MEV 8')
    expect(prompt).toContain('Hamstrings MEV 6')
  })

  it('prescribes rest intervals by role (180/120/75s)', () => {
    // v3 condenses the prescription into one line on rule 5.4.
    expect(prompt).toMatch(/main compound 180s/)
    expect(prompt).toMatch(/accessory 120s/)
    expect(prompt).toMatch(/isolation 75s/)
  })

  it('prescribes warmup ramp sets with explicit percentages', () => {
    // Compound main lift: three ramp sets 50/70/85
    expect(prompt).toContain('{"percent": 50, "reps": 10}')
    expect(prompt).toContain('{"percent": 70, "reps": 5}')
    expect(prompt).toContain('{"percent": 85, "reps": 3}')
    // Accessory: single 60/8 warmup
    expect(prompt).toContain('{"percent": 60, "reps": 8}')
    // Rehab/mobility/core/cardio: explicitly empty array
    expect(prompt).toMatch(/Rehab, mobility, core anti-movement, cardio[\s\S]*?warmup_sets: \[\]/)
    // And the schema-requirement framing
    expect(prompt).toMatch(/Every exercise object MUST include a warmup_sets array/)
  })

  it('includes the injury matrix for meniscus, lower back, shoulder, trap, hip-flexor, ankle', () => {
    expect(prompt).toMatch(/MENISCUS \/ KNEE/)
    expect(prompt).toContain('TKE')
    expect(prompt).toContain('Spanish squat')
    expect(prompt).toContain('jump squat')
    expect(prompt).toMatch(/LOWER BACK/)
    expect(prompt).toContain('Jefferson curl')
    expect(prompt).toContain('trap bar')
    expect(prompt).toContain('dead bug')
    expect(prompt).toMatch(/SHOULDER/)
    expect(prompt).toContain('landmine press')
    expect(prompt).toContain('face pull')
    expect(prompt).toMatch(/RIGHT TRAP/)
    expect(prompt).toContain('prone Y')
    expect(prompt).toMatch(/HIP FLEXORS/)
    expect(prompt).toMatch(/ANKLE/)
  })

  it('requires ≥2 posterolateral-hip exercises/week for knee flag', () => {
    expect(prompt).toMatch(/≥2 posterolateral-hip exercises\/week/)
  })

  it('codifies the progression model transitions (LP → DP → DUP)', () => {
    expect(prompt).toMatch(/Novice[\s\S]*?LINEAR/)
    expect(prompt).toMatch(/Intermediate[\s\S]*?DOUBLE PROGRESSION/)
    expect(prompt).toMatch(/Advanced[\s\S]*?DUP/)
  })

  it('declares the RIR progression across the block', () => {
    // v3 uses ASCII hyphen in the RIR range and frames deload as rule 7.4.
    expect(prompt).toMatch(/Week 1:\s*RIR 2-3/)
    expect(prompt).toMatch(/Final week = DELOAD/)
  })

  it('bans generic session titles ("Workout 1", "Lower A", etc.)', () => {
    expect(prompt).toMatch(/BANNED TITLES/)
    expect(prompt).toContain('"Workout 1"')
    expect(prompt).toContain('"Lower A"')
    expect(prompt).toContain('"Day 1"')
  })

  it('provides body-part title shapes + lowercase examples', () => {
    // v3 positive examples — lowercase, body-part / movement-pattern phrases.
    expect(prompt).toContain('"glutes & hamstrings"')
    expect(prompt).toContain('"back & biceps"')
    expect(prompt).toContain('"quad-dominant legs"')
    expect(prompt).toContain('"posterior chain day"')
    expect(prompt).toContain('"push day — chest focus"')
  })

  it('defines subtitle as a REQUIRED UPPERCASE descriptor with middle-dot separator', () => {
    expect(prompt).toMatch(/SUBTITLE is a REQUIRED short ALL-CAPS movement classifier with a middle-dot separator/)
    expect(prompt).toContain('"LOWER · PULL-DOMINANT"')
    expect(prompt).toContain('"UPPER · PUSH"')
    expect(prompt).toContain('"FULL BODY · POSTERIOR CHAIN"')
  })

  it('includes the personalization overlay (muscle_priority, aesthetic_preference, exercise_dislikes, specific_target)', () => {
    expect(prompt).toMatch(/muscle_priority/)
    expect(prompt).toMatch(/aesthetic_preference/)
    expect(prompt).toMatch(/exercise_dislikes[\s\S]*?EXCLUDE entirely/)
    expect(prompt).toMatch(/specific_target/)
  })

  it('embeds the user profile as JSON and the exercise pool', () => {
    expect(prompt).toContain('"primary_goal": "build_muscle"')
    expect(prompt).toContain('"muscle_priority"')
    expect(prompt).toContain('fedb:hip-thrust')
    expect(prompt).toContain('Barbell Hip Thrust')
  })

  it('ends with a clear "return JSON matching schema" instruction', () => {
    expect(prompt).toMatch(/Return a mesocycle as JSON matching the provided schema/)
    expect(prompt).toMatch(/No prose outside the JSON\.$/)
  })

  it('requires rationale ≤280 chars per session', () => {
    // v3 states this in the RATIONALE header.
    expect(prompt).toMatch(/RATIONALE \(required, per session, ≤280 chars\)/)
  })

  it('enforces day_of_week uniqueness + 48h recovery', () => {
    // v3 has an explicit RECOVERY SPACING section (rule 2) and a DAY-OF-WEEK
    // section (rule 11.1) that together cover what v2 said in one clause.
    expect(prompt).toMatch(/same major muscle group HARD[^\n]*twice in <48h is forbidden/)
    expect(prompt).toMatch(/unique within a week/)
  })

  it('stays under ~340 lines in the emitted prompt', () => {
    // Soft guard: prompt character budget. If this suddenly grows much, re-read
    // MASTER-SYNTHESIS and trim — we don't want the prompt to dwarf the pool.
    expect(prompt.split('\n').length).toBeLessThan(340)
  })

  // ── Hallucination guard (rule 0) ─────────────────────────────────────────
  it('always emits the "name must match pool entry exactly" hallucination guard', () => {
    expect(prompt).toMatch(/EXERCISE POOL IS THE SOURCE OF TRUTH/)
    expect(prompt).toMatch(/select exercises ONLY from the provided EXERCISE POOL/)
    expect(prompt).toMatch(/must EXACTLY match the `name` of an entry in the pool with the same `library_id`/)
    expect(prompt).toMatch(/OMIT that slot — never invent/)
    // Positive + negative example
    expect(prompt).toMatch(/GOOD:.*Barbell Bench Press/)
    expect(prompt).toMatch(/BAD:.*Lying Leg Pullover/)
    // Loud restatement near the OUTPUT block
    expect(prompt).toMatch(/HALLUCINATION CHECK BEFORE EMITTING/)
    expect(prompt).toMatch(/character-identical to a name in the pool/)
  })

  // ── Posture overlay (rule 13) ────────────────────────────────────────────
  it('with posture_notes mentioning desk work, requires upper-trap/neck + hip-flexor protective warmups', () => {
    const p = buildPlanPrompt({
      profile: { ...PROFILE, posture_notes: 'I sit at a desk 12 hours/day' },
      exercisePool: POOL,
      weeks: 6,
    })
    expect(p).toMatch(/posture_notes/)
    expect(p).toMatch(/contains "desk"/)
    expect(p).toMatch(/UPPER-body day, REQUIRE one upper-trap \/ neck release/)
    expect(p).toMatch(/LOWER-body day, REQUIRE one hip-flexor opener/)
  })

  // ── Weight overlay (rule 13) ─────────────────────────────────────────────
  it('with weight_kg=130, contains the high-body-mass low-impact substitution instruction', () => {
    const p = buildPlanPrompt({
      profile: { ...PROFILE, weight_kg: 130 },
      exercisePool: POOL,
      weeks: 6,
    })
    expect(p).toMatch(/weight_kg/)
    expect(p).toMatch(/> 120 kg/)
    expect(p).toMatch(/substitute every plyometric, deep-squat, or high-impact movement with a low-impact pool equivalent/)
    expect(p).toMatch(/Do NOT exclude lifts entirely/)
  })

  it('weight_kg overlay does NOT cap reps on standing single-leg work (no research basis)', () => {
    const p = buildPlanPrompt({
      profile: { ...PROFILE, weight_kg: 130 },
      exercisePool: POOL,
      weeks: 6,
    })
    // The old "cap reps on standing single-leg work at 8 (joint stress)" rule
    // had no research backing and was removed. Joint stress is gated via the
    // injury flags, not bodyweight alone.
    expect(p).not.toMatch(/single-leg work at 8/)
    expect(p).not.toMatch(/Cap reps on standing single-leg/)
  })

  // ── RIR 0 hard ban (section 7) ───────────────────────────────────────────
  it('forbids RIR 0 anywhere in the program (Helms 2018 / RP consensus)', () => {
    // Advanced "late weeks" cap RIR at 1, not 0. True failure is a
    // user-initiated peaking decision, not a planner-scheduled prescription.
    expect(prompt).toMatch(/NEVER prescribe RIR 0 anywhere in the program/)
    expect(prompt).not.toMatch(/RIR 0-1 on final accumulation week/)
    expect(prompt).toMatch(/training_age_months ≥ 36/)
    expect(prompt).toMatch(/LAST set of compound MAIN LIFTS may be prescribed at RIR 1/)
    expect(prompt).toMatch(/isolations may touch RIR 1-2 \(never 0\)/)
  })

  // ── Age overlay (rule 13) ────────────────────────────────────────────────
  it('with age=65, drops the blanket RIR cap (Fragala 2019) and keeps low-impact substitution', () => {
    const p = buildPlanPrompt({
      profile: { ...PROFILE, age: 65 },
      exercisePool: POOL,
      weeks: 6,
    })
    expect(p).toMatch(/age \(int, optional\)/)
    // Per Fragala 2019 (NSCA Position Statement on Resistance Training for
    // Older Adults), healthy 60+ trainees tolerate near-failure (RIR 1-2)
    // for hypertrophy. The blanket "cap RIR at 2 on ALL sets" rule was a
    // stereotype, not research — gone.
    expect(p).not.toMatch(/60\+\s*→\s*cap RIR at 2 on ALL sets/)
    expect(p).toMatch(/60\+\s*→\s*same RIR prescription as the general population/)
    expect(p).toMatch(/Fragala 2019/)
    expect(p).toMatch(/training_age_months and injury history as the actual gating signals/)
    // The low-impact substitution does remain for 60+.
    expect(p).toMatch(/replace plyometric or jumping movements with a low-impact equivalent/)
  })

  // ── Deadline awareness (rule 13 / specific_target) ───────────────────────
  it('with specific_target containing a deadline, contains deadline-awareness language and a today date', () => {
    const p = buildPlanPrompt({
      profile: { ...PROFILE, specific_target: 'lose 1 dress size by end of May' },
      exercisePool: POOL,
      weeks: 6,
      today: '2026-05-09',
    })
    expect(p).toMatch(/DEADLINE AWARENESS/)
    expect(p).toContain("today's date is 2026-05-09")
    expect(p).toMatch(/≥ 12 weeks/)
    expect(p).toMatch(/6-12 weeks/)
    expect(p).toMatch(/2-6 weeks/)
    expect(p).toMatch(/< 2 weeks/)
    expect(p).toMatch(/Body-composition targets.*are weight\/shape goals, not strength goals/)
  })

  it('falls back to runtime current date when `today` is omitted', () => {
    const p = buildPlanPrompt({ profile: PROFILE, exercisePool: POOL, weeks: 6 })
    // ISO date pattern YYYY-MM-DD appears after "today's date is "
    expect(p).toMatch(/today's date is \d{4}-\d{2}-\d{2}/)
  })

  // ── Height (reserved) ────────────────────────────────────────────────────
  it('mentions height_cm as reserved / not currently active', () => {
    expect(prompt).toMatch(/height_cm.*NOT currently active/)
  })
})
