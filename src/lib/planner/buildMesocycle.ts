// buildMesocycle — Phase 3 rule-based planner entry point.
//
// Consumes ProgrammingDirectives + rehab protocols + variant pool and
// produces a 6-week Mesocycle. Deterministic, pure TypeScript, zero
// network calls. The LLM isn't involved in building the plan — it only
// contributed (Phase 5) the interpretation pass that produced the
// directives, and (Phase 4) the per-session warmup copy.
//
// Intentionally keeps scope tight for Phase 3:
//   - Uses baked-in variant pool + session-type defaults rather than
//     querying the full EXERCISE_LIBRARY. Full library integration is
//     a follow-up once the planner shape is proven.
//   - Day-of-week assignment is a simple spread — not a CNS-aware
//     optimizer yet.
//   - Load prescription is deferred to the user's actual performance;
//     we emit rep schemes + RIR, not kg targets.

import type {
  ProgrammingDirectives,
  SessionType,
  GoalDirectives,
} from '../../types/directives'
import type { Protocol, Stage } from '../../data/rehab-protocols/types'
import { getProtocol } from '../../data/rehab-protocols'
import type {
  WarmupSet,
  PlannedExercise,
  PlannedSession,
  MuscleGroup,
} from '../../types/plan'
import type { UserProgramProfile } from '../../types/profile'
import {
  MAIN_VARIANTS,
  ACCESSORY_VARIANTS,
  resolveVariant,
  type VariantSpec,
} from './variants'
import { suggestStartingWeight } from './startingWeights'

// ─── Mesocycle shape ───────────────────────────────────────────────────────
export interface BuiltMesocycle {
  id: string
  length_weeks: number
  sessions: PlannedSession[]
  generated_at: string
}

// ─── Goal-driven mesocycle length ─────────────────────────────────────────
// Derive block length from the user's primary goal. RP-style hypertrophy
// mesocycles are typically 4-6 weeks; strength-leaning blocks accumulate
// fatigue faster and run shorter. Beginner / unspecified defaults stay at
// 6 weeks so the existing default behavior is preserved.
//   - 'lean_and_strong'           → 5 weeks (4 work + 1 deload)
//   - 'build_muscle' (hypertrophy) → 6 weeks (5 work + 1 deload)
//   - any other / unknown          → 6 weeks (today's default)
export function mesocycleLengthFor(profile?: UserProgramProfile): number {
  const pg = profile?.primary_goal
  if (pg === 'lean_and_strong') return 5
  if (pg === 'build_muscle') return 6
  return 6
}

// ─── Session-type → default compound + accessories ─────────────────────────
// Baseline when no injury directive supplies one. Kept simple — this pool
// expands later but covers the common sessions with safe defaults.

interface SessionDefaults {
  focus: MuscleGroup[]
  title: string
  subtitle: string
  default_main: string
  default_secondary: string | null
  default_accessories: string[]
  day_slot: number  // 0=Mon..6=Sun — suggestion, may be shuffled by spread
}

const SESSION_DEFAULTS: Record<SessionType, SessionDefaults> = {
  lower_squat_focus: {
    focus: ['quads', 'glutes'],
    title: 'quads & glutes',
    subtitle: 'LOWER · SQUAT-DOMINANT',
    default_main: 'back_squat',
    default_secondary: 'bulgarian_split_squat_loaded',
    default_accessories: ['seated_leg_curl', 'hip_abduction_machine', 'banded_clamshell', 'lying_leg_pullover'],
    day_slot: 0,
  },
  lower_hinge_focus: {
    focus: ['hamstrings', 'glutes', 'back'],
    title: 'glutes & posterior chain',
    subtitle: 'LOWER · HINGE-DOMINANT',
    default_main: 'romanian_deadlift_moderate',
    default_secondary: 'glute_max_bridge_or_hip_thrust',
    default_accessories: ['nordic_hamstring_curl', 'hip_abduction_machine', 'banded_clamshell'],
    day_slot: 3,
  },
  upper_push: {
    focus: ['chest', 'shoulders', 'triceps'],
    title: 'chest & shoulders',
    subtitle: 'UPPER · PUSH',
    default_main: 'bench_press_moderate',
    default_secondary: 'overhead_dumbbell_press',
    default_accessories: ['face_pull', 'prone_y_raise'],
    day_slot: 1,
  },
  upper_pull: {
    focus: ['back', 'biceps'],
    title: 'back & rear delts',
    subtitle: 'UPPER · PULL',
    default_main: 'pullup_full',
    default_secondary: 'chest_supported_row',
    default_accessories: ['face_pull', 'prone_y_raise'],
    day_slot: 4,
  },
  full_body_a: {
    focus: ['quads', 'chest', 'back'],
    title: 'full body A',
    subtitle: 'FULL · SQUAT + PUSH + PULL',
    default_main: 'back_squat',
    default_secondary: 'bench_press_moderate',
    default_accessories: ['chest_supported_row', 'face_pull'],
    day_slot: 0,
  },
  full_body_b: {
    focus: ['hamstrings', 'shoulders', 'back'],
    title: 'full body B',
    subtitle: 'FULL · HINGE + PRESS + PULL',
    default_main: 'romanian_deadlift_moderate',
    default_secondary: 'overhead_dumbbell_press',
    default_accessories: ['pullup_full', 'nordic_hamstring_curl'],
    day_slot: 3,
  },
  conditioning: {
    focus: ['full_body'],
    title: 'conditioning',
    subtitle: 'CONDITIONING',
    default_main: 'kettlebell_hip_hinge',
    default_secondary: null,
    default_accessories: [],
    day_slot: 5,
  },
  rehab_mobility: {
    focus: ['mobility', 'rehab'],
    title: 'mobility & rehab',
    subtitle: 'REHAB · MOBILITY',
    default_main: 'kettlebell_hip_hinge',
    default_secondary: null,
    default_accessories: [],
    day_slot: 6,
  },
}

// ─── Stage resolution ──────────────────────────────────────────────────────
// For a given week and injury directive, pick the applicable rehab stage
// considering stage_weeks offset (user may ENTER the plan mid-rehab).

export function resolveStage(
  protocol: Protocol,
  weekNumber: number,
  stageWeeksOffset: number,
): Stage | null {
  if (!protocol.by_severity.rehab) return null
  // effective_week accounts for where the user is in rehab globally
  const effective = weekNumber + stageWeeksOffset
  for (const stage of protocol.by_severity.rehab.stages) {
    const [lo, hi] = stage.target_weeks
    if (effective >= lo && effective <= hi) return stage
  }
  // If past the last stage's upper bound, stay on final stage (return-to-sport)
  const stages = protocol.by_severity.rehab.stages
  const last = stages[stages.length - 1]
  if (last && effective > last.target_weeks[1]) return last
  // If before first stage (stageWeeksOffset < 0), use first
  return stages[0] ?? null
}

// ─── Directive merging per session ─────────────────────────────────────────

interface MergedSessionContext {
  banned_variants: Set<string>
  preferred_variants: string[]  // from stage.allowed_main_variants
  priority_accessories: string[] // from protocol per_session_accessories
  decompression_pair: string[]   // e.g. lying_leg_pullover after squat
  warmup_elements: string[]     // de-duplicated warmup_focus
  rep_scheme_override: [number, number] | null
  avoid_this_session: string[]
  modifications: string[]
  modifications_note: string
}

function mergeDirectivesForSession(
  sessionType: SessionType,
  weekNumber: number,
  directives: ProgrammingDirectives,
): MergedSessionContext {
  const banned = new Set<string>()
  const preferred: string[] = []
  const priorityAcc: string[] = []
  const decompression: string[] = []
  const warmupElements: string[] = []
  const avoidThisSession: string[] = []
  const modifications: string[] = []
  let repOverride: [number, number] | null = null
  const modNotes: string[] = []

  for (const inj of directives.injury_directives) {
    if (!inj.matched_protocol) continue
    const protocol = getProtocol(inj.matched_protocol)
    if (!protocol) continue

    // If user is acute ('acute' severity), globally ban from the avoid block
    if (inj.severity === 'acute' && protocol.by_severity.avoid) {
      for (const b of protocol.by_severity.avoid.hard_ban_patterns) banned.add(b)
    }

    // Stage-based directives (rehab severity)
    if (inj.severity === 'rehab') {
      const stage = resolveStage(protocol, weekNumber, inj.stage_weeks)
      if (stage) {
        for (const b of stage.banned_variants) banned.add(b)
        for (const a of stage.allowed_main_variants) {
          if (!preferred.includes(a)) preferred.push(a)
        }
        for (const el of stage.warmup_protocol) {
          if (!warmupElements.includes(el.name)) warmupElements.push(el.name)
        }
        if (stage.rep_scheme_override) {
          // First-in wins for rep override (most-rehab-active injury drives)
          if (!repOverride) repOverride = stage.rep_scheme_override
        }
      }
    }

    // Chronic management — weave in root-cause work WITHOUT blanket-banning
    // stimulus exercises. Chronic = ongoing condition driven by a motor-control
    // or strength deficit (e.g. chronic LBP ← weak glutes + tight hip flexors).
    // The fix is to address the deficit, not avoid the pattern. We pull the
    // protocol's chronic.priority_work into priority accessories so the planner
    // routes them in front of generic accessories on every session that loads
    // the affected region. `do_not_ban` is intentionally NOT consulted here:
    // chronic never adds to `banned`, so squat/deadlift/etc. remain available.
    if (inj.severity === 'chronic' && protocol.by_severity.chronic) {
      for (const pw of protocol.by_severity.chronic.priority_work) {
        if (ACCESSORY_VARIANTS[pw] && !priorityAcc.includes(pw)) {
          priorityAcc.push(pw)
        }
      }
    }

    // Per-session_type directives
    const perSession = protocol.per_session_type[sessionType]
    if (perSession) {
      for (const el of perSession.warmup_focus) {
        if (!warmupElements.includes(el)) warmupElements.push(el)
      }
      for (const av of perSession.avoid_on_this_session) {
        avoidThisSession.push(av)
        banned.add(av)
      }
      for (const mod of perSession.modifications) {
        modifications.push(mod)
      }
      // priority_work added as priority accessories — mapped loosely
      for (const pw of perSession.priority_work) {
        if (ACCESSORY_VARIANTS[pw] && !priorityAcc.includes(pw)) {
          priorityAcc.push(pw)
        }
      }
      // pair_with maps to decompression_pair when the name is known
      for (const pw of perSession.pair_with) {
        if (ACCESSORY_VARIANTS[pw] && !decompression.includes(pw)) {
          decompression.push(pw)
        }
      }
    }

    // Protocol-level per_session_accessories
    const accessories = protocol.per_session_accessories?.[sessionType]
    if (accessories) {
      for (const p of accessories.priority) {
        if (ACCESSORY_VARIANTS[p.exercise_pattern] && !priorityAcc.includes(p.exercise_pattern)) {
          priorityAcc.push(p.exercise_pattern)
        }
      }
      for (const p of accessories.decompression_pair) {
        if (ACCESSORY_VARIANTS[p.exercise_pattern] && !decompression.includes(p.exercise_pattern)) {
          decompression.push(p.exercise_pattern)
        }
      }
    }

    if (modifications.length > 0) {
      modNotes.push(`${inj.source}: ${modifications.join('; ')}`)
    }
  }

  return {
    banned_variants: banned,
    preferred_variants: preferred,
    priority_accessories: priorityAcc,
    decompression_pair: decompression,
    warmup_elements: warmupElements,
    rep_scheme_override: repOverride,
    avoid_this_session: avoidThisSession,
    modifications,
    modifications_note: modNotes.join(' | '),
  }
}

// ─── Main-lift selection ───────────────────────────────────────────────────
// Prefer the first preferred_variant that isn't banned. Fall back to the
// session-type default (unless banned — then use the first accepted preferred).
function pickMainLift(
  sessionType: SessionType,
  context: MergedSessionContext,
): VariantSpec {
  // 1. Check preferred_variants (from stages) first
  for (const id of context.preferred_variants) {
    if (context.banned_variants.has(id)) continue
    const v = resolveVariant(id)
    if (v) return v
  }
  // 2. Fall back to session-type default if not banned
  const defaults = SESSION_DEFAULTS[sessionType]
  if (!context.banned_variants.has(defaults.default_main)) {
    const v = resolveVariant(defaults.default_main)
    if (v) return v
  }
  // 3. Scan all MAIN_VARIANTS for first non-banned option matching session focus
  for (const [id, v] of Object.entries(MAIN_VARIANTS)) {
    if (context.banned_variants.has(id)) continue
    const overlap = v.primary_muscles.some((m) => defaults.focus.includes(m))
    if (overlap) return v
  }
  // 4. Last-resort: first unbanned main variant
  const [, fallback] = Object.entries(MAIN_VARIANTS).find(
    ([id]) => !context.banned_variants.has(id),
  )!
  return fallback
}

// ─── Rep-scheme selection ──────────────────────────────────────────────────
function pickRepScheme(
  role: VariantSpec['role'],
  goal: GoalDirectives,
  override: [number, number] | null,
): { reps: string; rir: number; rest: number } {
  // Stage overrides dominate (rehab stage_1 goblet @ 8-12 beats goal's 3-6)
  if (role === 'main lift') {
    if (override) {
      return { reps: `${override[0]}-${override[1]}`, rir: 2, rest: 150 }
    }
    const [lo, hi] = goal.rep_scheme_bias.main_compounds
    return { reps: `${lo}-${hi}`, rir: goal.primary_adaptation === 'strength_power' ? 1 : 2, rest: 180 }
  }
  if (role === 'accessory') {
    const [lo, hi] = goal.rep_scheme_bias.accessories
    // WHY rest=120: align with engine standard rest tables (compound 180s,
    // accessory 120s, isolation 75s) and the LLM prompt's rule 5.4. Longer
    // rest preserves volume-load (R1 P12, R3 P4 — Pelland 2025).
    return { reps: `${lo}-${hi}`, rir: 2, rest: 120 }
  }
  if (role === 'isolation') {
    const [lo, hi] = goal.rep_scheme_bias.finishers
    // WHY rest=75: align with the engine's standard rest tables
    // (compound 180s, accessory 120s, isolation 75s) and the LLM prompt's
    // rule 5.4 in generatePlan.ts. The legacy 60s finisher rest came from
    // the "metabolic finisher / short rest = more fat burn" myth; Pelland
    // 2025 + Schoenfeld 2016 show shorter rest reduces total volume-load
    // without measurable hypertrophy/density benefit.
    return { reps: `${lo}-${hi}`, rir: 1, rest: 75 }
  }
  if (role === 'mobility' || role === 'rehab') {
    return { reps: '10-15', rir: 2, rest: 45 }
  }
  return { reps: '8-12', rir: 2, rest: 75 }
}

// ─── Warmup prescription ───────────────────────────────────────────────────
// Ramp sets on the main compound: 3 sets (50%/10, 70%/5, 85%/3).
// Accessory main: 1 set (60%/8). Everything else: [].
function warmupSetsFor(ramp: VariantSpec['ramp_style']): WarmupSet[] {
  if (ramp === 'compound') {
    return [
      { percent: 50, reps: 10 },
      { percent: 70, reps: 5 },
      { percent: 85, reps: 3 },
    ]
  }
  if (ramp === 'accessory') {
    return [{ percent: 60, reps: 8 }]
  }
  return []
}

// ─── Accessory selection ───────────────────────────────────────────────────
// Take priority_accessories first (injury-driven), then fill from session
// defaults up to target count. Add decompression_pair as a tail element.
function pickAccessories(
  sessionType: SessionType,
  context: MergedSessionContext,
  targetCount: number,
): VariantSpec[] {
  const picked: VariantSpec[] = []
  const pickedIds = new Set<string>()

  for (const id of context.priority_accessories) {
    if (pickedIds.has(id) || context.banned_variants.has(id)) continue
    const v = resolveVariant(id)
    if (!v) continue
    picked.push(v)
    pickedIds.add(id)
    if (picked.length >= targetCount) break
  }

  if (picked.length < targetCount) {
    const defaults = SESSION_DEFAULTS[sessionType].default_accessories
    for (const id of defaults) {
      if (pickedIds.has(id) || context.banned_variants.has(id)) continue
      const v = resolveVariant(id)
      if (!v) continue
      picked.push(v)
      pickedIds.add(id)
      if (picked.length >= targetCount) break
    }
  }

  for (const id of context.decompression_pair) {
    if (pickedIds.has(id) || context.banned_variants.has(id)) continue
    const v = resolveVariant(id)
    if (!v) continue
    picked.push(v)
    pickedIds.add(id)
  }

  return picked
}

// ─── Variant → PlannedExercise ─────────────────────────────────────────────
// Parses the first working-rep count out of a rep-scheme string ("5-8" → 5,
// "10" → 10). Used only to pick a starting-weight bucket; tolerant of noise.
function firstRepOf(reps: string): number {
  const m = reps.match(/\d+/)
  return m ? Number.parseInt(m[0]!, 10) : 8
}

function variantToExercise(
  v: VariantSpec,
  sets: number,
  reps: string,
  rir: number,
  restSec: number,
  profile?: UserProgramProfile,
  notes?: string,
): PlannedExercise {
  const suggested = profile
    ? suggestStartingWeight({
      variant: v,
      profile,
      role: v.role,
      reps: firstRepOf(reps),
      rir,
    })
    : undefined
  return {
    library_id: v.library_id ?? `variant:${v.id}`,
    name: v.name,
    sets,
    reps,
    rir,
    rest_seconds: restSec,
    role: v.role,
    warmup_sets: warmupSetsFor(v.ramp_style),
    ...(suggested !== undefined ? { suggested_weight_lbs: suggested } : {}),
    ...(notes ? { notes } : {}),
  }
}

// NOTE: weekly seed-weight progression was removed (audit 2026-05-07, priority
// #2). The seed (`suggested_weight_lbs`) is now the *first-time* starting
// weight only — identical across every week of a block. Once a check-in
// exists for an exercise, `computeAutoProgressionForSession` is the source of
// truth for next-session weight, and it bumps lb-by-lb from actual
// performance. The previous `applyWeeklyProgression` helper raced with that
// system: it pushed the seed up +2.5%/wk monotonically (`Math.max`), so a
// stalled lifter still saw a higher seed than what they actually hit. Keeping
// the seed flat lets autoProgress own the trajectory without static noise.

// ─── Deload (last week) adjustments ───────────────────────────────────────
// Delphi consensus 2024 (PMC10511399): cut volume OR intensity, not both —
// volume is the more commonly-recommended lever. We cut sets to ~50% and
// leave RIR untouched. The previous setup also bumped RIR by 1, which
// stacked a ~30% effort cut on top of the volume cut and over-deloaded
// users who hadn't accumulated much fatigue.
function applyDeload(exercises: PlannedExercise[]): PlannedExercise[] {
  return exercises.map((ex) => ({
    ...ex,
    sets: Math.max(1, Math.ceil(ex.sets * 0.5)),  // 50% of volume; RIR unchanged
  }))
}

// ─── Session builder ───────────────────────────────────────────────────────
export function buildSession(args: {
  sessionType: SessionType
  weekNumber: number
  ordinal: number
  directives: ProgrammingDirectives
  dayOfWeek: number
  profile?: UserProgramProfile
  /**
   * Total length of the enclosing mesocycle (in weeks). Used to detect the
   * deload week (always the last week of the block). Defaults to 6 to
   * preserve back-compat for callers that build a one-off session without
   * threading length through.
   */
  lengthWeeks?: number
}): PlannedSession {
  const { sessionType, weekNumber, ordinal, directives, dayOfWeek, profile } = args
  const lengthWeeks = args.lengthWeeks ?? 6
  const isDeloadWeek = weekNumber === lengthWeeks
  const defaults = SESSION_DEFAULTS[sessionType]
  const context = mergeDirectivesForSession(sessionType, weekNumber, directives)

  // Main lift. Modifications are captured in the rationale (below) — don't
  // leak raw protocol-key strings into the exercise's notes field, which
  // renders directly in the UI.
  const main = pickMainLift(sessionType, context)
  const mainScheme = pickRepScheme('main lift', directives.goal, context.rep_scheme_override)
  const exercises: PlannedExercise[] = [
    variantToExercise(main, 4, mainScheme.reps, mainScheme.rir, mainScheme.rest, profile),
  ]

  // Secondary lift (if session has one)
  if (defaults.default_secondary && !context.banned_variants.has(defaults.default_secondary)) {
    const sec = resolveVariant(defaults.default_secondary)
    if (sec) {
      const secScheme = pickRepScheme(sec.role, directives.goal, context.rep_scheme_override)
      exercises.push(
        variantToExercise(sec, 3, secScheme.reps, secScheme.rir, secScheme.rest, profile),
      )
    }
  }

  // Accessories — budget-driven. Pull the priority list (injury-forward + session
  // defaults + decompression pair), then add one at a time until we hit the
  // user's target lifting wall-clock (work + rest). This makes a 60-min request
  // produce a fuller session than a 45-min request, instead of every session
  // being the same fixed shape.
  const targetMin = directives.target_lifting_minutes ?? 60
  const minutesPerExercise = (ex: PlannedExercise): number =>
    ex.sets * (ex.rest_seconds / 60 + 0.8)
  const currentMinutes = (): number =>
    exercises.reduce((acc, ex) => acc + minutesPerExercise(ex), 0)
  // Fetch a wide pool — we'll filter based on budget.
  // Dedupe against the main + secondary we already picked: an injury-driven
  // priority accessory (e.g. meniscus → glute_max_bridge_or_hip_thrust) can
  // collide with the session's default secondary (lower_hinge's hip thrust),
  // producing two "Barbell Hip Thrust" rows in the same session. Pick by
  // library_id, not name, so variant aliases still collapse correctly.
  const alreadyPickedIds = new Set(exercises.map((e) => e.library_id))
  const accessoryPool = pickAccessories(sessionType, context, 8)
  for (const acc of accessoryPool) {
    const accLibraryId = `variant:${acc.id}`
    if (alreadyPickedIds.has(accLibraryId)) continue
    const accScheme = pickRepScheme(acc.role, directives.goal, null)
    const candidate = variantToExercise(
      acc,
      3,
      accScheme.reps,
      accScheme.rir,
      accScheme.rest,
      profile,
    )
    const projected = currentMinutes() + minutesPerExercise(candidate)
    // Always include at least 2 accessories so cards aren't bare. Past that,
    // stop once adding the next one would push ≥10% over target.
    if (exercises.length >= 3 && projected > targetMin * 1.1) break
    exercises.push(candidate)
    alreadyPickedIds.add(accLibraryId)
    if (currentMinutes() >= targetMin * 0.95) break
  }

  // The seed `suggested_weight_lbs` is held flat across every week of the
  // block (see note above `applyDeload`). `computeAutoProgressionForSession`
  // owns the lb-by-lb trajectory once check-ins exist. Deload (last week
  // of the block) cuts set counts only.
  const finalExercises = isDeloadWeek ? applyDeload(exercises) : exercises

  // Build rationale from context — short, descriptive, under 280 chars.
  // Use display names (not protocol keys) so "glute_max_bridge_or_hip_thrust"
  // doesn't leak into the UI.
  const priorityDisplayNames = context.priority_accessories
    .slice(0, 2)
    .map((id) => resolveVariant(id)?.name.toLowerCase() ?? id.replace(/_/g, ' '))
  const rationaleParts: string[] = []
  if (context.preferred_variants.length > 0) {
    rationaleParts.push(
      `rehab-appropriate main lift for wk ${weekNumber}: ${main.name.toLowerCase()}.`,
    )
  } else {
    rationaleParts.push(`${defaults.title} focus with ${main.name.toLowerCase()}.`)
  }
  if (priorityDisplayNames.length > 0) {
    rationaleParts.push(
      `injury-priority accessories first (${priorityDisplayNames.join(', ')}).`,
    )
  }
  if (isDeloadWeek) {
    rationaleParts.push('deload week — reduced volume, reassess progress.')
  }
  const rationale = rationaleParts.join(' ').slice(0, 280)

  // Estimated minutes: sum of (sets × (rest + ~0.8 min work)) per lift +
  // fixed warmup (10 min) + cooldown (5 min) so the session card matches
  // the wall-clock experience, not just lifting time.
  const liftingMinutes = finalExercises.reduce(
    (acc, ex) => acc + ex.sets * (ex.rest_seconds / 60 + 0.8),
    0,
  )
  const WARMUP_MIN = 10
  const COOLDOWN_MIN = 5
  const estimatedMinutes = Math.min(
    120,
    Math.max(25, liftingMinutes + WARMUP_MIN + COOLDOWN_MIN),
  )

  return {
    id: `session-wk${weekNumber}-s${ordinal}`,
    week_number: weekNumber,
    ordinal,
    focus: defaults.focus,
    title: defaults.title,
    subtitle: defaults.subtitle,
    estimated_minutes: Math.round(estimatedMinutes),
    exercises: finalExercises,
    day_of_week: dayOfWeek,
    rationale,
    status: 'upcoming',
  }
}

// ─── Day-of-week spread ────────────────────────────────────────────────────
// Spread N sessions across a 7-day week. Mon/Tue/Thu/Fri for 4 sessions,
// Mon/Wed/Fri for 3, etc. Rest days between matched session types.
//
// `preferredDays` (when provided AND length matches sessions_per_week) is
// honored 1:1 in the order given — this is how the onboarding day-picker
// reaches the planner. Length mismatch falls back to the rest-aware spread
// rather than producing a partial week the user didn't intend.
function spreadDaysOfWeek(
  sessionsPerWeek: number,
  preferredDays?: number[],
): number[] {
  if (
    preferredDays &&
    preferredDays.length === sessionsPerWeek &&
    preferredDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  ) {
    // Sort Mon→Sun so session ordinal 1 is the user's earliest selected day
    // (matches the recovery spread's monotonically-increasing convention).
    return [...preferredDays].sort((a, b) => a - b)
  }
  if (
    preferredDays &&
    preferredDays.length > 0 &&
    preferredDays.length !== sessionsPerWeek
  ) {
    // Soft warn — caller intent was ambiguous (e.g. profile saved before the
    // sessions_per_week change). Fall through to the default spread so we
    // never emit fewer sessions than requested.
    console.warn(
      `[buildMesocycle] preferred_days length ${preferredDays.length} ≠ ` +
        `sessions_per_week ${sessionsPerWeek}; using default spread instead.`,
    )
  }
  // 0=Mon..6=Sun
  if (sessionsPerWeek === 1) return [0]
  if (sessionsPerWeek === 2) return [0, 3]
  if (sessionsPerWeek === 3) return [0, 2, 4]
  if (sessionsPerWeek === 4) return [0, 1, 3, 4]
  if (sessionsPerWeek === 5) return [0, 1, 3, 4, 5]
  if (sessionsPerWeek === 6) return [0, 1, 2, 3, 4, 5]
  return [0, 1, 2, 3, 4, 5, 6]
}

// ─── Top-level entry ───────────────────────────────────────────────────────
// `lengthWeeks` is goal-driven by default (see `mesocycleLengthFor`). Callers
// may still override explicitly — passing a number wins over goal inference.
export function buildMesocycle(
  directives: ProgrammingDirectives,
  lengthWeeks?: number,
  profile?: UserProgramProfile,
): BuiltMesocycle {
  const resolvedLength = lengthWeeks ?? mesocycleLengthFor(profile)
  const template = directives.week_shape.template
  const sessionsPerWeek = directives.week_shape.sessions_per_week
  // Honor the user's preferred lifting days when present. The onboarding
  // day-picker step writes them onto the profile; everywhere else the
  // planner falls back to its rest-aware default spread.
  const dayOfWeekSpread = spreadDaysOfWeek(
    sessionsPerWeek,
    profile?.preferred_days,
  )

  const sessions: PlannedSession[] = []
  for (let week = 1; week <= resolvedLength; week += 1) {
    for (let i = 0; i < template.length; i += 1) {
      const sessionType = template[i]!
      const ordinal = i + 1
      const dow = dayOfWeekSpread[i] ?? 0
      sessions.push(
        buildSession({
          sessionType,
          weekNumber: week,
          ordinal,
          directives,
          dayOfWeek: dow,
          profile,
          lengthWeeks: resolvedLength,
        }),
      )
    }
  }

  return {
    id: `meso-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    length_weeks: resolvedLength,
    sessions,
    generated_at: new Date().toISOString(),
  }
}
