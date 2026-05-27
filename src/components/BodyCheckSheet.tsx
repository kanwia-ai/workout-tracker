// "Anything off today?" lightweight day-of body check. Lets the user flag
// specific body parts that feel off so today's session can surface inline
// scale/swap prompts on exercises that load those parts.
//
// Per coaching philosophy (docs/research/02-coaching-philosophy.md): this is
// a SIGNAL the user provides — the system doesn't auto-swap, it just shows
// the prompt. The user decides whether to scale, swap, or push through.
//
// Persists to localStorage keyed by today's ISO date, so the flagged state
// follows the user through the day but doesn't bleed into tomorrow.

import { useState } from 'react'
import { X } from 'lucide-react'
import type { BodyPart } from '../types/profile'

export const BODY_CHECK_STORAGE_KEY = (isoDate: string) =>
  `workout-tracker:body-check:${isoDate}`

export interface BodyCheckState {
  /** Parts the user tapped `off` — these drive the inline session prompts. */
  flagged: BodyPart[]
  /** Optional free-text note the user typed. Stored but not currently consumed. */
  note?: string
}

/**
 * Read today's body-check state from localStorage. Returns null when no check
 * has been saved today.
 */
export function loadBodyCheck(isoDate: string): BodyCheckState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(BODY_CHECK_STORAGE_KEY(isoDate))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as { flagged?: unknown }).flagged)
    ) {
      return parsed as BodyCheckState
    }
    return null
  } catch {
    return null
  }
}

/** Humanize a BodyPart enum value into something a human reads naturally. */
export function humanizeBodyPart(part: BodyPart): string {
  switch (part) {
    case 'left_meniscus':  return 'left knee (meniscus)'
    case 'right_meniscus': return 'right knee (meniscus)'
    case 'left_knee':      return 'left knee'
    case 'right_knee':     return 'right knee'
    case 'lower_back':     return 'lower back'
    case 'upper_back':     return 'upper back'
    case 'hip_flexors':    return 'hip flexors'
    case 'left_shoulder':  return 'left shoulder'
    case 'right_shoulder': return 'right shoulder'
    case 'left_trap':      return 'left trap'
    case 'right_trap':     return 'right trap'
    case 'wrist':          return 'wrist'
    case 'ankle':          return 'ankle'
    case 'neck':           return 'neck'
    case 'elbow':          return 'elbow'
    case 'other':          return 'other'
  }
}

type TapState = 'fine' | 'tight' | 'off'

interface BodyCheckSheetProps {
  /** Body parts the user tracks in their injury profile. */
  parts: BodyPart[]
  /** Today's ISO date — used as the storage key. */
  isoDate: string
  /** Initial state from prior save today, if any. */
  initial?: BodyCheckState | null
  /** Called when the user saves OR closes. Pass the new state so the parent
   * can trigger a re-render of dependent UI. Null = cancelled, no change. */
  onClose: (next: BodyCheckState | null) => void
}

export function BodyCheckSheet({ parts, isoDate, initial, onClose }: BodyCheckSheetProps) {
  const [tapState, setTapState] = useState<Record<BodyPart, TapState>>(() => {
    const init: Partial<Record<BodyPart, TapState>> = {}
    for (const p of parts) {
      init[p] = initial?.flagged.includes(p) ? 'off' : 'fine'
    }
    return init as Record<BodyPart, TapState>
  })
  const [note, setNote] = useState<string>(initial?.note ?? '')

  function handleSave() {
    const flagged: BodyPart[] = parts.filter((p) => tapState[p] === 'off')
    const next: BodyCheckState = {
      flagged,
      ...(note.trim() ? { note: note.trim() } : {}),
    }
    try {
      window.localStorage.setItem(
        BODY_CHECK_STORAGE_KEY(isoDate),
        JSON.stringify(next),
      )
    } catch {
      // Storage failures are non-fatal; the prompt just won't appear today.
    }
    onClose(next)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="body-check-title"
      data-testid="body-check-sheet"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 12,
        zIndex: 1000,
      }}
      onClick={() => onClose(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--lumo-raised)',
          border: '1px solid var(--lumo-border)',
          borderRadius: 20,
          padding: 22,
          color: 'var(--lumo-text)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2
            id="body-check-title"
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: 22,
              margin: 0,
              color: 'var(--lumo-text)',
            }}
          >
            anything off today?
          </h2>
          <button
            type="button"
            onClick={() => onClose(null)}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--lumo-text-sec)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--lumo-text-sec)',
            margin: '0 0 16px',
          }}
        >
          tap each one. we'll surface scale-or-swap prompts on exercises that
          load anything you mark off. nothing auto-changes.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {parts.map((part) => {
            const current = tapState[part]
            return (
              <div
                key={part}
                data-testid={`body-check-row-${part}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--lumo-bg)',
                  border: '1px solid var(--lumo-border)',
                  borderRadius: 12,
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--lumo-text)' }}>
                  {humanizeBodyPart(part)}
                </div>
                <div role="radiogroup" aria-label={humanizeBodyPart(part)} style={{ display: 'flex', gap: 4 }}>
                  {(['fine', 'tight', 'off'] as TapState[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={current === opt}
                      data-testid={`body-check-tap-${part}-${opt}`}
                      onClick={() => setTapState({ ...tapState, [part]: opt })}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        background:
                          current === opt
                            ? opt === 'off'
                              ? 'color-mix(in srgb, var(--accent-plum) 30%, transparent)'
                              : opt === 'tight'
                                ? 'color-mix(in srgb, var(--lumo-warn, #f59e0b) 20%, transparent)'
                                : 'color-mix(in srgb, var(--accent-mint) 22%, transparent)'
                            : 'transparent',
                        borderColor:
                          current === opt
                            ? opt === 'off'
                              ? 'color-mix(in srgb, var(--accent-plum) 60%, transparent)'
                              : opt === 'tight'
                                ? 'color-mix(in srgb, var(--lumo-warn, #f59e0b) 50%, transparent)'
                                : 'color-mix(in srgb, var(--accent-mint) 55%, transparent)'
                            : 'var(--lumo-border)',
                        color:
                          current === opt
                            ? opt === 'off'
                              ? 'var(--accent-plum)'
                              : opt === 'tight'
                                ? 'var(--lumo-warn, #f59e0b)'
                                : 'var(--accent-mint)'
                            : 'var(--lumo-text-sec)',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="other notes? (optional)"
          rows={2}
          style={{
            width: '100%',
            marginTop: 14,
            padding: '10px 12px',
            background: 'var(--lumo-bg)',
            border: '1px solid var(--lumo-border)',
            borderRadius: 10,
            color: 'var(--lumo-text)',
            fontSize: 13,
            fontFamily: 'inherit',
            resize: 'none',
          }}
        />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            type="button"
            onClick={() => onClose(null)}
            data-testid="body-check-cancel"
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              background: 'transparent',
              color: 'var(--lumo-text-sec)',
              border: '1px solid var(--lumo-border)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            data-testid="body-check-save"
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              background: 'var(--accent-plum)',
              color: 'var(--lumo-bg)',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            use this for today
          </button>
        </div>
      </div>
    </div>
  )
}
