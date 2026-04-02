import { useState, useRef, useEffect, useCallback } from 'react'

interface UseTimerOptions {
  initialSeconds: number
  onComplete?: () => void
  autoStart?: boolean
  countUp?: boolean
}

export function useTimer({ initialSeconds, onComplete, autoStart = false, countUp = false }: UseTimerOptions) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(autoStart)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (countUp) return prev + 1
          if (prev <= 1) {
            clear()
            setIsRunning(false)
            onComplete?.()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return clear
  }, [isRunning, countUp, clear, onComplete])

  const start = useCallback(() => setIsRunning(true), [])
  const pause = useCallback(() => { clear(); setIsRunning(false) }, [clear])
  const restart = useCallback(() => { clear(); setSeconds(initialSeconds); setIsRunning(true) }, [clear, initialSeconds])
  const reset = useCallback(() => { clear(); setSeconds(initialSeconds); setIsRunning(false) }, [clear, initialSeconds])

  const formatted = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  const progress = countUp ? 0 : ((initialSeconds - seconds) / initialSeconds) * 100

  return { seconds, isRunning, formatted, progress, start, pause, restart, reset }
}
