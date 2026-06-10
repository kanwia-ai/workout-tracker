// BackendStatusBanner — surfaces "Supabase unreachable" so the user knows
// cloud sync is temporarily down. Their actions still work against the
// Dexie cache; the next successful sync flushes them up.
//
// 2026-05-27: app went from local-first back to cloud-as-source-of-truth.
// We still want the banner because:
//   - If the Supabase project is paused / migrating, sign-in fails and
//     check-ins won't sync. The user deserves a heads-up rather than
//     a silently-broken cloud.
//   - Dexie keeps the writes locally — they'll catch up on the next
//     successful sync, so the user can keep working.
//
// Design constraints:
//   - Show only when Supabase is *configured* (env vars present) but
//     unreachable. Local dev builds with no Supabase URL skip the
//     banner entirely — there's no backend to be down.
//   - Run one health probe on mount with a 3s timeout. Re-probe after 60s
//     so we don't nag every render or burn a request per keystroke.
//   - Honesty over optimism: after OFFLINE_BACKOFF_THRESHOLD consecutive
//     failures, the backend isn't having a blip — it's down-down. Promising
//     changes "will catch up shortly" would be a lie, so the copy switches
//     to "sync is paused" and probing backs off to every 10 minutes to stop
//     burning the user's battery on a dead host.
//   - Dismissal persists in sessionStorage so the banner doesn't reappear
//     mid-session, but a fresh visit (new tab, app re-open) shows it again
//     if the backend is still down.
//   - Warm amber palette, NOT red — informational, not an error state.

import { useEffect, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'

const DISMISS_KEY = 'workout-tracker:backend-banner-dismissed'
const HEALTH_PATH = '/auth/v1/health'
const PROBE_TIMEOUT_MS = 3000
export const RETRY_INTERVAL_MS = 60_000
/** Consecutive failed probes before we stop pretending it's a blip. */
export const OFFLINE_BACKOFF_THRESHOLD = 5
/** Probe interval once the backend looks long-dead. */
export const BACKOFF_INTERVAL_MS = 600_000

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
  // Consecutive failed probes — drives the copy switch + probe backoff.
  // Reset to 0 by any successful probe.
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)

  useEffect(() => {
    // Only run when configured. Local-only builds with no Supabase URL skip
    // the banner entirely (it would be a lie to say "backend offline" when
    // there's no backend by design).
    if (!supabaseUrl) return
    let cancelled = false
    let timer: number | undefined
    // Local mirror of the failure count — the loop schedules its own next
    // run, so it can't read the (stale-closure) state value.
    let failures = 0

    const runProbe = async (first: boolean) => {
      // Only flag 'probing' on the very first run. Re-probes keep the
      // current offline state so the banner doesn't flicker out every
      // interval while the host is still dead.
      if (first) setState('probing')
      const ok = await probe(supabaseUrl)
      if (cancelled) return
      failures = ok ? 0 : failures + 1
      setConsecutiveFailures(failures)
      setState(ok ? 'online' : 'offline')
      // Back off once the backend looks long-dead — a 60s drumbeat against
      // a host that's been down for 5+ probes is pure battery burn.
      const next =
        failures >= OFFLINE_BACKOFF_THRESHOLD ? BACKOFF_INTERVAL_MS : RETRY_INTERVAL_MS
      timer = window.setTimeout(() => {
        void runProbe(false)
      }, next)
    }

    void runProbe(true)

    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
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
          {consecutiveFailures >= OFFLINE_BACKOFF_THRESHOLD
            ? "can't reach the cloud — your data is safe on this phone, sync is paused."
            : "we're temporarily having sync issues — your changes are saved on this device and will catch up shortly."}
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
