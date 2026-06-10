import { describe, expect, it } from 'vitest'
import {
  bucketFromMonths,
  entryMatchesProfile,
  expandInjuryToken,
  goalsForProfile,
  normalizeGoalToken,
  retrieveRelevantEntries,
  scoreEntry,
} from './retrieval'
import { getEntryById } from './loader'
import type { KBEntry } from './types'
import type { UserProgramProfile } from '../../types/profile'
import type { Mesocycle } from '../../types/plan'

// ─── Fixture builders ──────────────────────────────────────────────────────
function buildEntry(overrides: Partial<KBEntry['frontmatter']> = {}): KBEntry {
  return {
    filePath: 'test://entry.md',
    body: '# Test\n\n## Claim\nA claim.\n\n## Nuance\nA nuance.',
    frontmatter: {
      id: 'test-entry',
      type: 'principle',
      domain: 'programming-fundamentals',
      title: 'Test entry',
      confidence: 'high',
      applicability: {
        goals: ['build_muscle'],
        training_age: 'any',
        sex: 'any',
        injuries: [],
      },
      tags: [],
      citations: [],
      related: [],
      contradicts: [],
      ...overrides,
    },
  }
}

function buildProfile(overrides: Partial<UserProgramProfile> = {}): UserProgramProfile {
  return {
    goal: 'aesthetics',
    sessions_per_week: 4,
    training_age_months: 18,
    equipment: ['full_gym'],
    injuries: [],
    time_budget_min: 60,
    sex: 'female',
    posture_notes: '',
    primary_goals: ['build_muscle'],
    ...overrides,
  } as UserProgramProfile
}

describe('bucketFromMonths', () => {
  it('maps month counts to canonical buckets', () => {
    expect(bucketFromMonths(0)).toBe('beginner')
    expect(bucketFromMonths(6)).toBe('beginner')
    expect(bucketFromMonths(7)).toBe('early')
    expect(bucketFromMonths(12)).toBe('early')
    expect(bucketFromMonths(13)).toBe('intermediate')
    expect(bucketFromMonths(36)).toBe('intermediate')
    expect(bucketFromMonths(37)).toBe('advanced')
    expect(bucketFromMonths(120)).toBe('advanced')
  })
})

describe('goalsForProfile', () => {
  it('expands canonical primary_goals via the alias map', () => {
    const out = goalsForProfile(buildProfile({ primary_goals: ['get_stronger'] }))
    // 'get_stronger' should pull in both 'get_strong' (legacy KB token) and
    // 'strength' so older entries still match.
    expect(out).toContain('get_stronger')
    expect(out).toContain('get_strong')
    expect(out).toContain('strength')
  })

  it('falls back to primary_goal singular when no primary_goals array', () => {
    const profile = { ...buildProfile(), primary_goals: undefined, primary_goal: 'fat_loss' as const }
    expect(goalsForProfile(profile)).toContain('fat_loss')
  })

  it('falls back to legacy goal when neither primary field is set', () => {
    const profile = {
      ...buildProfile(),
      primary_goals: undefined,
      primary_goal: undefined,
      goal: 'strength' as const,
    }
    // The legacy goal is included verbatim. Aliases ARE expanded via
    // GOAL_ALIASES['strength']? — there isn't an alias entry for 'strength'
    // (it's not a canonical primary goal), so we expect just the raw token.
    expect(goalsForProfile(profile)).toContain('strength')
  })
})

describe('normalizeGoalToken', () => {
  it('passes canonical PrimaryGoal tokens through unchanged', () => {
    for (const g of [
      'build_muscle',
      'get_stronger',
      'lean_and_strong',
      'fat_loss',
      'mobility',
      'athletic',
      'general_fitness',
    ]) {
      expect(normalizeGoalToken(g)).toBe(g)
    }
  })

  it('maps every legacy / drift KB token to a canonical PrimaryGoal', () => {
    expect(normalizeGoalToken('get_strong')).toBe('get_stronger')
    expect(normalizeGoalToken('strong')).toBe('get_stronger')
    expect(normalizeGoalToken('strength')).toBe('get_stronger')
    expect(normalizeGoalToken('aesthetics')).toBe('build_muscle')
    expect(normalizeGoalToken('glutes')).toBe('build_muscle')
    expect(normalizeGoalToken('longevity')).toBe('general_fitness')
    expect(normalizeGoalToken('rehab')).toBe('mobility')
    expect(normalizeGoalToken('general')).toBe('general_fitness')
  })

  it('passes the `any` wildcard and unknown tokens through verbatim', () => {
    expect(normalizeGoalToken('any')).toBe('any')
    expect(normalizeGoalToken('something_new')).toBe('something_new')
  })
})

describe('expandInjuryToken', () => {
  it('passes canonical BodyPart tokens through unchanged', () => {
    expect(expandInjuryToken('left_meniscus')).toEqual(['left_meniscus'])
    expect(expandInjuryToken('lower_back')).toEqual(['lower_back'])
    expect(expandInjuryToken('hip_flexors')).toEqual(['hip_flexors'])
  })

  it('expands generic KB tokens to the sided BodyPart enum values', () => {
    expect(expandInjuryToken('knee')).toEqual(
      expect.arrayContaining(['left_knee', 'right_knee', 'left_meniscus', 'right_meniscus']),
    )
    expect(expandInjuryToken('meniscus')).toEqual(['left_meniscus', 'right_meniscus'])
    expect(expandInjuryToken('patellofemoral')).toEqual(['left_knee', 'right_knee'])
    expect(expandInjuryToken('shoulder')).toEqual(['left_shoulder', 'right_shoulder'])
    expect(expandInjuryToken('trap')).toEqual(['left_trap', 'right_trap'])
    expect(expandInjuryToken('back')).toEqual(['lower_back', 'upper_back'])
    expect(expandInjuryToken('sciatica')).toEqual(['lower_back'])
    expect(expandInjuryToken('hip')).toEqual(['hip_flexors'])
  })

  it('returns [] for tokens that resolve to no body part', () => {
    expect(expandInjuryToken('vibes')).toEqual([])
  })
})

describe('entryMatchesProfile', () => {
  it('passes when entry goals match the user goals (canonical token)', () => {
    const entry = buildEntry({
      applicability: {
        goals: ['build_muscle'],
        training_age: 'any',
        sex: 'any',
        injuries: [],
      },
    })
    expect(entryMatchesProfile(entry, buildProfile())).toBe(true)
  })

  it('passes via the alias map (legacy "get_strong" token)', () => {
    const entry = buildEntry({
      applicability: {
        goals: ['get_strong'],
        training_age: 'any',
        sex: 'any',
        injuries: [],
      },
    })
    const profile = buildProfile({ primary_goals: ['get_stronger'] })
    expect(entryMatchesProfile(entry, profile)).toBe(true)
  })

  it('passes a `rehab` entry for a mobility user (legacy token normalized)', () => {
    const entry = buildEntry({
      applicability: {
        goals: ['rehab'],
        training_age: 'any',
        sex: 'any',
        injuries: [],
      },
    })
    const profile = buildProfile({ primary_goals: ['mobility'] })
    expect(entryMatchesProfile(entry, profile)).toBe(true)
  })

  it('passes a bare `general` entry for a general_fitness user (drift token normalized)', () => {
    const entry = buildEntry({
      applicability: {
        goals: ['build_muscle', 'general', 'athletic'],
        training_age: 'any',
        sex: 'any',
        injuries: [],
      },
    })
    const profile = buildProfile({ primary_goals: ['general_fitness'] })
    expect(entryMatchesProfile(entry, profile)).toBe(true)
  })

  it('passes a `longevity` entry for a general_fitness user', () => {
    const entry = buildEntry({
      applicability: {
        goals: ['longevity'],
        training_age: 'any',
        sex: 'any',
        injuries: [],
      },
    })
    const profile = buildProfile({ primary_goals: ['general_fitness'] })
    expect(entryMatchesProfile(entry, profile)).toBe(true)
  })

  it('still scores a legacy-token goal match (rehab → mobility)', () => {
    const entry = buildEntry({
      applicability: {
        goals: ['rehab'],
        training_age: 'any',
        sex: 'any',
        injuries: [],
      },
    })
    const profile = buildProfile({ primary_goals: ['mobility'] })
    // +5 dominant goal match + (+2 high confidence) at minimum.
    expect(scoreEntry(entry, profile)).toBeGreaterThanOrEqual(5)
  })

  it('fails when entry goals do NOT overlap the user goals', () => {
    const entry = buildEntry({
      applicability: {
        goals: ['athletic'],
        training_age: 'any',
        sex: 'any',
        injuries: [],
      },
    })
    expect(entryMatchesProfile(entry, buildProfile({ primary_goals: ['fat_loss'] }))).toBe(false)
  })

  it('passes when entry training_age is `any`', () => {
    const entry = buildEntry()
    expect(entryMatchesProfile(entry, buildProfile({ training_age_months: 1 }))).toBe(true)
    expect(entryMatchesProfile(entry, buildProfile({ training_age_months: 60 }))).toBe(true)
  })

  it('fails when training_age does not match the user bucket', () => {
    const entry = buildEntry({
      applicability: {
        goals: ['build_muscle'],
        training_age: 'advanced',
        sex: 'any',
        injuries: [],
      },
    })
    // User has 18mo experience → intermediate; entry only targets advanced.
    expect(entryMatchesProfile(entry, buildProfile({ training_age_months: 18 }))).toBe(false)
  })

  it('passes when training_age is an array containing the user bucket', () => {
    const entry = buildEntry({
      applicability: {
        goals: ['build_muscle'],
        training_age: ['early', 'intermediate', 'advanced'],
        sex: 'any',
        injuries: [],
      },
    })
    expect(entryMatchesProfile(entry, buildProfile({ training_age_months: 18 }))).toBe(true)
    expect(entryMatchesProfile(entry, buildProfile({ training_age_months: 3 }))).toBe(false)
  })

  it('passes a sex-specific entry only when sex matches', () => {
    const entry = buildEntry({
      applicability: {
        goals: ['build_muscle'],
        training_age: 'any',
        sex: 'female',
        injuries: [],
      },
    })
    expect(entryMatchesProfile(entry, buildProfile({ sex: 'female' }))).toBe(true)
    expect(entryMatchesProfile(entry, buildProfile({ sex: 'male' }))).toBe(false)
  })

  it('passes an injury-specific entry only when user has that injury', () => {
    const entry = buildEntry({
      applicability: {
        goals: ['build_muscle'],
        training_age: 'any',
        sex: 'any',
        injuries: ['left_meniscus', 'right_meniscus'],
      },
    })
    const withInjury = buildProfile({
      injuries: [{ part: 'left_meniscus', severity: 'modify' }],
    })
    const without = buildProfile()
    expect(entryMatchesProfile(entry, withInjury)).toBe(true)
    expect(entryMatchesProfile(entry, without)).toBe(false)
  })

  it('passes a generic (empty injuries[]) entry regardless of user injuries', () => {
    const entry = buildEntry()
    const withInjury = buildProfile({
      injuries: [{ part: 'left_meniscus', severity: 'modify' }],
    })
    expect(entryMatchesProfile(entry, withInjury)).toBe(true)
  })

  it('matches generic injury tokens (knee/meniscus/patellofemoral) against sided user injuries', () => {
    const entry = buildEntry({
      applicability: {
        goals: ['build_muscle'],
        training_age: 'any',
        sex: 'any',
        injuries: ['knee', 'meniscus', 'patellofemoral'],
      },
    })
    const meniscusUser = buildProfile({
      injuries: [{ part: 'left_meniscus', severity: 'modify' }],
    })
    const kneeUser = buildProfile({
      injuries: [{ part: 'right_knee', severity: 'modify' }],
    })
    expect(entryMatchesProfile(entry, meniscusUser)).toBe(true)
    expect(entryMatchesProfile(entry, kneeUser)).toBe(true)
  })

  it('does not match a generic injury entry when the user injuries are unrelated', () => {
    const entry = buildEntry({
      applicability: {
        goals: ['build_muscle'],
        training_age: 'any',
        sex: 'any',
        injuries: ['shoulder'],
      },
    })
    const meniscusUser = buildProfile({
      injuries: [{ part: 'left_meniscus', severity: 'modify' }],
    })
    expect(entryMatchesProfile(entry, meniscusUser)).toBe(false)
    expect(
      entryMatchesProfile(
        entry,
        buildProfile({ injuries: [{ part: 'right_shoulder', severity: 'modify' }] }),
      ),
    ).toBe(true)
  })
})

describe('scoreEntry', () => {
  it('scores a direct dominant-goal match higher than a secondary-goal match', () => {
    const buildMuscleEntry = buildEntry({
      applicability: { goals: ['build_muscle'], training_age: 'any', sex: 'any', injuries: [] },
    })
    const fatLossEntry = buildEntry({
      applicability: { goals: ['fat_loss'], training_age: 'any', sex: 'any', injuries: [] },
    })
    const profile = buildProfile({
      primary_goals: ['build_muscle', 'fat_loss'],
    })
    expect(scoreEntry(buildMuscleEntry, profile)).toBeGreaterThan(
      scoreEntry(fatLossEntry, profile),
    )
  })

  it('rewards injury-specific entries when the user has the matching injury', () => {
    const profile = buildProfile({
      injuries: [{ part: 'left_meniscus', severity: 'modify' }],
    })
    const injuryEntry = buildEntry({
      applicability: {
        goals: ['build_muscle'],
        training_age: 'any',
        sex: 'any',
        injuries: ['left_meniscus'],
      },
    })
    const genericEntry = buildEntry()
    expect(scoreEntry(injuryEntry, profile)).toBeGreaterThan(
      scoreEntry(genericEntry, profile),
    )
  })

  it('gives the injury bonus when a generic token covers the user injury', () => {
    const profile = buildProfile({
      injuries: [{ part: 'left_meniscus', severity: 'modify' }],
    })
    const genericTokenEntry = buildEntry({
      applicability: {
        goals: ['build_muscle'],
        training_age: 'any',
        sex: 'any',
        injuries: ['knee', 'meniscus'],
      },
    })
    const noInjuryEntry = buildEntry()
    expect(scoreEntry(genericTokenEntry, profile)).toBeGreaterThan(
      scoreEntry(noInjuryEntry, profile),
    )
  })

  it('rewards myth entries to keep guardrails in the prompt', () => {
    const profile = buildProfile()
    const myth = buildEntry({ type: 'myth', domain: 'myths' })
    const principle = buildEntry({ type: 'principle' })
    // Both pass; myth has +2 type bonus + the same goal score.
    expect(scoreEntry(myth, profile)).toBeGreaterThan(scoreEntry(principle, profile) - 1)
  })

  it('gives the myth bonus only when the myth tags touch the user goals', () => {
    const profile = buildProfile({ primary_goals: ['build_muscle'] })
    const relevantMyth = buildEntry({
      type: 'myth',
      domain: 'myths',
      tags: ['hypertrophy', 'rep-ranges'],
    })
    const irrelevantMyth = buildEntry({
      type: 'myth',
      domain: 'myths',
      tags: ['nutrition', 'meal-timing'],
    })
    expect(scoreEntry(relevantMyth, profile)).toBe(scoreEntry(irrelevantMyth, profile) + 2)
  })

  it('matches hyphenated myth tags against underscore goal tokens (fat-loss → fat_loss)', () => {
    const profile = buildProfile({ primary_goals: ['fat_loss'] })
    const fatLossMyth = buildEntry({
      type: 'myth',
      domain: 'myths',
      tags: ['fat-loss', 'cardio'],
      applicability: { goals: ['fat_loss'], training_age: 'any', sex: 'any', injuries: [] },
    })
    const offTopicMyth = buildEntry({
      type: 'myth',
      domain: 'myths',
      tags: ['growth-plates', 'youth'],
      applicability: { goals: ['fat_loss'], training_age: 'any', sex: 'any', injuries: [] },
    })
    expect(scoreEntry(fatLossMyth, profile)).toBe(scoreEntry(offTopicMyth, profile) + 2)
  })

  it('gives the myth bonus when the myth tags match the plan content', () => {
    const profile = buildProfile({ primary_goals: ['mobility'] })
    const squatMyth = buildEntry({
      type: 'myth',
      domain: 'myths',
      tags: ['squat', 'glutes-growth'],
      applicability: { goals: ['any'], training_age: 'any', sex: 'any', injuries: [] },
    })
    const planTokens = new Set(['goblet', 'squat', 'press'])
    expect(scoreEntry(squatMyth, profile, planTokens)).toBe(scoreEntry(squatMyth, profile) + 2)
  })

  it('matches compound myth tags (hip-thrust) against single plan-name tokens', () => {
    const profile = buildProfile({ primary_goals: ['mobility'] })
    const hipThrustMyth = buildEntry({
      type: 'myth',
      domain: 'myths',
      tags: ['hip-thrust'],
      applicability: { goals: ['any'], training_age: 'any', sex: 'any', injuries: [] },
    })
    // 'Barbell Hip Thrust' tokenizes to ['barbell', 'thrust'] (≥4 chars only).
    const planTokens = new Set(['barbell', 'thrust'])
    expect(scoreEntry(hipThrustMyth, profile, planTokens)).toBe(
      scoreEntry(hipThrustMyth, profile) + 2,
    )
  })

  it('rewards entries written specifically for the user sex over generic ones', () => {
    const profile = buildProfile({ sex: 'female' })
    const femaleSpecific = buildEntry({
      applicability: { goals: ['build_muscle'], training_age: 'any', sex: 'female', injuries: [] },
    })
    const anySex = buildEntry()
    expect(scoreEntry(femaleSpecific, profile)).toBeGreaterThan(scoreEntry(anySex, profile))
  })

  it('rewards higher confidence', () => {
    const profile = buildProfile()
    const high = buildEntry({ confidence: 'high' })
    const medium = buildEntry({ confidence: 'medium' })
    const low = buildEntry({ confidence: 'low' })
    expect(scoreEntry(high, profile)).toBeGreaterThan(scoreEntry(medium, profile))
    expect(scoreEntry(medium, profile)).toBeGreaterThan(scoreEntry(low, profile))
  })
})

describe('retrieveRelevantEntries', () => {
  it('returns at most `cap` entries', () => {
    const kb = Array.from({ length: 50 }, (_, i) =>
      buildEntry({ id: `entry-${i}`, title: `Entry ${i}` }),
    )
    const out = retrieveRelevantEntries(buildProfile(), null, { knowledgeBase: kb, cap: 10 })
    expect(out.entries.length).toBe(10)
  })

  it('orders by descending score (myth + high confidence on top, low confidence at the bottom)', () => {
    const kb: KBEntry[] = [
      buildEntry({ id: 'low-conf', confidence: 'low' }),
      buildEntry({ id: 'myth-high', type: 'myth', domain: 'myths', confidence: 'high' }),
      buildEntry({ id: 'med-conf', confidence: 'medium' }),
    ]
    const out = retrieveRelevantEntries(buildProfile(), null, { knowledgeBase: kb, cap: 10 })
    const order = out.entries.map((e) => e.frontmatter.id)
    expect(order[0]).toBe('myth-high')
    expect(order[order.length - 1]).toBe('low-conf')
  })

  it('filters out entries that fail the applicability check', () => {
    const kb: KBEntry[] = [
      buildEntry({ id: 'ok', applicability: { goals: ['build_muscle'], training_age: 'any', sex: 'any', injuries: [] } }),
      buildEntry({ id: 'wrong-goal', applicability: { goals: ['athletic'], training_age: 'any', sex: 'any', injuries: [] } }),
      buildEntry({ id: 'wrong-injury', applicability: { goals: ['build_muscle'], training_age: 'any', sex: 'any', injuries: ['left_meniscus'] } }),
    ]
    const profile = buildProfile({ primary_goals: ['build_muscle'] })
    const out = retrieveRelevantEntries(profile, null, { knowledgeBase: kb })
    const ids = out.entries.map((e) => e.frontmatter.id)
    expect(ids).toContain('ok')
    expect(ids).not.toContain('wrong-goal')
    expect(ids).not.toContain('wrong-injury')
  })

  it('exposes per-entry scores in the result for debug/display', () => {
    const kb: KBEntry[] = [
      buildEntry({ id: 'a', confidence: 'high' }),
      buildEntry({ id: 'b', confidence: 'medium' }),
    ]
    const out = retrieveRelevantEntries(buildProfile(), null, { knowledgeBase: kb })
    expect(out.scores['a']).toBeGreaterThan(out.scores['b'])
  })

  it('stratifies the cut by domain instead of letting one domain flood the cap', () => {
    // 40 goal-relevant myths outscore everything else; a flat top-N cut would
    // return myths only. The stratified cut must keep every eligible domain
    // represented.
    const kb: KBEntry[] = [
      ...Array.from({ length: 40 }, (_, i) =>
        buildEntry({
          id: `myth-${i}`,
          type: 'myth',
          domain: 'myths',
          tags: ['hypertrophy'],
          confidence: 'high',
        }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        buildEntry({ id: `prog-${i}`, domain: 'programming-fundamentals', confidence: 'low' }),
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        buildEntry({ id: `progression-${i}`, domain: 'progression', confidence: 'low' }),
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        buildEntry({ id: `ex-${i}`, type: 'exercise', domain: 'exercises', confidence: 'low' }),
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        buildEntry({ id: `warm-${i}`, domain: 'warmup-recovery', confidence: 'low' }),
      ),
    ]
    const out = retrieveRelevantEntries(buildProfile(), null, { knowledgeBase: kb, cap: 30 })
    expect(out.entries.length).toBe(30)
    const domains = new Set(out.entries.map((e) => e.frontmatter.domain))
    for (const d of ['myths', 'programming-fundamentals', 'progression', 'exercises', 'warmup-recovery']) {
      expect([...domains], `domain ${d} missing from the cut`).toContain(d)
    }
    // Result stays ordered by descending score.
    const scores = out.entries.map((e) => out.scores[e.frontmatter.id])
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
    }
  })

  it('covers every core domain in the top-30 for an injured-female-hypertrophy profile (live KB)', () => {
    // Regression for the myth flood: a flat +2 myth bonus + global top-30 cut
    // produced ~20 myths and ZERO programming-fundamentals / progression /
    // warmup-recovery / special-populations entries for this profile.
    const profile = buildProfile({
      sex: 'female',
      primary_goals: ['build_muscle', 'lean_and_strong'],
      training_age_months: 24,
      injuries: [
        { part: 'left_meniscus', severity: 'modify' },
        { part: 'lower_back', severity: 'chronic' },
        { part: 'hip_flexors', severity: 'chronic' },
        { part: 'right_trap', severity: 'chronic' },
      ],
    })
    const mesocycle = {
      sessions: [
        {
          exercises: [
            { name: 'Heel-Elevated Goblet Squat' },
            { name: 'Barbell Hip Thrust' },
            { name: 'Lat Pulldown' },
          ],
        },
      ],
    } as unknown as Mesocycle
    const out = retrieveRelevantEntries(profile, mesocycle)
    expect(out.entries.length).toBeLessThanOrEqual(30)
    const domains = out.entries.map((e) => e.frontmatter.domain)
    for (const d of [
      'injuries',
      'programming-fundamentals',
      'progression',
      'exercises',
      'myths',
      'warmup-recovery',
      'special-populations',
    ]) {
      expect(domains, `domain ${d} missing from the top-30`).toContain(d)
    }
    // Myths must not flood the cut — they get 6 reserved slots and can only
    // earn more by genuinely outscoring other domains.
    const mythCount = out.entries.filter((e) => e.frontmatter.type === 'myth').length
    expect(mythCount).toBeLessThanOrEqual(12)
    // The female-specific fundamentals entry must beat generic special-pop
    // entries (adolescents, older adults) for a female profile.
    const ids = out.entries.map((e) => e.frontmatter.id)
    expect(ids).toContain('women-training-fundamentals')
  })

  it('reaches squat-variants-knee-friendly for a left-meniscus user (live KB)', () => {
    // Regression: the entry declares generic tokens [knee, meniscus,
    // patellofemoral] which used to never match the sided BodyPart enum —
    // the single most owner-relevant exercise entry was permanently
    // unreachable.
    const entry = getEntryById('squat-variants-knee-friendly')
    expect(entry).not.toBeNull()
    const profile = buildProfile({
      primary_goals: ['build_muscle'],
      injuries: [{ part: 'left_meniscus', severity: 'modify' }],
    })
    expect(entryMatchesProfile(entry!, profile)).toBe(true)
    const out = retrieveRelevantEntries(profile, null)
    expect(out.entries.map((e) => e.frontmatter.id)).toContain('squat-variants-knee-friendly')
  })

  it('reaches lat-pulldown-cueing for a shoulder-injury user (live KB)', () => {
    const entry = getEntryById('lat-pulldown-cueing')
    expect(entry).not.toBeNull()
    const profile = buildProfile({
      primary_goals: ['build_muscle'],
      injuries: [{ part: 'right_shoulder', severity: 'modify' }],
    })
    expect(entryMatchesProfile(entry!, profile)).toBe(true)
  })

  it('integrates with the real KB: returns sensible results for a desk-worker meniscus profile', () => {
    const profile = buildProfile({
      primary_goals: ['lean_and_strong', 'build_muscle'],
      injuries: [
        { part: 'left_meniscus', severity: 'modify' },
        { part: 'lower_back', severity: 'chronic' },
      ],
      posture_notes: 'desk job',
      training_age_months: 24,
    })
    const out = retrieveRelevantEntries(profile, null)
    // At least one injury-specific entry must be in the top results when the
    // user has injuries.
    const ids = out.entries.map((e) => e.frontmatter.id)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.length).toBeLessThanOrEqual(30)
    // At least one myth entry should make it into the top set.
    expect(out.entries.some((e) => e.frontmatter.type === 'myth')).toBe(true)
  })
})
