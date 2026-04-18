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
      setProposal(null)
      setErrorMsg('')
    }
  }, [open, currentExercise.library_id])

  const fireRequest = async (reason: SwapReason) => {
    setLastReason(reason)
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      // Intentionally no tap-outside-to-dismiss — MVP requires explicit Cancel to
      // avoid accidentally losing a proposed swap mid-review.
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-full max-w-lg bg-surface-raised border-t border-x border-border-subtle rounded-t-3xl p-5 pb-8"
        style={{ animation: 'swap-sheet-slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <style>{`@keyframes swap-sheet-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        {/* Grip handle */}
        <div className="mx-auto w-10 h-1 rounded-full bg-zinc-700 mb-4" aria-hidden="true" />

        {state === 'reason-picker' && (
          <div>
            <h2 className="text-lg font-extrabold mb-1">Swap this exercise?</h2>
            <p className="text-sm text-zinc-500 mb-4">
              Replacing <span className="text-zinc-300 font-semibold">{currentExercise.name}</span>. Why?
            </p>
            <div className="grid gap-2">
              {REASON_ORDER.map(r => (
                <button
                  key={r}
                  onClick={() => fireRequest(r)}
                  className="p-3 rounded-2xl text-left border border-border-subtle bg-surface hover:border-brand/60 active:scale-[0.99] transition-all font-semibold text-sm"
                >
                  {SWAP_REASON_LABELS[r]}
                </button>
              ))}
            </div>
            <button
              onClick={onDismiss}
              className="w-full mt-4 p-3 rounded-2xl text-sm text-zinc-400 font-semibold border border-border-subtle"
            >
              Cancel
            </button>
          </div>
        )}

        {state === 'loading' && (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <Loader2 size={28} className="text-brand animate-spin mb-3" />
            <div className="text-sm font-semibold text-zinc-300">Finding a substitution…</div>
            <div className="text-xs text-zinc-500 mt-1">Hang tight — matching your equipment and injuries.</div>
          </div>
        )}

        {state === 'review' && proposal && (
          <div>
            <h2 className="text-lg font-extrabold mb-1">Try this instead</h2>
            <p className="text-sm text-zinc-500 mb-4">
              Replacing <span className="line-through">{currentExercise.name}</span>
            </p>
            <div className="p-4 rounded-2xl border border-brand/40 bg-brand/5 mb-4">
              <div className="text-base font-bold text-zinc-100">{proposal.replacement.name}</div>
              <div className="text-xs text-zinc-500 mt-1">
                {proposal.replacement.sets}×{proposal.replacement.reps} @RIR {proposal.replacement.rir} ·{' '}
                {proposal.replacement.rest_seconds}s rest · {proposal.replacement.role}
              </div>
              {proposal.replacement.notes && (
                <div className="text-xs text-zinc-400 mt-2 italic">{proposal.replacement.notes}</div>
              )}
              <div className="mt-3 pt-3 border-t border-brand/20 text-xs text-zinc-400">
                {proposal.reason}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAccept(proposal.replacement)}
                className="inline-flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-brand text-black font-bold active:scale-95 transition-all"
              >
                <Check size={16} /> Accept
              </button>
              <button
                onClick={() => lastReason && fireRequest(lastReason)}
                className="inline-flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-surface border border-border-subtle text-zinc-200 font-semibold active:scale-95 transition-all"
              >
                <RefreshCw size={14} /> Try another
              </button>
            </div>
            <button
              onClick={onDismiss}
              className="w-full mt-2 p-3 rounded-2xl text-sm text-zinc-400 font-semibold border border-border-subtle inline-flex items-center justify-center gap-1.5"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="py-4">
            <div className="flex items-start gap-3 p-3 rounded-2xl border border-red-900/40 bg-red-500/5 mb-4">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-300">{errorMsg}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => lastReason && fireRequest(lastReason)}
                className="inline-flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-brand text-black font-bold active:scale-95 transition-all"
                disabled={!lastReason}
              >
                <RefreshCw size={14} /> Retry
              </button>
              <button
                onClick={onDismiss}
                className="p-3 rounded-2xl bg-surface border border-border-subtle text-zinc-200 font-semibold active:scale-95 transition-all"
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
