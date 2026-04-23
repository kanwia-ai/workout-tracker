import { db } from './db'
import { callEdge } from './generate'
import { MesocycleSchema, type Mesocycle } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'
import { orchestratePlan } from './planner/orchestrate'

// ─── Phase-2 migration helpers ──────────────────────────────────────────────
// Pre-2P.1 plans in Dexie lack `day_of_week` + `rationale`. On load, we
// back-fill both so `MesocycleSchema.parse` doesn't hard-fail a stale row.
// The fallback day distribution picks N days out of Mon-Sun that respect a
// rough 48h recovery pattern, matching what the Gemini prompt aims for.

/**
 * Returns an array of `day_of_week` values (0=Mon..6=Sun) that provides
 * reasonable recovery spacing for `perWeek` training sessions. Used by
 * `loadMesocycle` to back-fill legacy Phase-1 mesocycles that have no
 * server-assigned day_of_week.
 */
export function pickRecoveryPattern(perWeek: number): number[] {
  switch (perWeek) {
    case 1: return [0]
    case 2: return [0, 3]
    case 3: return [0, 2, 4]
    case 4: return [0, 1, 3, 4]
    case 5: return [0, 1, 2, 4, 5]
    case 6: return [0, 1, 2, 3, 4, 5]
    default: return [0, 1, 2, 3, 4, 5, 6]
  }
}

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
//
// TODO(custom-exercises): fold `db.customExercises.where('user_id').equals(userId)`
// into this pool so Claude can select the user's own variations (e.g. "incline
// push-ups") when generating a plan. Requires threading a userId into the
// signature (currently only profile) and updating the 4 call-sites + tests,
// plus a prompt update so the model knows these rows come from the user.
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
/**
 * Generate + persist a Mesocycle using the local rule-based clinical planner.
 *
 * Runs entirely in the client — zero API calls, zero cost. Output is a
 * schema-valid Mesocycle compatible with every other part of the app
 * (storage, rendering, day-override, session entry).
 *
 * Opt-in via `VITE_USE_LOCAL_PLANNER=true` — the default remains the
 * edge-function Anthropic path until Kyra flips the flag on deploy. See
 * docs/plans/2026-04-22-clinical-planner-architecture.md for the rationale.
 */
export async function generatePlanLocal(
  profile: UserProgramProfile,
  userId: string,
  weeks: number = 6,
): Promise<Mesocycle> {
  const { mesocycle } = orchestratePlan(profile, userId, weeks)

  await db.mesocycles.put({
    id: mesocycle.id,
    user_id: mesocycle.user_id,
    generated_at: mesocycle.generated_at,
    length_weeks: mesocycle.length_weeks,
    sessions_json: JSON.stringify(mesocycle.sessions),
    profile_snapshot_json: JSON.stringify(profile),
    synced: false,
  })

  return mesocycle
}

export async function generatePlan(
  profile: UserProgramProfile,
  userId: string,
  weeks: number = 6,
): Promise<Mesocycle> {
  // Opt-in route: VITE_USE_LOCAL_PLANNER=true uses the rule-based planner
  // and skips the edge function entirely. Default stays on the LLM path
  // until Kyra flips the flag (no auto-switch without explicit approval).
  if (import.meta.env.VITE_USE_LOCAL_PLANNER === 'true') {
    return generatePlanLocal(profile, userId, weeks)
  }

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

  // Back-fill missing fields for pre-2P.1 plans. Without this,
  // MesocycleSchema.parse would throw on every legacy row the moment Phase 2
  // (or v3 prompt) ships and make the user's app unbootable until they
  // regenerate. We accept a slightly imprecise fallback pattern to keep the
  // app loading — the user can always regenerate for a fresh coach-authored
  // rationale + ramp-set prescriptions.
  //
  // Fields back-filled:
  //   - day_of_week (pre-2P.1)                → picked from recovery pattern
  //   - rationale (pre-2P.1)                  → stub with regenerate hint
  //   - subtitle (pre-v3 prompt)              → "" (UI hides when empty)
  //   - exercises[].warmup_sets (pre-v3)      → [] (UI falls back to role heuristic)
  const rawSessions = candidate.sessions as Array<Record<string, unknown>>
  const needsBackfill = rawSessions.some(
    s => s.day_of_week === undefined
      || s.rationale === undefined
      || s.subtitle === undefined
      || (Array.isArray(s.exercises) && (s.exercises as Array<Record<string, unknown>>).some(
        ex => ex.warmup_sets === undefined,
      )),
  )
  if (needsBackfill) {
    const perWeek = Math.max(
      1,
      Math.ceil(rawSessions.length / Math.max(1, candidate.length_weeks)),
    )
    const pattern = pickRecoveryPattern(perWeek)
    for (const s of rawSessions) {
      if (s.day_of_week === undefined) {
        const ordinal = typeof s.ordinal === 'number' ? s.ordinal : 1
        s.day_of_week = pattern[(ordinal - 1) % pattern.length]
      }
      if (s.rationale === undefined) {
        s.rationale = 'Migrated from an earlier plan — regenerate for a fresher rationale.'
      }
      if (s.subtitle === undefined) {
        s.subtitle = ''
      }
      if (Array.isArray(s.exercises)) {
        for (const ex of s.exercises as Array<Record<string, unknown>>) {
          if (ex.warmup_sets === undefined) {
            ex.warmup_sets = []
          }
        }
      }
    }
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
