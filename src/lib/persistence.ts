// Local-first persistence for workout data: session logs, set logs, PRs,
// last-used weights, and cardio logs.
//
// Every write lands in Dexie FIRST (synced: false) and the function returns
// on the strength of that local write alone — the cloud push is a background
// fire-and-forget that flips `synced: true` on success. Every read serves
// Dexie, opportunistically merging in cloud rows when the backend answers.
// A dead backend therefore degrades to "fully offline" instead of silently
// dropping completed workouts (the pre-2026-06-09 behavior — see
// docs/plans/2026-06-09-senior-audit-and-revamp.md, root cause #2).
//
// Pattern mirrors profileRepo.ts (saveProfileLocal + syncProfileUp) and
// checkins.ts (syncDirtyCheckins / pullCheckinsFromCloud).
import { db, type LocalSessionLog } from './db'
import { supabase } from './supabase'
import type { SessionPhase } from '../types'

// crypto.randomUUID is available everywhere Dexie runs; the fallback covers
// unusually locked-down web views. Cloud `id` columns are uuid-typed, so a
// fallback id simply leaves the row local-only (dirty) — never lost.
function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

// Deterministic row id for the one-row-per-(user, exercise) tables. Makes
// Dexie `put` a natural upsert, mirroring the cloud unique(user_id,
// exercise_id) constraint.
function perExerciseKey(userId: string, exerciseId: string): string {
  return `${userId}:${exerciseId}`
}

function logSyncFailure(what: string) {
  return (err: unknown) => {
    console.warn(`${what} (background sync) failed — row stays queued`, err)
  }
}

// ─── Save completed session ───────────────────────────────────────────────

interface SaveSessionParams {
  userId: string
  workoutId: string
  workoutTitle: string
  date: string
  startedAt: string
  endedAt: string
  phases: SessionPhase[]
  completedSets: number
  totalSets: number
}

export async function saveSession(params: SaveSessionParams): Promise<string | null> {
  const id = newId()
  try {
    await db.sessionLogs.put({
      id,
      user_id: params.userId,
      workout_id: params.workoutId,
      workout_title: params.workoutTitle,
      date: params.date,
      started_at: params.startedAt,
      ended_at: params.endedAt,
      phases_json: JSON.stringify(params.phases),
      completed_sets: params.completedSets,
      total_sets: params.totalSets,
      synced: false,
    })
  } catch (err) {
    // Dexie failing (quota, private mode) is the only true save failure now.
    console.error('saveSession: Dexie put failed', err)
    return null
  }
  void pushSessionLogUp(id).catch(logSyncFailure('pushSessionLogUp'))
  return id
}

// ─── Save set log ─────────────────────────────────────────────────────────

interface SaveSetLogParams {
  sessionLogId: string
  userId: string
  exerciseId: string
  exerciseName: string
  setNumber: number
  weight?: number
  repsCompleted?: number
}

export async function saveSetLog(params: SaveSetLogParams) {
  const id = newId()
  try {
    await db.setLogs.put({
      id,
      session_log_id: params.sessionLogId,
      user_id: params.userId,
      exercise_id: params.exerciseId,
      exercise_name: params.exerciseName,
      set_number: params.setNumber,
      weight: params.weight,
      reps_completed: params.repsCompleted,
      timestamp: new Date().toISOString(),
      synced: false,
    })
  } catch (err) {
    console.error('saveSetLog: Dexie put failed', err)
    return
  }
  void pushSetLogUp(id).catch(logSyncFailure('pushSetLogUp'))
}

// ─── Upsert weight for exercise ───────────────────────────────────────────

export async function saveLastWeight(userId: string, exerciseId: string, weight: number) {
  const id = perExerciseKey(userId, exerciseId)
  try {
    await db.userWeights.put({
      id,
      user_id: userId,
      exercise_id: exerciseId,
      weight,
      date: todayISO(),
      synced: false,
    })
  } catch (err) {
    console.error('saveLastWeight: Dexie put failed', err)
    return
  }
  void pushLastWeightUp(id).catch(logSyncFailure('pushLastWeightUp'))
}

// ─── Update personal record ──────────────────────────────────────────────

export async function updatePR(userId: string, exerciseId: string, exerciseName: string, weight: number) {
  // Local row is the source of truth. loadPRs merges cloud history into
  // Dexie on screen load, so by the time a workout finishes the local row
  // already reflects the user's true best.
  const existing = await db.personalRecords
    .where('[user_id+exercise_id]')
    .equals([userId, exerciseId])
    .first()

  if (existing && weight <= Number(existing.weight)) return false

  const id = existing?.id ?? perExerciseKey(userId, exerciseId)
  try {
    await db.personalRecords.put({
      id,
      user_id: userId,
      exercise_id: exerciseId,
      exercise_name: exerciseName,
      weight,
      date: todayISO(),
      synced: false,
    })
  } catch (err) {
    console.error('updatePR: Dexie put failed', err)
    return false
  }
  void pushPRUp(id).catch(logSyncFailure('pushPRUp'))
  return true // new PR!
}

// ─── Load user data ──────────────────────────────────────────────────────

export async function loadLastWeights(userId: string): Promise<Record<string, number>> {
  const local = await db.userWeights.where('user_id').equals(userId).toArray()
  const map = Object.fromEntries(local.map((r) => [r.exercise_id, Number(r.weight)]))

  // Opportunistic cloud merge — last write wins by date, dirty local rows
  // never clobbered (their unpushed value is newer by definition).
  try {
    const { data, error } = await supabase
      .from('last_weights')
      .select('exercise_id, weight, date')
      .eq('user_id', userId)
    if (!error && data) {
      for (const cloud of data as Array<{ exercise_id: string; weight: number; date: string }>) {
        const localRow = local.find((r) => r.exercise_id === cloud.exercise_id)
        if (localRow && !localRow.synced) continue
        if (localRow && localRow.date >= cloud.date) continue
        await db.userWeights.put({
          id: localRow?.id ?? perExerciseKey(userId, cloud.exercise_id),
          user_id: userId,
          exercise_id: cloud.exercise_id,
          weight: Number(cloud.weight),
          date: cloud.date,
          synced: true,
        })
        map[cloud.exercise_id] = Number(cloud.weight)
      }
    }
  } catch {
    // Cloud unreachable — Dexie alone serves the read.
  }
  return map
}

export async function loadPRs(userId: string): Promise<Record<string, number>> {
  const local = await db.personalRecords.where('user_id').equals(userId).toArray()
  const map = Object.fromEntries(local.map((r) => [r.exercise_id, Number(r.weight)]))

  // Opportunistic cloud merge — for PRs the max weight wins (a record can
  // never go down), regardless of which side wrote last.
  try {
    const { data, error } = await supabase
      .from('personal_records')
      .select('exercise_id, exercise_name, weight, date')
      .eq('user_id', userId)
    if (!error && data) {
      for (const cloud of data as Array<{ exercise_id: string; exercise_name: string; weight: number; date: string }>) {
        const localRow = local.find((r) => r.exercise_id === cloud.exercise_id)
        if (localRow && Number(localRow.weight) >= Number(cloud.weight)) continue
        await db.personalRecords.put({
          id: localRow?.id ?? perExerciseKey(userId, cloud.exercise_id),
          user_id: userId,
          exercise_id: cloud.exercise_id,
          exercise_name: cloud.exercise_name,
          weight: Number(cloud.weight),
          date: cloud.date,
          synced: true,
        })
        map[cloud.exercise_id] = Number(cloud.weight)
      }
    }
  } catch {
    // Cloud unreachable — Dexie alone serves the read.
  }
  return map
}

// Cloud-shaped session record: what callers historically got from the
// Supabase select('*') — snake_case columns with `phases` as a parsed array.
// The index signature keeps existing callers (which treat rows as
// Record<string, unknown>) compiling unchanged.
interface SessionLogRecord {
  [column: string]: unknown
  id: string
  user_id: string
  workout_id: string
  workout_title?: string
  date: string
  started_at: string
  ended_at?: string
  phases: SessionPhase[]
  completed_sets: number
  total_sets: number
  notes?: string
}

function toSessionRecord(row: LocalSessionLog): SessionLogRecord {
  let phases: SessionPhase[] = []
  try {
    phases = JSON.parse(row.phases_json)
  } catch {
    // Corrupt phases JSON shouldn't sink the whole history read.
  }
  return {
    id: row.id,
    user_id: row.user_id,
    workout_id: row.workout_id,
    workout_title: row.workout_title,
    date: row.date,
    started_at: row.started_at,
    ended_at: row.ended_at,
    phases,
    completed_sets: row.completed_sets,
    total_sets: row.total_sets,
    notes: row.notes,
  }
}

export async function loadSessionHistory(userId: string, limit = 30): Promise<SessionLogRecord[]> {
  // Opportunistically cache cloud rows we don't have locally (e.g. sessions
  // logged on another device). Sessions are immutable once written, so an
  // id match means we already hold the full row.
  try {
    const { data, error } = await supabase
      .from('session_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit)
    if (!error && data) {
      for (const cloud of data as Array<Record<string, unknown>>) {
        const id = cloud.id as string
        if (await db.sessionLogs.get(id)) continue
        await db.sessionLogs.put({
          id,
          user_id: cloud.user_id as string,
          workout_id: cloud.workout_id as string,
          workout_title: (cloud.workout_title as string | null) ?? undefined,
          date: cloud.date as string,
          started_at: cloud.started_at as string,
          ended_at: (cloud.ended_at as string | null) ?? undefined,
          phases_json: JSON.stringify(cloud.phases ?? []),
          completed_sets: (cloud.completed_sets as number | null) ?? 0,
          total_sets: (cloud.total_sets as number | null) ?? 0,
          notes: (cloud.notes as string | null) ?? undefined,
          synced: true,
        })
      }
    }
  } catch {
    // Cloud unreachable — Dexie alone serves the read.
  }

  const rows = await db.sessionLogs.where('user_id').equals(userId).toArray()
  rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return rows.slice(0, limit).map(toSessionRecord)
}

// ─── Save cardio log ──────────────────────────────────────────────────────

interface SaveCardioParams {
  userId: string
  date: string
  type: string
  durationMinutes: number
  incline?: number
  distance?: number
  startedAt?: string
  endedAt?: string
  notes?: string
}

export async function saveCardioLog(params: SaveCardioParams) {
  const id = newId()
  try {
    await db.cardioLogs.put({
      id,
      user_id: params.userId,
      date: params.date,
      type: params.type,
      duration_minutes: params.durationMinutes,
      incline: params.incline,
      distance: params.distance,
      started_at: params.startedAt,
      ended_at: params.endedAt,
      notes: params.notes,
      synced: false,
    })
  } catch (err) {
    console.error('saveCardioLog: Dexie put failed', err)
    return
  }
  void pushCardioLogUp(id).catch(logSyncFailure('pushCardioLogUp'))
}

// ─── Cloud push (one dirty row at a time) ─────────────────────────────────
// Each push is a no-op when the row is missing or already synced, flips
// `synced: true` on success, and throws on cloud errors so the row stays
// dirty for the next attempt.

async function pushSessionLogUp(id: string): Promise<void> {
  const row = await db.sessionLogs.get(id)
  if (!row || row.synced) return
  const { error } = await supabase.from('session_logs').upsert({
    id: row.id,
    user_id: row.user_id,
    workout_id: row.workout_id,
    workout_title: row.workout_title,
    date: row.date,
    started_at: row.started_at,
    ended_at: row.ended_at,
    phases: JSON.parse(row.phases_json),
    completed_sets: row.completed_sets,
    total_sets: row.total_sets,
    notes: row.notes,
  })
  if (error) throw error
  await db.sessionLogs.update(id, { synced: true })
}

async function pushSetLogUp(id: string): Promise<void> {
  const row = await db.setLogs.get(id)
  if (!row || row.synced) return
  // Pre-v11 rows have no user_id — the cloud insert can't satisfy RLS, so
  // they stay local-only.
  if (!row.user_id) return
  const { error } = await supabase.from('set_logs').insert({
    id: row.id,
    session_log_id: row.session_log_id,
    user_id: row.user_id,
    exercise_id: row.exercise_id,
    exercise_name: row.exercise_name,
    set_number: row.set_number,
    weight: row.weight,
    reps_completed: row.reps_completed,
  })
  // 23505 = duplicate key: a previous push landed but the local flag flip
  // didn't. The cloud already has the row — treat as success. (set_logs has
  // no RLS update policy, so insert + tolerate-duplicate instead of upsert.)
  if (error && (error as { code?: string }).code !== '23505') throw error
  await db.setLogs.update(id, { synced: true })
}

async function pushLastWeightUp(id: string): Promise<void> {
  const row = await db.userWeights.get(id)
  if (!row || row.synced) return
  const { error } = await supabase
    .from('last_weights')
    .upsert(
      { user_id: row.user_id, exercise_id: row.exercise_id, weight: row.weight, date: row.date },
      { onConflict: 'user_id,exercise_id' },
    )
  if (error) throw error
  await db.userWeights.update(id, { synced: true })
}

async function pushPRUp(id: string): Promise<void> {
  const row = await db.personalRecords.get(id)
  if (!row || row.synced) return
  const { error } = await supabase
    .from('personal_records')
    .upsert(
      {
        user_id: row.user_id,
        exercise_id: row.exercise_id,
        exercise_name: row.exercise_name,
        weight: row.weight,
        date: row.date,
      },
      { onConflict: 'user_id,exercise_id' },
    )
  if (error) throw error
  await db.personalRecords.update(id, { synced: true })
}

async function pushCardioLogUp(id: string): Promise<void> {
  const row = await db.cardioLogs.get(id)
  if (!row || row.synced) return
  const { error } = await supabase.from('cardio_logs').upsert({
    id: row.id,
    user_id: row.user_id,
    date: row.date,
    type: row.type,
    duration_minutes: row.duration_minutes,
    incline: row.incline,
    distance: row.distance,
    started_at: row.started_at,
    ended_at: row.ended_at,
    notes: row.notes,
  })
  if (error) throw error
  await db.cardioLogs.update(id, { synced: true })
}

// ─── Backfill sweep ───────────────────────────────────────────────────────

/**
 * Push every dirty (synced: false) workout-data row for a user up to the
 * cloud. Call when the backend comes back: sign-in, app foreground, or a
 * manual retry. Sessions go first — set logs FK-reference them in the cloud
 * schema. Per-row failures are logged but don't stop the sweep; whatever
 * stays dirty gets picked up next time.
 */
export async function syncDirtyPersistence(userId: string): Promise<void> {
  const dirtySessions = await db.sessionLogs
    .where('user_id').equals(userId).filter((r) => !r.synced).toArray()
  for (const row of dirtySessions) {
    try {
      await pushSessionLogUp(row.id)
    } catch (err) {
      console.warn('syncDirtyPersistence: session row failed', { id: row.id, err })
    }
  }

  const dirtySets = await db.setLogs
    .where('user_id').equals(userId).filter((r) => !r.synced).toArray()
  for (const row of dirtySets) {
    try {
      await pushSetLogUp(row.id)
    } catch (err) {
      console.warn('syncDirtyPersistence: set row failed', { id: row.id, err })
    }
  }

  const dirtyCardio = await db.cardioLogs
    .where('user_id').equals(userId).filter((r) => !r.synced).toArray()
  for (const row of dirtyCardio) {
    try {
      await pushCardioLogUp(row.id)
    } catch (err) {
      console.warn('syncDirtyPersistence: cardio row failed', { id: row.id, err })
    }
  }

  const dirtyPRs = await db.personalRecords
    .where('user_id').equals(userId).filter((r) => !r.synced).toArray()
  for (const row of dirtyPRs) {
    try {
      await pushPRUp(row.id)
    } catch (err) {
      console.warn('syncDirtyPersistence: PR row failed', { id: row.id, err })
    }
  }

  const dirtyWeights = await db.userWeights
    .where('user_id').equals(userId).filter((r) => !r.synced).toArray()
  for (const row of dirtyWeights) {
    try {
      await pushLastWeightUp(row.id)
    } catch (err) {
      console.warn('syncDirtyPersistence: weight row failed', { id: row.id, err })
    }
  }
}
