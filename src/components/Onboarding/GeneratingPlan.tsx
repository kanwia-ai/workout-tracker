import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Full-screen loading state shown while the onboarding completion handler is
 * calling the edge function to generate a 6-week mesocycle. Gemini 2.5 Flash
 * typically takes 60–120 seconds for a full block, so we show an honest
 * elapsed-time counter plus a progress bar that paces to 95% over ~90 seconds
 * and then parks there until the parent component unmounts this screen (i.e.,
 * until generation actually resolves). We never claim 100% because we don't
 * know when it's actually done.
 */
const PACE_DURATION_MS = 90_000
const PROGRESS_CEILING = 95
const SLOW_WARNING_THRESHOLD_MS = 180_000

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export interface GeneratingPlanProps {
  /**
   * Optional escape hatch shown once elapsed exceeds the slow-warning
   * threshold. Tapping the button fires this callback — it does NOT abort the
   * in-flight fetch (out of scope), it just lets the parent flip to the
   * error/retry screen so the user isn't stuck staring at a spinner forever.
   */
  onCancel?: () => void
}

export function GeneratingPlan({ onCancel }: GeneratingPlanProps = {}) {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startedAt)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const progressPct = Math.min(
    (elapsedMs / PACE_DURATION_MS) * PROGRESS_CEILING,
    PROGRESS_CEILING,
  )
  const showSlowWarning = elapsedMs > SLOW_WARNING_THRESHOLD_MS

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
      <Loader2 size={48} className="text-brand animate-spin mb-8" />
      <h1 className="text-2xl font-extrabold mb-3">
        Designing your training block
      </h1>
      <p className="text-zinc-400 max-w-sm mb-6">
        Usually takes 60-120 seconds. Matching 24 sessions to your profile,
        injuries, and recovery windows.
      </p>

      <div className="w-full max-w-sm mb-3">
        <div className="h-2 w-full rounded-full bg-surface-raised overflow-hidden">
          <div
            data-testid="progress-bar-fill"
            className="h-full bg-brand transition-[width] duration-1000 ease-linear"
            style={{ width: `${progressPct}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      <p
        data-testid="elapsed-time"
        className="text-sm text-zinc-500 tabular-nums"
      >
        {formatElapsed(elapsedMs)}
      </p>

      {showSlowWarning && (
        <p className="mt-6 text-sm text-amber-400 max-w-sm">
          This is taking longer than usual. Hang tight or refresh to retry.
        </p>
      )}

      {showSlowWarning && onCancel && (
        <button
          onClick={onCancel}
          className="mt-4 px-5 py-2 rounded-2xl bg-surface-raised text-zinc-200 text-sm font-semibold hover:bg-zinc-700"
        >
          Cancel and try again
        </button>
      )}
    </div>
  )
}
