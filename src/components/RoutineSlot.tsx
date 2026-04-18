import { useState, useEffect, useRef } from 'react'
import { Loader2, RefreshCw, AlertTriangle, X } from 'lucide-react'
import type { PlannedSession } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'
import type { RoutineKind } from '../lib/routines'
import { generateRoutine } from '../lib/routines'
import { useRoutine } from '../hooks/useRoutine'

// ─── Defaults & chip menus ────────────────────────────────────────────────
// These live in-module so the component re-renders never reallocate them and
// tests can read them by value (5 / 10 / 15 / 20 for warmup + cardio, etc.).

const DEFAULT_MINUTES: Record<RoutineKind, number> = {
  warmup: 10,
  cooldown: 5,
  cardio: 15,
}

const MINUTE_CHIPS: Record<RoutineKind, number[]> = {
  warmup: [5, 10, 15, 20],
  cooldown: [3, 5, 10],
  cardio: [5, 10, 15, 20],
}

const FOCUS_CHIPS: Record<RoutineKind, string[]> = {
  warmup: ['Mobility', 'Activation', 'Movement prep'],
  cooldown: ['Stretching', 'Breath'],
  cardio: ['Zone 2', 'Intervals'],
}

const KIND_LABELS: Record<RoutineKind, string> = {
  warmup: 'warmup',
  cooldown: 'cooldown',
  cardio: 'cardio',
}

interface Props {
  session: PlannedSession
  kind: RoutineKind
  profile: UserProgramProfile
}

// Format duration seconds as MM:SS (e.g., 30 → "00:30", 90 → "01:30").
function formatDuration(seconds: number): string {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')
  const ss = (seconds % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

export function RoutineSlot({ session, kind, profile }: Props) {
  const { routine, loading } = useRoutine(session.id, kind)
  const [picking, setPicking] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guard the auto-generate effect so we only fire once per (session, kind)
  // absence. Without this we'd re-fire on every render that keeps routine=null.
  const didAutoFire = useRef(false)

  async function doGenerate(minutes: number, focusTag?: string) {
    setGenerating(true)
    setError(null)
    try {
      await generateRoutine({
        session,
        kind,
        profile,
        minutes,
        ...(focusTag ? { focusTag } : {}),
      })
    } catch {
      setError(`Failed to build ${KIND_LABELS[kind]}`)
    } finally {
      setGenerating(false)
      setPicking(false)
    }
  }

  // Default-generate on first mount when no saved routine exists.
  useEffect(() => {
    if (loading) return
    if (routine) {
      didAutoFire.current = false // reset for future deletions
      return
    }
    if (didAutoFire.current) return
    if (error) return // don't loop into a failing edge call
    didAutoFire.current = true
    void doGenerate(DEFAULT_MINUTES[kind])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, routine, kind, error])

  // ─── Render states ────────────────────────────────────────────────────
  // Order matters: loading → generating → error → ready.
  // "Ready" is the steady state; picker is layered on top.

  if (loading || generating || (!routine && !error)) {
    const copy = routine
      ? `Regenerating ${KIND_LABELS[kind]}…`
      : `Building your ${KIND_LABELS[kind]}…`
    return (
      <section className="p-4 rounded-2xl bg-surface-raised border border-border-subtle">
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-zinc-400"
        >
          <Loader2 size={16} className="text-brand animate-spin" />
          <span>{copy}</span>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="p-4 rounded-2xl bg-surface-raised border border-red-900/40">
        <div className="flex items-start gap-2 mb-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-300">Failed to build {KIND_LABELS[kind]}</div>
        </div>
        <button
          type="button"
          onClick={() => doGenerate(DEFAULT_MINUTES[kind])}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand text-black font-bold text-sm active:scale-95 transition"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </section>
    )
  }

  // Ready state (routine is non-null, nothing pending, no error)
  return (
    <section className="p-4 rounded-2xl bg-surface-raised border border-border-subtle">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-extrabold text-zinc-100">{routine!.title}</h3>
        <button
          type="button"
          onClick={() => setPicking(true)}
          aria-label={`Regenerate ${KIND_LABELS[kind]}`}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-surface transition"
        >
          <RefreshCw size={14} />
        </button>
      </header>
      <ul className="space-y-2">
        {routine!.exercises.map((ex, i) => {
          const primary =
            typeof ex.duration_seconds === 'number'
              ? formatDuration(ex.duration_seconds)
              : (ex.reps ?? '')
          return (
            <li key={`${ex.name}-${i}`} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-zinc-200 font-semibold">{ex.name}</span>
                {primary && (
                  <span className="text-zinc-400 tabular-nums text-xs">{primary}</span>
                )}
              </div>
              {ex.notes && (
                <div className="text-xs text-zinc-500 mt-0.5 italic">{ex.notes}</div>
              )}
            </li>
          )
        })}
      </ul>

      {picking && (
        <RegeneratePicker
          kind={kind}
          onConfirm={doGenerate}
          onCancel={() => setPicking(false)}
        />
      )}
    </section>
  )
}

// ─── RegeneratePicker bottom sheet ─────────────────────────────────────────
// Intentional UX: the picker requires both a minute chip AND an explicit
// "Yes, replace" confirm before firing generateRoutine. Per Kyra's note, a
// single accidental tap on a chip should never overwrite the saved routine.

interface PickerProps {
  kind: RoutineKind
  onConfirm: (minutes: number, focusTag?: string) => void
  onCancel: () => void
}

function RegeneratePicker({ kind, onConfirm, onCancel }: PickerProps) {
  const [minutes, setMinutes] = useState<number>(DEFAULT_MINUTES[kind])
  const [focusTag, setFocusTag] = useState<string | undefined>(undefined)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Regenerate ${KIND_LABELS[kind]}`}
    >
      <div
        className="w-full max-w-lg bg-surface-raised border-t border-x border-border-subtle rounded-t-3xl p-5 pb-8"
        style={{ animation: 'routine-picker-slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <style>{`@keyframes routine-picker-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        <div className="mx-auto w-10 h-1 rounded-full bg-zinc-700 mb-4" aria-hidden="true" />

        <h2 className="text-lg font-extrabold mb-1">Regenerate {KIND_LABELS[kind]}</h2>
        <p className="text-sm text-zinc-500 mb-4">Pick a length + optional focus.</p>

        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Minutes</div>
          <div className="flex flex-wrap gap-2">
            {MINUTE_CHIPS[kind].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                aria-pressed={minutes === m}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                  minutes === m
                    ? 'bg-brand text-black border-brand'
                    : 'bg-surface text-zinc-300 border-border-subtle hover:border-brand/60'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Focus</div>
          <div className="flex flex-wrap gap-2">
            {FOCUS_CHIPS[kind].map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFocusTag(prev => (prev === f ? undefined : f))}
                aria-pressed={focusTag === f}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                  focusTag === f
                    ? 'bg-brand text-black border-brand'
                    : 'bg-surface text-zinc-300 border-border-subtle hover:border-brand/60'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-zinc-400 mb-3">
          Replace current {KIND_LABELS[kind]}?
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onConfirm(minutes, focusTag)}
            className="inline-flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-brand text-black font-bold active:scale-95 transition"
          >
            <RefreshCw size={14} /> Yes, replace
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-surface border border-border-subtle text-zinc-200 font-semibold active:scale-95 transition"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
