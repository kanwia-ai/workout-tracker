import { useState, useCallback, useEffect } from 'react'
import type { ActiveSession, SessionPhase } from '../types'

const STORAGE_KEY = 'workout-tracker:active-session'
const HAS_USED_KEY = 'workout-tracker:has-used'

function loadPersistedSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ActiveSession
  } catch {
    return null
  }
}

export function useSession() {
  const [session, setSession] = useState<ActiveSession | null>(() => loadPersistedSession())

  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [session])

  const startSession = useCallback((workoutId: string) => {
    const now = new Date().toISOString()
    localStorage.setItem(HAS_USED_KEY, 'true')
    setSession({
      workout_id: workoutId,
      started_at: now,
      current_phase: 'warm-up',
      phases: [{ name: 'warm-up', started_at: now }],
      checked_sets: {},
      weights: {},
    })
  }, [])

  const switchPhase = useCallback((phase: SessionPhase['name']) => {
    setSession(prev => {
      if (!prev) return null
      const now = new Date().toISOString()
      const phases = prev.phases.map((p, i) =>
        i === prev.phases.length - 1 && !p.ended_at ? { ...p, ended_at: now } : p
      )
      phases.push({ name: phase, started_at: now })
      return { ...prev, current_phase: phase, phases }
    })
  }, [])

  const endSession = useCallback(() => {
    setSession(prev => {
      if (!prev) return null
      const now = new Date().toISOString()
      const phases = prev.phases.map((p, i) =>
        i === prev.phases.length - 1 && !p.ended_at ? { ...p, ended_at: now } : p
      )
      return { ...prev, phases }
    })
  }, [])

  const clearSession = useCallback(() => {
    setSession(null)
  }, [])

  const toggleSet = useCallback((key: string) => {
    setSession(prev => {
      if (!prev) return null
      const checked = { ...prev.checked_sets, [key]: !prev.checked_sets[key] }
      return { ...prev, checked_sets: checked }
    })
  }, [])

  const setWeight = useCallback((exerciseId: string, weight: number) => {
    setSession(prev => {
      if (!prev) return null
      return { ...prev, weights: { ...prev.weights, [exerciseId]: weight } }
    })
  }, [])

  const elapsed = session
    ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
    : 0

  return { session, startSession, switchPhase, endSession, clearSession, toggleSet, setWeight, elapsed }
}
