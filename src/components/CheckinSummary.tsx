/**
 * CheckinSummary — read-only display of a SessionCheckin for a finished
 * session. Loads the check-in from Dexie via `loadCheckin(sessionId)` on
 * mount (and whenever sessionId changes). Renders:
 *
 *   1. "your check-in" header (Fraunces italic to match Lumo headlines)
 *   2. Overall feel as a 5-dot row, the picked dot filled with --brand
 *   3. Optional overall_notes in a quote-style block (italic, left border)
 *   4. Per-exercise rows with a colored rating pill, used weight, notes
 *
 * Empty / loading states:
 *   - While loading: render nothing (avoid flashing an empty box).
 *   - No row in Dexie yet: render a soft prompt nudging the user to fill
 *     out the check-in via End Session.
 *
 * No external state side-effects, no writes — strictly a viewer.
 */
import { useEffect, useState, type CSSProperties } from 'react'
import { loadCheckin } from '../lib/checkins'
import type { ExerciseRating, SessionCheckin } from '../types/checkin'

// Mirrors SessionCheckinSheet so the user sees the same colors at capture
// and at recall — important so "tough" looks like the same thing in both
// surfaces.
const RATING_LABEL: Record<ExerciseRating, string> = {
  easy: 'easy',
  solid: 'solid',
  tough: 'tough',
  failed: 'failed',
}
const RATING_BG: Record<ExerciseRating, string> = {
  easy: 'color-mix(in srgb, var(--accent-mint) 30%, var(--lumo-raised))',
  solid: 'color-mix(in srgb, var(--brand) 28%, var(--lumo-raised))',
  tough: 'color-mix(in srgb, var(--accent-amber, #f59e0b) 32%, var(--lumo-raised))',
  failed: 'color-mix(in srgb, var(--accent-plum) 30%, var(--lumo-raised))',
}
const RATING_FG: Record<ExerciseRating, string> = {
  easy: 'var(--lumo-text)',
  solid: 'var(--lumo-text)',
  tough: 'var(--lumo-text)',
  failed: 'var(--accent-plum)',
}

export interface CheckinSummaryProps {
  sessionId: string
}

export function CheckinSummary({ sessionId }: CheckinSummaryProps) {
  const [checkin, setCheckin] = useState<SessionCheckin | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadCheckin(sessionId)
      .then((c) => {
        if (cancelled) return
        setCheckin(c)
        setLoading(false)
      })
      .catch(() => {
        // Swallow — a load failure shouldn't block the surrounding UI.
        // Treat as "no check-in yet" so the prompt renders.
        if (cancelled) return
        setCheckin(null)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  // Hide entirely while loading so the surface doesn't flicker between
  // an empty-box prompt and the real content.
  if (loading) return null

  return (
    <div
      data-testid="checkin-summary"
      className="rounded-2xl"
      style={{
        marginTop: 4,
        padding: '16px 16px 18px',
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--lumo-text)',
          fontFamily: "'Fraunces', Georgia, serif",
          fontStyle: 'italic',
          letterSpacing: '-0.01em',
          marginBottom: checkin ? 12 : 4,
        }}
      >
        your check-in
      </div>

      {!checkin ? (
        <div
          data-testid="checkin-summary-empty"
          style={{
            fontSize: 13,
            color: 'var(--lumo-text-sec)',
          }}
        >
          tap End Session to record how it felt.
        </div>
      ) : (
        <>
          <FeelDots feel={checkin.overall_feel} />
          {checkin.overall_notes ? (
            <NotesQuote notes={checkin.overall_notes} />
          ) : null}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginTop: 14,
            }}
          >
            {checkin.exercises.map((ex) => (
              <ExerciseSummaryRow
                key={ex.library_id}
                libraryId={ex.library_id}
                name={ex.name}
                rating={ex.rating}
                usedWeightLb={ex.used_weight_lb}
                notes={ex.notes}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── FeelDots — 5 circles, the picked one filled ─────────────────────────
function FeelDots({ feel }: { feel: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div data-testid="checkin-feel-row">
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'var(--lumo-text-ter)',
          marginBottom: 6,
        }}
      >
        overall feel
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n === feel
          return (
            <span
              key={n}
              data-testid={`checkin-feel-dot-${n}`}
              data-active={active ? 'true' : 'false'}
              aria-label={`Overall feel ${feel} of 5${active ? ' (selected)' : ''}`}
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: active ? 'var(--brand)' : 'var(--lumo-input-bg)',
                border: active
                  ? '1.5px solid var(--brand)'
                  : '1px solid var(--lumo-border)',
                display: 'inline-block',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── NotesQuote — quote-style block with left border accent ──────────────
function NotesQuote({ notes }: { notes: string }) {
  return (
    <blockquote
      data-testid="checkin-overall-notes"
      style={{
        marginTop: 12,
        marginBottom: 0,
        marginLeft: 0,
        padding: '6px 10px',
        borderLeft: '3px solid var(--brand)',
        color: 'var(--lumo-text-sec)',
        fontStyle: 'italic',
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      {notes}
    </blockquote>
  )
}

// ─── ExerciseSummaryRow — one card per exercise ──────────────────────────
interface ExerciseSummaryRowProps {
  libraryId: string
  name: string
  rating: ExerciseRating
  usedWeightLb?: number
  notes?: string
}

function ExerciseSummaryRow({
  libraryId,
  name,
  rating,
  usedWeightLb,
  notes,
}: ExerciseSummaryRowProps) {
  const pillStyle: CSSProperties = {
    display: 'inline-block',
    padding: '3px 9px',
    borderRadius: 999,
    background: RATING_BG[rating],
    color: RATING_FG[rating],
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.02em',
    textTransform: 'lowercase',
    flexShrink: 0,
  }
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 12,
        background: 'var(--lumo-input-bg)',
        border: '1px solid var(--lumo-border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--lumo-text)',
            letterSpacing: '-0.01em',
            flex: '1 1 auto',
            minWidth: 0,
          }}
        >
          {name}
        </div>
        <span data-testid={`checkin-rating-${libraryId}`} style={pillStyle}>
          {RATING_LABEL[rating]}
        </span>
      </div>
      {usedWeightLb && usedWeightLb > 0 ? (
        <div
          style={{
            fontSize: 11,
            color: 'var(--lumo-text-ter)',
            marginTop: 4,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {usedWeightLb} lb
        </div>
      ) : null}
      {notes ? (
        <div
          data-testid={`checkin-notes-${libraryId}`}
          style={{
            marginTop: 6,
            fontSize: 12,
            fontStyle: 'italic',
            color: 'var(--lumo-text-sec)',
            lineHeight: 1.4,
          }}
        >
          {notes}
        </div>
      ) : null}
    </div>
  )
}
