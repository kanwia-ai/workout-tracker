import { db } from './db'
import { callEdge } from './generate'
import { MesocycleSchema, type Mesocycle } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'

// ─── Equipment mapping ──────────────────────────────────────────────────────
// Maps free-exercise-db equipment strings → the Equipment enum values we ship
// in the onboarding form. An entry is included if ANY of the user's chosen
// equipment values appears in the allow-list for that entry.
//
// Rationale per tag:
//   "body only"   → always allowed; every profile can do calisthenics.
//   "barbell"     → full_gym, barbell.
//   "dumbbell"    → full_gym, home_weights.
//   "cable"       → full_gym, cable_machine.
//   "machine"     → full_gym (treated as commercial-gym equipment).
//   "kettlebells" → full_gym, home_weights.
//   "bands"       → full_gym, home_weights, bands_only.
//   "e-z curl bar"→ full_gym, barbell.
//   "other"       → full_gym only (conservative; unknown requirement).
//   null/unknown  → full_gym only (same reasoning).
type EquipmentTag =
  | 'body only'
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'kettlebells'
  | 'bands'
  | 'e-z curl bar'
  | 'other'

const EQUIPMENT_PERMITS: Record<EquipmentTag, ReadonlyArray<UserProgramProfile['equipment'][number]>> = {
  'body only': ['full_gym', 'home_weights', 'bands_only', 'bodyweight_only', 'cable_machine', 'barbell'],
  'barbell': ['full_gym', 'barbell'],
  'dumbbell': ['full_gym', 'home_weights'],
  'cable': ['full_gym', 'cable_machine'],
  'machine': ['full_gym'],
  'kettlebells': ['full_gym', 'home_weights'],
  'bands': ['full_gym', 'home_weights', 'bands_only'],
  'e-z curl bar': ['full_gym', 'barbell'],
  'other': ['full_gym'],
}

function equipmentAllowed(entry: string | null, chosen: UserProgramProfile['equipment']): boolean {
  const tag = (entry ?? 'other') as EquipmentTag
  const allowList = EQUIPMENT_PERMITS[tag] ?? EQUIPMENT_PERMITS['other']
  return chosen.some(c => allowList.includes(c))
}

export interface ExercisePoolEntry {
  id: string
  name: string
  primaryMuscles: string[]
  equipment: string | null
}

// Build a lean exercise pool suitable for stuffing into a Gemini prompt. Caps
// at 200 entries to stay well under token limits.
export async function buildExercisePool(profile: UserProgramProfile): Promise<ExercisePoolEntry[]> {
  const rows = await db.exerciseLibrary.toArray()
  return rows
    .filter(r => equipmentAllowed(r.equipment, profile.equipment))
    .slice(0, 200)
    .map(r => ({
      id: r.id,
      name: r.name,
      primaryMuscles: r.primaryMuscles,
      equipment: r.equipment,
    }))
}

// Generate a new mesocycle by calling the edge function, validating the result,
// and persisting it to Dexie. Throws if the edge call fails or returns an
// invalid shape. We deliberately do NOT fall back to a templated plan —
// surface the error so the UI can retry.
export async function generatePlan(
  profile: UserProgramProfile,
  userId: string,
  weeks: number = 6,
): Promise<Mesocycle> {
  const exercisePool = await buildExercisePool(profile)

  // The server never sees user_id / generated_at / profile_snapshot, so strip
  // them from the schema the edge function validates against.
  const partialSchema = MesocycleSchema.omit({
    user_id: true,
    generated_at: true,
    profile_snapshot: true,
  })

  const raw = await callEdge(
    'generate_plan',
    { profile, exercisePool, weeks },
    partialSchema,
  )

  const merged = {
    ...raw,
    user_id: userId,
    generated_at: new Date().toISOString(),
    profile_snapshot: profile,
  }
  const result = MesocycleSchema.safeParse(merged)
  if (!result.success) {
    throw new Error(`generatePlan: merged mesocycle failed validation — ${result.error.message}`)
  }
  const meso = result.data

  await db.mesocycles.put({
    id: meso.id,
    user_id: meso.user_id,
    generated_at: meso.generated_at,
    length_weeks: meso.length_weeks,
    sessions_json: JSON.stringify(meso.sessions),
    profile_snapshot_json: JSON.stringify(profile),
    synced: false,
  })

  return meso
}

/**
 * Load a persisted mesocycle from Dexie, unmarshaling the JSON-stringified
 * sessions and profile_snapshot fields, and re-validating the shape. Returns
 * null if no row exists for `id`. Throws if stored JSON is malformed or the
 * unmarshaled object fails `MesocycleSchema` validation (indicates migration
 * bug or schema drift).
 *
 * Task 3.2's `usePlan` hook should route through this helper rather than
 * casting the raw Dexie row.
 */
export async function loadMesocycle(id: string): Promise<Mesocycle | null> {
  const row = await db.mesocycles.get(id)
  if (!row) return null
  const candidate = {
    id: row.id,
    user_id: row.user_id,
    generated_at: row.generated_at,
    length_weeks: row.length_weeks,
    sessions: JSON.parse(row.sessions_json),
    profile_snapshot: JSON.parse(row.profile_snapshot_json),
  }
  return MesocycleSchema.parse(candidate)
}

/**
 * Load the most-recently-generated mesocycle for a user. Returns null when
 * the user has no plan yet (first-time user, or they've never onboarded).
 */
export async function loadLatestMesocycleForUser(userId: string): Promise<Mesocycle | null> {
  const row = await db.mesocycles
    .where('user_id')
    .equals(userId)
    .reverse()
    .sortBy('generated_at')
  const latest = row[row.length - 1]
  if (!latest) return null
  return loadMesocycle(latest.id)
}
