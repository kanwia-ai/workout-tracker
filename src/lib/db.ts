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

export { db }
export type { LocalSessionLog, LocalSetLog, LocalCardioLog, LocalPersonalRecord, LocalUserWeight, LibraryExercise, LocalProfile, LocalMesocycle, LocalRoutine }
