import { useState, useCallback, useEffect } from 'react'
import type { ProtocolProgress, PainLevel, PainLog } from '../data/protocols'

const STORAGE_KEY_PREFIX = 'protocol-progress-'

function loadProgress(protocolId: string): ProtocolProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + protocolId)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveProgress(progress: ProtocolProgress) {
  localStorage.setItem(STORAGE_KEY_PREFIX + progress.protocol_id, JSON.stringify(progress))
}

function clearProgress(protocolId: string) {
  localStorage.removeItem(STORAGE_KEY_PREFIX + protocolId)
}

export function useProtocol(protocolId: string, totalWeeks: number) {
  const [progress, setProgress] = useState<ProtocolProgress | null>(() => loadProgress(protocolId))

  // Persist on every change
  useEffect(() => {
    if (progress) saveProgress(progress)
  }, [progress])

  const startProtocol = useCallback(() => {
    const newProgress: ProtocolProgress = {
      protocol_id: protocolId,
      current_week: 1,
      started_at: new Date().toISOString(),
      status: 'active',
      sessions_completed: 0,
      pain_logs: [],
      completed_exercises: {},
    }
    setProgress(newProgress)
  }, [protocolId])

  const pauseProtocol = useCallback(() => {
    setProgress(prev => prev ? { ...prev, status: 'paused' } : null)
  }, [])

  const resumeProtocol = useCallback(() => {
    setProgress(prev => prev ? { ...prev, status: 'active' } : null)
  }, [])

  const resetProtocol = useCallback(() => {
    clearProgress(protocolId)
    setProgress(null)
  }, [protocolId])

  const advanceWeek = useCallback(() => {
    setProgress(prev => {
      if (!prev) return null
      const nextWeek = prev.current_week + 1
      if (nextWeek > totalWeeks) {
        return { ...prev, status: 'completed' }
      }
      return {
        ...prev,
        current_week: nextWeek,
        sessions_completed: prev.sessions_completed + 1,
      }
    })
  }, [totalWeeks])

  const regressWeek = useCallback(() => {
    setProgress(prev => {
      if (!prev || prev.current_week <= 1) return prev
      return { ...prev, current_week: prev.current_week - 1 }
    })
  }, [])

  const toggleExercise = useCallback((week: number, exerciseId: string) => {
    setProgress(prev => {
      if (!prev) return null
      const key = `${week}-${exerciseId}`
      const completed = { ...prev.completed_exercises }
      completed[key] = !completed[key]
      return { ...prev, completed_exercises: completed }
    })
  }, [])

  const logPain = useCallback((painLevel: PainLevel, swelling: boolean, notes?: string) => {
    setProgress(prev => {
      if (!prev) return null
      const shouldRegress = painLevel === 'moderate' || painLevel === 'severe' || swelling
      const log: PainLog = {
        date: new Date().toISOString(),
        week: prev.current_week,
        pain_level: painLevel,
        swelling,
        notes,
        auto_regressed: shouldRegress,
      }
      const newWeek = shouldRegress && prev.current_week > 1
        ? prev.current_week - 1
        : prev.current_week
      return {
        ...prev,
        current_week: newWeek,
        pain_logs: [...prev.pain_logs, log],
      }
    })
  }, [])

  const isExerciseCompleted = useCallback((week: number, exerciseId: string): boolean => {
    if (!progress) return false
    return !!progress.completed_exercises[`${week}-${exerciseId}`]
  }, [progress])

  const getWeekCompletionCount = useCallback((week: number, exerciseIds: string[]): number => {
    if (!progress) return 0
    return exerciseIds.filter(id => progress.completed_exercises[`${week}-${id}`]).length
  }, [progress])

  return {
    progress,
    startProtocol,
    pauseProtocol,
    resumeProtocol,
    resetProtocol,
    advanceWeek,
    regressWeek,
    toggleExercise,
    logPain,
    isExerciseCompleted,
    getWeekCompletionCount,
  }
}
