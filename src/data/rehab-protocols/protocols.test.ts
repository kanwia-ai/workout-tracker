import { describe, it, expect } from 'vitest'
import { PROTOCOLS, ALL_PROTOCOL_IDS, getProtocol } from './index'
import { ProtocolSchema } from './types'

const EXPECTED_IDS = [
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

describe('rehab-protocols registry', () => {
  it('exports all 11 protocols', () => {
    expect(ALL_PROTOCOL_IDS).toHaveLength(11)
    for (const id of EXPECTED_IDS) {
      expect(PROTOCOLS[id]).toBeDefined()
    }
  })

  it('every protocol validates against the schema', () => {
    for (const id of EXPECTED_IDS) {
      const p = PROTOCOLS[id]
      const parsed = ProtocolSchema.safeParse(p)
      expect(parsed.success, `${id} failed schema: ${!parsed.success ? parsed.error.message : ''}`).toBe(true)
    }
  })

  it('every protocol declares at least one peer-reviewed citation', () => {
    for (const id of EXPECTED_IDS) {
      const p = PROTOCOLS[id]
      expect(p.citations.length, `${id} missing citations`).toBeGreaterThanOrEqual(1)
      // Each citation must have authors, year, and title minimum
      for (const c of p.citations) {
        expect(c.authors.length, `${id} citation missing authors`).toBeGreaterThan(0)
        expect(c.year, `${id} citation missing year`).toBeGreaterThanOrEqual(1980)
        expect(c.title.length, `${id} citation missing title`).toBeGreaterThan(0)
      }
    }
  })

  it('every protocol maps to every SessionType in per_session_type', () => {
    const expectedSessionTypes = [
      'lower_squat_focus',
      'lower_hinge_focus',
      'upper_push',
      'upper_pull',
      'full_body_a',
      'full_body_b',
      'conditioning',
      'rehab_mobility',
    ] as const
    for (const id of EXPECTED_IDS) {
      const p = PROTOCOLS[id]
      for (const st of expectedSessionTypes) {
        expect(
          p.per_session_type[st],
          `${id} missing per_session_type entry for ${st}`,
        ).toBeDefined()
      }
    }
  })

  it('every protocol has user_facing copy (what_this_plan_does + what_to_report + when_to_see_professional)', () => {
    for (const id of EXPECTED_IDS) {
      const p = PROTOCOLS[id]
      expect(p.user_facing.what_this_plan_does.length).toBeGreaterThan(20)
      expect(p.user_facing.what_to_report.length).toBeGreaterThanOrEqual(1)
      expect(p.user_facing.when_to_see_professional.length).toBeGreaterThan(20)
    }
  })

  it('getProtocol returns the matching protocol by id', () => {
    const m = getProtocol('meniscus')
    expect(m).not.toBeNull()
    expect(m!.id).toBe('meniscus')
    expect(m!.title).toMatch(/meniscus/i)
  })
})

describe('clinical rigor — critical protocol content', () => {
  it('lower_back protocol does NOT ban squat/deadlift under chronic severity (avoidance ≠ recovery)', () => {
    const lbp = getProtocol('lower_back')
    expect(lbp!.by_severity.chronic).toBeDefined()
    expect(lbp!.by_severity.chronic!.do_not_ban).toEqual(
      expect.arrayContaining(['deadlift', 'squat', 'rdl']),
    )
  })

  it('meniscus rehab progresses from heel-elevated to back squat across 3 stages', () => {
    const m = getProtocol('meniscus')
    expect(m!.by_severity.rehab).toBeDefined()
    const stages = m!.by_severity.rehab!.stages
    expect(stages).toHaveLength(3)
    // Stage 1: heel-elevated or box squats, NO back squat
    expect(stages[0]!.banned_variants).toEqual(
      expect.arrayContaining(['back_squat']),
    )
    // Stage 3: back squat is ALLOWED (full return)
    expect(stages[2]!.allowed_main_variants).toEqual(
      expect.arrayContaining(['back_squat_moderate_load']),
    )
  })

  it('meniscus wk1-2 warmup includes reverse-incline walking (Kyra\'s friend\'s workout key modality)', () => {
    const m = getProtocol('meniscus')
    const stage1 = m!.by_severity.rehab!.stages[0]!
    const names = stage1.warmup_protocol.map((e) => e.name)
    expect(names).toContain('reverse_incline_walking')
  })

  it('shoulder protocol keeps overhead_press in do_not_ban under chronic severity', () => {
    const s = getProtocol('shoulder')
    expect(s!.by_severity.chronic!.do_not_ban).toContain('overhead_press')
  })

  it('PFP protocol lists hip-focused accessories (glute med is primary target, per Crossley 2016)', () => {
    const pfp = getProtocol('knee_pfp')
    const squatDay = pfp!.per_session_accessories.lower_squat_focus
    expect(squatDay).toBeDefined()
    const patterns = squatDay!.priority.map((p) => p.exercise_pattern)
    expect(
      patterns.some((p) => p.includes('hip_abduction') || p.includes('abduction')),
      'expected hip abduction priority',
    ).toBe(true)
  })

  it('elbow protocol features flexbar eccentric (Tyler 2010 protocol) in rehab + chronic', () => {
    const e = getProtocol('elbow')
    const stages = e!.by_severity.rehab!.stages
    const stage1Variants = stages[0]!.allowed_main_variants.join(' ')
    expect(stage1Variants.toLowerCase()).toContain('flexbar')
    expect(e!.by_severity.chronic!.priority_work.some((w) => w.includes('flexbar'))).toBe(true)
  })

  it('ankle protocol uses heel-elevated squat as compensation (Macrum 2012 rationale)', () => {
    const a = getProtocol('ankle')
    const squatDay = a!.per_session_type.lower_squat_focus
    expect(squatDay.modifications.some((m) => m.includes('heel_elevated'))).toBe(true)
  })

  it('trap protocol keeps overhead/pullup in do_not_ban (upper-cross corrects via overhead work)', () => {
    const t = getProtocol('trap')
    expect(t!.by_severity.chronic!.do_not_ban).toEqual(
      expect.arrayContaining(['overhead_press', 'pullup']),
    )
  })

  it('every protocol\'s chronic block provides a why_not_banned rationale', () => {
    for (const id of EXPECTED_IDS) {
      const p = PROTOCOLS[id]
      if (!p.by_severity.chronic) continue
      expect(p.by_severity.chronic.why_not_banned.length).toBeGreaterThan(30)
    }
  })
})
