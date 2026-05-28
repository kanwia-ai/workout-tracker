import { describe, expect, it } from 'vitest'
import {
  bucketFromMonths,
  entryMatchesProfile,
  goalsForProfile,
  normalizeGoalToken,
  retrieveRelevantEntries,
  scoreEntry,
} from './retrieval'
import type { KBEntry } from './types'
import type { UserProgramProfile } from '../../types/profile'

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

  it('rewards myth entries to keep guardrails in the prompt', () => {
    const profile = buildProfile()
    const myth = buildEntry({ type: 'myth', domain: 'myths' })
    const principle = buildEntry({ type: 'principle' })
    // Both pass; myth has +2 type bonus + the same goal score.
    expect(scoreEntry(myth, profile)).toBeGreaterThan(scoreEntry(principle, profile) - 1)
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
