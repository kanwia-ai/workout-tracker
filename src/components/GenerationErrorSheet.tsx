// GenerationErrorSheet — surfaces plan-generation failures to users who
// already have a profile (2026-06-09 audit, Phase 0).
//
// Pre-fix, runGeneration's catch set generationError + pendingProfile but
// the only UI for them lived inside App's !hasProfile branch — existing
// users' failed regenerates silently returned to the home screen. This
// fixed bottom sheet renders over whatever screen the user is on (home,
// settings, any tab) so the failure is never invisible again.
//
// Reassurance matters here: generation only writes to Dexie on success, so
// the user's current plan really is untouched — the copy says so.
import { X } from 'lucide-react'
import { Lumo } from './Lumo'

export interface GenerationErrorSheetProps {
  /** Friendly error string from App's friendlyGenerationError. */
  message: string
  /** Re-run generation with the pending (or stored) profile. */
  onRetry: () => void
  /** Clear the error and keep the current plan. */
  onDismiss: () => void
}

export function GenerationErrorSheet({
  message,
  onRetry,
  onDismiss,
}: GenerationErrorSheetProps) {
  return (
    <div
      role="alert"
      data-testid="generation-error-sheet"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 16,
        zIndex: 2100,
        maxWidth: 480,
        margin: '0 auto',
        background: 'var(--lumo-raised)',
        border: '1px solid color-mix(in srgb, #ef4444 40%, var(--lumo-border))',
        borderRadius: 22,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)',
        color: 'var(--lumo-text)',
      }}
    >
      <div className="flex items-center gap-3">
        <Lumo state="sad" size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: '-0.01em',
            }}
          >
            couldn't build your plan
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--lumo-text-sec)',
              marginTop: 4,
              lineHeight: 1.4,
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
            }}
          >
            {message} nothing was lost — your saved workouts are untouched.
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss generation error"
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-md active:scale-90 transition"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--lumo-text-sec)',
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          <X size={16} />
        </button>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="active:scale-[0.98] transition"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
        try again
      </button>
    </div>
  )
}

export default GenerationErrorSheet
