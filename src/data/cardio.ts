import type { CardioType, CardioLog, UserGoal } from '../types'

// ─── Cardio Type Labels & Config ────────────────────────────────────────────

export const CARDIO_TYPES: { value: CardioType; label: string; emoji: string }[] = [
  { value: 'stairmaster', label: 'Stair Master', emoji: '🪜' },
  { value: 'treadmill_walk', label: 'Incline Treadmill', emoji: '🚶' },
  { value: 'treadmill_run', label: 'Treadmill Run', emoji: '🏃' },
  { value: 'bike', label: 'Bike', emoji: '🚴' },
  { value: 'elliptical', label: 'Elliptical', emoji: '🔄' },
  { value: 'walk', label: 'Walk', emoji: '👟' },
  { value: 'swim', label: 'Swim', emoji: '🏊' },
  { value: 'other', label: 'Other', emoji: '💪' },
]

export function getCardioLabel(type: CardioType): string {
  return CARDIO_TYPES.find(t => t.value === type)?.label ?? type
}

export function getCardioEmoji(type: CardioType): string {
  return CARDIO_TYPES.find(t => t.value === type)?.emoji ?? '💪'
}

// ─── Local Storage Keys ─────────────────────────────────────────────────────

const CARDIO_LOGS_KEY = 'workout-tracker:cardio-logs'
const CARDIO_GOALS_KEY = 'workout-tracker:cardio-goals'

// ─── Cardio Log Storage ─────────────────────────────────────────────────────

export function loadCardioLogs(): CardioLog[] {
  try {
    const raw = localStorage.getItem(CARDIO_LOGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCardioLogs(logs: CardioLog[]): void {
  localStorage.setItem(CARDIO_LOGS_KEY, JSON.stringify(logs))
}

export function addCardioLog(log: CardioLog): CardioLog[] {
  const logs = loadCardioLogs()
  logs.unshift(log) // newest first
  saveCardioLogs(logs)
  return logs
}

export function deleteCardioLog(logId: string): CardioLog[] {
  const logs = loadCardioLogs().filter(l => l.id !== logId)
  saveCardioLogs(logs)
  return logs
}

// ─── Goal Storage ───────────────────────────────────────────────────────────

export function loadGoals(): UserGoal[] {
  try {
    const raw = localStorage.getItem(CARDIO_GOALS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveGoals(goals: UserGoal[]): void {
  localStorage.setItem(CARDIO_GOALS_KEY, JSON.stringify(goals))
}

export function addGoal(goal: UserGoal): UserGoal[] {
  const goals = loadGoals()
  goals.push(goal)
  saveGoals(goals)
  return goals
}

export function updateGoalProgress(goalId: string, currentValue: number): UserGoal[] {
  const goals = loadGoals().map(g =>
    g.id === goalId ? { ...g, current_value: currentValue } : g
  )
  saveGoals(goals)
  return goals
}

export function deleteGoal(goalId: string): UserGoal[] {
  const goals = loadGoals().filter(g => g.id !== goalId)
  saveGoals(goals)
  return goals
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

/** Sum total cardio minutes for a given type from all logs */
export function getTotalMinutesForType(logs: CardioLog[], type: CardioType): number {
  return logs
    .filter(l => l.type === type)
    .reduce((sum, l) => sum + l.duration_minutes, 0)
}

/** Get milestone thresholds hit */
export function getMilestones(current: number, target: number): number[] {
  const milestones = [0.25, 0.5, 0.75, 1.0]
  return milestones
    .map(m => Math.round(m * target))
    .filter(m => current >= m)
}
