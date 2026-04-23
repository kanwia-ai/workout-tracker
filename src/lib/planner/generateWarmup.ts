// generateWarmup — per-session warmup composition.
//
// Given a PlannedSession + the ProgrammingDirectives that produced it,
// emits a structured warmup. Rule-based by default: pulls warmup_protocol
// from each active injury directive's current rehab stage + per_session_type
// warmup_focus, de-duplicates, and orders the result into a coherent flow
// (general mobility → targeted mobility → activation → specific prep).
//
// Phase 4 ships the rule-based path. Phase 5 can optionally replace the
// inner composition with a narrow LLM call for creative voice / variation,
// keeping the same input → output shape. The caching key is session-scoped
// so re-entering a session doesn't regenerate warmup copy on every mount.

import { z } from 'zod'
import type {
  ProgrammingDirectives,
  SessionType,
} from '../../types/directives'
import { getProtocol } from '../../data/rehab-protocols'
import { resolveStage } from './buildMesocycle'
import type { WarmupElement } from '../../data/rehab-protocols/types'

// ─── Output schema ─────────────────────────────────────────────────────────
export const StructuredWarmupExerciseSchema = z.object({
  name: z.string(),
  display_name: z.string(),        // friendly label for UI
  category: z.enum(['mobility', 'activation', 'cv_prep', 'specific']),
  duration_sec: z.number().int().optional(),
  reps: z.number().int().optional(),
  sets: z.number().int().optional(),
  cue: z.string().optional(),
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
})
export type StructuredWarmupExercise = z.infer<typeof StructuredWarmupExerciseSchema>

export const StructuredWarmupSchema = z.object({
  session_id: z.string(),
  estimated_minutes: z.number().int().min(3).max(20),
  exercises: z.array(StructuredWarmupExerciseSchema).min(1),
  summary: z.string(),
  source: z.enum(['rules', 'llm']),
})
export type StructuredWarmup = z.infer<typeof StructuredWarmupSchema>

// ─── Warmup element → friendly copy + category ─────────────────────────────
// Maps stable ids from protocol YAMLs to user-facing display names + a
// category so the flow can be ordered. Items not in the catalog fall
// through with a tidied-up name.

interface CatalogEntry {
  display: string
  category: StructuredWarmupExercise['category']
  default_duration_sec?: number
  default_reps?: number
  default_sets?: number
  cue?: string
}

const WARMUP_CATALOG: Record<string, CatalogEntry> = {
  // Cardio prep
  reverse_incline_walking: {
    display: 'Reverse Incline Walking',
    category: 'cv_prep',
    default_duration_sec: 300,
    cue: 'Treadmill: incline 10, speed 1 — light patellar load',
  },
  reverse_incline_walking_5min: {
    display: 'Reverse Incline Walking',
    category: 'cv_prep',
    default_duration_sec: 300,
    cue: 'Treadmill: incline 10, speed 1',
  },
  reverse_incline_walking_3min: {
    display: 'Reverse Incline Walking',
    category: 'cv_prep',
    default_duration_sec: 180,
    cue: 'Treadmill: incline 10, speed 1',
  },

  // Mobility
  cat_cow: {
    display: 'Cat / Cow',
    category: 'mobility',
    default_reps: 8,
    cue: 'End-range, no pain',
  },
  '90_90_hip_stretch': {
    display: '90/90 Hip Stretch',
    category: 'mobility',
    default_duration_sec: 60,
  },
  '90_90_hip': {
    display: '90/90 Hip Mobility',
    category: 'mobility',
    default_duration_sec: 60,
  },
  hip_airplane: {
    display: 'Hip Airplane',
    category: 'mobility',
    default_reps: 8,
    cue: 'Slow, controlled ER + IR at the hip',
  },
  ankle_dorsiflexion_mobility: {
    display: 'Ankle Dorsiflexion Mobility',
    category: 'mobility',
    default_duration_sec: 60,
    cue: 'Knee over toe, no heel lift',
  },
  ankle_dorsiflexion: {
    display: 'Ankle Dorsiflexion Drill',
    category: 'mobility',
    default_duration_sec: 45,
  },
  knee_to_wall_mobility: {
    display: 'Knee-to-Wall Ankle Mobility',
    category: 'mobility',
    default_reps: 10,
    cue: 'Knee tracks over big toe, heel planted',
  },
  thoracic_extension_foam_roller: {
    display: 'Thoracic Extension (Foam Roller)',
    category: 'mobility',
    default_duration_sec: 60,
  },
  thoracic_extension: {
    display: 'Thoracic Extension',
    category: 'mobility',
    default_duration_sec: 45,
  },
  couch_stretch: {
    display: 'Couch Stretch',
    category: 'mobility',
    default_duration_sec: 60,
    cue: '60s per side',
  },
  hip_flexor_stretch_kneeling: {
    display: 'Kneeling Hip Flexor Stretch',
    category: 'mobility',
    default_duration_sec: 60,
  },
  hip_flexor_stretch: {
    display: 'Hip Flexor Stretch',
    category: 'mobility',
    default_duration_sec: 60,
  },
  wrist_extension_mobility: {
    display: 'Wrist Extension Mobility',
    category: 'mobility',
    default_reps: 12,
  },
  wrist_flexion_mobility: {
    display: 'Wrist Flexion Mobility',
    category: 'mobility',
    default_reps: 12,
  },
  wrist_mobility: {
    display: 'Wrist Mobility',
    category: 'mobility',
    default_reps: 12,
  },

  // Activation
  bird_dog: {
    display: 'Bird Dog',
    category: 'activation',
    default_sets: 2,
    default_reps: 8,
    cue: 'Neutral spine, no rotation',
  },
  mcgill_curl_up: {
    display: 'McGill Curl-Up',
    category: 'activation',
    default_sets: 2,
    default_reps: 8,
  },
  side_plank: {
    display: 'Side Plank',
    category: 'activation',
    default_sets: 2,
    default_duration_sec: 20,
  },
  glute_bridge_march: {
    display: 'Glute Bridge March',
    category: 'activation',
    default_sets: 2,
    default_reps: 12,
    cue: 'Keep hips level',
  },
  banded_lateral_walk: {
    display: 'Banded Lateral Walk',
    category: 'activation',
    default_sets: 2,
    default_reps: 12,
  },
  banded_monster_walk: {
    display: 'Banded Monster Walk',
    category: 'activation',
    default_sets: 2,
    default_reps: 12,
  },
  terminal_knee_extensions_banded: {
    display: 'Banded Terminal Knee Extension',
    category: 'activation',
    default_sets: 2,
    default_reps: 15,
  },
  clamshell_banded: {
    display: 'Banded Clamshell',
    category: 'activation',
    default_sets: 2,
    default_reps: 15,
  },
  banded_clamshell: {
    display: 'Banded Clamshell',
    category: 'activation',
    default_sets: 2,
    default_reps: 15,
  },
  banded_external_rotation: {
    display: 'Banded External Rotation',
    category: 'activation',
    default_sets: 2,
    default_reps: 12,
  },
  banded_external_rotation_neutral: {
    display: 'Banded External Rotation (Neutral)',
    category: 'activation',
    default_sets: 2,
    default_reps: 15,
  },
  banded_scap_retraction_depression: {
    display: 'Banded Scap Retraction + Depression',
    category: 'activation',
    default_sets: 2,
    default_reps: 12,
  },
  banded_scap_retraction: {
    display: 'Banded Scap Retraction',
    category: 'activation',
    default_sets: 2,
    default_reps: 15,
  },
  banded_pull_apart: {
    display: 'Banded Pull-Apart',
    category: 'activation',
    default_sets: 2,
    default_reps: 15,
  },
  wall_slide: {
    display: 'Wall Slide',
    category: 'activation',
    default_sets: 2,
    default_reps: 10,
  },
  wall_slide_lower_trap: {
    display: 'Wall Slide (Lower Trap Bias)',
    category: 'activation',
    default_sets: 2,
    default_reps: 10,
  },
  scap_push_up: {
    display: 'Scap Push-Up',
    category: 'activation',
    default_sets: 2,
    default_reps: 10,
  },
  scap_pushup: {
    display: 'Scap Push-Up',
    category: 'activation',
    default_sets: 2,
    default_reps: 10,
  },
  face_pull_high: {
    display: 'Face Pull (High Cable)',
    category: 'activation',
    default_sets: 2,
    default_reps: 15,
  },
  prone_y_raise: {
    display: 'Prone Y Raise',
    category: 'activation',
    default_sets: 2,
    default_reps: 10,
  },
  chin_tuck: {
    display: 'Chin Tuck Isometric',
    category: 'activation',
    default_sets: 3,
    default_duration_sec: 10,
  },
  chin_tuck_isometric: {
    display: 'Chin Tuck Isometric',
    category: 'activation',
    default_sets: 3,
    default_duration_sec: 10,
  },
  isometric_wrist_extension_hold: {
    display: 'Isometric Wrist Extension Hold',
    category: 'activation',
    default_sets: 3,
    default_duration_sec: 20,
  },
  flexbar_warmup_set: {
    display: 'Flexbar Warm-Up Set',
    category: 'activation',
    default_reps: 10,
  },
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function lookupWarmup(name: string): CatalogEntry {
  const direct = WARMUP_CATALOG[name]
  if (direct) return direct
  // Fall through — show the id prettified as the display name, category=specific
  return {
    display: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    category: 'specific',
  }
}

function toStructuredExercise(
  id: string,
  override?: WarmupElement,
): StructuredWarmupExercise {
  const entry = lookupWarmup(id)
  const cat: StructuredWarmupExercise = {
    name: id,
    display_name: entry.display,
    category: entry.category,
  }
  if (entry.default_duration_sec !== undefined || override?.duration_sec !== undefined) {
    cat.duration_sec = override?.duration_sec ?? entry.default_duration_sec
  }
  if (entry.default_reps !== undefined || override?.reps !== undefined) {
    cat.reps = override?.reps ?? entry.default_reps
  }
  if (entry.default_sets !== undefined || override?.sets !== undefined) {
    cat.sets = override?.sets ?? entry.default_sets
  }
  if (entry.cue || override?.cue) {
    cat.cue = override?.cue ?? entry.cue
  }
  if (override?.params) cat.params = override.params
  return cat
}

const CATEGORY_ORDER: StructuredWarmupExercise['category'][] = [
  'cv_prep',
  'mobility',
  'activation',
  'specific',
]

function orderExercises(
  list: StructuredWarmupExercise[],
): StructuredWarmupExercise[] {
  return list
    .slice()
    .sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category)
      const bi = CATEGORY_ORDER.indexOf(b.category)
      return ai - bi
    })
}

function estimateMinutes(list: StructuredWarmupExercise[]): number {
  let seconds = 0
  for (const ex of list) {
    if (ex.duration_sec) {
      seconds += ex.duration_sec * (ex.sets ?? 1)
    } else if (ex.reps) {
      // Assume ~2 seconds per rep * sets
      seconds += ex.reps * (ex.sets ?? 1) * 2
    }
    seconds += 15  // transition time
  }
  return Math.max(3, Math.min(20, Math.round(seconds / 60)))
}

// ─── Input shape ───────────────────────────────────────────────────────────
export interface GenerateWarmupInput {
  session_id: string
  session_type: SessionType
  week_number: number
  directives: ProgrammingDirectives
}

// ─── Entry ─────────────────────────────────────────────────────────────────
// Pure function. Aggregates warmup_protocol entries from active stages and
// per_session_type warmup_focus strings into a single structured warmup.

export function generateWarmup(input: GenerateWarmupInput): StructuredWarmup {
  const { session_id, session_type, week_number, directives } = input

  // Collect (id, optional stage-emitted override) pairs from every injury.
  const collected = new Map<string, WarmupElement | undefined>()

  for (const inj of directives.injury_directives) {
    if (!inj.matched_protocol) continue
    const protocol = getProtocol(inj.matched_protocol)
    if (!protocol) continue

    // 1. Stage warmup_protocol (structured) — rehab severity
    if (inj.severity === 'rehab') {
      const stage = resolveStage(protocol, week_number, inj.stage_weeks)
      if (stage) {
        for (const el of stage.warmup_protocol) {
          if (!collected.has(el.name)) collected.set(el.name, el)
        }
      }
    }

    // 2. per_session_type warmup_focus (string ids)
    const perSession = protocol.per_session_type[session_type]
    if (perSession) {
      for (const id of perSession.warmup_focus) {
        if (!collected.has(id)) collected.set(id, undefined)
      }
    }
  }

  const exercises: StructuredWarmupExercise[] = []
  for (const [id, override] of collected) {
    exercises.push(toStructuredExercise(id, override))
  }

  // If nothing got collected (no injuries matched session_type), emit a
  // sensible generic warmup so we always return at least one element.
  if (exercises.length === 0) {
    if (session_type.startsWith('lower')) {
      exercises.push(
        toStructuredExercise('cat_cow'),
        toStructuredExercise('90_90_hip_stretch'),
        toStructuredExercise('glute_bridge_march'),
      )
    } else if (session_type.startsWith('upper')) {
      exercises.push(
        toStructuredExercise('thoracic_extension'),
        toStructuredExercise('banded_pull_apart'),
        toStructuredExercise('scap_push_up'),
      )
    } else {
      exercises.push(
        toStructuredExercise('cat_cow'),
        toStructuredExercise('90_90_hip_stretch'),
      )
    }
  }

  const ordered = orderExercises(exercises)
  const estMinutes = estimateMinutes(ordered)

  // Short summary — human-readable one-liner for UI
  const firstTwo = ordered.slice(0, 2).map((e) => e.display_name.toLowerCase())
  const summary = `${estMinutes}-min warmup: ${firstTwo.join(' + ')}${ordered.length > 2 ? ` + ${ordered.length - 2} more` : ''}.`

  return {
    session_id,
    estimated_minutes: estMinutes,
    exercises: ordered,
    summary,
    source: 'rules',
  }
}
