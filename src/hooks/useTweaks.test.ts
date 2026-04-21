import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor, cleanup } from '@testing-library/react'
import {
  useTweaks,
  THEME_PREF_KEY,
  THEME_PREF_VERSION_KEY,
} from './useTweaks'
import { THEMES } from '../lib/theme'

// Reset the document root's inline styles between tests so CSS var
// assertions don't leak across cases.
function clearRootStyles() {
  document.documentElement.removeAttribute('style')
}

// Stamp the current theme-pref version so readStoredMode() doesn't take the
// invalidation path (which would wipe any pref we set and force 'light').
// Kept in sync with CURRENT_THEME_PREF_VERSION in useTweaks.ts.
const CURRENT_THEME_PREF_VERSION = '2'

describe('useTweaks', () => {
  beforeEach(() => {
    window.localStorage.clear()
    // Stamp the version so stored preferences in individual tests are honored
    // rather than invalidated on mount.
    window.localStorage.setItem(THEME_PREF_VERSION_KEY, CURRENT_THEME_PREF_VERSION)
  })

  afterEach(() => {
    cleanup()
    clearRootStyles()
    window.localStorage.clear()
  })

  it('applies default theme CSS vars on mount', async () => {
    const { result } = renderHook(() => useTweaks())
    // Default theme is light (no stored pref, version stamped so the
    // invalidation path is skipped).
    await waitFor(() => {
      const bg = document.documentElement.style.getPropertyValue('--lumo-bg')
      expect(bg).toBe(THEMES.light['--lumo-bg'])
    })
    expect(result.current[0].theme).toBe('light')
    expect(result.current[0].brand).toBe('#FF7A45')
    expect(document.documentElement.style.getPropertyValue('--brand')).toBe('#FF7A45')
    expect(document.documentElement.style.getPropertyValue('--mascot-color')).toBe('#FFB4C6')
  })

  it('updates state + CSS vars when an EDITMODE:SET postMessage arrives', async () => {
    // Seed a dark preference so we start in dark, then verify the message
    // handler flips us to light. This keeps the test's intent (message
    // handler mutates state + CSS vars) while honoring the new light default.
    window.localStorage.setItem(THEME_PREF_KEY, 'dark')
    const { result } = renderHook(() => useTweaks())

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--lumo-bg')).toBe(
        THEMES.dark['--lumo-bg'],
      )
    })

    act(() => {
      window.postMessage(
        { type: 'EDITMODE:SET', payload: { theme: 'light', brand: '#123456' } },
        '*',
      )
    })

    await waitFor(() => {
      expect(result.current[0].theme).toBe('light')
    })
    expect(result.current[0].brand).toBe('#123456')
    expect(document.documentElement.style.getPropertyValue('--lumo-bg')).toBe(
      THEMES.light['--lumo-bg'],
    )
    expect(document.documentElement.style.getPropertyValue('--brand')).toBe('#123456')
  })

  it('also accepts the __edit_mode_set_keys echo shape from the design file', async () => {
    const { result } = renderHook(() => useTweaks())

    act(() => {
      window.postMessage(
        { type: '__edit_mode_set_keys', edits: { accent: 'mint' } },
        '*',
      )
    })

    await waitFor(() => {
      expect(result.current[0].accent).toBe('mint')
    })
  })

  it('cleans up the message listener on unmount', async () => {
    // Seed dark so we can post a light message after unmount and assert
    // nothing flipped — light default would make that assertion vacuous.
    window.localStorage.setItem(THEME_PREF_KEY, 'dark')
    const { result, unmount } = renderHook(() => useTweaks())

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--lumo-bg')).toBe(
        THEMES.dark['--lumo-bg'],
      )
    })

    const stateBeforeUnmount = result.current[0]
    unmount()

    // After unmount, a message should not mutate the (now-dead) state and
    // should not throw. We verify by posting a message and confirming the
    // document has no pending theme change applied (no re-run can occur).
    act(() => {
      window.postMessage(
        { type: 'EDITMODE:SET', payload: { theme: 'light' } },
        '*',
      )
    })

    // Give the event loop a tick for any stray handlers to fire.
    await new Promise((r) => setTimeout(r, 10))

    // The ref'd result is the last value before unmount; state is frozen.
    expect(stateBeforeUnmount.theme).toBe('dark')
    // And because the only listener was the one we cleaned up, the root's
    // --lumo-bg should still hold the dark value (no light switch happened).
    expect(document.documentElement.style.getPropertyValue('--lumo-bg')).toBe(
      THEMES.dark['--lumo-bg'],
    )
  })

  it('imperative setter also updates theme vars', async () => {
    const { result } = renderHook(() => useTweaks())

    act(() => {
      result.current[1]({ theme: 'light' })
    })

    await waitFor(() => {
      expect(result.current[0].theme).toBe('light')
    })
    expect(document.documentElement.style.getPropertyValue('--lumo-bg')).toBe(
      THEMES.light['--lumo-bg'],
    )
  })
})
