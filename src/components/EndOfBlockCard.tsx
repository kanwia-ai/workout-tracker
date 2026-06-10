// EndOfBlockCard — the end-of-block dead-end fix (2026-06-09 audit, Phase 0).
//
// Before this card existed, a finished 6-week block left HomeScreen pinned
// on "Week 6 of 6" forever: no auto-rollover exists and the only regenerate
// affordances were buried in Settings. This card celebrates the finish and
// hands the user a one-tap path into their next block.
//
// `isBlockComplete` is the detection half — exported separately so
// HomeScreen (and tests) can gate the card on it.
import { ArrowRight } from 'lucide-react'
import { Lumo } from './Lumo'
import type { Mesocycle } from '../types/plan'

/** Monday (00:00 local) of the week containing `date`. Mirrors HomeScreen's
 *  week-anchor math so "block over" and "Week N of M" agree. */
export function mondayOfDate(date: Date): Date {
  const d = new Date(date)
  // JS getDay: 0=Sun..6=Sat → shift to Mon=0..Sun=6 to subtract the right amount.
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - dow)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * A block is complete when either:
 *   1. every session is completed or skipped (nothing left to do), or
 *   2. today is past the block's final week — anchored to the Monday of the
 *      generated_at week, exactly like HomeScreen's week navigation, so the
 *      card appears the morning after "Week N of N" ends even if sessions
 *      were left untouched.
 */
export function isBlockComplete(plan: Mesocycle | null, today: Date = new Date()): boolean {
  if (!plan || plan.sessions.length === 0) return false

  const allDone = plan.sessions.every(
    (s) => s.status === 'completed' || s.status === 'skipped',
  )
  if (allDone) return true

  const anchor = mondayOfDate(new Date(plan.generated_at))
  const end = new Date(anchor)
  end.setDate(anchor.getDate() + plan.length_weeks * 7)
  return today.getTime() >= end.getTime()
}

export interface EndOfBlockCardProps {
  /** Kick off the next block — replan when available, else regenerate. */
  onStartNextBlock: () => void
}

export function EndOfBlockCard({ onStartNextBlock }: EndOfBlockCardProps) {
  return (
    <div
      data-testid="end-of-block-card"
      style={{
        marginTop: 16,
        background:
          'linear-gradient(160deg, color-mix(in srgb, var(--accent-mint) 18%, transparent), var(--lumo-raised))',
        border: '1px solid color-mix(in srgb, var(--accent-mint) 35%, transparent)',
        padding: 20,
        borderRadius: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div className="flex items-center gap-3.5">
        <Lumo state="celebrate" size={64} color="var(--accent-mint)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--lumo-text)',
              letterSpacing: '-0.01em',
            }}
          >
            block complete
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--lumo-text-sec)',
              marginTop: 6,
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
              lineHeight: 1.4,
            }}
          >
            you finished the whole thing. time to build your next one — fresh
            lifts, bigger numbers.
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onStartNextBlock}
        aria-label="Build my next block"
        className="active:scale-[0.98] transition"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '12px 14px',
          borderRadius: 14,
          background: 'var(--brand)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '-0.01em',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        build my next block
        <ArrowRight size={14} />
      </button>
    </div>
  )
}

export default EndOfBlockCard
