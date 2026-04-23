import { useState, useMemo, type CSSProperties } from 'react'
import { X, Check } from 'lucide-react'
import {
  ExerciseRating,
  type ExerciseCheckin,
  type SessionCheckin,
} from '../types/checkin'
import type { PlannedExercise } from '../types/plan'

// ─── Design reference ────────────────────────────────────────────────────
// Lumo design system — paints entirely through CSS vars (--lumo-bg,
// --lumo-raised, --brand, etc.), Fraunces italic for decorative headlines,
// system-ui for body. Structured after SwapSheet (bottom sheet on mobile)
// but centered on desktop via max-width + auto margins on the outer flex.
//
// Full-screen on mobile feels aggressive for a post-session hand-off, so
// we use a bottom-sheet-that-grows-to-fit — scrolls internally when
// exercises > ~4. This matches Kyra's "no button soup" preference and keeps
// the page context (Lumo, progress) visible behind the dim.
// ─────────────────────────────────────────────────────────────────────────

// Emoji row for overall feel. Indices 0..4 map to 1..5 — we pass the
// literal score into the consumer so the schema's union type stays happy.
const FEEL_EMOJI: readonly string[] = ['😩', '😕', '🙂', '💪', '🔥']
const FEEL_LABEL: readonly string[] = ['wrecked', 'rough', 'ok', 'strong', 'on fire']

type Feel = 1 | 2 | 3 | 4 | 5

const RATING_ORDER: readonly ExerciseRating[] = ['easy', 'solid', 'tough', 'failed']
const RATING_LABEL: Record<ExerciseRating, string> = {
  easy: 'easy',
  solid: 'solid',
  tough: 'tough',
  failed: 'failed',
}
// Chip background accents per rating so the active state feels distinct —
// green-ish for "easy", brand-forward for "solid", amber for "tough",
// plum for "failed". All mixed through CSS vars so themes flip cleanly.
const RATING_BG: Record<ExerciseRating, string> = {
  easy: 'color-mix(in srgb, var(--accent-mint) 22%, var(--lumo-raised))',
  solid: 'var(--brand)',
  tough: 'color-mix(in srgb, var(--accent-amber, #f59e0b) 28%, var(--lumo-raised))',
  failed: 'color-mix(in srgb, var(--accent-plum) 26%, var(--lumo-raised))',
}
const RATING_FG: Record<ExerciseRating, string> = {
  easy: 'var(--lumo-text)',
  solid: '#fff',
  tough: 'var(--lumo-text)',
  failed: 'var(--accent-plum)',
}

// The "hydrated" per-exercise state the sheet tracks internally. Rating is
// nullable until the user has tapped a chip. We refuse to submit until
// every exercise has a rating + overall feel is picked.
interface DraftRow {
  library_id: string
  name: string
  rating: ExerciseRating | null
  used_weight_lb?: number
  reps_done?: number[]
}

export interface SessionCheckinSheetProps {
  open: boolean
  userId: string
  sessionId: string
  weekNumber: number
  /** Exercises from the just-finished session — used to build rows. */
  exercises: PlannedExercise[]
  /**
   * Completed weights keyed by library_id — copied straight from
   * WorkoutView's effective-weight calc. Optional so the sheet works in
   * isolation (tests, standalone previews).
   */
  completedWeights?: Record<string, number>
  /**
   * Completed reps per set keyed by library_id. Each array has one entry
   * per set; 0 means "not recorded".
   */
  completedReps?: Record<string, number[]>
  onSave: (checkin: SessionCheckin) => void
  onSkip: () => void
}

export function SessionCheckinSheet({
  open,
  userId,
  sessionId,
  weekNumber,
  exercises,
  completedWeights,
  completedReps,
  onSave,
  onSkip,
}: SessionCheckinSheetProps) {
  // Seed the draft rows from props. We don't useEffect-sync this because
  // the parent is expected to unmount the sheet between sessions (open
  // flips false, the sheet unmounts, re-mount next session gets fresh
  // state). Keeps the reducer surface tiny.
  const [rows, setRows] = useState<DraftRow[]>(() =>
    exercises.map((ex) => ({
      library_id: ex.library_id,
      name: ex.name,
      rating: null,
      used_weight_lb: completedWeights?.[ex.library_id],
      reps_done: completedReps?.[ex.library_id],
    })),
  )
  const [feel, setFeel] = useState<Feel | null>(null)
  const [notes, setNotes] = useState('')

  const allRated = useMemo(
    () => rows.every((r) => r.rating !== null),
    [rows],
  )
  const canSave = allRated && feel !== null

  const setRating = (idx: number, rating: ExerciseRating) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, rating } : r)))
  }

  const handleSave = () => {
    if (!canSave || feel === null) return
    const exercisesPayload: ExerciseCheckin[] = rows.map((r) => {
      const base: ExerciseCheckin = {
        library_id: r.library_id,
        name: r.name,
        rating: r.rating as ExerciseRating,
      }
      // Only attach optional fields when we actually have data — keeps the
      // stored JSON tight and avoids introducing `undefined` keys through
      // JSON.stringify round-trips.
      if (r.used_weight_lb !== undefined && r.used_weight_lb > 0) {
        base.used_weight_lb = r.used_weight_lb
      }
      if (r.reps_done && r.reps_done.length > 0) {
        base.reps_done = r.reps_done
      }
      return base
    })
    const checkin: SessionCheckin = {
      session_id: sessionId,
      user_id: userId,
      completed_at: new Date().toISOString(),
      week_number: weekNumber,
      overall_feel: feel,
      overall_notes: notes.trim() ? notes.trim().slice(0, 500) : undefined,
      exercises: exercisesPayload,
      synced: false,
    }
    onSave(checkin)
  }

  if (!open) return null

  return (
    <div
      data-testid="session-checkin-sheet"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      aria-modal="true"
      role="dialog"
      aria-label="Post-workout check-in"
    >
      <div
        className="w-full max-w-lg"
        style={{
          background: 'var(--lumo-raised)',
          borderTop: '1px solid var(--lumo-border)',
          borderLeft: '1px solid var(--lumo-border)',
          borderRight: '1px solid var(--lumo-border)',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          // Desktop: round all corners, add a gentle bottom border.
          borderBottomLeftRadius: 22,
          borderBottomRightRadius: 22,
          borderBottom: '1px solid var(--lumo-border)',
          padding: '20px 20px 28px',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'checkin-sheet-slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes checkin-sheet-slide-up {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-testid="session-checkin-sheet"] > div { animation: none !important; }
          }
        `}</style>

        {/* Grip handle — visual cue on mobile, harmless on desktop. */}
        <div
          className="mx-auto mb-4"
          aria-hidden="true"
          style={{
            width: 40,
            height: 4,
            borderRadius: 999,
            background: 'var(--lumo-border-strong)',
          }}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--lumo-text)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              how'd it go?
            </h2>
            <p
              style={{
                fontSize: 13,
                color: 'var(--lumo-text-sec)',
                marginTop: 4,
              }}
            >
              a quick tap per lift helps me tune next week.
            </p>
          </div>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Skip check-in"
            data-testid="checkin-skip-close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: 'var(--lumo-overlay)',
              border: '1px solid var(--lumo-border)',
              color: 'var(--lumo-text-sec)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Overall feel — 5-emoji row */}
        <section aria-label="Overall feel" style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--lumo-text-ter)',
              marginBottom: 8,
            }}
          >
            overall feel
          </div>
          <div
            role="radiogroup"
            aria-label="Overall feel"
            data-testid="feel-row"
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'space-between',
            }}
          >
            {FEEL_EMOJI.map((emoji, i) => {
              const value = (i + 1) as Feel
              const active = feel === value
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${FEEL_LABEL[i]} (${value} of 5)`}
                  data-testid={`feel-${value}`}
                  onClick={() => setFeel(value)}
                  style={{
                    flex: 1,
                    minHeight: 56,
                    borderRadius: 14,
                    background: active
                      ? 'color-mix(in srgb, var(--brand) 14%, var(--lumo-input-bg))'
                      : 'var(--lumo-input-bg)',
                    border: active
                      ? '1.5px solid var(--brand)'
                      : '1px solid var(--lumo-border)',
                    fontSize: 24,
                    cursor: 'pointer',
                    transition: 'transform 120ms, background 160ms, border-color 160ms',
                    transform: active ? 'scale(1.03)' : 'scale(1)',
                    padding: 0,
                  }}
                >
                  <span aria-hidden="true">{emoji}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Per-exercise ratings */}
        <section aria-label="Per-exercise ratings" style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--lumo-text-ter)',
              marginBottom: 8,
            }}
          >
            the work · tap to rate
          </div>
          <div
            data-testid="exercise-rows"
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {rows.map((row, idx) => (
              <ExerciseRow
                key={`${row.library_id}-${idx}`}
                row={row}
                onRate={(rating) => setRating(idx, rating)}
              />
            ))}
          </div>
        </section>

        {/* Overall notes — optional, 500 chars */}
        <section aria-label="Overall notes" style={{ marginTop: 20 }}>
          <label
            htmlFor="checkin-overall-notes"
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--lumo-text-ter)',
              display: 'block',
              marginBottom: 8,
            }}
          >
            anything to flag? (optional)
          </label>
          <textarea
            id="checkin-overall-notes"
            data-testid="checkin-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            maxLength={500}
            rows={3}
            placeholder="sore knee, shoulder pinchy, felt amazing…"
            style={{
              width: '100%',
              resize: 'vertical',
              minHeight: 72,
              maxHeight: 180,
              padding: '10px 12px',
              borderRadius: 12,
              background: 'var(--lumo-input-bg)',
              border: '1px solid var(--lumo-border)',
              color: 'var(--lumo-text)',
              fontSize: 14,
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <div
            style={{
              fontSize: 11,
              color: 'var(--lumo-text-ter)',
              marginTop: 4,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {notes.length}/500
          </div>
        </section>

        {/* Actions */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            data-testid="checkin-save"
            className="active:scale-[0.99] transition-all"
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 14,
              background: canSave ? 'var(--brand)' : 'var(--lumo-overlay)',
              color: canSave ? '#fff' : 'var(--lumo-text-ter)',
              fontWeight: 700,
              fontSize: 15,
              border: 'none',
              letterSpacing: '-0.01em',
              cursor: canSave ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Check size={16} /> Save &amp; close
          </button>
          <button
            type="button"
            onClick={onSkip}
            data-testid="checkin-skip"
            className="active:scale-[0.99] transition-all"
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 14,
              background: 'transparent',
              color: 'var(--lumo-text-sec)',
              fontWeight: 600,
              fontSize: 13,
              border: '1px solid var(--lumo-border)',
              cursor: 'pointer',
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ExerciseRow ────────────────────────────────────────────────────────
// One card per exercise: name on top, 4 rating chips below. Pulled out to
// keep the main sheet body scannable.
interface ExerciseRowProps {
  row: DraftRow
  onRate: (rating: ExerciseRating) => void
}

function ExerciseRow({ row, onRate }: ExerciseRowProps) {
  return (
    <div
      style={{
        padding: '12px 12px 10px',
        borderRadius: 14,
        background: 'var(--lumo-input-bg)',
        border: '1px solid var(--lumo-border)',
      }}
      data-testid={`exercise-row-${row.library_id}`}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--lumo-text)',
          letterSpacing: '-0.01em',
          marginBottom: 2,
        }}
      >
        {row.name}
      </div>
      {(row.used_weight_lb || (row.reps_done && row.reps_done.length > 0)) && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--lumo-text-ter)',
            marginBottom: 8,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {row.used_weight_lb ? `${row.used_weight_lb} lb` : null}
          {row.used_weight_lb && row.reps_done?.length ? ' · ' : null}
          {row.reps_done?.length
            ? `reps: ${row.reps_done.join('·')}`
            : null}
        </div>
      )}
      <div
        role="radiogroup"
        aria-label={`Rating for ${row.name}`}
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
      >
        {RATING_ORDER.map((r) => {
          const active = row.rating === r
          const chipStyle: CSSProperties = {
            flex: '1 1 auto',
            minWidth: 64,
            padding: '8px 10px',
            borderRadius: 10,
            background: active ? RATING_BG[r] : 'var(--lumo-raised)',
            color: active ? RATING_FG[r] : 'var(--lumo-text-sec)',
            border: active
              ? '1px solid transparent'
              : '1px solid var(--lumo-border)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.02em',
            textTransform: 'lowercase',
            cursor: 'pointer',
            transition: 'background 160ms, color 160ms, border-color 160ms',
          }
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Rate ${row.name} as ${RATING_LABEL[r]}`}
              data-testid={`rating-${row.library_id}-${r}`}
              onClick={() => onRate(r)}
              className="active:scale-[0.97]"
              style={chipStyle}
            >
              {RATING_LABEL[r]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
