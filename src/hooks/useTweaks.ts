/**
 * useTweaks — holds live Tweaks state, applies theme CSS vars on change,
 * and listens for the design-tool host's EDITMODE postMessage protocol.
 *
 * Protocol (ported verbatim from /tmp/workout-app-design/app.jsx):
 *
 *   Host → App:
 *     { type: '__activate_edit_mode' }
 *     { type: '__deactivate_edit_mode' }
 *     { type: 'EDITMODE:SET', payload: Partial<Tweaks> }  // our plumbing
 *
 *   App → Host (on mount):
 *     window.parent.postMessage({ type: '__edit_mode_available' }, '*')
 *
 *   App → Host (on tweak change):
 *     window.parent.postMessage(
 *       { type: '__edit_mode_set_keys', edits: { [k]: v } },
 *       '*'
 *     )
 *
 * The EDITMODE:SET shape is the one spec'd by this task — the design file
 * itself does not include a SET channel, only activate / deactivate / echo.
 * We accept both the literal `EDITMODE:SET` message and the bare
 * `__edit_mode_set_keys` echo as synonyms so a host using either wiring
 * lands the same tweak patch.
 *
 * ── Theme persistence ───────────────────────────────────────────────────
 * Beyond the design-tool host protocol, this hook also persists Kyra's
 * theme preference to localStorage and supports a `'system'` pseudo-theme
 * that follows `prefers-color-scheme`. The user-selected mode lives under
 * `workout-tracker:theme-preference` as `'dark'|'light'|'system'`. The
 * *resolved* theme (what CSS vars actually use) is always one of the two
 * concrete values and is exposed via `themeMode` so the Settings toggle
 * can highlight "System" while CSS still paints dark or light.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { applyTheme, type Theme } from '../lib/theme'
import { DEFAULT_TWEAKS, mergeTweaks, type Tweaks } from '../lib/tweaks'

export type ThemeMode = 'dark' | 'light' | 'system'
export const THEME_PREF_KEY = 'workout-tracker:theme-preference'
export const THEME_PREF_VERSION_KEY = 'workout-tracker:theme-pref-version'
// Bump this when we want to invalidate old stored theme preferences
// (e.g. we changed the app's default and don't want old dark-mode choices
// from an earlier beta to override the new light-mode default).
const CURRENT_THEME_PREF_VERSION = '2'
export const CHEEK_PREF_KEY = 'workout-tracker:cheek-preference'

type EditModeSetMessage =
  | { type: 'EDITMODE:SET'; payload?: Partial<Tweaks> }
  | { type: '__edit_mode_set_keys'; edits?: Partial<Tweaks> }

function extractTweakPatch(data: unknown): Partial<Tweaks> | null {
  if (!data || typeof data !== 'object') return null
  const msg = data as EditModeSetMessage
  if (msg.type === 'EDITMODE:SET') {
    return msg.payload && typeof msg.payload === 'object' ? msg.payload : null
  }
  if (msg.type === '__edit_mode_set_keys') {
    return msg.edits && typeof msg.edits === 'object' ? msg.edits : null
  }
  return null
}

function isThemeMode(v: unknown): v is ThemeMode {
  return v === 'dark' || v === 'light' || v === 'system'
}

/** Read a persisted ThemeMode from localStorage. Defaults to 'light'.
 *  Invalidates old preferences when the theme-pref version bumps, so users
 *  who had 'dark' saved from a previous default don't keep seeing dark after
 *  the app default flipped to light. */
function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  try {
    const ls = window.localStorage
    if (!ls) return 'light'
    const version = ls.getItem(THEME_PREF_VERSION_KEY)
    if (version !== CURRENT_THEME_PREF_VERSION) {
      // Old or missing version — drop any stored pref + stamp the new version.
      ls.removeItem(THEME_PREF_KEY)
      ls.setItem(THEME_PREF_VERSION_KEY, CURRENT_THEME_PREF_VERSION)
      return 'light'
    }
    const raw = ls.getItem(THEME_PREF_KEY)
    if (isThemeMode(raw)) return raw
  } catch {
    // localStorage can throw when access is denied (incognito + safari etc.).
  }
  return 'light'
}

/**
 * Read a persisted cheek level from localStorage. Returns null if not set
 * or unreadable so the caller can fall through to the initial default.
 */
function readStoredCheek(): 0 | 1 | 2 | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage?.getItem(CHEEK_PREF_KEY)
    if (raw === '0' || raw === '1' || raw === '2') {
      return Number(raw) as 0 | 1 | 2
    }
  } catch {
    // ignore
  }
  return null
}

/** Read the current OS-level color scheme via matchMedia. */
function readSystemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  } catch {
    return 'light'
  }
}

/** Resolve a mode → concrete theme to apply to CSS vars. */
function resolveTheme(mode: ThemeMode): Theme {
  return mode === 'system' ? readSystemTheme() : mode
}

export type SetTweaks = (patchOrUpdater: Partial<Tweaks> | ((t: Tweaks) => Tweaks)) => void

export interface UseTweaksResult {
  tweaks: Tweaks
  setTweaks: SetTweaks
  /** User-facing selection: 'dark' | 'light' | 'system'. */
  themeMode: ThemeMode
  /** Setter for the user-facing selection. Persists to localStorage. */
  setThemeMode: (mode: ThemeMode) => void
}

/**
 * The hook returns a tuple for legacy callers (`[tweaks, setTweaks]`) with
 * the extended surface (`themeMode`, `setThemeMode`) attached as
 * named properties on the same array. This keeps `const [t, s] = useTweaks()`
 * working everywhere while letting the Settings screen reach for
 * `.themeMode` / `.setThemeMode` without a second hook call.
 */
export type UseTweaksReturn = [Tweaks, SetTweaks] & UseTweaksResult

export function useTweaks(initial: Tweaks = DEFAULT_TWEAKS): UseTweaksReturn {
  // Seed the user's theme preference from localStorage BEFORE the first
  // render so the initial applyTheme paints the right palette and we don't
  // flash the wrong theme for a tick.
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => readStoredMode())
  const [tweaks, setTweaksState] = useState<Tweaks>(() => {
    const storedCheek = readStoredCheek()
    return {
      ...initial,
      theme: resolveTheme(readStoredMode()),
      ...(storedCheek !== null && { cheek: storedCheek, cheekiness: storedCheek }),
    }
  })

  // Keep the latest tweaks in a ref so the message handler (bound once) can
  // always merge against current state without triggering re-subscribes.
  const tweaksRef = useRef<Tweaks>(tweaks)
  tweaksRef.current = tweaks

  // Apply theme every time tweaks change. This also runs on mount so CSS
  // vars are set even when no EDITMODE host is present.
  useEffect(() => {
    applyTheme(tweaks.theme, tweaks)
  }, [tweaks])

  // When in 'system' mode, subscribe to prefers-color-scheme and flip the
  // resolved theme on the fly. The `themeMode` state stays 'system' the
  // whole time so the Settings UI still shows that segment highlighted.
  useEffect(() => {
    if (themeMode !== 'system') return
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const next = readSystemTheme()
      setTweaksState((prev) => (prev.theme === next ? prev : { ...prev, theme: next }))
    }
    // Safari <14 uses addListener / removeListener. Modern browsers use
    // addEventListener('change', ...). Cover both to be safe.
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange)
    } else if (typeof (mql as unknown as { addListener?: (cb: () => void) => void }).addListener === 'function') {
      ;(mql as unknown as { addListener: (cb: () => void) => void }).addListener(onChange)
    }
    return () => {
      if (typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', onChange)
      } else if (typeof (mql as unknown as { removeListener?: (cb: () => void) => void }).removeListener === 'function') {
        ;(mql as unknown as { removeListener: (cb: () => void) => void }).removeListener(onChange)
      }
    }
  }, [themeMode])

  // Mount: announce availability to the host, subscribe to incoming edits.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const patch = extractTweakPatch(e.data)
      if (!patch) return
      setTweaksState((prev) => mergeTweaks(prev, patch))
    }

    window.addEventListener('message', onMessage)

    // Inform the host we're ready to accept edits. Match the design file's
    // literal message type verbatim.
    try {
      window.parent?.postMessage({ type: '__edit_mode_available' }, '*')
    } catch {
      // Some sandboxes block cross-origin postMessage; safe to ignore.
    }

    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [])

  const setTweaks = useCallback<SetTweaks>((patchOrUpdater) => {
    setTweaksState((prev) => {
      const next =
        typeof patchOrUpdater === 'function'
          ? patchOrUpdater(prev)
          : mergeTweaks(prev, patchOrUpdater)
      return next
    })
  }, [])

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode)
    try {
      window.localStorage?.setItem(THEME_PREF_KEY, mode)
    } catch {
      // Persistence is best-effort — don't crash the UI on a denied write.
    }
    const resolved = resolveTheme(mode)
    setTweaksState((prev) =>
      prev.theme === resolved ? prev : { ...prev, theme: resolved },
    )
  }, [])

  // Build the tuple-with-named-fields return shape. The tuple indices keep
  // existing `[tweaks, setTweaks]` destructuring callers working.
  const result = [tweaks, setTweaks] as unknown as UseTweaksReturn
  result.tweaks = tweaks
  result.setTweaks = setTweaks
  result.themeMode = themeMode
  result.setThemeMode = setThemeMode
  return result
}
