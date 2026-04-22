import { useState, useEffect, useRef } from 'react'
import { Loader2, RefreshCw, AlertTriangle, X, ChevronDown } from 'lucide-react'
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

// Per-kind accent mapping. Design (screens.jsx) pairs warm-up with sun and
// cool-down with mint; cardio isn't in the original SessionScreen, so it
// takes the remaining distinct accent (plum) to stay visually distinct.
const KIND_ACCENTS: Record<RoutineKind, string> = {
  warmup: 'var(--accent-sun)',
  cooldown: 'var(--accent-mint)',
  cardio: 'var(--accent-plum)',
}

// Human-readable title used in the accordion header (e.g. "warm-up").
const KIND_HEADER: Record<RoutineKind, string> = {
  warmup: 'warm-up',
  cooldown: 'cool-down',
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

// Detect `prefers-reduced-motion: reduce` so the chevron rotation + expand
// transitions can be suppressed. Safe in SSR / jsdom without matchMedia.
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function RoutineSlot({ session, kind, profile }: Props) {
  const { routine, loading } = useRoutine(session.id, kind)
  const [picking, setPicking] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Accordion starts open so a freshly-generated routine is visible without
  // an extra tap. User can collapse to get it out of the way.
  const [expanded, setExpanded] = useState(true)
  const reducedMotion = prefersReducedMotion()

  // Guard the auto-generate effect so we only fire once per (session, kind)
  // absence. Without this we'd re-fire on every render that keeps routine=null.
  const didAutoFire = useRef(false)

  const accent = KIND_ACCENTS[kind]

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
      <section
        className="rounded-2xl px-[14px] py-3 mb-[10px]"
        style={{
          background: 'var(--lumo-raised)',
          border: '1px solid var(--lumo-border)',
        }}
      >
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-sm"
          style={{ color: 'var(--lumo-text-sec)' }}
        >
          <Loader2 size={16} className="animate-spin" style={{ color: accent }} />
          <span>{copy}</span>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section
        className="rounded-2xl px-[14px] py-3 mb-[10px]"
        style={{
          background: 'var(--lumo-raised)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
        }}
      >
        <div className="flex items-start gap-2 mb-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: '#f87171' }} />
          <div className="text-sm" style={{ color: '#fca5a5' }}>
            Failed to build {KIND_LABELS[kind]}
          </div>
        </div>
        <button
          type="button"
          onClick={() => doGenerate(DEFAULT_MINUTES[kind])}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm active:scale-95 transition"
          style={{ background: 'var(--brand)', color: '#fff' }}
        >
          <RefreshCw size={14} /> Retry
        </button>
      </section>
    )
  }

  // Ready state (routine is non-null, nothing pending, no error)
  const exerciseCount = routine!.exercises.length
  const sub = `${exerciseCount} ${exerciseCount === 1 ? 'move' : 'moves'}`

  return (
    <section
      className="rounded-[18px] mb-[10px]"
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        padding: '12px 14px',
      }}
    >
      {/* Whole header row is the expand/collapse tap target. The regenerate
          button stops propagation so it doesn't accidentally toggle expand. */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2 bg-transparent border-0 p-0 text-left cursor-pointer"
        style={{ color: 'var(--lumo-text)' }}
      >
        <span className="flex items-center gap-[10px] flex-1 min-w-0">
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
          />
          <span className="flex flex-col min-w-0">
            <span
              className="text-[14px] font-bold"
              style={{
                color: accent,
                fontFamily: "'Fraunces', 'Iowan Old Style', Georgia, serif",
                fontStyle: 'italic',
              }}
            >
              {KIND_HEADER[kind]}
            </span>
            <span
              className="text-[11px] mt-[1px] tabular-nums"
              style={{ color: 'var(--lumo-text-ter)' }}
            >
              {sub}
            </span>
          </span>
        </span>

        <span className="flex items-center gap-2 shrink-0">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setPicking(true) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                setPicking(true)
              }
            }}
            aria-label={`Regenerate ${KIND_LABELS[kind]}`}
            title="Regenerate"
            className="p-1.5 rounded-lg transition active:scale-95 cursor-pointer"
            style={{ color: 'var(--lumo-text-ter)' }}
          >
            <RefreshCw size={14} />
          </span>
          <ChevronDown
            size={14}
            aria-hidden="true"
            style={{
              color: 'var(--lumo-text-ter)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: reducedMotion ? 'none' : 'transform 200ms ease',
            }}
          />
        </span>
      </button>

      {expanded && (() => {
        const exercises = routine!.exercises
        // Cardio special case: if there's only one entry, render as a single
        // compact row — name on left, duration/reps/notes on right. No list.
        if (kind === 'cardio' && exercises.length === 1) {
          const ex = exercises[0]
          const primary =
            typeof ex.duration_seconds === 'number'
              ? formatDuration(ex.duration_seconds)
              : (ex.reps ?? '')
          const right = ex.notes || primary
          return (
            <div
              className="mt-[8px] pt-[8px] flex items-baseline justify-between gap-3"
              style={{
                borderTop: '1px solid color-mix(in srgb, var(--lumo-border-strong) 40%, transparent)',
                padding: '4px 2px',
              }}
            >
              <span
                className="text-[15px] min-w-0 truncate"
                style={{ color: 'var(--lumo-text)', fontWeight: 500 }}
              >
                {ex.name}
              </span>
              {right && (
                <span
                  className="text-[12px] shrink-0 tabular-nums"
                  style={{ color: 'var(--lumo-text-ter)' }}
                >
                  {right}
                </span>
              )}
            </div>
          )
        }
        return (
          <ul
            className="mt-[4px] flex flex-col"
            style={{
              borderTop: '1px solid color-mix(in srgb, var(--lumo-border-strong) 40%, transparent)',
            }}
          >
            {exercises.map((ex, i) => {
              const primary =
                typeof ex.duration_seconds === 'number'
                  ? formatDuration(ex.duration_seconds)
                  : (ex.reps ?? '')
              return (
                <li
                  key={`${ex.name}-${i}`}
                  className="flex items-baseline justify-between gap-3"
                  style={{
                    padding: '11px 2px',
                    borderBottom:
                      i === exercises.length - 1
                        ? 'none'
                        : '1px solid color-mix(in srgb, var(--lumo-border-strong) 40%, transparent)',
                  }}
                >
                  <span
                    className="text-[15px] min-w-0 truncate"
                    style={{ color: 'var(--lumo-text)', fontWeight: 500 }}
                  >
                    {ex.name}
                  </span>
                  {primary && (
                    <span
                      className="text-[12px] shrink-0 tabular-nums"
                      style={{ color: 'var(--lumo-text-ter)' }}
                    >
                      {primary}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )
      })()}

      {picking && (
        <RegeneratePicker
          kind={kind}
          accent={accent}
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
// Chips only appear here — never in the main accordion view.

interface PickerProps {
  kind: RoutineKind
  accent: string
  onConfirm: (minutes: number, focusTag?: string) => void
  onCancel: () => void
}

function RegeneratePicker({ kind, accent, onConfirm, onCancel }: PickerProps) {
  const [minutes, setMinutes] = useState<number>(DEFAULT_MINUTES[kind])
  const [focusTag, setFocusTag] = useState<string | undefined>(undefined)
  const reducedMotion = prefersReducedMotion()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Regenerate ${KIND_LABELS[kind]}`}
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl p-5 pb-8"
        style={{
          background: 'var(--lumo-raised)',
          borderTop: '1px solid var(--lumo-border)',
          borderLeft: '1px solid var(--lumo-border)',
          borderRight: '1px solid var(--lumo-border)',
          animation: reducedMotion
            ? 'none'
            : 'routine-picker-slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`@keyframes routine-picker-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        <div
          className="mx-auto w-10 h-1 rounded-full mb-4"
          aria-hidden="true"
          style={{ background: 'var(--lumo-border-strong)' }}
        />

        <h2
          className="text-lg font-extrabold mb-1"
          style={{
            color: 'var(--lumo-text)',
            fontFamily: "'Fraunces', 'Iowan Old Style', Georgia, serif",
            fontStyle: 'italic',
          }}
        >
          Regenerate {KIND_LABELS[kind]}
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--lumo-text-sec)' }}>
          Pick a length + optional focus.
        </p>

        <div className="mb-4">
          <div
            className="text-xs uppercase tracking-wide mb-2"
            style={{ color: 'var(--lumo-text-ter)' }}
          >
            Minutes
          </div>
          <div className="flex flex-wrap gap-2">
            {MINUTE_CHIPS[kind].map(m => {
              const selected = minutes === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  aria-pressed={selected}
                  className="px-3 py-2 rounded-xl text-sm font-semibold transition tabular-nums"
                  style={{
                    background: selected ? accent : 'var(--lumo-bg)',
                    color: selected ? '#1A0F2A' : 'var(--lumo-text-sec)',
                    border: `1px solid ${selected ? accent : 'var(--lumo-border)'}`,
                  }}
                >
                  {m} min
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-5">
          <div
            className="text-xs uppercase tracking-wide mb-2"
            style={{ color: 'var(--lumo-text-ter)' }}
          >
            Focus
          </div>
          <div className="flex flex-wrap gap-2">
            {FOCUS_CHIPS[kind].map(f => {
              const selected = focusTag === f
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFocusTag(prev => (prev === f ? undefined : f))}
                  aria-pressed={selected}
                  className="px-3 py-2 rounded-xl text-sm font-semibold transition"
                  style={{
                    background: selected ? accent : 'var(--lumo-bg)',
                    color: selected ? '#1A0F2A' : 'var(--lumo-text-sec)',
                    border: `1px solid ${selected ? accent : 'var(--lumo-border)'}`,
                  }}
                >
                  {f}
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-xs mb-3" style={{ color: 'var(--lumo-text-sec)' }}>
          Replace current {KIND_LABELS[kind]}?
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onConfirm(minutes, focusTag)}
            className="inline-flex items-center justify-center gap-1.5 p-3 rounded-2xl font-bold active:scale-95 transition"
            style={{ background: 'var(--brand)', color: '#fff' }}
          >
            <RefreshCw size={14} /> Yes, replace
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1.5 p-3 rounded-2xl font-semibold active:scale-95 transition"
            style={{
              background: 'var(--lumo-bg)',
              border: '1px solid var(--lumo-border)',
              color: 'var(--lumo-text-sec)',
            }}
          >
            <X size={14} /> Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
