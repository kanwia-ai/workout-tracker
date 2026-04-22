import Dexie, { type EntityTable } from 'dexie'

// ─── Local Database (IndexedDB via Dexie) ─────────────────────────────────
// Primary storage. Syncs to Supabase when online.

interface LocalSessionLog {
  id: string
  user_id: string
  workout_id: string
  date: string
  started_at: string
  ended_at?: string
  phases_json: string
  completed_sets: number
  total_sets: number
  notes?: string
  synced: boolean
}

interface LocalSetLog {
  id: string
  session_log_id: string
  exercise_id: string
  set_number: number
  weight?: number
  reps_completed?: number
  timestamp: string
  synced: boolean
}

interface LocalCardioLog {
  id: string
  user_id: string
  date: string
  type: string
  duration_minutes: number
  incline?: number
  distance?: number
  notes?: string
  started_at?: string
  ended_at?: string
  synced: boolean
}

interface LocalPersonalRecord {
  id: string
  user_id: string
  exercise_id: string
  exercise_name: string
  weight: number
  date: string
  synced: boolean
}

interface LocalUserWeight {
  id: string
  user_id: string
  exercise_id: string
  weight: number
  date: string
  synced: boolean
}

// Public-domain exercise library (yuhonas/free-exercise-db, 873 entries).
// Seeded once on first load; see src/data/seedExerciseLibrary.ts
interface LibraryExercise {
  id: string                     // prefixed with "fedb:" to avoid collisions with curated IDs
  name: string
  force: string | null
  level: string | null
  mechanic: string | null
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  category: string | null
  imageCount: number
  rawId: string                  // original free-exercise-db id, used to build image URLs
}

// TODO(1.2): supabase migration pending — run `supabase db push` once CLI is linked.
interface LocalProfile {
  user_id: string   // PK
  profile_json: string  // JSON-stringified UserProgramProfile
  updated_at: string
  synced: boolean
}

// Generated mesocycle (training block). `sessions` and `profile_snapshot` are
// JSON-stringified to avoid needing per-field schema migrations as the plan
// shape evolves. Indexed fields kept flat for Dexie querying.
interface LocalMesocycle {
  id: string
  user_id: string
  generated_at: string
  length_weeks: number
  sessions_json: string             // JSON-stringified PlannedSession[]
  profile_snapshot_json: string     // JSON-stringified UserProgramProfile
  synced: boolean
}

// Per-session routine (warmup, cool-down, cardio). Generated on demand via the
// `generate_routine` edge op and keyed by `${session_id}:${kind}` so we have at
// most one saved routine of each kind per planned session.
interface LocalRoutine {
  id: string                        // `${session_id}:${kind}`
  session_id: string
  kind: 'warmup' | 'cooldown' | 'cardio'
  minutes: number
  focusTag?: string
  routine_json: string              // JSON-stringified Routine ({ title, exercises[] })
  generated_at: string
  synced: boolean
}

// Day-level override. A user decision to do a real workout on a scheduled
// rest day (or to swap a different session onto a given date). Keyed by
// `${user_id}:${dateISO}` so there's at most one override per date.
// session_id references a session already in the user's mesocycle — we
// don't duplicate session data, we just re-point the date.
interface LocalDayOverride {
  id: string                        // `${user_id}:${dateISO}`
  user_id: string
  date: string                      // YYYY-MM-DD (local time)
  session_id: string                // refs PlannedSession.id
  created_at: string
  synced: boolean
}

// User-authored custom exercise (e.g. "incline push-ups"). Lives alongside the
// curated EXERCISE_LIBRARY and the seeded exerciseLibrary (free-exercise-db).
// IDs are prefixed `custom:` to avoid collisions with curated (`ex-...`) or
// free-exercise-db (`fedb:...`) ids.
interface LocalCustomExercise {
  id: string                        // `custom:<uuid>`
  user_id: string
  name: string
  primary_muscles: string[]
  secondary_muscles: string[]
  equipment: string | null          // bodyweight, dumbbell, barbell, cable, machine, kettlebell, bands, other
  video_url: string | null          // optional YouTube URL
  notes: string | null
  created_at: string
  synced: boolean
}

const db = new Dexie('WorkoutTrackerDB') as Dexie & {
  sessionLogs: EntityTable<LocalSessionLog, 'id'>
  setLogs: EntityTable<LocalSetLog, 'id'>
  cardioLogs: EntityTable<LocalCardioLog, 'id'>
  personalRecords: EntityTable<LocalPersonalRecord, 'id'>
  userWeights: EntityTable<LocalUserWeight, 'id'>
  exerciseLibrary: EntityTable<LibraryExercise, 'id'>
  userProgramProfiles: EntityTable<LocalProfile, 'user_id'>
  mesocycles: EntityTable<LocalMesocycle, 'id'>
  routines: EntityTable<LocalRoutine, 'id'>
  dayOverrides: EntityTable<LocalDayOverride, 'id'>
  customExercises: EntityTable<LocalCustomExercise, 'id'>
}

db.version(1).stores({
  sessionLogs: 'id, user_id, workout_id, date, synced',
  setLogs: 'id, session_log_id, exercise_id, synced',
  cardioLogs: 'id, user_id, date, synced',
  personalRecords: 'id, user_id, exercise_id, synced',
  userWeights: 'id, user_id, exercise_id, date, synced',
})

db.version(2).stores({
  sessionLogs: 'id, user_id, workout_id, date, synced',
  setLogs: 'id, session_log_id, exercise_id, synced',
  cardioLogs: 'id, user_id, date, synced',
  personalRecords: 'id, user_id, exercise_id, synced',
  userWeights: 'id, user_id, exercise_id, date, synced',
  exerciseLibrary: 'id, name, category, equipment, level, *primaryMuscles, *secondaryMuscles',
})

db.version(3).stores({
  sessionLogs: 'id, user_id, workout_id, date, synced',
  setLogs: 'id, session_log_id, exercise_id, synced',
  cardioLogs: 'id, user_id, date, synced',
  personalRecords: 'id, user_id, exercise_id, synced',
  userWeights: 'id, user_id, exercise_id, date, synced',
  exerciseLibrary: 'id, name, category, equipment, level, *primaryMuscles, *secondaryMuscles',
  userProgramProfiles: 'user_id, updated_at, synced',
})

db.version(4).stores({
  sessionLogs: 'id, user_id, workout_id, date, synced',
  setLogs: 'id, session_log_id, exercise_id, synced',
  cardioLogs: 'id, user_id, date, synced',
  personalRecords: 'id, user_id, exercise_id, synced',
  userWeights: 'id, user_id, exercise_id, date, synced',
  exerciseLibrary: 'id, name, category, equipment, level, *primaryMuscles, *secondaryMuscles',
  userProgramProfiles: 'user_id, updated_at, synced',
  mesocycles: 'id, user_id, generated_at, synced',
})

db.version(5).stores({
  sessionLogs: 'id, user_id, workout_id, date, synced',
  setLogs: 'id, session_log_id, exercise_id, synced',
  cardioLogs: 'id, user_id, date, synced',
  personalRecords: 'id, user_id, exercise_id, synced',
  userWeights: 'id, user_id, exercise_id, date, synced',
  exerciseLibrary: 'id, name, category, equipment, level, *primaryMuscles, *secondaryMuscles',
  userProgramProfiles: 'user_id, updated_at, synced',
  mesocycles: 'id, user_id, generated_at, synced',
  routines: 'id, session_id, kind, generated_at, synced',
})

db.version(6).stores({
  sessionLogs: 'id, user_id, workout_id, date, synced',
  setLogs: 'id, session_log_id, exercise_id, synced',
  cardioLogs: 'id, user_id, date, synced',
  personalRecords: 'id, user_id, exercise_id, synced',
  userWeights: 'id, user_id, exercise_id, date, synced',
  exerciseLibrary: 'id, name, category, equipment, level, *primaryMuscles, *secondaryMuscles',
  userProgramProfiles: 'user_id, updated_at, synced',
  mesocycles: 'id, user_id, generated_at, synced',
  routines: 'id, session_id, kind, generated_at, synced',
  dayOverrides: 'id, user_id, date, session_id, synced',
})

// v7 — customExercises table (additive). Indexed fields mirror the free-exercise-db
// columns the ExerciseBrowser filters against, so a "mine" query is a cheap
// where-clause rather than a full scan + filter.
db.version(7).stores({
  sessionLogs: 'id, user_id, workout_id, date, synced',
  setLogs: 'id, session_log_id, exercise_id, synced',
  cardioLogs: 'id, user_id, date, synced',
  personalRecords: 'id, user_id, exercise_id, synced',
  userWeights: 'id, user_id, exercise_id, date, synced',
  exerciseLibrary: 'id, name, category, equipment, level, *primaryMuscles, *secondaryMuscles',
  userProgramProfiles: 'user_id, updated_at, synced',
  mesocycles: 'id, user_id, generated_at, synced',
  routines: 'id, session_id, kind, generated_at, synced',
  dayOverrides: 'id, user_id, date, session_id, synced',
  customExercises: 'id, user_id, name, equipment, created_at, *primary_muscles, *secondary_muscles, synced',
})

export { db }
export type { LocalSessionLog, LocalSetLog, LocalCardioLog, LocalPersonalRecord, LocalUserWeight, LibraryExercise, LocalProfile, LocalMesocycle, LocalRoutine, LocalDayOverride, LocalCustomExercise }
