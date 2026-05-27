// Prompt-string contract test for the routine-generation prompt.
//
// v1.1 (2026-05-26 — philosophy pass): per docs/research/02-coaching-philosophy.md,
// the warmup ramp-up count and the cardio block placement are reframed
// from fixed prescriptions to JUDGMENT from the user's goal. The minute
// budget passed by the caller is a STARTING POINT, not a hard ceiling.
// These tests assert the new philosophy sections land in the emitted
// prompt without dropping the practical defaults.

import { describe, it, expect } from 'vitest'
import { buildRoutinePrompt } from './generateRoutine'

const PROFILE = {
  primary_goal: 'build_muscle',
  sessions_per_week: 4,
  training_age_months: 18,
  equipment: ['full_gym'],
  injuries: [],
}

describe('buildRoutinePrompt — warmup (v1.1 philosophy pass)', () => {
  const prompt = buildRoutinePrompt({
    profile: PROFILE,
    sessionFocus: ['glutes', 'hamstrings'],
    kind: 'warmup',
    minutes: 8,
  })

  it('still names the dynamic-mobility core + Behm 2011 anchor', () => {
    expect(prompt).toMatch(/Dynamic mobility for 8 min/)
    expect(prompt).toMatch(/Behm 2011/)
    expect(prompt).toMatch(/static holds pre-strength reduce force output ~5%/)
  })

  it('frames ramp-up count as judgment, not a fixed "2-3 sets" rule', () => {
    expect(prompt).toMatch(/Ramp-up sets — judgment, not a fixed count/)
    // Starting-point still surfaces (2-3 for cold-start).
    expect(prompt).toMatch(/2-3 ramps for a true cold-start/)
    // Adjustment philosophy.
    expect(prompt).toMatch(/preceded by another compound that hit the same primary muscle/)
    expect(prompt).toMatch(/training_age_months ≤ 6/)
    expect(prompt).toMatch(/training_age_months ≥ 36/)
    expect(prompt).toMatch(/"didn't feel it"/)
    // Don't pad when warm.
    expect(prompt).toMatch(/DON'T pad ramps when the body is clearly already warm/)
  })

  it('honors the session focus list in the rendered prompt', () => {
    expect(prompt).toContain('SESSION FOCUS: glutes, hamstrings')
  })
})

describe('buildRoutinePrompt — cardio (v1.1 philosophy pass)', () => {
  const prompt = buildRoutinePrompt({
    profile: PROFILE,
    sessionFocus: ['legs'],
    kind: 'cardio',
    minutes: 10,
  })

  it('frames cardio placement as judgment from goal, not a fixed 10-min stack', () => {
    // Per docs/research/02-coaching-philosophy.md §"Don't confuse the body".
    expect(prompt).toMatch(/Cardio placement — judgment from these principles/)
    expect(prompt).toMatch(/Heavy cardio before lifting puts the body in cardiovascular mode/)
  })

  it('routes by goal: hypertrophy/strength → post; cutting → post; cv-health → pre; bulking → none', () => {
    expect(prompt).toMatch(/hypertrophy \/ strength \/ build_muscle \/ get_stronger[\s\S]*?POST-strength/)
    expect(prompt).toMatch(/fat loss \/ cutting[\s\S]*?post-strength cardio works best/)
    expect(prompt).toMatch(/cardiovascular health[\s\S]*?cardio can lead the session/)
    expect(prompt).toMatch(/bulking \/ mass gain[\s\S]*?don't add cardio/i)
  })

  it('treats the minute budget as a starting point, not a hard prescription', () => {
    expect(prompt).toMatch(/The 10-minute target is a STARTING POINT/)
  })

  it('forbids high-intensity intervals stacked after lifting (concurrent-training interference)', () => {
    expect(prompt).toMatch(/Do NOT program high-intensity intervals when this block is stacked AFTER lifting/)
    expect(prompt).toMatch(/concurrent-training interference/)
  })

  it('does NOT mention the discarded "10-min UX heuristic" stack rule', () => {
    // The old rule was "Keep post-strength cardio brief (~10 min) when
    // stacked into the same session — UX heuristic so the cardio block
    // fits in a typical session". That was a fixed prescription disguised
    // as a UX rule. The minute budget now flows from goal-based judgment.
    expect(prompt).not.toMatch(/UX heuristic so the cardio block fits/)
  })
})

describe('buildRoutinePrompt — cooldown (unchanged in v1.1)', () => {
  const prompt = buildRoutinePrompt({
    profile: PROFILE,
    sessionFocus: ['chest'],
    kind: 'cooldown',
    minutes: 6,
  })

  it('still cites Van Hooren & Peake 2018 (cooldown is psychological, not physiological)', () => {
    expect(prompt).toMatch(/Van Hooren & Peake 2018/)
    expect(prompt).toMatch(/Down-regulate for 6 min/)
    expect(prompt).toMatch(/static stretching/)
  })
})
