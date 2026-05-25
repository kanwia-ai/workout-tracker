// BackendStatusBanner — surfaces "Supabase unreachable" so the user knows
// the app is in local-only mode, instead of staring at a sign-in button
// that quietly fails. Mounted by App.tsx near the top of the tree (just
// below the status bar).
//
// Design constraints:
//   - Show only when Supabase is *configured* (env vars present) but
//     unreachable. If the env vars are missing entirely the app is in a
//     local-only build by design and this banner would just be noise.
//   - Run one health probe on mount with a 3s timeout. Re-probe after 60s
//     so we don't nag every render or burn a request per keystroke.
//   - Dismissal persists in sessionStorage so the banner doesn't reappear
//     mid-session, but a fresh visit (new tab, app re-open) shows it again
//     if the backend is still down.
//   - Warm amber palette, NOT red — this is informational, not an error
//     state. Sign-in is disabled, but the user's data is safe locally.
//
// Wiring: App.tsx imports + mounts `<BackendStatusBanner />`. This file
// intentionally does not auto-mount itself — Agent B is touching App.tsx
// and will wire it in once their changes land.

import { useEffect, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'

const DISMISS_KEY = 'workout-tracker:backend-banner-dismissed'
const HEALTH_PATH = '/auth/v1/health'
const PROBE_TIMEOUT_MS = 3000
const RETRY_INTERVAL_MS = 60_000

type ProbeState = 'idle' | 'probing' | 'online' | 'offline'

/**
 * Probe Supabase /auth/v1/health with an AbortController-backed timeout.
 * Returns true if we got any HTTP response (including 401/4xx — those still
 * mean "the host is reachable"), false on network failure / timeout / DNS
 * miss / CORS reject.
 */
async function probeBackend(baseUrl: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    // We don't need the body; a HEAD would be ideal but Supabase's health
    // endpoint may not allow it, so we GET and ignore the payload.
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}${HEALTH_PATH}`, {
      method: 'GET',
      signal: controller.signal,
    })
    // Any response (even 4xx) proves the host resolved + responded.
    return res.status > 0
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

function isDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function setDismissed(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // sessionStorage can fail in private mode / locked-down web views.
    // We swallow because the banner just stays up — not a fatal UX bug.
  }
}

export interface BackendStatusBannerProps {
  /**
   * Optional override for the Supabase URL. Defaults to
   * `import.meta.env.VITE_SUPABASE_URL`. Pass explicitly in tests so we
   * don't depend on the global env shape.
   */
  supabaseUrl?: string
  /**
   * Optional override for the probe function. Defaults to the real
   * `probeBackend(...)` helper. Tests inject a deterministic mock here.
   */
  probe?: (baseUrl: string) => Promise<boolean>
}

export function BackendStatusBanner({
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL,
  probe = probeBackend,
}: BackendStatusBannerProps = {}) {
  const [state, setState] = useState<ProbeState>('idle')
  const [dismissed, setDismissedState] = useState<boolean>(() => isDismissed())

  useEffect(() => {
    // Only run when configured. Local-only builds with no Supabase URL skip
    // the banner entirely (it would be a lie to say "backend offline" when
    // there's no backend by design).
    if (!supabaseUrl) return
    let cancelled = false

    const runProbe = async () => {
      setState('probing')
      const ok = await probe(supabaseUrl)
      if (cancelled) return
      setState(ok ? 'online' : 'offline')
    }

    void runProbe()
    const retry = window.setInterval(() => {
      void runProbe()
    }, RETRY_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(retry)
    }
  }, [supabaseUrl, probe])

  // Hidden states: not configured, currently online, still probing the
  // first time, or user dismissed for this session.
  if (!supabaseUrl) return null
  if (state !== 'offline') return null
  if (dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="backend-status-banner"
      className="w-full flex items-center justify-between gap-3 px-3"
      style={{
        height: 32,
        background: 'rgba(255, 196, 87, 0.16)',
        borderBottom: '1px solid rgba(255, 196, 87, 0.4)',
        color: '#fde68a',
        fontSize: 12,
        fontWeight: 500,
        // The banner sits below the status bar, above the rest of the app.
        // Caller can override z-index by wrapping if needed.
      }}
    >
      <span className="flex items-center gap-2 min-w-0 flex-1">
        <AlertTriangle size={14} aria-hidden="true" style={{ color: '#fbbf24', flexShrink: 0 }} />
        <span className="truncate">
          backend offline — your data stays on this device. sign-in disabled until it&apos;s back.
        </span>
      </span>
      <button
        type="button"
        aria-label="Dismiss backend status banner"
        onClick={() => {
          setDismissed()
          setDismissedState(true)
        }}
        className="shrink-0 p-1 rounded-md active:scale-90 transition"
        style={{ color: '#fde68a' }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default BackendStatusBanner
