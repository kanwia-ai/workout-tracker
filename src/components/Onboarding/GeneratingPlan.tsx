import { useEffect, useMemo, useRef, useState } from 'react'
import { Lumo } from '../Lumo'
import {
  buildGeneratingPlanPool,
  DEFAULT_CHEEK,
  pickCopy,
  type CheekLevel,
} from '../../lib/copy'

/**
 * Full-screen loading state shown while the onboarding completion handler is
 * calling the edge function to generate a 6-week mesocycle. Kyra's directive
 * (2026-04-17): stop showing an elapsed-time counter — users don't care how
 * many seconds have ticked by, they care that something is happening. So we
 * show a CHECKPOINT-based percentage that paces naturally to 95% over ~150s,
 * holds there, and lets the Lumo mascot narrate what the plan builder is
 * doing in a cheeky rotation. Latency budget: 2-3 minutes (user-approved).
 *
 * Why checkpoints instead of linear fill: a linear "0→95 over 90s" bar feels
 * dishonest when generation actually has phases. We attach a label to each
 * stage ("reading your profile", "picking exercises", …) so the user can see
 * the builder is doing *something*, even though we have no real progress
 * signal from the edge function (the streaming hook isn't wired yet).
 */
const PROGRESS_CEILING = 95
// When the component has been mounted this long, swap to the "still cooking"
// pool + sleepy Lumo. Under 180s the plan-gen latency is within budget.
const SLOW_WARNING_THRESHOLD_MS = 180_000
// Narration rotates every ~6s. Aligns with the user's reading speed so each
// line has time to land.
const NARRATION_ROTATE_MS = 6_000

type Injury = { part: string; severity?: string }

interface Checkpoint {
  /** Min elapsed time, in ms, when this checkpoint's progress target is reached. */
  readonly atMs: number
  /** Target percentage at `atMs`. Progress interpolates linearly between checkpoints. */
  readonly pct: number
  /** Short label shown above the bar. Never the only copy — narration does the heavy lifting. */
  readonly label: string
}

/**
 * Checkpoints spec'd in the task: 0→15% in ~8s, 15→35% by ~25s, 35→55%
 * by ~55s, 55→75% by ~90s, 75→90% by ~130s, 90→95% by ~170s. The final
 * hold at 95% is the ceiling — we never hit 100% until the parent
 * unmounts us.
 *
 * Users in the 150-180s range see progress parked at 95% but narration
 * still rotates; past 180s we switch to the "still cooking" pool +
 * sleepy Lumo. Labels are kept short and non-overlapping with the
 * narration pool so the a11y tree doesn't surface duplicate copy.
 */
const CHECKPOINTS: readonly Checkpoint[] = [
  { atMs: 0, pct: 0, label: 'reading your profile' },
  { atMs: 6_000, pct: 15, label: 'reading your profile' },
  { atMs: 22_000, pct: 35, label: 'picking exercises' },
  { atMs: 55_000, pct: 55, label: 'building week 1' },
  { atMs: 90_000, pct: 75, label: 'checking recovery spacing' },
  { atMs: 130_000, pct: 90, label: 'adding warmups' },
  { atMs: 170_000, pct: PROGRESS_CEILING, label: 'last touches' },
]

/** Interpolate between the two surrounding checkpoints for the current elapsed time. */
function progressForElapsed(elapsedMs: number): { pct: number; label: string } {
  const first = CHECKPOINTS[0]
  const last = CHECKPOINTS[CHECKPOINTS.length - 1]
  if (elapsedMs <= first.atMs) return { pct: first.pct, label: first.label }
  if (elapsedMs >= last.atMs) return { pct: last.pct, label: last.label }
  for (let i = 1; i < CHECKPOINTS.length; i += 1) {
    const prev = CHECKPOINTS[i - 1]
    const curr = CHECKPOINTS[i]
    if (elapsedMs <= curr.atMs) {
      const span = curr.atMs - prev.atMs
      const frac = span === 0 ? 1 : (elapsedMs - prev.atMs) / span
      const pct = prev.pct + (curr.pct - prev.pct) * frac
      return { pct, label: curr.label }
    }
  }
  return { pct: last.pct, label: last.label }
}

export interface GeneratingPlanProps {
  /**
   * Escape hatch shown once elapsed exceeds the slow-warning threshold.
   * Tapping the button fires this callback — it does NOT abort the in-flight
   * fetch (out of scope), it just lets the parent flip to the error/retry
   * screen so the user isn't stuck staring at a spinner forever.
   */
  onCancel?: () => void
  /**
   * Optional injury list from the user's profile. When provided, narration
   * can surface injury-specific callouts (e.g. "negotiating with your left
   * meniscus"). Unknown body parts are silently ignored.
   */
  injuries?: readonly Injury[]
  /** Cheek level for narration. Defaults to {@link DEFAULT_CHEEK} (2). */
  cheek?: CheekLevel
  /**
   * Override the mount time for deterministic testing. Production always
   * uses Date.now() at mount.
   */
  startedAt?: number
  /** Optional label retained for API compatibility; no longer displayed. */
  taskName?: string
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function GeneratingPlan({
  onCancel,
  injuries,
  cheek = DEFAULT_CHEEK,
  startedAt,
}: GeneratingPlanProps = {}) {
  const mountedAtRef = useRef<number>(startedAt ?? Date.now())
  const [elapsedMs, setElapsedMs] = useState(0)

  // 250ms tick — smooth enough for the bar to animate, cheap enough to avoid
  // wasting a render loop. We intentionally don't lean on requestAnimationFrame:
  // the bar transitions via CSS so the tick rate only drives the label swap.
  useEffect(() => {
    const tick = () => setElapsedMs(Date.now() - mountedAtRef.current)
    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [])

  const { pct, label } = progressForElapsed(elapsedMs)
  const isLongWait = elapsedMs > SLOW_WARNING_THRESHOLD_MS
  const reducedMotion = prefersReducedMotion()

  // Build the narration pool once per (cheek, injuries, isLongWait) combo.
  const pool = useMemo(
    () => buildGeneratingPlanPool(cheek, injuries, isLongWait),
    [cheek, injuries, isLongWait],
  )

  // Anti-repeat rotation. The ref is read/written by pickCopy, so we don't
  // need state for the "last shown" value — only for the currently-rendered
  // line so React re-renders when it changes.
  const lastLineRef = useRef<string | null>(null)
  const [narration, setNarration] = useState<string>(() => {
    const initial = pickCopy(
      isLongWait ? 'generatingPlanLong' : 'generatingPlan',
      cheek,
      lastLineRef,
    )
    // Rebuild pool-aware rotation so injury lines can surface. pickCopy
    // above only saw the base pool keyed by name; re-seed from our merged
    // pool on first paint so injury lines aren't starved.
    if (pool.length > 0) {
      const firstFromPool = pool[Math.floor(Math.random() * pool.length)]
      lastLineRef.current = firstFromPool
      return firstFromPool
    }
    return initial
  })

  useEffect(() => {
    // Kick the current narration when the pool changes (e.g. isLongWait
    // just flipped) so the user sees a fresh line immediately instead of
    // waiting another rotate tick.
    if (pool.length === 0) return
    const filtered = pool.filter((e) => e !== lastLineRef.current)
    const candidates = filtered.length > 0 ? filtered : pool
    const next = candidates[Math.floor(Math.random() * candidates.length)]
    lastLineRef.current = next
    setNarration(next)
  }, [pool])

  useEffect(() => {
    if (reducedMotion) return // no rotation when user prefers reduced motion
    const id = setInterval(() => {
      if (pool.length === 0) return
      const filtered = pool.filter((e) => e !== lastLineRef.current)
      const candidates = filtered.length > 0 ? filtered : pool
      const next = candidates[Math.floor(Math.random() * candidates.length)]
      lastLineRef.current = next
      setNarration(next)
    }, NARRATION_ROTATE_MS)
    return () => clearInterval(id)
  }, [pool, reducedMotion])

  // Lumo state: thinking while working, sleepy once we cross the long-wait
  // threshold. We never render 'cheer' here — the parent unmounts us the
  // moment the real result lands, so the celebration happens in the next
  // screen (WorkoutView's session intro).
  const lumoState = isLongWait ? 'sleepy' : 'thinking'

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ background: 'var(--lumo-bg)', color: 'var(--lumo-text)' }}
    >
      <div
        className="mb-6"
        style={{
          // Breathing room around the 120px mascot. A wrapper rather than
          // inline size so the svg's built-in float animation has space.
          width: 140,
          height: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        data-testid="generating-plan-lumo"
        data-lumo-state={lumoState}
      >
        <Lumo state={lumoState} size={120} />
      </div>

      <h1
        className="text-2xl mb-2"
        style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontStyle: 'italic',
          fontWeight: 700,
          color: 'var(--lumo-text)',
        }}
      >
        Designing your training block
      </h1>
      <p
        className="text-sm max-w-sm mb-8"
        style={{ color: 'var(--lumo-text-sec)' }}
      >
        {label}.
      </p>

      <div className="w-full max-w-sm mb-3">
        <div
          className="h-2 w-full rounded-full overflow-hidden"
          style={{
            background: 'var(--lumo-raised)',
            border: '1px solid var(--lumo-border)',
          }}
        >
          <div
            data-testid="progress-bar-fill"
            className={
              reducedMotion
                ? 'h-full'
                : 'h-full transition-[width] duration-700 ease-out'
            }
            style={{
              width: `${pct}%`,
              background: 'var(--brand)',
            }}
            role="progressbar"
            aria-label="Plan generation progress"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${Math.round(pct)}% — ${narration}`}
          />
        </div>
      </div>

      <p
        data-testid="progress-pct"
        className="text-sm tabular-nums mb-6"
        style={{ color: 'var(--lumo-text-ter)' }}
      >
        {Math.round(pct)}%
      </p>

      <p
        data-testid="narration"
        role="status"
        aria-live="polite"
        className="text-base max-w-sm"
        style={{
          color: 'var(--lumo-text-sec)',
          fontStyle: 'italic',
          fontFamily: "'Fraunces', Georgia, serif",
          minHeight: '2.5rem',
        }}
      >
        {narration}
      </p>

      {isLongWait && (
        <p
          data-testid="long-wait-banner"
          className="mt-6 text-sm max-w-sm"
          style={{ color: 'var(--accent-sun)' }}
        >
          This is taking longer than usual — still cooking though.
        </p>
      )}

      {isLongWait && onCancel && (
        <button
          onClick={onCancel}
          className="mt-4 px-5 py-2 rounded-2xl text-sm font-semibold active:scale-95 transition-all"
          style={{
            background: 'var(--lumo-raised)',
            color: 'var(--lumo-text)',
            border: '1px solid var(--lumo-border-strong)',
          }}
        >
          Cancel and try again
        </button>
      )}
    </div>
  )
}
