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

const db = new Dexie('WorkoutTrackerDB') as Dexie & {
  sessionLogs: EntityTable<LocalSessionLog, 'id'>
  setLogs: EntityTable<LocalSetLog, 'id'>
  cardioLogs: EntityTable<LocalCardioLog, 'id'>
  personalRecords: EntityTable<LocalPersonalRecord, 'id'>
  userWeights: EntityTable<LocalUserWeight, 'id'>
}

db.version(1).stores({
  sessionLogs: 'id, user_id, workout_id, date, synced',
  setLogs: 'id, session_log_id, exercise_id, synced',
  cardioLogs: 'id, user_id, date, synced',
  personalRecords: 'id, user_id, exercise_id, synced',
  userWeights: 'id, user_id, exercise_id, date, synced',
})

export { db }
export type { LocalSessionLog, LocalSetLog, LocalCardioLog, LocalPersonalRecord, LocalUserWeight }
