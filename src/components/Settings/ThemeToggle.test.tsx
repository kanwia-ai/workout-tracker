/**
 * ThemeToggle tests — we cover it via the Settings wiring (via useTweaks)
 * rather than stubbing the hook in isolation. That way we catch the real
 * persistence path + matchMedia listener + localStorage write at once.
 */

import {
  describe,
  it,
  expect,
  afterEach,
  beforeEach,
  vi,
} from 'vitest'
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
  renderHook,
  waitFor,
} from '@testing-library/react'
import { ThemeToggle } from './ThemeToggle'
import {
  useTweaks,
  THEME_PREF_KEY,
  type ThemeMode,
} from '../../hooks/useTweaks'
import { THEMES } from '../../lib/theme'

type MediaListener = (ev: MediaQueryListEvent) => void

// jsdom doesn't provide matchMedia. Build a controllable stub so we can
// drive the "system" option's subscription.
function installMatchMediaMock({
  initialMatches,
}: { initialMatches: boolean }) {
  let matches = initialMatches
  const listeners = new Set<MediaListener>()
  const mql = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_: string, cb: MediaListener) => listeners.add(cb),
    removeEventListener: (_: string, cb: MediaListener) => listeners.delete(cb),
    addListener: (cb: MediaListener) => listeners.add(cb),
    removeListener: (cb: MediaListener) => listeners.delete(cb),
    dispatchEvent: () => true,
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mql),
  })
  return {
    setMatches(next: boolean) {
      matches = next
      mql.matches = next
      const evt = { matches: next } as MediaQueryListEvent
      listeners.forEach((cb) => cb(evt))
    },
    listenerCount: () => listeners.size,
  }
}

describe('ThemeToggle (standalone rendering)', () => {
  afterEach(() => cleanup())

  it('renders three radios with the current selection marked', () => {
    const onChange = vi.fn()
    render(<ThemeToggle mode="dark" onChange={onChange} />)
    const dark = screen.getByTestId('theme-toggle-dark')
    const light = screen.getByTestId('theme-toggle-light')
    const system = screen.getByTestId('theme-toggle-system')
    expect(dark.getAttribute('aria-checked')).toBe('true')
    expect(light.getAttribute('aria-checked')).toBe('false')
    expect(system.getAttribute('aria-checked')).toBe('false')
  })

  it('fires onChange with the new mode when a segment is clicked', () => {
    const onChange = vi.fn()
    render(<ThemeToggle mode="dark" onChange={onChange} />)
    fireEvent.click(screen.getByTestId('theme-toggle-light'))
    expect(onChange).toHaveBeenCalledWith('light')
    fireEvent.click(screen.getByTestId('theme-toggle-system'))
    expect(onChange).toHaveBeenCalledWith('system')
  })
})

describe('ThemeToggle ↔ useTweaks integration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('style')
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('clicking Light applies light theme CSS vars AND writes localStorage', async () => {
    installMatchMediaMock({ initialMatches: false })
    const { result } = renderHook(() => useTweaks())

    function TestHarness(): React.JSX.Element {
      const { themeMode, setThemeMode } = result.current
      return <ThemeToggle mode={themeMode} onChange={setThemeMode} />
    }

    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('theme-toggle-light'))

    await waitFor(() => {
      expect(result.current.themeMode).toBe('light')
    })
    expect(
      document.documentElement.style.getPropertyValue('--lumo-bg'),
    ).toBe(THEMES.light['--lumo-bg'])
    expect(window.localStorage.getItem(THEME_PREF_KEY)).toBe('light')
  })

  it('System option follows matchMedia live', async () => {
    const mm = installMatchMediaMock({ initialMatches: true }) // start in dark OS
    const { result } = renderHook(() => useTweaks())

    // Pick System.
    act(() => {
      result.current.setThemeMode('system')
    })
    await waitFor(() => {
      expect(result.current.themeMode).toBe('system')
    })
    // Resolved theme should be dark (OS is dark).
    expect(
      document.documentElement.style.getPropertyValue('--lumo-bg'),
    ).toBe(THEMES.dark['--lumo-bg'])

    // Flip the OS to light.
    act(() => {
      mm.setMatches(false)
    })
    await waitFor(() => {
      expect(
        document.documentElement.style.getPropertyValue('--lumo-bg'),
      ).toBe(THEMES.light['--lumo-bg'])
    })
    // User-facing selection stays 'system'.
    expect(result.current.themeMode).toBe('system')
    // And it's persisted.
    expect(window.localStorage.getItem(THEME_PREF_KEY)).toBe('system')
  })

  it('removes the matchMedia listener when leaving System mode (no leak)', async () => {
    const mm = installMatchMediaMock({ initialMatches: false })
    const { result } = renderHook(() => useTweaks())

    act(() => {
      result.current.setThemeMode('system')
    })
    await waitFor(() => expect(mm.listenerCount()).toBe(1))

    act(() => {
      result.current.setThemeMode('dark')
    })
    await waitFor(() => expect(mm.listenerCount()).toBe(0))
  })

  it('unmounting clears the matchMedia listener (cleanup on unmount)', async () => {
    const mm = installMatchMediaMock({ initialMatches: false })
    const { result, unmount } = renderHook(() => useTweaks())

    act(() => {
      result.current.setThemeMode('system')
    })
    await waitFor(() => expect(mm.listenerCount()).toBe(1))

    unmount()
    expect(mm.listenerCount()).toBe(0)
  })

  it('persisted theme mode hydrates on next mount', async () => {
    installMatchMediaMock({ initialMatches: false })
    window.localStorage.setItem(THEME_PREF_KEY, 'light' satisfies ThemeMode)

    const { result } = renderHook(() => useTweaks())

    await waitFor(() => {
      expect(result.current.themeMode).toBe('light')
    })
    expect(
      document.documentElement.style.getPropertyValue('--lumo-bg'),
    ).toBe(THEMES.light['--lumo-bg'])
  })
})
