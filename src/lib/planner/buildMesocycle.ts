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
import {
  MAIN_VARIANTS,
  ACCESSORY_VARIANTS,
  resolveVariant,
  type VariantSpec,
} from './variants'

// ─── Mesocycle shape ───────────────────────────────────────────────────────
export interface BuiltMesocycle {
  id: string
  length_weeks: number
  sessions: PlannedSession[]
  generated_at: string
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
    return { reps: `${lo}-${hi}`, rir: 2, rest: 90 }
  }
  if (role === 'isolation') {
    const [lo, hi] = goal.rep_scheme_bias.finishers
    return { reps: `${lo}-${hi}`, rir: 1, rest: 60 }
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
function variantToExercise(
  v: VariantSpec,
  sets: number,
  reps: string,
  rir: number,
  restSec: number,
  notes?: string,
): PlannedExercise {
  return {
    library_id: v.library_id ?? `variant:${v.id}`,
    name: v.name,
    sets,
    reps,
    rir,
    rest_seconds: restSec,
    role: v.role,
    warmup_sets: warmupSetsFor(v.ramp_style),
    ...(notes ? { notes } : {}),
  }
}

// ─── Deload (week 6) adjustments ──────────────────────────────────────────
function applyDeload(exercises: PlannedExercise[]): PlannedExercise[] {
  return exercises.map((ex) => ({
    ...ex,
    sets: Math.max(1, Math.ceil(ex.sets * 0.6)),  // 60% of volume
    rir: Math.min(5, ex.rir + 1),                 // lighter RIR
  }))
}

// ─── Session builder ───────────────────────────────────────────────────────
export function buildSession(args: {
  sessionType: SessionType
  weekNumber: number
  ordinal: number
  directives: ProgrammingDirectives
  dayOfWeek: number
}): PlannedSession {
  const { sessionType, weekNumber, ordinal, directives, dayOfWeek } = args
  const defaults = SESSION_DEFAULTS[sessionType]
  const context = mergeDirectivesForSession(sessionType, weekNumber, directives)

  // Main lift. Modifications are captured in the rationale (below) — don't
  // leak raw protocol-key strings into the exercise's notes field, which
  // renders directly in the UI.
  const main = pickMainLift(sessionType, context)
  const mainScheme = pickRepScheme('main lift', directives.goal, context.rep_scheme_override)
  const exercises: PlannedExercise[] = [
    variantToExercise(main, 4, mainScheme.reps, mainScheme.rir, mainScheme.rest),
  ]

  // Secondary lift (if session has one)
  if (defaults.default_secondary && !context.banned_variants.has(defaults.default_secondary)) {
    const sec = resolveVariant(defaults.default_secondary)
    if (sec) {
      const secScheme = pickRepScheme(sec.role, directives.goal, context.rep_scheme_override)
      exercises.push(
        variantToExercise(sec, 3, secScheme.reps, secScheme.rir, secScheme.rest),
      )
    }
  }

  // Accessories — target 3 accessories on leg days, 2 on upper days
  const accessoryTarget = sessionType.startsWith('lower') ? 3 : 2
  for (const acc of pickAccessories(sessionType, context, accessoryTarget)) {
    const accScheme = pickRepScheme(acc.role, directives.goal, null)
    exercises.push(variantToExercise(acc, 3, accScheme.reps, accScheme.rir, accScheme.rest))
  }

  // Deload on week 6
  const finalExercises = weekNumber === 6 ? applyDeload(exercises) : exercises

  // Build rationale from context — short, descriptive, under 280 chars.
  const rationaleParts: string[] = []
  if (context.preferred_variants.length > 0) {
    rationaleParts.push(
      `rehab-appropriate main lift for wk ${weekNumber}: ${main.name.toLowerCase()}.`,
    )
  } else {
    rationaleParts.push(`${defaults.title} focus with ${main.name.toLowerCase()}.`)
  }
  if (context.priority_accessories.length > 0) {
    rationaleParts.push(
      `injury-priority accessories first (${context.priority_accessories.slice(0, 2).join(', ')}).`,
    )
  }
  if (weekNumber === 6) {
    rationaleParts.push('deload week — reduced volume, reassess progress.')
  }
  const rationale = rationaleParts.join(' ').slice(0, 280)

  // Estimated minutes: 4 sets × (reps × 3s + rest) per exercise, rough.
  const estimatedMinutes = Math.min(
    120,
    Math.max(
      25,
      finalExercises.reduce((acc, ex) => acc + ex.sets * (ex.rest_seconds / 60 + 0.8), 0),
    ),
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
function spreadDaysOfWeek(sessionsPerWeek: number): number[] {
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
export function buildMesocycle(
  directives: ProgrammingDirectives,
  lengthWeeks = 6,
): BuiltMesocycle {
  const template = directives.week_shape.template
  const sessionsPerWeek = directives.week_shape.sessions_per_week
  const dayOfWeekSpread = spreadDaysOfWeek(sessionsPerWeek)

  const sessions: PlannedSession[] = []
  for (let week = 1; week <= lengthWeeks; week += 1) {
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
        }),
      )
    }
  }

  return {
    id: `meso-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    length_weeks: lengthWeeks,
    sessions,
    generated_at: new Date().toISOString(),
  }
}
