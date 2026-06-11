// Amend-today: today-only edits to the scheduled session — add mobility for
// a tight area, add an exercise, or re-pick exercises for the equipment you
// actually have in front of you. The plan is never mutated; everything lives
// in a DayAmendment on the date's override row and is applied at resolution
// time. Clear it and today snaps back to the original session.
import { db } from './db'
import { localDateISO } from './dayOverrides'
import {
  DayAmendmentSchema,
  amendmentIsEmpty,
  emptyAmendment,
  type DayAmendment,
} from '../types/amendment'
import type { PlannedExercise, PlannedSession } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'
import { swapVariantLocal } from './swapLocal'
import {
  equipmentAccessFor,
  resolveVariant,
  variantAllowedByEquipment,
} from './planner/variants'

// ─── Mobility catalog ───────────────────────────────────────────────────────
// Curated, deterministic, plain-language. Each area maps to 3 moves woven
// into the session (no standalone screens). All knee-safe and equipment-free
// (a band where listed has a no-band fallback in the name's cue).

export const MOBILITY_AREAS = [
  'hips',
  'lower_back',
  'upper_back_shoulders',
  'ankles_calves',
] as const
export type MobilityArea = (typeof MOBILITY_AREAS)[number]

export const MOBILITY_AREA_LABELS: Record<MobilityArea, string> = {
  hips: 'hips',
  lower_back: 'lower back',
  upper_back_shoulders: 'upper back + shoulders',
  ankles_calves: 'ankles + calves',
}

interface MobilityMove {
  id: string
  name: string
  sets: number
  reps: string
  cue?: string
}

const MOBILITY_CATALOG: Record<MobilityArea, MobilityMove[]> = {
  hips: [
    { id: 'mob_90_90', name: '90/90 Hip Switch', sets: 2, reps: '6-8 per side', cue: 'slow, tall chest' },
    { id: 'mob_couch_stretch', name: 'Couch Stretch', sets: 2, reps: '30-45s per side', cue: 'squeeze the back glute' },
    { id: 'mob_deep_squat_hold', name: 'Supported Deep Squat Hold', sets: 2, reps: '20-30s', cue: 'hold something, only as deep as the knee allows' },
  ],
  lower_back: [
    { id: 'mob_cat_cow', name: 'Cat-Cow', sets: 2, reps: '8-10', cue: 'move one vertebra at a time' },
    { id: 'mob_childs_pose_reach', name: "Child's Pose with Side Reach", sets: 2, reps: '30s per side' },
    { id: 'mob_leg_pullover_decompress', name: 'Lying Leg Pullover (Decompression)', sets: 2, reps: '8-10', cue: 'let the lower back relax' },
  ],
  upper_back_shoulders: [
    { id: 'mob_thoracic_opener', name: 'Thoracic Bench Opener', sets: 2, reps: '8-10', cue: 'elbows on a bench, sink the chest' },
    { id: 'mob_doorway_pec', name: 'Doorway Pec Stretch', sets: 2, reps: '30s per side' },
    { id: 'mob_wall_slide', name: 'Wall Slide', sets: 2, reps: '8-12', cue: 'ribs down, low back off the wall' },
  ],
  ankles_calves: [
    { id: 'mob_ankle_rock', name: 'Knee-to-Wall Ankle Rock', sets: 2, reps: '10 per side', cue: 'heel stays down' },
    { id: 'mob_calf_stretch_wall', name: 'Wall Calf Stretch', sets: 2, reps: '30s per side' },
    { id: 'mob_toe_elevated_hinge', name: 'Toes-Elevated Hinge', sets: 2, reps: '8-10', cue: 'soft knees, feel the calves lengthen' },
  ],
}

/** Mobility block for an area as ready-to-append PlannedExercise rows. */
export function mobilityExercisesForArea(area: MobilityArea): PlannedExercise[] {
  return MOBILITY_CATALOG[area].map((m) => ({
    library_id: `amend:${m.id}`,
    name: m.name,
    sets: m.sets,
    reps: m.reps,
    rir: 0,
    rest_seconds: 30,
    role: 'mobility',
    warmup_sets: [],
    ...(m.cue ? { notes: m.cue } : {}),
  }))
}

// ─── Captured video → today ─────────────────────────────────────────────────

/**
 * Convert a Gemini-extracted exercise (video capture flow) into a
 * PlannedExercise ready to append to today's session.
 */
export function plannedExerciseFromExtracted(
  ex: {
    name: string
    sets?: number
    reps?: string
    duration_seconds?: number
    form_cues: string[]
    notes?: string
  },
  libraryId: string,
): PlannedExercise {
  const noteBits = [
    ...(ex.form_cues.length > 0 ? [ex.form_cues.join('; ')] : []),
    ...(ex.notes ? [ex.notes] : []),
  ]
  return {
    library_id: libraryId,
    name: ex.name,
    sets: Math.min(10, Math.max(1, ex.sets ?? 3)),
    reps: ex.reps ?? (ex.duration_seconds ? `${ex.duration_seconds}s` : '8-12'),
    rir: 2,
    rest_seconds: 90,
    role: 'accessory',
    warmup_sets: [],
    ...(noteBits.length > 0 ? { notes: noteBits.join(' | ').slice(0, 500) } : {}),
  }
}

// ─── Different equipment today ──────────────────────────────────────────────

export interface EquipmentRepick {
  /** original library_id → replacement exercise (same role/pattern, injury-safe) */
  swaps: Record<string, PlannedExercise>
  /** exercises that already work with today's equipment */
  compatible: string[]
  /** exercises with no safe equivalent for today's equipment (kept, flagged) */
  unswappable: string[]
}

const SWAPPABLE_ROLES = new Set(['main lift', 'accessory', 'isolation', 'core'])

/**
 * Re-pick today's exercises for the equipment actually available, using the
 * same injury-aware swap machinery as the in-session swap button (bans,
 * rehab-stage constraints, and movement-pattern promises all hold).
 */
export function equipmentRepickForSession(
  session: PlannedSession,
  equipmentToday: UserProgramProfile['equipment'],
  profile: UserProgramProfile,
): EquipmentRepick {
  const todayProfile: UserProgramProfile = { ...profile, equipment: equipmentToday }
  const access = equipmentAccessFor(equipmentToday)
  const swaps: Record<string, PlannedExercise> = {}
  const compatible: string[] = []
  const unswappable: string[] = []

  for (const ex of session.exercises) {
    if (!SWAPPABLE_ROLES.has(ex.role)) {
      compatible.push(ex.library_id)
      continue
    }
    const rawId = ex.library_id.startsWith('variant:')
      ? ex.library_id.slice('variant:'.length)
      : ex.library_id
    const variant = resolveVariant(rawId)
    if (!variant) {
      // Unknown to the variant pool (custom/captured) — leave it; the user
      // added it themselves and knows what it needs.
      compatible.push(ex.library_id)
      continue
    }
    if (variantAllowedByEquipment(variant, access)) {
      compatible.push(ex.library_id)
      continue
    }
    try {
      const result = swapVariantLocal({
        currentExercise: ex,
        session,
        profile: todayProfile,
        reason: 'machine_busy',
      })
      swaps[ex.library_id] = result.replacement
    } catch {
      unswappable.push(ex.library_id)
    }
  }

  return { swaps, compatible, unswappable }
}

// ─── Application ────────────────────────────────────────────────────────────

const WORK_MINUTES_PER_SET = 0.8

function minutesFor(ex: PlannedExercise): number {
  return ex.sets * (ex.rest_seconds / 60 + WORK_MINUTES_PER_SET)
}

/**
 * Apply a DayAmendment to a resolved session. Pure — returns a new session
 * object with the same id (set-tracking localStorage keys stay valid).
 */
export function applyAmendment(
  session: PlannedSession,
  amendment: DayAmendment,
): PlannedSession {
  const present = new Set(session.exercises.map((e) => e.library_id))
  const swapped = session.exercises.map((ex) => amendment.swaps[ex.library_id] ?? ex)
  const additions = amendment.added_exercises.filter((e) => !present.has(e.library_id))
  const addedMinutes = additions.reduce((acc, e) => acc + minutesFor(e), 0)
  return {
    ...session,
    exercises: [...swapped, ...additions],
    estimated_minutes: Math.min(
      180,
      Math.round(session.estimated_minutes + addedMinutes),
    ),
  }
}

// ─── Persistence (rides on the dayOverrides row) ───────────────────────────

function overrideKey(userId: string, dateISO: string): string {
  return `${userId}:${dateISO}`
}

export function parseAmendment(json: string | undefined): DayAmendment | null {
  if (!json) return null
  try {
    const parsed = DayAmendmentSchema.safeParse(JSON.parse(json))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export async function loadAmendmentForDate(
  userId: string,
  dateISO: string = localDateISO(),
): Promise<DayAmendment> {
  const row = await db.dayOverrides.get(overrideKey(userId, dateISO))
  return parseAmendment(row?.amendment_json) ?? emptyAmendment()
}

/**
 * Upsert the amendment for a date. Creates the override row if missing
 * (pointing at the scheduled session so resolution is unchanged), preserves
 * an existing redirect's session_id, and deletes the row entirely when the
 * amendment empties out on a plain (non-redirect) row.
 */
export async function saveAmendmentForDate(
  userId: string,
  dateISO: string,
  scheduledSessionId: string,
  amendment: DayAmendment,
): Promise<void> {
  const key = overrideKey(userId, dateISO)
  const existing = await db.dayOverrides.get(key)

  if (amendmentIsEmpty(amendment)) {
    if (!existing) return
    if (existing.session_id === scheduledSessionId) {
      // Plain amendment row — remove it outright.
      await db.dayOverrides.delete(key)
    } else {
      // Redirect row that also carried an amendment — keep the redirect.
      await db.dayOverrides.put({ ...existing, amendment_json: undefined, synced: false })
    }
    return
  }

  await db.dayOverrides.put({
    id: key,
    user_id: userId,
    date: dateISO,
    session_id: existing?.session_id ?? scheduledSessionId,
    created_at: existing?.created_at ?? new Date().toISOString(),
    synced: false,
    amendment_json: JSON.stringify(amendment),
  })
}

export async function clearAmendmentForDate(
  userId: string,
  dateISO: string,
  scheduledSessionId: string,
): Promise<void> {
  await saveAmendmentForDate(userId, dateISO, scheduledSessionId, emptyAmendment())
}
