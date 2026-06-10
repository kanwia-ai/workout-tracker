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
  equipmentAccessFor,
  variantAllowedByEquipment,
  isVariantDisliked,
  type MovementPattern,
  type VariantSpec,
} from './variants'
import { suggestStartingWeight } from './startingWeights'
import { substituteStaticStretch } from './staticStretchSubstitution'

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

// ─── Session main-slot movement pattern ────────────────────────────────────
// The movement pattern of each session type's MAIN-lift slot. Protocol stage
// constraints (allowed_main_variants, rep overrides, stage warmups) only
// apply to sessions whose main slot matches the pattern of the stage's
// variants — a squat-pattern meniscus stage must not rewrite the bench or
// row slot. Exported so integration tests can assert main-lift/focus match.
export const SESSION_MAIN_PATTERN: Record<SessionType, MovementPattern> = {
  lower_squat_focus: 'squat',
  lower_hinge_focus: 'hinge',
  upper_push: 'push',
  upper_pull: 'pull',
  full_body_a: 'squat',
  full_body_b: 'hinge',
  conditioning: 'hinge',
  rehab_mobility: 'hinge',
}

// Reverse lookup: persisted session subtitle → SessionType. The subtitle is
// the stable session-shape marker the planner stamps on every session, so
// downstream consumers (local swap safety, rehab continuity) can recover the
// session type from a stored PlannedSession without re-deriving the week
// template.
const SUBTITLE_TO_SESSION_TYPE: ReadonlyMap<string, SessionType> = new Map(
  (Object.entries(SESSION_DEFAULTS) as Array<[SessionType, SessionDefaults]>).map(
    ([type, defaults]) => [defaults.subtitle, type],
  ),
)

export function sessionTypeForSubtitle(subtitle: string): SessionType | null {
  return SUBTITLE_TO_SESSION_TYPE.get(subtitle) ?? null
}

// ─── Per-muscle weekly volume landmarks (MEV / MAV / MRV) ──────────────────
// docs/research/00-MASTER-SYNTHESIS.md "Volume landmarks per muscle per week"
// (R1 P2 — Israetel/Schoenfeld). Hard sets/muscle/week at RIR 0-3. Where the
// research publishes a range we take the conservative end: MEV is the floor
// the engine must hit for every muscle the split claims to train, MAV (low
// end) is the accumulation target, MRV (low end) is the ceiling additions
// may never breach. The audit finding this implements: "MEV/MAV/MRV volume
// landmarks are implemented nowhere — fixed 4/3/3 sets + time filler".
export interface VolumeLandmark {
  mev: number
  mav: number
  mrv: number
}

export const VOLUME_LANDMARKS: Readonly<Partial<Record<MuscleGroup, VolumeLandmark>>> = {
  chest: { mev: 8, mav: 12, mrv: 20 },
  back: { mev: 10, mav: 14, mrv: 22 },
  shoulders: { mev: 8, mav: 14, mrv: 22 },
  biceps: { mev: 8, mav: 14, mrv: 20 },
  triceps: { mev: 6, mav: 10, mrv: 18 },
  quads: { mev: 8, mav: 12, mrv: 20 },
  hamstrings: { mev: 6, mav: 10, mrv: 16 },
  glutes: { mev: 6, mav: 8, mrv: 16 },
  calves: { mev: 8, mav: 12, mrv: 20 },
  core: { mev: 4, mav: 8, mrv: 15 },
}

// Deterministic enforcement order when the user has no muscle_priority —
// the landmark table's own order (upper-body pressing/pulling first).
const ORDERED_LANDMARK_MUSCLES = Object.keys(VOLUME_LANDMARKS) as MuscleGroup[]

// Reverse index: PlannedExercise.library_id → VariantSpec. Variants with a
// curated library link (e.g. ex-hip-thrust) emit that id, everything else
// emits `variant:<id>` — mirror variantToExercise's derivation exactly.
const LIBRARY_ID_TO_VARIANT: ReadonlyMap<string, VariantSpec> = (() => {
  const m = new Map<string, VariantSpec>()
  for (const pool of [MAIN_VARIANTS, ACCESSORY_VARIANTS]) {
    for (const v of Object.values(pool)) {
      const key = v.library_id ?? `variant:${v.id}`
      if (!m.has(key)) m.set(key, v)
    }
  }
  return m
})()

// Rehab, mobility, and cardio work isn't a "hard set" — only stimulus roles
// count toward (and receive) landmark volume.
const COUNTED_VOLUME_ROLES = new Set(['main lift', 'accessory', 'isolation', 'core'])

// Per-exercise weekly working-set ceiling: straight sets stay the backbone;
// past 5 sets of one movement the marginal stimulus drops — spread further
// volume across movements instead.
const SET_CAP_PER_EXERCISE = 5

// A freshly-added volume exercise starts at 2 sets — the minimum honest dose.
const NEW_EXERCISE_SETS = 2

type TrainingTier = 'novice' | 'intermediate' | 'advanced'

// Same breakpoints as autoProgress/startingWeights: <12mo novice, <36mo
// intermediate, 36+ advanced; unknown → intermediate (long-standing default).
function trainingTierFor(months: number | undefined): TrainingTier {
  if (months === undefined) return 'intermediate'
  if (months < 12) return 'novice'
  if (months < 36) return 'intermediate'
  return 'advanced'
}

/**
 * Weekly set target for one muscle: start the block at MEV, ramp linearly to
 * the tier ceiling by the last work week (deload week is excluded upstream).
 * Tier ceilings per the research overlay: novice caps at MEV+2, intermediate
 * targets MAV, advanced may push slightly past MAV (never past MRV).
 */
export function weeklyVolumeTarget(
  lm: VolumeLandmark,
  weekNumber: number,
  lengthWeeks: number,
  tier: TrainingTier,
  bias = 0,
): number {
  const ceiling =
    tier === 'novice' ? lm.mev + 2
    : tier === 'advanced' ? Math.min(lm.mav + 2, lm.mrv)
    : lm.mav
  const workWeeks = Math.max(2, lengthWeeks - 1)
  const t = Math.min(1, Math.max(0, (weekNumber - 1) / (workWeeks - 1)))
  const base = lm.mev + (ceiling - lm.mev) * t
  // volume_bias: ±2 sets per step, floored just under MEV (a "ran hot" block
  // starts as a recovery block, not a collapse) and capped at MRV.
  const floor = Math.max(1, lm.mev - 2)
  return Math.min(lm.mrv, Math.max(floor, Math.round(base + bias * 2)))
}

/**
 * Count weekly hard sets per muscle across a week's sessions. Primary muscles
 * get full credit, secondaries half credit (indirect volume counts ~half per
 * the RP convention). Exported so tests audit emitted plans with the same
 * accounting the engine enforces.
 */
export function countWeeklySetsPerMuscle(
  sessions: readonly PlannedSession[],
): Map<MuscleGroup, number> {
  const out = new Map<MuscleGroup, number>()
  for (const s of sessions) {
    for (const ex of s.exercises) {
      if (!COUNTED_VOLUME_ROLES.has(ex.role)) continue
      const v = LIBRARY_ID_TO_VARIANT.get(ex.library_id)
      if (!v) continue
      for (const m of v.primary_muscles) out.set(m, (out.get(m) ?? 0) + ex.sets)
      for (const m of v.secondary_muscles) out.set(m, (out.get(m) ?? 0) + ex.sets * 0.5)
    }
  }
  return out
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

export function mergeDirectivesForSession(
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
        // Bans are safety constraints — they apply to every session type.
        for (const b of stage.banned_variants) banned.add(b)
        // Everything else in the stage only constrains the session slot whose
        // movement pattern matches the stage's target. A meniscus stage lists
        // squat variants — it owns squat-pattern slots, NOT the bench/row/
        // hinge slots (the audit's "goblet squat on every day" leak). When a
        // stage lists variants across patterns (e.g. shoulder rehab allows
        // both modified presses and rows), each variant routes only to its
        // matching slot. A stage whose variants resolve to no pattern at all
        // (loose protocol ids) is treated as pattern-agnostic — conservative
        // old behavior for overrides/warmups, with nothing to prefer.
        const slotPattern = SESSION_MAIN_PATTERN[sessionType]
        const stagePatterns = new Set<MovementPattern>()
        for (const a of stage.allowed_main_variants) {
          const p = resolveVariant(a)?.pattern
          if (p) stagePatterns.add(p)
        }
        const constrainsThisSlot =
          stagePatterns.size === 0 || stagePatterns.has(slotPattern)
        if (constrainsThisSlot) {
          for (const a of stage.allowed_main_variants) {
            const v = resolveVariant(a)
            if (v?.pattern !== slotPattern) continue
            if (!preferred.includes(a)) preferred.push(a)
          }
          for (const el of stage.warmup_protocol) {
            // Swap static stretches for dynamic equivalents (or drop) — static
            // holds pre-lift transiently cut force output. See
            // staticStretchSubstitution.ts.
            const sub = substituteStaticStretch(el.name)
            if (sub && !warmupElements.includes(sub)) warmupElements.push(sub)
          }
          if (stage.rep_scheme_override) {
            // First-in wins for rep override (most-rehab-active injury drives)
            if (!repOverride) repOverride = stage.rep_scheme_override
          }
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
        // Same static-stretch guard as the rehab-stage path above.
        const sub = substituteStaticStretch(el)
        if (sub && !warmupElements.includes(sub)) warmupElements.push(sub)
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

  // ── Root-cause integration ───────────────────────────────────────────────
  // WHY: Root-cause patterns (desk worker + chronic LBP, etc.) need to
  // surface their priority work WITHOUT being filtered out by the same
  // injury that triggered them. The `do_not_ban` allowlist is the key —
  // chronic LBP triggers the protocol but should NOT remove deadlift/
  // squat/RDL from a user whose root cause is desk posture (those
  // movements ARE the rehab). Stems are matched as substrings so loose
  // labels like 'deadlift' cover every loaded variant ID.
  const doNotBanStems: string[] = []
  for (const flag of directives.root_causes) {
    const scope = flag.applies_to_session_type
    // null/undefined → applies to every session (session-agnostic correctives).
    // Otherwise: only fire when the current session is in the explicit list.
    if (scope && scope.length > 0 && !scope.includes(sessionType)) continue
    for (const pw of flag.priority_work) {
      // No ACCESSORY_VARIANTS gate here — root-cause IDs are loose labels
      // (e.g. 'glute_med_isolation') that may not map 1:1 to a registered
      // variant. `pickAccessories` already skips unresolvable IDs, so we
      // preserve the priority hint in the merged context while staying
      // robust to incomplete variant coverage.
      if (!priorityAcc.includes(pw)) priorityAcc.push(pw)
    }
    for (const stem of flag.do_not_ban) {
      if (!doNotBanStems.includes(stem)) doNotBanStems.push(stem)
    }
  }
  // Apply the allowlist: any banned variant whose id contains a
  // do_not_ban stem (case-insensitive substring) is rescued. This is what
  // makes chronic-LBP-on-a-desk-worker still able to deadlift — the
  // posterior-chain pattern IS the corrective, not the contraindication.
  if (doNotBanStems.length > 0) {
    for (const variantId of [...banned]) {
      const lower = variantId.toLowerCase()
      if (doNotBanStems.some((stem) => lower.includes(stem.toLowerCase()))) {
        banned.delete(variantId)
      }
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

// ─── Profile-driven selection filters ──────────────────────────────────────
// Equipment + dislikes computed once per session build and applied at every
// selection point. Injury bans stay the stronger filter: selection relaxes
// dislikes (then equipment) before it would ever breach a ban.
interface SelectionFilters {
  access: Set<string> | null          // null = unrestricted equipment
  dislikes: NonNullable<UserProgramProfile['exercise_dislikes']>
}

function filtersFor(profile?: UserProgramProfile): SelectionFilters {
  return {
    access: equipmentAccessFor(profile?.equipment),
    dislikes: profile?.exercise_dislikes ?? [],
  }
}

function passesFilters(v: VariantSpec, f: SelectionFilters): boolean {
  return variantAllowedByEquipment(v, f.access) && !isVariantDisliked(v, f.dislikes)
}

// ─── Main-lift selection ───────────────────────────────────────────────────
// Prefer the first preferred_variant that isn't banned. Fall back to the
// session-type default (unless banned — then use the first accepted preferred).
function pickMainLift(
  sessionType: SessionType,
  context: MergedSessionContext,
  filters: SelectionFilters,
): VariantSpec {
  // 1. Check preferred_variants (from stages) first
  for (const id of context.preferred_variants) {
    if (context.banned_variants.has(id)) continue
    const v = resolveVariant(id)
    if (v && passesFilters(v, filters)) return v
  }
  // 2. Fall back to session-type default if not banned
  const defaults = SESSION_DEFAULTS[sessionType]
  if (!context.banned_variants.has(defaults.default_main)) {
    const v = resolveVariant(defaults.default_main)
    if (v && passesFilters(v, filters)) return v
  }
  // 3. Scan MAIN_VARIANTS for the first non-banned, filter-passing variant on
  //    the session's main-slot movement pattern (bench gone → another press,
  //    never a squat on push day).
  const slotPattern = SESSION_MAIN_PATTERN[sessionType]
  for (const [id, v] of Object.entries(MAIN_VARIANTS)) {
    if (context.banned_variants.has(id)) continue
    if (v.pattern !== slotPattern) continue
    if (passesFilters(v, filters)) return v
  }
  // 4. Same scan, matching session focus muscles instead of pattern.
  for (const [id, v] of Object.entries(MAIN_VARIANTS)) {
    if (context.banned_variants.has(id)) continue
    const overlap = v.primary_muscles.some((m) => defaults.focus.includes(m))
    if (overlap && passesFilters(v, filters)) return v
  }
  // 5. Relax dislikes (preference yields to having a workout at all), keep
  //    equipment honest — bodyweight variants always pass this gate.
  for (const [id, v] of Object.entries(MAIN_VARIANTS)) {
    if (context.banned_variants.has(id)) continue
    if (variantAllowedByEquipment(v, filters.access)) return v
  }
  // 6. Last-resort: first unbanned main variant (never breach a ban).
  const fallback = Object.entries(MAIN_VARIANTS).find(
    ([id]) => !context.banned_variants.has(id),
  )
  return fallback ? fallback[1] : MAIN_VARIANTS.split_squat_bodyweight!
}

// ─── Secondary-lift selection ──────────────────────────────────────────────
// The session default when it survives bans + filters; otherwise the first
// same-pattern substitute (a user who dislikes overhead pressing still gets
// a second press, not a hole in the session). Returns null when nothing fits.
function pickSecondary(
  sessionType: SessionType,
  context: MergedSessionContext,
  filters: SelectionFilters,
  takenLibraryIds: ReadonlySet<string>,
): VariantSpec | null {
  const defaults = SESSION_DEFAULTS[sessionType]
  const defaultId = defaults.default_secondary
  if (!defaultId) return null
  const libIdOf = (v: VariantSpec): string => v.library_id ?? `variant:${v.id}`
  const def = resolveVariant(defaultId)
  if (
    def &&
    !context.banned_variants.has(defaultId) &&
    passesFilters(def, filters) &&
    !takenLibraryIds.has(libIdOf(def))
  ) {
    return def
  }
  const pattern = def?.pattern ?? SESSION_MAIN_PATTERN[sessionType]
  // Rehab-stage variants first — when the default secondary is stage-banned,
  // the substitute should come from what the stage allows, not the full pool.
  for (const id of context.preferred_variants) {
    const v = resolveVariant(id)
    if (!v || v.pattern !== pattern) continue
    if (context.banned_variants.has(id)) continue
    if (!passesFilters(v, filters)) continue
    if (takenLibraryIds.has(libIdOf(v))) continue
    return v
  }
  for (const [id, v] of Object.entries(MAIN_VARIANTS)) {
    if (v.pattern !== pattern) continue
    if (context.banned_variants.has(id)) continue
    if (!passesFilters(v, filters)) continue
    if (takenLibraryIds.has(libIdOf(v))) continue
    return v
  }
  return null
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
    return {
      reps: `${lo}-${hi}`,
      rir: goal.primary_adaptation === 'strength_power' ? 1 : 2,
      rest: 180,
    }
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
// Take priority_accessories first (injury-driven), then accessories targeting
// the user's priority muscles, then session defaults up to target count. Add
// decompression_pair as a tail element. Equipment + dislikes hard-filter every
// step; when the defaults are wiped out by the equipment filter, a pool scan
// on the session's focus muscles keeps the card from going bare.
function pickAccessories(
  sessionType: SessionType,
  context: MergedSessionContext,
  targetCount: number,
  filters: SelectionFilters,
  priorityMuscles: readonly MuscleGroup[],
): VariantSpec[] {
  const picked: VariantSpec[] = []
  const pickedIds = new Set<string>()
  const defaults = SESSION_DEFAULTS[sessionType]

  const tryAdd = (id: string): void => {
    if (pickedIds.has(id) || context.banned_variants.has(id)) return
    const v = resolveVariant(id)
    if (!v || !passesFilters(v, filters)) return
    picked.push(v)
    pickedIds.add(id)
  }

  for (const id of context.priority_accessories) {
    tryAdd(id)
    if (picked.length >= targetCount) break
  }

  // Muscle-priority bias: pull pool accessories whose primary muscle is one
  // of the user's picks onto sessions that already train that muscle, in
  // priority order (first pick's accessories lead).
  for (const muscle of priorityMuscles) {
    if (!defaults.focus.includes(muscle)) continue
    for (const [id, v] of Object.entries(ACCESSORY_VARIANTS)) {
      if (v.primary_muscles[0] !== muscle) continue
      tryAdd(id)
      if (picked.length >= targetCount) break
    }
    if (picked.length >= targetCount) break
  }

  if (picked.length < targetCount) {
    for (const id of defaults.default_accessories) {
      tryAdd(id)
      if (picked.length >= targetCount) break
    }
  }

  // Equipment-poor fallback: the session HAS default accessories but the
  // filters removed them — scan the pool for anything matching the session
  // focus so minimal-equipment users still get a complete card.
  if (picked.length < 2 && defaults.default_accessories.length > 0) {
    for (const [id, v] of Object.entries(ACCESSORY_VARIANTS)) {
      if (!v.primary_muscles.some((m) => defaults.focus.includes(m))) continue
      tryAdd(id)
      if (picked.length >= 2) break
    }
  }

  for (const id of context.decompression_pair) {
    tryAdd(id)
  }

  return picked
}

// ─── Session-exercise ordering (categorical rules) ────────────────────────
// The two categorical ordering rules from docs/research/02-coaching-philosophy.md:
// (1) Compound lifts come first within a session — they earn their place by producing
//     fatigue/strength/growth smaller exercises can't, and they warm up downstream isolations.
// (2) Consecutive exercises group by primary muscle — switching tells the muscle "we're done"
//     and reduces growth stimulus. Within a block, compound first.
//
// The reorder is three passes over the post-selection exercise list:
//   Pass 1: assign each exercise to a primary-muscle bucket.
//   Pass 2: within each bucket, compounds come before non-compounds.
//   Pass 3: order the buckets — session.focus[0], then focus[1..], then everything else.
//
// `compound` here means role === 'main lift'. The planner's variant pool already
// classifies multi-joint movements with this role (squat, hinge, press, row,
// pull-up). Accessory/isolation/rehab/mobility/core are NOT compounds even when
// they happen to be multi-joint. The LLM prompt (generatePlan.ts) carries a
// broader movement-pattern definition because it operates on a different pool.

// Find the primary muscle bucket key for a planned exercise. Variant-derived
// exercises encode their id as `variant:${id}`, so we can resolve back to the
// VariantSpec and read `primary_muscles[0]`. If we can't resolve (defensive
// fallback for non-variant library_ids), bucket under '__unknown__' so the
// exercise stays at its current relative position via stable sort.
function primaryMuscleOf(ex: PlannedExercise): MuscleGroup | '__unknown__' {
  const libId = ex.library_id
  if (libId.startsWith('variant:')) {
    const variantId = libId.slice('variant:'.length)
    const v = resolveVariant(variantId)
    if (v && v.primary_muscles.length > 0) return v.primary_muscles[0]!
  }
  return '__unknown__'
}

// A "compound" within the planner is any exercise with role === 'main lift'.
// Accessories, isolations, rehab, mobility, core, and cardio are NOT compounds.
function isCompound(ex: PlannedExercise): boolean {
  return ex.role === 'main lift'
}

// Reorder a session's exercises so:
//   - Each muscle-group block is contiguous (no ping-pong).
//   - Within each block, compounds come first.
//   - Blocks are ordered by session.focus first, then anything else.
// Uses stable sorts throughout so otherwise-equal items preserve insertion order.
// Exported for direct unit testing of the categorical-ordering rules.
export function reorderExercisesForSession(
  exercises: PlannedExercise[],
  focus: MuscleGroup[],
): PlannedExercise[] {
  if (exercises.length <= 1) return exercises

  // Pass 1 — bucket by primary muscle, preserving insertion order within each bucket.
  const buckets = new Map<string, PlannedExercise[]>()
  for (const ex of exercises) {
    const key = primaryMuscleOf(ex)
    const arr = buckets.get(key)
    if (arr) arr.push(ex)
    else buckets.set(key, [ex])
  }

  // Pass 2 — within each bucket, stable-sort compounds before non-compounds.
  for (const [key, arr] of buckets) {
    const sorted = arr
      .map((ex, idx) => ({ ex, idx, compound: isCompound(ex) }))
      .sort((a, b) => {
        if (a.compound !== b.compound) return a.compound ? -1 : 1
        return a.idx - b.idx
      })
      .map((entry) => entry.ex)
    buckets.set(key, sorted)
  }

  // Pass 3 — order the buckets by session focus, then the rest.
  const orderedKeys: string[] = []
  for (const muscle of focus) {
    if (buckets.has(muscle) && !orderedKeys.includes(muscle)) orderedKeys.push(muscle)
  }
  // Append remaining buckets in their original first-appearance order.
  for (const key of buckets.keys()) {
    if (!orderedKeys.includes(key)) orderedKeys.push(key)
  }

  const out: PlannedExercise[] = []
  for (const key of orderedKeys) {
    out.push(...(buckets.get(key) ?? []))
  }
  return out
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
// Delphi consensus, Bell et al. 2023 (PMC10511399): cut volume OR intensity, not both —
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

// ─── Session wall-clock accounting ─────────────────────────────────────────
// One working set costs its rest window plus ~0.8 min of actual lifting.
// Estimated session minutes add fixed warmup (10) + cooldown (5) so the card
// matches the wall-clock experience, not just lifting time.
const WORK_MINUTES_PER_SET = 0.8
const WARMUP_MINUTES = 10
const COOLDOWN_MINUTES = 5

function liftingMinutesOf(exercises: readonly PlannedExercise[]): number {
  return exercises.reduce(
    (acc, ex) => acc + ex.sets * (ex.rest_seconds / 60 + WORK_MINUTES_PER_SET),
    0,
  )
}

function estimateSessionMinutes(exercises: readonly PlannedExercise[]): number {
  return Math.round(
    Math.min(120, Math.max(25, liftingMinutesOf(exercises) + WARMUP_MINUTES + COOLDOWN_MINUTES)),
  )
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
  const filters = filtersFor(profile)
  const priorityMuscles = profile?.muscle_priority ?? []
  const main = pickMainLift(sessionType, context, filters)
  const mainScheme = pickRepScheme('main lift', directives.goal, context.rep_scheme_override)
  const exercises: PlannedExercise[] = [
    variantToExercise(main, 4, mainScheme.reps, mainScheme.rir, mainScheme.rest, profile),
  ]

  // Secondary lift (if session has one) — pickSecondary substitutes a
  // same-pattern variant when the default is banned/disliked/unavailable.
  const sec = pickSecondary(
    sessionType,
    context,
    filters,
    new Set(exercises.map((e) => e.library_id)),
  )
  if (sec) {
    const secScheme = pickRepScheme(sec.role, directives.goal, context.rep_scheme_override)
    exercises.push(
      variantToExercise(sec, 3, secScheme.reps, secScheme.rir, secScheme.rest, profile),
    )
  }

  // Accessories — budget-driven. Pull the priority list (injury-forward + session
  // defaults + decompression pair), then add one at a time until we hit the
  // user's target lifting wall-clock (work + rest). This makes a 60-min request
  // produce a fuller session than a 45-min request, instead of every session
  // being the same fixed shape.
  const targetMin = directives.target_lifting_minutes ?? 60
  const minutesPerExercise = (ex: PlannedExercise): number =>
    ex.sets * (ex.rest_seconds / 60 + WORK_MINUTES_PER_SET)
  const currentMinutes = (): number =>
    exercises.reduce((acc, ex) => acc + minutesPerExercise(ex), 0)
  // Fetch a wide pool — we'll filter based on budget.
  // Dedupe against the main + secondary we already picked: an injury-driven
  // priority accessory (e.g. meniscus → glute_max_bridge_or_hip_thrust) can
  // collide with the session's default secondary (lower_hinge's hip thrust),
  // producing two "Barbell Hip Thrust" rows in the same session. Pick by
  // library_id, not name, so variant aliases still collapse correctly.
  const alreadyPickedIds = new Set(exercises.map((e) => e.library_id))
  const accessoryPool = pickAccessories(sessionType, context, 8, filters, priorityMuscles)
  for (const acc of accessoryPool) {
    // Mirror variantToExercise's library_id derivation EXACTLY — variants
    // with a curated library link (e.g. glute_max_bridge_or_hip_thrust →
    // ex-hip-thrust) emit that id, and comparing against `variant:${id}`
    // let the same hip thrust through twice (the audit's dedupe bug).
    const accLibraryId = acc.library_id ?? `variant:${acc.id}`
    if (alreadyPickedIds.has(accLibraryId)) continue
    const accScheme = pickRepScheme(acc.role, directives.goal, null)
    // The user's FIRST priority muscle earns an extra set on its accessories
    // (the second pick gets selection preference only — first pick stronger).
    const boosted =
      priorityMuscles.length > 0 &&
      acc.primary_muscles.includes(priorityMuscles[0]!)
    const candidate = variantToExercise(
      acc,
      boosted ? 4 : 3,
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

  // Reorder per the two categorical rules from docs/research/02-coaching-philosophy.md
  // sections 5 + 6: (1) compounds come first within a session; (2) consecutive
  // exercises group by primary muscle (no ping-pong); muscle-group blocks
  // ordered by session.focus first.
  const orderedExercises = reorderExercisesForSession(exercises, defaults.focus)

  // The seed `suggested_weight_lbs` is held flat across every week of the
  // block (see note above `applyDeload`). `computeAutoProgressionForSession`
  // owns the lb-by-lb trajectory once check-ins exist. Deload (last week
  // of the block) cuts set counts only.
  const finalExercises = isDeloadWeek ? applyDeload(orderedExercises) : orderedExercises

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

  return {
    id: `session-wk${weekNumber}-s${ordinal}`,
    week_number: weekNumber,
    ordinal,
    focus: defaults.focus,
    title: defaults.title,
    subtitle: defaults.subtitle,
    estimated_minutes: estimateSessionMinutes(finalExercises),
    exercises: finalExercises,
    day_of_week: dayOfWeek,
    rationale,
    status: 'upcoming',
  }
}

// ─── Weekly volume enforcement (MEV floors → MAV ramp, MRV-capped) ─────────
// Runs once per work week AFTER the week's sessions are built. Counts hard
// sets per muscle across the week, then closes per-muscle deficits against
// the week's ramped target: first by deepening existing exercises that train
// the muscle (fewest sets first, capped per exercise), then by adding a
// direct-work exercise from the pool. Every addition respects injury bans,
// equipment, dislikes, MRV ceilings, and the session minute cap. The deload
// week is excluded — it stays at 50% of base volume via applyDeload.

interface WeekSessionRef {
  session: PlannedSession
  sessionType: SessionType
  context: MergedSessionContext
  /** Conditioning / rehab_mobility sessions never receive landmark volume. */
  receivesVolume: boolean
  minutes: number
  changed: boolean
}

function fitsUnderMrv(
  v: VariantSpec,
  counts: Map<MuscleGroup, number>,
  increment: number,
): boolean {
  for (const m of v.primary_muscles) {
    const lm = VOLUME_LANDMARKS[m]
    if (!lm) continue
    if ((counts.get(m) ?? 0) + increment > lm.mrv) return false
  }
  // Secondaries earn half credit, so they breach MRV half as fast — but they
  // still breach it (the audit's cap is on TOTAL counted volume).
  for (const m of v.secondary_muscles) {
    const lm = VOLUME_LANDMARKS[m]
    if (!lm) continue
    if ((counts.get(m) ?? 0) + increment * 0.5 > lm.mrv) return false
  }
  return true
}

function creditSets(counts: Map<MuscleGroup, number>, v: VariantSpec, n: number): void {
  for (const m of v.primary_muscles) counts.set(m, (counts.get(m) ?? 0) + n)
  for (const m of v.secondary_muscles) counts.set(m, (counts.get(m) ?? 0) + n * 0.5)
}

// +1 set on the existing exercise that trains the muscle with the fewest
// working sets (spread before deepening). Deterministic tie-break: session
// order, then exercise order within the session.
function addSetForMuscle(
  muscle: MuscleGroup,
  refs: WeekSessionRef[],
  counts: Map<MuscleGroup, number>,
  capMinutes: number,
): boolean {
  let best: { ref: WeekSessionRef; ex: PlannedExercise; v: VariantSpec } | null = null
  for (const ref of refs) {
    if (!ref.receivesVolume) continue
    for (const ex of ref.session.exercises) {
      if (!COUNTED_VOLUME_ROLES.has(ex.role)) continue
      if (ex.sets >= SET_CAP_PER_EXERCISE) continue
      const v = LIBRARY_ID_TO_VARIANT.get(ex.library_id)
      if (!v || !v.primary_muscles.includes(muscle)) continue
      const setCost = ex.rest_seconds / 60 + WORK_MINUTES_PER_SET
      if (ref.minutes + setCost > capMinutes) continue
      if (!fitsUnderMrv(v, counts, 1)) continue
      if (!best || ex.sets < best.ex.sets) best = { ref, ex, v }
    }
  }
  if (!best) return false
  best.ex.sets += 1
  best.ref.minutes += best.ex.rest_seconds / 60 + WORK_MINUTES_PER_SET
  best.ref.changed = true
  creditSets(counts, best.v, 1)
  return true
}

// Add a direct-work exercise for the muscle to the session with the most
// remaining time. Candidate order: accessories whose FIRST primary muscle is
// the target (true direct work), then any accessory training it, then main
// variants — so a chest deficit gets a fly before a second press.
function addExerciseForMuscle(
  muscle: MuscleGroup,
  refs: WeekSessionRef[],
  counts: Map<MuscleGroup, number>,
  capMinutes: number,
  directives: ProgrammingDirectives,
  filters: SelectionFilters,
  profile?: UserProgramProfile,
): boolean {
  const candidates: VariantSpec[] = []
  const seen = new Set<string>()
  for (const [id, v] of Object.entries(ACCESSORY_VARIANTS)) {
    if (v.primary_muscles[0] === muscle) {
      candidates.push(v)
      seen.add(id)
    }
  }
  for (const [id, v] of Object.entries(ACCESSORY_VARIANTS)) {
    if (!seen.has(id) && v.primary_muscles.includes(muscle)) candidates.push(v)
  }
  for (const v of Object.values(MAIN_VARIANTS)) {
    if (v.primary_muscles.includes(muscle)) candidates.push(v)
  }

  // Host sessions: already train the muscle (focus or an existing exercise),
  // most headroom first; tie-break by ordinal for determinism.
  const hosts = refs
    .filter(
      (r) =>
        r.receivesVolume &&
        (r.session.focus.includes(muscle) ||
          r.session.exercises.some((e) =>
            LIBRARY_ID_TO_VARIANT.get(e.library_id)?.primary_muscles.includes(muscle),
          )),
    )
    .sort((a, b) => a.minutes - b.minutes || a.session.ordinal - b.session.ordinal)

  for (const v of candidates) {
    if (!COUNTED_VOLUME_ROLES.has(v.role)) continue
    if (!passesFilters(v, filters)) continue
    if (!fitsUnderMrv(v, counts, NEW_EXERCISE_SETS)) continue
    const scheme = pickRepScheme(v.role, directives.goal, null)
    const cost = NEW_EXERCISE_SETS * (scheme.rest / 60 + WORK_MINUTES_PER_SET)
    const libId = v.library_id ?? `variant:${v.id}`
    for (const ref of hosts) {
      if (ref.context.banned_variants.has(v.id)) continue
      if (ref.session.exercises.some((e) => e.library_id === libId)) continue
      if (ref.minutes + cost > capMinutes) continue
      ref.session.exercises.push(
        variantToExercise(v, NEW_EXERCISE_SETS, scheme.reps, scheme.rir, scheme.rest, profile),
      )
      ref.minutes += cost
      ref.changed = true
      creditSets(counts, v, NEW_EXERCISE_SETS)
      return true
    }
  }
  return false
}

function applyWeeklyVolume(args: {
  refs: WeekSessionRef[]
  weekNumber: number
  lengthWeeks: number
  directives: ProgrammingDirectives
  profile?: UserProgramProfile
}): void {
  const { refs, weekNumber, lengthWeeks, directives, profile } = args
  const tier = trainingTierFor(profile?.training_age_months)
  const filters = filtersFor(profile)
  const targetMin = directives.target_lifting_minutes ?? 60
  // Week 1 honors the onboarding time budget with the same +10% tolerance the
  // base builder uses. Later weeks earn +5% of target per week: the research
  // mandates ~1-2 added sets/muscle/week, and a frozen cap would stall the
  // ramp at week 2 for tight budgets. Peak week tops out at +30%.
  const capMinutes = targetMin * (1.1 + 0.05 * (weekNumber - 1))

  const counts = countWeeklySetsPerMuscle(refs.map((r) => r.session))

  // Coverage = muscles the split claims to train this week. A session under
  // active rehab-stage constraints pins its focus muscles to MEV — never ramp
  // volume through a healing joint ("injury: cap at MEV until cleared").
  const coverage: MuscleGroup[] = []
  const rehabCapped = new Set<MuscleGroup>()
  for (const r of refs) {
    if (!r.receivesVolume) continue
    for (const m of r.session.focus) {
      if (!VOLUME_LANDMARKS[m]) continue
      if (!coverage.includes(m)) coverage.push(m)
      if (r.context.preferred_variants.length > 0 || r.context.rep_scheme_override) {
        rehabCapped.add(m)
      }
    }
  }

  // Deterministic order: the user's muscle_priority picks win the time budget
  // first; everything else follows the landmark table's canonical order.
  const priorities = (profile?.muscle_priority ?? []).filter((m) => coverage.includes(m))
  const order = [
    ...priorities,
    ...ORDERED_LANDMARK_MUSCLES.filter(
      (m) => coverage.includes(m) && !priorities.includes(m),
    ),
  ]

  for (const muscle of order) {
    const lm = VOLUME_LANDMARKS[muscle]!
    const capped = rehabCapped.has(muscle)
    const target = capped
      ? lm.mev
      : weeklyVolumeTarget(lm, weekNumber, lengthWeeks, tier, directives.volume_bias ?? 0)
    let guard = 0
    while (guard < 40) {
      guard += 1
      const deficit = target - (counts.get(muscle) ?? 0)
      if (deficit <= 0) break
      if (addSetForMuscle(muscle, refs, counts, capMinutes)) continue
      // A new exercise lands at NEW_EXERCISE_SETS sets. On a rehab-capped
      // muscle that may not overshoot the MEV ceiling — staying one set shy
      // beats adding load above the cap on a healing joint.
      if (!capped || deficit >= NEW_EXERCISE_SETS) {
        if (
          addExerciseForMuscle(muscle, refs, counts, capMinutes, directives, filters, profile)
        ) {
          continue
        }
      }
      break // time/equipment too tight — deficit stands, priority already won
    }
  }

  // Restore the categorical ordering rules + honest time estimates on any
  // session the pass touched.
  for (const ref of refs) {
    if (!ref.changed) continue
    ref.session.exercises = reorderExercisesForSession(
      ref.session.exercises,
      ref.session.focus,
    )
    ref.session.estimated_minutes = estimateSessionMinutes(ref.session.exercises)
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
    const weekRefs: WeekSessionRef[] = []
    for (let i = 0; i < template.length; i += 1) {
      const sessionType = template[i]!
      const ordinal = i + 1
      const dow = dayOfWeekSpread[i] ?? 0
      const session = buildSession({
        sessionType,
        weekNumber: week,
        ordinal,
        directives,
        dayOfWeek: dow,
        profile,
        lengthWeeks: resolvedLength,
      })
      sessions.push(session)
      weekRefs.push({
        session,
        sessionType,
        context: mergeDirectivesForSession(sessionType, week, directives),
        receivesVolume:
          sessionType !== 'conditioning' && sessionType !== 'rehab_mobility',
        minutes: liftingMinutesOf(session.exercises),
        changed: false,
      })
    }
    // Deload week (the last week) stays at 50% of base volume — only work
    // weeks get the MEV→MAV accounting.
    if (week < resolvedLength) {
      applyWeeklyVolume({
        refs: weekRefs,
        weekNumber: week,
        lengthWeeks: resolvedLength,
        directives,
        profile,
      })
    }
  }

  return {
    id: `meso-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    length_weeks: resolvedLength,
    sessions,
    generated_at: new Date().toISOString(),
  }
}
