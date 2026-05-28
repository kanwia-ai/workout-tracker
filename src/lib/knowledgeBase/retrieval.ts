// Knowledge-base retrieval — given a user profile + the engine's plan,
// returns the relevant subset of KB entries the nuance layer can cite. Naive
// MVP filter per the spec: match on goals, injuries, training_age bucket,
// sex; cap at 30 entries; rank by a relevance score so the most-applicable
// entries land in the prompt first.
//
// Why naive matching (no embeddings):
//   - 107 entries fit easily in a single prompt's context budget. No need
//     for cosine similarity vs. a vector store.
//   - Filter logic is explicit + auditable. When the LLM cites an entry, a
//     human reviewer can trace back why it was eligible.
//   - We can swap this for embedding-based RAG later without changing the
//     prompt or the surface area of `annotateWithNuance`.

import type { KBEntry } from './types'
import type { PrimaryGoal, UserProgramProfile } from '../../types/profile'
import type { Mesocycle } from '../../types/plan'
import { loadKnowledgeBase } from './loader'

// ─── Training-age bucketing ────────────────────────────────────────────────
// Mirrors the buckets the README defines:
//   beginner     ≤ 6 mo
//   early        6-12 mo
//   intermediate 12-36 mo
//   advanced     36+ mo
//
// `any` is the KB's wildcard. We treat the user as matching `any` always.
export function bucketFromMonths(months: number): 'beginner' | 'early' | 'intermediate' | 'advanced' {
  if (months <= 6) return 'beginner'
  if (months <= 12) return 'early'
  if (months <= 36) return 'intermediate'
  return 'advanced'
}

// ─── Goal-token normalization ──────────────────────────────────────────────
// The KB frontmatter accumulated legacy / non-canonical goal tokens that
// pre-date (or drift from) the canonical `PrimaryGoal` enum in
// src/types/profile.ts. Examples found in the live KB:
//   get_strong  (typo'd form of get_stronger)
//   strength    (legacy `Goal` enum value → maps to get_stronger)
//   aesthetics  (legacy `Goal` enum value → maps to build_muscle)
//   glutes      (legacy `Goal` enum value → maps to build_muscle)
//   longevity   (legacy `Goal` enum value → maps to general_fitness)
//   rehab       (legacy `Goal` enum value → maps to mobility)
//   general     (truncated form of general_fitness)
//
// Rather than maintain a fragile one-way alias expansion (the previous
// approach silently missed `rehab` and the bare `general` token, so relevant
// entries failed to surface), we normalize BOTH the entry's goal tokens AND
// the profile's goal tokens to canonical PrimaryGoal values before comparing.
// This is the single source of truth for goal matching and is robust to any
// future token drift in the KB.
//
// The mapping mirrors `legacyGoalToPrimaryGoal` in src/types/profile.ts (the
// legacy `Goal` enum → `PrimaryGoal`) so there is exactly one mapping policy
// across the codebase, plus the KB-only tokens (`get_strong`, `general`) that
// the profile types never produce.
const LEGACY_GOAL_TO_CANONICAL: Record<string, PrimaryGoal> = {
  // Legacy `Goal` enum values (kept in sync with legacyGoalToPrimaryGoal).
  glutes: 'build_muscle',
  strength: 'get_stronger',
  longevity: 'general_fitness',
  aesthetics: 'build_muscle',
  rehab: 'mobility',
  // KB-only drift tokens (never emitted by the profile types).
  get_strong: 'get_stronger',
  strong: 'get_stronger',
  general: 'general_fitness',
}

const CANONICAL_GOALS: ReadonlySet<string> = new Set<PrimaryGoal>([
  'build_muscle',
  'get_stronger',
  'lean_and_strong',
  'fat_loss',
  'mobility',
  'athletic',
  'general_fitness',
])

/**
 * Map any goal token (canonical, legacy `Goal` enum value, or KB drift token)
 * to its canonical `PrimaryGoal`. Canonical tokens pass through unchanged. The
 * KB wildcard `any` and any genuinely-unknown token pass through verbatim so
 * the matcher can still reason about them (e.g. `any` short-circuits the goal
 * gate). Pure, total.
 */
export function normalizeGoalToken(token: string): string {
  if (CANONICAL_GOALS.has(token)) return token
  return LEGACY_GOAL_TO_CANONICAL[token] ?? token
}

// Some KB entries use the legacy single-word goal tokens that pre-date the
// canonical PrimaryGoal enum (`get_strong` instead of `get_stronger`,
// `aesthetics`, `strength`, etc.). We map the canonical PrimaryGoal values
// to the set of KB tokens that should match them. Retained for back-compat
// with `goalsForProfile` callers/tests; the actual match path now relies on
// `normalizeGoalToken` so it is drift-proof regardless of this map.
const GOAL_ALIASES: Record<string, ReadonlyArray<string>> = {
  build_muscle: ['build_muscle', 'aesthetics', 'glutes'],
  get_stronger: ['get_stronger', 'get_strong', 'strength'],
  lean_and_strong: ['lean_and_strong'],
  fat_loss: ['fat_loss'],
  mobility: ['mobility', 'rehab', 'longevity'],
  athletic: ['athletic'],
  general_fitness: ['general_fitness', 'longevity'],
}

/**
 * Return the KB-goal tokens that should match a given profile's goals. Used
 * both for filtering and for relevance ranking (a direct match on the
 * dominant goal scores higher than a match on a secondary goal).
 */
export function goalsForProfile(profile: UserProgramProfile): string[] {
  const out = new Set<string>()
  // primary_goals (multi-select) takes precedence; falls back to primary_goal
  // singular, then to the legacy `goal` field.
  const sources: string[] = []
  if (profile.primary_goals && profile.primary_goals.length > 0) {
    sources.push(...profile.primary_goals)
  } else if (profile.primary_goal) {
    sources.push(profile.primary_goal)
  } else if (profile.goal) {
    sources.push(profile.goal)
  }
  for (const src of sources) {
    out.add(src)
    const aliases = GOAL_ALIASES[src] ?? []
    for (const a of aliases) out.add(a)
  }
  return [...out]
}

/**
 * Return the body-part tokens we should match against KB
 * `applicability.injuries`. Empty when the user has no injuries.
 */
export function injuriesForProfile(profile: UserProgramProfile): string[] {
  return (profile.injuries ?? []).map((i) => i.part)
}

// ─── Filter predicate ──────────────────────────────────────────────────────
// True iff this entry's applicability is consistent with the user's profile.
// Includes (everything-permissive bias):
//   - Goals: if entry lists goals, at least one must match. If the entry's
//     goals array is empty OR contains 'any', it passes regardless.
//   - Training age: if entry's training_age is 'any', it passes. Otherwise
//     the user's bucket must be in the entry's allowed buckets.
//   - Sex: if entry's sex is 'any', it passes. Otherwise must match.
//   - Injuries: if entry lists injuries, the user must have at least one of
//     them. If the entry's injuries array is empty, it passes (generic
//     entry; not injury-specific).
//
// Type-narrowed view of applicability.training_age — the YAML parser
// returns either a single string ('any', 'beginner') or an array of
// strings. We normalize both to a tokens[] for matching.
function trainingAgeTokens(applicability: KBEntry['frontmatter']['applicability']): string[] {
  const t = applicability.training_age
  return Array.isArray(t) ? t : [t]
}

export function entryMatchesProfile(
  entry: KBEntry,
  profile: UserProgramProfile,
): boolean {
  const a = entry.frontmatter.applicability

  // ── goals ──
  // Normalize both sides to canonical PrimaryGoal tokens before comparing so
  // legacy / drifted KB tokens (`get_strong`, `rehab`, `general`, …) still
  // match the right users. `any` is the KB wildcard and short-circuits.
  const profileGoalTokens = new Set(
    goalsForProfile(profile).map(normalizeGoalToken),
  )
  const entryGoals = a.goals ?? []
  const goalsPass =
    entryGoals.length === 0 ||
    entryGoals.includes('any') ||
    entryGoals.some((g) => profileGoalTokens.has(normalizeGoalToken(g)))
  if (!goalsPass) return false

  // ── training age ──
  const userBucket = bucketFromMonths(profile.training_age_months)
  const entryAges = trainingAgeTokens(a)
  const ageTokens = entryAges.length === 0 ? ['any'] : entryAges
  const agePass = ageTokens.includes('any') || ageTokens.includes(userBucket)
  if (!agePass) return false

  // ── sex ──
  const entrySex = a.sex ?? 'any'
  const sexPass = entrySex === 'any' || entrySex === profile.sex
  if (!sexPass) return false

  // ── injuries ──
  // If the entry is injury-specific, the user must have a matching injury.
  // If the entry's injuries[] is empty, this filter is a pass-through.
  const entryInjuries = a.injuries ?? []
  if (entryInjuries.length > 0) {
    const userInjuries = new Set(injuriesForProfile(profile))
    const injuryPass = entryInjuries.some((part) => userInjuries.has(part))
    if (!injuryPass) return false
  }

  return true
}

// ─── Relevance ranking ─────────────────────────────────────────────────────
// A simple weighted score. Higher = include earlier.
//
// Weights:
//   +5  direct goal match on user's dominant goal (primary_goals[0])
//   +3  goal match on a secondary goal
//   +6  injury-specific entry whose injuries[] includes one of the user's
//   +2  myth entry (always useful as guardrail; cap doesn't hurt)
//   +2  the user's primary muscle-priority is in the entry's tags
//   +1  the entry's domain matches a domain the plan touches:
//       - body-composition  → user has 'fat_loss' goal
//       - injuries          → user has any injury
//       - warmup-recovery   → always +0.5; warmup nuance applies broadly
//   +confidence weighting: high=+2, medium=+1, low=+0
//
// Negative pruning: none. Filter is the gate; ranking just orders within.
export function scoreEntry(entry: KBEntry, profile: UserProgramProfile): number {
  let score = 0
  const a = entry.frontmatter.applicability

  // Goal matches. Normalize the entry's goals to canonical tokens once so all
  // comparisons below are drift-proof.
  const allGoalTokens = goalsForProfile(profile).map(normalizeGoalToken)
  const entryGoals = new Set((a.goals ?? []).map(normalizeGoalToken))
  if (profile.primary_goals && profile.primary_goals.length > 0) {
    // primary_goals are already canonical PrimaryGoal values; normalize anyway
    // for symmetry (pass-through for canonical tokens).
    if (entryGoals.has(normalizeGoalToken(profile.primary_goals[0]))) score += 5
    if (profile.primary_goals[1]) {
      if (entryGoals.has(normalizeGoalToken(profile.primary_goals[1]))) score += 3
    }
  } else {
    // No multi-goal — give a flat +3 for any single-goal match (since we
    // can't distinguish dominant vs secondary).
    if (allGoalTokens.some((g) => entryGoals.has(g))) score += 3
  }

  // Injury match — injury-specific entries are the highest-value when they
  // apply to the user, because they're the ones with the strongest rehab
  // semantics encoded.
  const userInjuries = new Set(injuriesForProfile(profile))
  const entryInjuries = a.injuries ?? []
  if (entryInjuries.length > 0 && entryInjuries.some((p) => userInjuries.has(p))) {
    score += 6
  }

  // Myths — always +2 so the nuance layer has guardrails against common
  // gym-bro defaults the LLM might regress to without them.
  if (entry.frontmatter.type === 'myth') score += 2

  // Muscle-priority tag match
  if (profile.muscle_priority && profile.muscle_priority.length > 0) {
    const tags = new Set((entry.frontmatter.tags ?? []).map((t) => t.toLowerCase()))
    const topPriority = profile.muscle_priority[0]
    if (topPriority && tags.has(topPriority.toLowerCase())) score += 2
  }

  // Domain relevance
  const domain = entry.frontmatter.domain
  if (domain === 'body-composition' && allGoalTokens.includes('fat_loss')) score += 1
  if (domain === 'injuries' && userInjuries.size > 0) score += 1
  if (domain === 'warmup-recovery') score += 0.5

  // Confidence weighting — high-confidence entries surface earlier so the
  // LLM gets strong evidence first when the prompt budget gets tight.
  if (entry.frontmatter.confidence === 'high') score += 2
  else if (entry.frontmatter.confidence === 'medium') score += 1

  return score
}

// ─── Public retrieval API ──────────────────────────────────────────────────
export interface RetrievalOptions {
  /** Hard cap on entries returned. Default 30. */
  cap?: number
  /** Pre-loaded KB (test-only — production reads from the glob registry). */
  knowledgeBase?: KBEntry[]
}

export interface RetrievalResult {
  entries: KBEntry[]
  /** Map from entry id → its score, for debug / display purposes. */
  scores: Record<string, number>
}

/**
 * Given the user profile + the engine's plan, return the relevant KB entries
 * sorted by descending relevance. The `mesocycle` argument is reserved for a
 * future enhancement (e.g. "this session contains lat pulldown → boost
 * `lat-pulldown-cueing`"); the current implementation reads only the
 * profile. We keep it in the signature so the nuance layer wires through
 * the plan reference, future-proofing the API.
 */
export function retrieveRelevantEntries(
  profile: UserProgramProfile,
  mesocycle: Mesocycle | null,
  options: RetrievalOptions = {},
): RetrievalResult {
  const cap = options.cap ?? 30
  const kb = options.knowledgeBase ?? loadKnowledgeBase()

  const eligible = kb.filter((e) => entryMatchesProfile(e, profile))

  // Plan-aware boost: when the plan contains an exercise whose name OR
  // library_id matches one of the entry's tags, give that entry +1. Lets
  // exercise-specific entries (lat-pulldown-cueing, hip-thrust-glute-priority)
  // pop without forcing the LLM to dig for them.
  const planTags = new Set<string>()
  if (mesocycle) {
    for (const sess of mesocycle.sessions) {
      for (const ex of sess.exercises) {
        for (const token of ex.name.toLowerCase().split(/\s+/)) {
          if (token.length >= 4) planTags.add(token)
        }
      }
    }
  }

  const scored = eligible.map((entry) => {
    let score = scoreEntry(entry, profile)
    if (planTags.size > 0) {
      const tags = (entry.frontmatter.tags ?? []).map((t) => t.toLowerCase())
      for (const tag of tags) {
        if (planTags.has(tag)) {
          score += 1
          break
        }
      }
    }
    return { entry, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, cap)

  return {
    entries: top.map((s) => s.entry),
    scores: Object.fromEntries(top.map((s) => [s.entry.frontmatter.id, s.score])),
  }
}
