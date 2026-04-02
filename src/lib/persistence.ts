import { supabase } from './supabase'
import type { SessionPhase } from '../types'

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
  const { data, error } = await supabase
    .from('session_logs')
    .insert({
      user_id: params.userId,
      workout_id: params.workoutId,
      workout_title: params.workoutTitle,
      date: params.date,
      started_at: params.startedAt,
      ended_at: params.endedAt,
      phases: params.phases,
      completed_sets: params.completedSets,
      total_sets: params.totalSets,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to save session:', error)
    return null
  }
  return data.id
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
  const { error } = await supabase.from('set_logs').insert({
    session_log_id: params.sessionLogId,
    user_id: params.userId,
    exercise_id: params.exerciseId,
    exercise_name: params.exerciseName,
    set_number: params.setNumber,
    weight: params.weight,
    reps_completed: params.repsCompleted,
  })

  if (error) console.error('Failed to save set log:', error)
}

// ─── Upsert weight for exercise ───────────────────────────────────────────

export async function saveLastWeight(userId: string, exerciseId: string, weight: number) {
  const { error } = await supabase
    .from('last_weights')
    .upsert(
      { user_id: userId, exercise_id: exerciseId, weight, date: new Date().toISOString().split('T')[0] },
      { onConflict: 'user_id,exercise_id' }
    )

  if (error) console.error('Failed to save weight:', error)
}

// ─── Update personal record ──────────────────────────────────────────────

export async function updatePR(userId: string, exerciseId: string, exerciseName: string, weight: number) {
  // Check current PR
  const { data: existing } = await supabase
    .from('personal_records')
    .select('weight')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .single()

  if (!existing || weight > Number(existing.weight)) {
    await supabase
      .from('personal_records')
      .upsert(
        {
          user_id: userId,
          exercise_id: exerciseId,
          exercise_name: exerciseName,
          weight,
          date: new Date().toISOString().split('T')[0],
        },
        { onConflict: 'user_id,exercise_id' }
      )
    return true // new PR!
  }
  return false
}

// ─── Load user data ──────────────────────────────────────────────────────

export async function loadLastWeights(userId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('last_weights')
    .select('exercise_id, weight')
    .eq('user_id', userId)

  if (!data) return {}
  return Object.fromEntries(data.map(d => [d.exercise_id, Number(d.weight)]))
}

export async function loadPRs(userId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('personal_records')
    .select('exercise_id, weight')
    .eq('user_id', userId)

  if (!data) return {}
  return Object.fromEntries(data.map(d => [d.exercise_id, Number(d.weight)]))
}

export async function loadSessionHistory(userId: string, limit = 30) {
  const { data } = await supabase
    .from('session_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit)

  return data || []
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
  const { error } = await supabase.from('cardio_logs').insert({
    user_id: params.userId,
    date: params.date,
    type: params.type,
    duration_minutes: params.durationMinutes,
    incline: params.incline,
    distance: params.distance,
    started_at: params.startedAt,
    ended_at: params.endedAt,
    notes: params.notes,
  })

  if (error) console.error('Failed to save cardio log:', error)
}
