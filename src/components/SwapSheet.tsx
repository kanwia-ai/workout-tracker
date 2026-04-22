import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle, RefreshCw, Check, X } from 'lucide-react'
import type { PlannedExercise } from '../types/plan'
import { SWAP_REASON_LABELS, type SwapReason } from '../lib/swap'

// ─── Component states ─────────────────────────────────────────────────────
// reason-picker: initial list of 5 swap reasons
// loading     : waiting for the edge call to resolve
// review      : show proposed replacement, let user accept / try another / cancel
// error       : edge call failed — offer a retry
type SheetState = 'reason-picker' | 'loading' | 'review' | 'error'

interface SwapSheetProps {
  open: boolean
  currentExercise: PlannedExercise
  onDismiss: () => void
  onAccept: (replacement: PlannedExercise) => void
  onRequest: (reason: SwapReason) => Promise<{ replacement: PlannedExercise; reason: string }>
}

// ─── Order matters: this is the visual order in the reason picker ────────
const REASON_ORDER: SwapReason[] = [
  'machine_busy',
  'too_hard',
  'too_easy',
  'injury_flare',
  'generic',
]

export function SwapSheet({
  open,
  currentExercise,
  onDismiss,
  onAccept,
  onRequest,
}: SwapSheetProps) {
  const [state, setState] = useState<SheetState>('reason-picker')
  const [lastReason, setLastReason] = useState<SwapReason | null>(null)
  const [activeReason, setActiveReason] = useState<SwapReason | null>(null)
  const [proposal, setProposal] = useState<{ replacement: PlannedExercise; reason: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  // Reset to initial state every time the sheet is reopened for a new exercise.
  // Using currentExercise.library_id as the reset key so we also reset when the
  // parent swaps the target without closing the sheet (defensive — the current
  // WorkoutView wiring always closes between swaps).
  useEffect(() => {
    if (open) {
      setState('reason-picker')
      setLastReason(null)
      setActiveReason(null)
      setProposal(null)
      setErrorMsg('')
    }
  }, [open, currentExercise.library_id])

  const fireRequest = async (reason: SwapReason) => {
    setLastReason(reason)
    setActiveReason(reason)
    setState('loading')
    setErrorMsg('')
    try {
      const result = await onRequest(reason)
      setProposal(result)
      setState('review')
    } catch (err) {
      setErrorMsg(
        err instanceof Error && /network|timeout|timed out/i.test(err.message)
          ? 'Network hiccup. Try again in a moment.'
          : 'Could not find a swap. Try again.',
      )
      setState('error')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      // Intentionally no tap-outside-to-dismiss — MVP requires explicit Cancel to
      // avoid accidentally losing a proposed swap mid-review.
      aria-modal="true"
      role="dialog"
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
          padding: '20px 20px 32px',
          animation: 'swap-sheet-slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`@keyframes swap-sheet-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        {/* Grip handle */}
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

        {state === 'reason-picker' && (
          <div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--lumo-text)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                letterSpacing: '-0.01em',
                marginBottom: 4,
              }}
            >
              swap this exercise?
            </h2>
            <p
              style={{
                fontSize: 13,
                color: 'var(--lumo-text-sec)',
                marginBottom: 16,
              }}
            >
              Replacing{' '}
              <span style={{ color: 'var(--lumo-text)', fontWeight: 600 }}>
                {currentExercise.name}
              </span>
              . Why?
            </p>
            {/* Horizontal scroll reason chips */}
            <div
              className="flex gap-2 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              <style>{`.swap-reasons::-webkit-scrollbar { display: none; }`}</style>
              <div className="swap-reasons flex gap-2 flex-wrap">
                {REASON_ORDER.map(r => {
                  const isActive = activeReason === r
                  return (
                    <button
                      key={r}
                      onClick={() => fireRequest(r)}
                      className="active:scale-[0.97] transition-all shrink-0"
                      style={{
                        padding: '10px 14px',
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 600,
                        background: isActive ? 'var(--brand)' : 'var(--lumo-overlay)',
                        color: isActive ? '#fff' : 'var(--lumo-text)',
                        border: isActive
                          ? '1px solid var(--brand)'
                          : '1px solid var(--lumo-border)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {SWAP_REASON_LABELS[r]}
                    </button>
                  )
                })}
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="w-full active:scale-[0.99] transition-all"
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--lumo-text-sec)',
                background: 'transparent',
                border: '1px solid var(--lumo-border)',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {state === 'loading' && (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <Loader2
              size={28}
              className="animate-spin"
              style={{ color: 'var(--brand)', marginBottom: 12 }}
            />
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--lumo-text)',
              }}
            >
              Finding a substitution…
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--lumo-text-ter)',
                marginTop: 4,
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
              }}
            >
              hang tight — matching your equipment and injuries.
            </div>
          </div>
        )}

        {state === 'review' && proposal && (
          <div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--lumo-text)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                letterSpacing: '-0.01em',
                marginBottom: 4,
              }}
            >
              try this instead
            </h2>
            <p
              style={{
                fontSize: 13,
                color: 'var(--lumo-text-sec)',
                marginBottom: 16,
              }}
            >
              Replacing{' '}
              <span style={{ textDecoration: 'line-through', color: 'var(--lumo-text-ter)' }}>
                {currentExercise.name}
              </span>
            </p>
            <div
              style={{
                padding: 16,
                borderRadius: 18,
                border: '1px solid color-mix(in srgb, var(--brand) 45%, transparent)',
                background: 'color-mix(in srgb, var(--brand) 8%, var(--lumo-raised))',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--lumo-text)',
                  letterSpacing: '-0.01em',
                }}
              >
                {proposal.replacement.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--lumo-text-ter)',
                  marginTop: 6,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
                className="tabular-nums"
              >
                {proposal.replacement.sets}×{proposal.replacement.reps} · RIR {proposal.replacement.rir} ·{' '}
                {proposal.replacement.rest_seconds}s rest · {proposal.replacement.role}
              </div>
              {proposal.replacement.notes && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--lumo-text-sec)',
                    marginTop: 8,
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontStyle: 'italic',
                    lineHeight: 1.4,
                  }}
                >
                  {proposal.replacement.notes}
                </div>
              )}
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid color-mix(in srgb, var(--brand) 22%, transparent)',
                  fontSize: 12,
                  color: 'var(--lumo-text-sec)',
                  lineHeight: 1.4,
                }}
              >
                {proposal.reason}
              </div>
            </div>
            <button
              onClick={() => onAccept(proposal.replacement)}
              className="w-full inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              style={{
                padding: 14,
                borderRadius: 14,
                background: 'var(--brand)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                border: 'none',
                letterSpacing: '-0.01em',
              }}
            >
              <Check size={16} /> Accept
            </button>
            <div className="grid grid-cols-2 gap-2" style={{ marginTop: 8 }}>
              <button
                onClick={() => lastReason && fireRequest(lastReason)}
                className="inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                style={{
                  padding: 12,
                  borderRadius: 14,
                  background: 'var(--lumo-overlay)',
                  border: '1px solid var(--lumo-border)',
                  color: 'var(--lumo-text)',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                <RefreshCw size={14} /> Try another
              </button>
              <button
                onClick={onDismiss}
                className="inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                style={{
                  padding: 12,
                  borderRadius: 14,
                  background: 'transparent',
                  border: '1px solid var(--lumo-border)',
                  color: 'var(--lumo-text-sec)',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="py-4">
            <div
              className="flex items-start gap-3"
              style={{
                padding: 12,
                borderRadius: 14,
                border: '1px solid color-mix(in srgb, #ef4444 40%, transparent)',
                background: 'color-mix(in srgb, #ef4444 8%, var(--lumo-raised))',
                marginBottom: 16,
              }}
            >
              <AlertTriangle
                size={18}
                className="shrink-0"
                style={{ color: '#f87171', marginTop: 2 }}
              />
              <div style={{ fontSize: 13, color: '#fca5a5' }}>{errorMsg}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => lastReason && fireRequest(lastReason)}
                className="inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                style={{
                  padding: 12,
                  borderRadius: 14,
                  background: 'var(--brand)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  border: 'none',
                  opacity: lastReason ? 1 : 0.5,
                }}
                disabled={!lastReason}
              >
                <RefreshCw size={14} /> Retry
              </button>
              <button
                onClick={onDismiss}
                className="active:scale-95 transition-all"
                style={{
                  padding: 12,
                  borderRadius: 14,
                  background: 'var(--lumo-overlay)',
                  border: '1px solid var(--lumo-border)',
                  color: 'var(--lumo-text)',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
