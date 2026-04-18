// PRCelebration — full-viewport modal overlay that fires when the user hits a
// new personal record. Ported (structure + motion vocabulary) from the Lumo
// visual spike at /tmp/workout-app-design/screens.jsx and the design-spec PR
// celebration section. Self-contained: CSS-only confetti fallback (no
// canvas-confetti dependency), keyboard + tap-outside dismissal, focus trap
// with focus-return on close, prefers-reduced-motion respected.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'

export interface PRCelebrationProps {
  open: boolean
  onClose: () => void
  exerciseName: string
  /** Previous value — e.g. "95 lb × 5". Rendered struck-through. */
  oldValue: string
  /** New value — e.g. "100 lb × 5". */
  newValue: string
  /** Optional metric label, e.g. "1RM estimate". */
  metric?: string
}

// Color palette lifted from the Lumo spec so confetti feels on-brand even in
// environments where the CSS vars haven't been injected yet. When the Lumo
// tokens land (P3.A1) the ACCENT_PLUM vars-based fallback will just work.
const CONFETTI_COLORS = [
  '#C9A0FF', // plum
  '#FFD86E', // sun
  '#6EE7C7', // mint
  '#FF9AA2', // blush
  '#FF7A45', // brand warm
]

const CONFETTI_COUNT = 28

interface ConfettiPiece {
  id: number
  left: number // %
  size: number // px
  color: string
  delay: number // s
  duration: number // s
  rotation: number // deg
}

function buildConfetti(): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 5 + Math.random() * 6,
    color:
      CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!,
    delay: Math.random() * 0.6,
    duration: 1.8 + Math.random() * 1.6,
    rotation: Math.random() * 360,
  }))
}

// Keyframes + reduced-motion override live in a <style> block scoped to the
// component so we don't have to touch global CSS to ship this.
const ANIMATION_CSS = `
@keyframes pr-confetti-fall {
  0%   { transform: translate3d(0, -40px, 0) rotate(0deg); opacity: 0; }
  10%  { opacity: 1; }
  100% { transform: translate3d(0, 110vh, 0) rotate(var(--pr-rot, 360deg)); opacity: 0; }
}
@keyframes pr-backdrop-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes pr-card-pop {
  0%   { transform: scale(0.7); opacity: 0; }
  60%  { transform: scale(1.04); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes pr-title-in {
  0%   { transform: scale(0.4) rotate(-8deg); opacity: 0; }
  60%  { transform: scale(1.1) rotate(2deg); }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .pr-animated-backdrop,
  .pr-animated-card,
  .pr-animated-title,
  .pr-animated-confetti {
    animation: none !important;
  }
  .pr-animated-confetti { display: none !important; }
}
`

// Tab-stop detection for a minimal focus trap. We only need to handle Tab and
// Shift+Tab; Escape is wired separately.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function PRCelebration({
  open,
  onClose,
  exerciseName,
  oldValue,
  newValue,
  metric,
}: PRCelebrationProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // Confetti pieces are re-rolled each time the modal opens so consecutive
  // PRs don't look identical.
  const confetti = useMemo(
    () => (open ? buildConfetti() : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  )

  // Remember which element had focus before we mounted so we can restore it
  // when the dialog closes (WCAG 2.4.3 Focus Order).
  useEffect(() => {
    if (!open) return
    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? null
    // Move focus into the dialog — the close button is a safe default because
    // it's always present and obviously dismissive.
    const raf = requestAnimationFrame(() => {
      closeButtonRef.current?.focus()
    })
    return () => {
      cancelAnimationFrame(raf)
      // Return focus to the previously-focused element, guarded because the
      // node might have been unmounted while the modal was open.
      const prev = previouslyFocusedRef.current
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
        prev.focus()
      }
    }
  }, [open])

  // Escape closes the dialog. Listener lives on document so it fires even if
  // focus temporarily drifts (shouldn't, but belt + suspenders).
  useEffect(() => {
    if (!open) return
    const handler = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Minimal focus trap: when Tab would leave the card, wrap.
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Tab') return
      const card = cardRef.current
      if (!card) return
      const focusables = card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusables.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      const active = document.activeElement as HTMLElement | null
      if (event.shiftKey) {
        if (active === first || !card.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          event.preventDefault()
          first.focus()
        }
      }
    },
    [],
  )

  const handleBackdropClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      // Only close when the click lands on the backdrop itself — stopPropagation
      // on the card handles the inverse case, but this guard keeps behaviour
      // correct if the card somehow re-emits the event.
      if (event.target === event.currentTarget) {
        onClose()
      }
    },
    [onClose],
  )

  if (!open) return null

  // Values referenced via CSS custom properties so the card picks up the Lumo
  // tokens once they land in index.css. Fallback colors keep the component
  // visually coherent in isolation (tests, Storybook, etc.).
  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'var(--lumo-overlay, rgba(11, 11, 15, 0.82))',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    animation: 'pr-backdrop-fade 200ms ease-out both',
  }

  const cardStyle: CSSProperties = {
    position: 'relative',
    maxWidth: 340,
    width: '100%',
    textAlign: 'center',
    background:
      'linear-gradient(160deg, var(--lumo-overlay, #1a1a1e), var(--lumo-raised, #222226))',
    border: '1px solid color-mix(in srgb, var(--accent-plum, #C9A0FF) 35%, transparent)',
    borderRadius: 28,
    padding: '28px 24px 22px',
    boxShadow:
      '0 20px 60px color-mix(in srgb, var(--accent-plum, #C9A0FF) 25%, transparent)',
    color: 'var(--lumo-text, #f4f4f5)',
    animation: 'pr-card-pop 420ms cubic-bezier(.34,1.56,.64,1) both',
  }

  const titleStyle: CSSProperties = {
    fontFamily: "'Fraunces', 'Iowan Old Style', Georgia, serif",
    fontStyle: 'italic',
    fontSize: 44,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1,
    color: 'var(--accent-plum, #C9A0FF)',
    textShadow: '0 0 30px color-mix(in srgb, var(--accent-plum, #C9A0FF) 40%, transparent)',
    animation: 'pr-title-in 560ms cubic-bezier(.34,1.56,.64,1) both',
    margin: 0,
  }

  return (
    <div
      className="pr-animated-backdrop"
      style={overlayStyle}
      data-testid="pr-celebration-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <style>{ANIMATION_CSS}</style>

      {/* Confetti layer — pointer-events:none so it never intercepts taps. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {confetti.map(p => (
          <span
            key={p.id}
            className="pr-animated-confetti"
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: -20,
              width: p.size,
              height: p.size * 1.5,
              background: p.color,
              borderRadius: 1,
              // CSS custom properties are typed loosely in React — cast to
              // CSSProperties & Record<string, string> if noUnknownProperty is
              // ever turned on.
              ['--pr-rot' as string]: `${p.rotation + 360}deg`,
              animation: `pr-confetti-fall ${p.duration}s ${p.delay}s ease-in both`,
            }}
          />
        ))}
      </div>

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pr-celebration-title"
        style={cardStyle}
        onClick={e => e.stopPropagation()}
      >
        <h2
          id="pr-celebration-title"
          className="pr-animated-title"
          style={titleStyle}
        >
          NEW PR
        </h2>

        <div
          style={{
            fontSize: 12,
            marginTop: 12,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--lumo-text-ter, #9a9aa3)',
          }}
        >
          {exerciseName}
        </div>

        {metric && (
          <div
            style={{
              fontSize: 11,
              marginTop: 4,
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
              color: 'var(--lumo-text-sec, #c9c9d1)',
            }}
          >
            {metric}
          </div>
        )}

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 16,
              color: 'var(--lumo-text-ter, #9a9aa3)',
              textDecoration: 'line-through',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
            }}
            data-testid="pr-old-value"
          >
            {oldValue}
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: 'var(--lumo-text, #f4f4f5)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
            data-testid="pr-new-value"
          >
            {newValue}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px 12px',
              borderRadius: 14,
              background: 'transparent',
              border: '1px solid var(--lumo-border, #3a3a50)',
              color: 'var(--lumo-text-sec, #c9c9d1)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            keep going
          </button>
        </div>
      </div>
    </div>
  )
}

export default PRCelebration
