import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Full-screen loading state shown while the onboarding completion handler is
 * calling the edge function to generate a 6-week mesocycle. Gemini 2.5 Flash
 * typically takes 5–10s for a full block, so we show a subtle rotating
 * reassurance ticker rather than a hard progress bar (we don't get real
 * progress events from the server).
 */
const TICKER_MESSAGES = [
  "Matching exercises to your profile…",
  "Respecting injuries and equipment…",
  "Balancing volume across the week…",
  "Writing progressive overload for six weeks…",
  "Almost there…",
] as const

export function GeneratingPlan() {
  const [tickerIdx, setTickerIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIdx((i) => (i + 1) % TICKER_MESSAGES.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
      <Loader2 size={48} className="text-brand animate-spin mb-8" />
      <h1 className="text-2xl font-extrabold mb-3">
        Designing your training block…
      </h1>
      <p className="text-zinc-500 max-w-sm mb-8">
        Should take about 10 seconds. We're matching exercises to your profile.
      </p>
      <p
        key={tickerIdx}
        className="text-sm text-zinc-400 transition-opacity animate-pulse"
      >
        {TICKER_MESSAGES[tickerIdx]}
      </p>
    </div>
  )
}
