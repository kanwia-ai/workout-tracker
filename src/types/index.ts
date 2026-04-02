// ─── Core Types ───────────────────────────────────────────────────────────

export interface Exercise {
  id: string
  name: string
  description?: string
  instructions?: string[]
  primary_muscles: MuscleGroup[]
  secondary_muscles?: MuscleGroup[]
  movement_pattern?: MovementPattern
  equipment: Equipment[]
  body_region: BodyRegion
  difficulty: Difficulty
  knee_safety: KneeSafety
  knee_safety_notes?: string
  laterality?: 'bilateral' | 'unilateral'
  cues?: string[]
  source?: string
  video_url?: string
  image_url?: string
  created_by?: string
}

export interface WorkoutExercise {
  id: string
  exercise_id: string
  exercise?: Exercise
  sets: number
  reps: string
  rest_seconds: number
  track_weight: boolean
  note?: string
  sort_order: number
  // For timed exercises
  work_seconds?: number
}

export interface WorkoutSection {
  id: string
  workout_id: string
  name: string
  note?: string
  sort_order: number
  exercises: WorkoutExercise[]
}

export interface Workout {
  id: string
  title: string
  emoji: string
  est_minutes: number
  is_circuit?: boolean
  created_by?: string
  sections: WorkoutSection[]
}

export interface ScheduleDay {
  day_of_week: number // 0=Mon, 6=Sun
  day_label: string
  workout_id: string | null
  label: string
  is_rest_day: boolean
}

export interface SessionLog {
  id: string
  user_id: string
  workout_id: string
  date: string // YYYY-MM-DD
  started_at: string // ISO timestamp
  ended_at?: string
  phases: SessionPhase[]
  completed_sets: number
  total_sets: number
  notes?: string
}

export interface SessionPhase {
  name: 'warm-up' | 'lifts' | 'cardio' | 'cool-down'
  started_at: string
  ended_at?: string
}

export interface SetLog {
  id: string
  session_log_id: string
  exercise_id: string
  set_number: number
  weight?: number
  reps_completed?: number
  timestamp: string
}

export interface CardioLog {
  id: string
  user_id: string
  date: string
  type: CardioType
  duration_minutes: number
  incline?: number
  distance?: number
  notes?: string
  started_at?: string
  ended_at?: string
}

export interface UserGoal {
  id: string
  user_id: string
  goal_type: string
  target_value: number
  current_value: number
  unit: string
  created_at: string
}

export interface PersonalRecord {
  id: string
  user_id: string
  exercise_id: string
  exercise_name: string
  weight: number
  date: string
}

export interface UserProfile {
  id: string
  email: string
  display_name: string
  avatar_emoji?: string
  knee_flag?: boolean // true = show knee-safe modifications
  created_at: string
}

// ─── Timer State ──────────────────────────────────────────────────────────

export interface TimerState {
  type: 'rest' | 'work'
  seconds: number
  label: string
  exercise_name?: string
}

// ─── Session Tracking ─────────────────────────────────────────────────────

export interface ActiveSession {
  workout_id: string
  started_at: string
  current_phase: SessionPhase['name']
  phases: SessionPhase[]
  checked_sets: Record<string, boolean> // key: "sectionIdx-exerciseIdx-setIdx"
  weights: Record<string, number> // key: "exerciseId"
}

// ─── Enums ────────────────────────────────────────────────────────────────

export type MuscleGroup =
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'hip_flexors'
  | 'adductors' | 'abductors' | 'chest' | 'back_upper' | 'back_lower'
  | 'lats' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'core_anterior' | 'core_obliques' | 'core_posterior' | 'pelvic_floor'
  | 'full_body'

export type MovementPattern =
  | 'squat' | 'hinge' | 'push_horizontal' | 'push_vertical'
  | 'pull_horizontal' | 'pull_vertical' | 'lunge' | 'carry'
  | 'rotation' | 'anti_rotation' | 'anti_extension' | 'anti_lateral_flexion'
  | 'isolation' | 'plyometric' | 'mobility' | 'cardio'

export type Equipment =
  | 'bodyweight' | 'dumbbells' | 'kettlebells' | 'barbell' | 'cable_machine'
  | 'smith_machine' | 'leg_press' | 'leg_extension' | 'leg_curl'
  | 'lat_pulldown' | 'chest_press_machine' | 'bench' | 'pull_up_bar'
  | 'resistance_band' | 'mini_band' | 'foam_roller' | 'stability_ball'
  | 'trx_suspension' | 'stair_master' | 'treadmill' | 'elliptical'
  | 'stationary_bike' | 'box_step' | 'yoga_mat' | 'medicine_ball'
  | 'bosu_ball'

export type BodyRegion = 'lower_body' | 'upper_body' | 'core' | 'full_body'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export type KneeSafety = 'knee_safe' | 'knee_caution' | 'knee_avoid'

export type CardioType = 'stairmaster' | 'treadmill_walk' | 'treadmill_run' | 'bike' | 'elliptical' | 'walk' | 'swim' | 'other'
