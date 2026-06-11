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

import type { KBDomain, KBEntry } from './types'
import { BodyPart } from '../../types/profile'
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
  // Tag-concept tokens — KB tags describe topics ('hypertrophy', 'toning')
  // rather than enum goals. Mapping them here lets the myth-relevance check
  // reuse the single normalization policy.
  hypertrophy: 'build_muscle',
  // 'toning' used to map to the lean_and_strong hybrid; that goal is no
  // longer selectable (profiles migrate to get_stronger + build_muscle on
  // load), and "toned" content is hypertrophy content.
  toning: 'build_muscle',
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

// ─── Injury-token normalization ────────────────────────────────────────────
// Mirrors `normalizeGoalToken`: KB frontmatter accumulated generic injury
// tokens ('knee', 'meniscus', 'shoulder', ...) that never equal the sided
// BodyPart enum the profile uses ('left_meniscus', 'right_shoulder', ...).
// Exact-equality matching made every entry carrying a generic token
// permanently unreachable — including squat-variants-knee-friendly, the most
// owner-relevant entry in the KB.
//
// Each generic token expands to the set of BodyPart values it covers; the
// matcher then intersects that set with the user's actual injuries. A
// loader-level test asserts every applicability.injuries token in the live KB
// expands to at least one enum value, so future drift fails CI instead of
// silently orphaning entries.
const BODY_PART_VALUES: ReadonlySet<string> = new Set(BodyPart.options)

const GENERIC_INJURY_TO_BODY_PARTS: Record<string, ReadonlyArray<BodyPart>> = {
  // A meniscus tear IS a knee issue, so the bare 'knee' token covers both the
  // knee and meniscus enum values.
  knee: ['left_knee', 'right_knee', 'left_meniscus', 'right_meniscus'],
  meniscus: ['left_meniscus', 'right_meniscus'],
  // No dedicated enum value — patellofemoral pain presents as knee pain.
  patellofemoral: ['left_knee', 'right_knee'],
  shoulder: ['left_shoulder', 'right_shoulder'],
  trap: ['left_trap', 'right_trap'],
  back: ['lower_back', 'upper_back'],
  // Sciatica originates at the lower back; that's the flag users can set.
  sciatica: ['lower_back'],
  // Closest enum value — the profile has no generic 'hip' part.
  hip: ['hip_flexors'],
}

/**
 * Expand a KB injury token (canonical sided BodyPart value OR generic token)
 * to the BodyPart enum values it covers. Canonical tokens pass through as a
 * singleton; unknown tokens expand to [] (they can never match a user, and
 * the loader validation test keeps them out of the live KB). Pure, total.
 */
export function expandInjuryToken(token: string): string[] {
  if (BODY_PART_VALUES.has(token)) return [token]
  return [...(GENERIC_INJURY_TO_BODY_PARTS[token] ?? [])]
}

/** True iff any entry injury token covers any of the user's injured parts. */
function entryInjuriesMatchUser(
  entryInjuries: ReadonlyArray<string>,
  userParts: ReadonlySet<string>,
): boolean {
  return entryInjuries.some((t) => expandInjuryToken(t).some((p) => userParts.has(p)))
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
  // Tokens are normalized via expandInjuryToken so generic KB tokens
  // ('knee', 'shoulder') match the sided enum values users actually have.
  const entryInjuries = a.injuries ?? []
  if (entryInjuries.length > 0) {
    const userInjuries = new Set(injuriesForProfile(profile))
    if (!entryInjuriesMatchUser(entryInjuries, userInjuries)) return false
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
//   +2  myth entry whose tags touch the user's goals or the plan's content
//       (a flat myth bonus let nutrition/cardio myths flood the cap for
//       every profile — see the domain-stratified cut below)
//   +2  the user's primary muscle-priority is in the entry's tags
//   +1  sex-specific entry matching the user's sex (beats sex:any ties)
//   +1  the entry's domain matches a domain the plan touches:
//       - body-composition  → user has 'fat_loss' goal
//       - injuries          → user has any injury
//       - warmup-recovery   → always +0.5; warmup nuance applies broadly
//   +confidence weighting: high=+2, medium=+1, low=+0
//
// Negative pruning: none. Filter is the gate; ranking just orders within.

/**
 * True iff a myth is about something this user or this plan actually touches:
 * a tag normalizes to one of the profile's canonical goals (tags are
 * hyphenated topic words — 'fat-loss', 'hypertrophy' — so we underscore +
 * normalize before comparing), or a tag (or one of its hyphen-parts) appears
 * in the plan's exercise-name tokens.
 */
function mythTouchesUserOrPlan(
  entry: KBEntry,
  profileGoals: ReadonlyArray<string>,
  planTokens?: ReadonlySet<string>,
): boolean {
  const goalSet = new Set(profileGoals)
  for (const rawTag of entry.frontmatter.tags ?? []) {
    const tag = rawTag.toLowerCase()
    if (goalSet.has(normalizeGoalToken(tag.replace(/-/g, '_')))) return true
    if (planTokens) {
      if (planTokens.has(tag)) return true
      for (const part of tag.split('-')) {
        if (part.length >= 4 && planTokens.has(part)) return true
      }
    }
  }
  return false
}

export function scoreEntry(
  entry: KBEntry,
  profile: UserProgramProfile,
  planTokens?: ReadonlySet<string>,
): number {
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
  if (entryInjuries.length > 0 && entryInjuriesMatchUser(entryInjuries, userInjuries)) {
    score += 6
  }

  // Myths — +2 only when the myth is about something this user's goals or
  // this plan's exercises touch. The old flat bonus pushed ~20 myths (incl.
  // nutrition/cardio ones) into the top-30 for every profile, crowding out
  // entire domains.
  if (
    entry.frontmatter.type === 'myth' &&
    mythTouchesUserOrPlan(entry, allGoalTokens, planTokens)
  ) {
    score += 2
  }

  // Muscle-priority tag match
  if (profile.muscle_priority && profile.muscle_priority.length > 0) {
    const tags = new Set((entry.frontmatter.tags ?? []).map((t) => t.toLowerCase()))
    const topPriority = profile.muscle_priority[0]
    if (topPriority && tags.has(topPriority.toLowerCase())) score += 2
  }

  // Sex-specific entries that match the user beat generic (sex: any) ties —
  // e.g. women-training-fundamentals over adolescents-youth-training for a
  // female profile. The filter already rejected mismatches.
  if ((a.sex ?? 'any') !== 'any' && a.sex === profile.sex) score += 1

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

// ─── Domain-stratified cut ─────────────────────────────────────────────────
// A flat top-N cut let one domain flood the prompt budget (myths took ~20 of
// 30 slots for the owner's profile, leaving zero programming-fundamentals /
// progression / warmup-recovery entries). Instead, reserve slots per domain
// group, guarantee every domain with at least one eligible entry is
// represented, and fill the remainder by raw score.
const RESERVED_DOMAIN_SLOTS: ReadonlyArray<{
  domains: ReadonlyArray<KBDomain>
  slots: number
}> = [
  { domains: ['injuries'], slots: 6 },
  { domains: ['programming-fundamentals', 'progression'], slots: 6 },
  { domains: ['exercises'], slots: 4 },
  { domains: ['myths'], slots: 6 },
  { domains: ['warmup-recovery'], slots: 2 },
  { domains: ['special-populations'], slots: 2 },
]

interface ScoredEntry {
  entry: KBEntry
  score: number
}

function stratifiedCut(scoredDesc: ScoredEntry[], cap: number): ScoredEntry[] {
  const picked = new Set<ScoredEntry>()
  const pickedDomains = new Set<KBDomain>()
  const take = (candidates: ScoredEntry[], slots: number): void => {
    let remaining = slots
    for (const c of candidates) {
      if (remaining <= 0 || picked.size >= cap) break
      if (picked.has(c)) continue
      picked.add(c)
      pickedDomains.add(c.entry.frontmatter.domain)
      remaining--
    }
  }

  for (const group of RESERVED_DOMAIN_SLOTS) {
    take(
      scoredDesc.filter((s) => group.domains.includes(s.entry.frontmatter.domain)),
      group.slots,
    )
  }

  // Floor: any eligible domain still unrepresented (warmup-recovery,
  // special-populations, … have no reservation) gets its top entry.
  const eligibleDomains = new Set(scoredDesc.map((s) => s.entry.frontmatter.domain))
  for (const domain of eligibleDomains) {
    if (!pickedDomains.has(domain)) {
      take(
        scoredDesc.filter((s) => s.entry.frontmatter.domain === domain),
        1,
      )
    }
  }

  // Remainder by raw score across everything not yet picked.
  take(scoredDesc, cap - picked.size)

  return [...picked].sort((a, b) => b.score - a.score)
}

/**
 * Given the user profile + the engine's plan, return the relevant KB entries
 * sorted by descending relevance. The plan feeds two signals: exercise-name
 * tokens boost entries tagged with those exercises (+1), and they make
 * exercise-specific myths eligible for the myth bonus. The final cut is
 * domain-stratified (see `stratifiedCut`) so no single domain floods the
 * prompt budget.
 */
export function retrieveRelevantEntries(
  profile: UserProgramProfile,
  mesocycle: Mesocycle | null,
  options: RetrievalOptions = {},
): RetrievalResult {
  const cap = options.cap ?? 30
  const kb = options.knowledgeBase ?? loadKnowledgeBase()

  const eligible = kb.filter((e) => entryMatchesProfile(e, profile))

  // Plan-aware boost: when the plan contains an exercise whose name matches
  // one of the entry's tags, give that entry +1. Lets exercise-specific
  // entries (lat-pulldown-cueing, hip-thrust-glute-priority) pop without
  // forcing the LLM to dig for them.
  const planTokens = new Set<string>()
  if (mesocycle) {
    for (const sess of mesocycle.sessions) {
      for (const ex of sess.exercises) {
        for (const token of ex.name.toLowerCase().split(/\s+/)) {
          if (token.length >= 4) planTokens.add(token)
        }
      }
    }
  }

  const scored: ScoredEntry[] = eligible.map((entry) => {
    let score = scoreEntry(entry, profile, planTokens)
    if (planTokens.size > 0) {
      const tags = (entry.frontmatter.tags ?? []).map((t) => t.toLowerCase())
      for (const tag of tags) {
        if (planTokens.has(tag)) {
          score += 1
          break
        }
      }
    }
    return { entry, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const top = scored.length <= cap ? scored : stratifiedCut(scored, cap)

  return {
    entries: top.map((s) => s.entry),
    scores: Object.fromEntries(top.map((s) => [s.entry.frontmatter.id, s.score])),
  }
}
