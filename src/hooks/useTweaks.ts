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
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { applyTheme } from '../lib/theme'
import { DEFAULT_TWEAKS, mergeTweaks, type Tweaks } from '../lib/tweaks'

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

export type SetTweaks = (patchOrUpdater: Partial<Tweaks> | ((t: Tweaks) => Tweaks)) => void

export function useTweaks(initial: Tweaks = DEFAULT_TWEAKS): [Tweaks, SetTweaks] {
  const [tweaks, setTweaksState] = useState<Tweaks>(initial)

  // Keep the latest tweaks in a ref so the message handler (bound once) can
  // always merge against current state without triggering re-subscribes.
  const tweaksRef = useRef<Tweaks>(tweaks)
  tweaksRef.current = tweaks

  // Apply theme every time tweaks change. This also runs on mount so CSS
  // vars are set even when no EDITMODE host is present.
  useEffect(() => {
    applyTheme(tweaks.theme, tweaks)
  }, [tweaks])

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

  return [tweaks, setTweaks]
}
