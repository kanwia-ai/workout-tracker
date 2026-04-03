// ─── Progress Data Types ────────────────────────────────────────────────
// Types for progress visualizations. Data will come from real session logs.

export interface WeightEntry {
  date: string
  weight: number
}

export interface CardioEntry {
  date: string
  minutes: number
  type: string
}

export interface SessionEntry {
  date: string
  workoutId: string
  workoutTitle: string
  durationMinutes: number
}

export interface VolumeEntry {
  muscleGroup: string
  sets: number
}

export interface WeeklyRecapData {
  weekLabel: string
  workoutsCompleted: number
  totalMinutes: number
  highlights: string[]
  newPRs: { exercise: string; weight: number }[]
  cardioHighlight?: string
}
