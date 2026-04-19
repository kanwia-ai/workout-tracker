// Prompt-string contract test for the plan-generation v2 prompt.
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
  aesthetic_preference: 'toned_lean',
  exercise_dislikes: ['burpees'],
  specific_target: 'first pull-up',
}

describe('buildPlanPrompt (v2)', () => {
  const prompt = buildPlanPrompt({ profile: PROFILE, exercisePool: POOL, weeks: 6 })

  it('opens with the evidence-based role statement', () => {
    expect(prompt).toMatch(/You are a strength coach applying evidence-based programming/)
  })

  it('includes the 6-week length in the brief', () => {
    expect(prompt).toContain('6-week training block')
    expect(prompt).toContain('length_weeks must equal 6')
  })

  it('codifies the split architecture table by sessions_per_week', () => {
    expect(prompt).toMatch(/2\/wk\s*→\s*FULL-BODY/)
    expect(prompt).toMatch(/3\/wk\s*→\s*FULL-BODY/)
    expect(prompt).toMatch(/4\/wk\s*→\s*UPPER\/LOWER/)
    expect(prompt).toMatch(/5\/wk\s*→\s*PPL/)
    expect(prompt).toMatch(/6\/wk\s*→\s*PPL/)
  })

  it('lists volume landmarks (MEV/MAV/MRV) per muscle', () => {
    expect(prompt).toContain('Chest MEV 8')
    expect(prompt).toContain('Back MEV 10')
    expect(prompt).toContain('Glutes MEV 4')
    expect(prompt).toContain('Quads MEV 8')
    expect(prompt).toContain('Hamstrings MEV 6')
  })

  it('prescribes rest intervals by role (180/120/75s)', () => {
    expect(prompt).toMatch(/Compound main lift[^\n]*180s/)
    expect(prompt).toMatch(/Accessory compound[^\n]*120s/)
    expect(prompt).toMatch(/Isolation[^\n]*75s/)
  })

  it('prescribes warmup ramp sets with explicit percentages', () => {
    // Compound main lift: three ramp sets 50/70/85
    expect(prompt).toContain('"percent":50,"reps":10')
    expect(prompt).toContain('"percent":70,"reps":5')
    expect(prompt).toContain('"percent":85,"reps":3')
    // Accessory: single 60/8 warmup
    expect(prompt).toContain('"percent":60,"reps":8')
    // Rehab: explicitly empty
    expect(prompt).toMatch(/Rehab \/ mobility \/ core[^\n]*\[\]/)
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
    expect(prompt).toMatch(/Week 1:\s*RIR 2–3/)
    expect(prompt).toMatch(/FINAL week = DELOAD/)
  })

  it('bans generic session titles ("Workout 1", "Lower A", etc.)', () => {
    expect(prompt).toMatch(/BANNED TITLES/)
    expect(prompt).toContain('"Workout 1"')
    expect(prompt).toContain('"Lower A"')
    expect(prompt).toContain('"Day 1"')
  })

  it('provides body-part title shapes + lowercase examples', () => {
    expect(prompt).toContain('"glutes & hammies"')
    expect(prompt).toContain('"back & biceps"')
    expect(prompt).toContain('"push day (chest + tris)"')
    expect(prompt).toContain('"full body — posterior chain"')
  })

  it('defines subtitle as an UPPERCASE descriptor with dot separator', () => {
    expect(prompt).toContain('"LOWER · PULL-DOMINANT"')
    expect(prompt).toContain('"UPPER · PUSH"')
    expect(prompt).toContain('"FULL BODY · POSTERIOR"')
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
    expect(prompt).toMatch(/rationale ≤280 chars/)
  })

  it('enforces day_of_week uniqueness + 48h recovery', () => {
    expect(prompt).toMatch(/48h minimum between sessions targeting the same major muscle group/)
    expect(prompt).toMatch(/unique within a week/)
  })

  it('stays under ~300 lines in the emitted prompt', () => {
    // Soft guard: prompt character budget. If this suddenly grows much, re-read
    // MASTER-SYNTHESIS and trim — we don't want the prompt to dwarf the pool.
    expect(prompt.split('\n').length).toBeLessThan(260)
  })
})
