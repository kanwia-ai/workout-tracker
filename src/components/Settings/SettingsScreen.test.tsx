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
  renderHook,
  waitFor,
  act,
} from '@testing-library/react'
import { SettingsScreen, REPLAN_MIN_CHECKINS, type ReplanState } from './SettingsScreen'
import {
  useTweaks,
  THEME_PREF_KEY,
  CHEEK_PREF_KEY,
} from '../../hooks/useTweaks'
import { THEMES } from '../../lib/theme'

// Minimal matchMedia shim so useTweaks's 'system' branch doesn't explode
// when anything in here flips the theme mode.
function installMatchMediaMock() {
  const mql = {
    matches: false,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mql),
  })
}

function renderWired(
  opts: {
    onReplanNextBlock?: () => void
    checkinCount?: number
    replanState?: ReplanState
    onReplanClose?: () => void
    onReplanApply?: () => void
  } = {},
) {
  installMatchMediaMock()
  const { result } = renderHook(() => useTweaks())
  const onClose = vi.fn()
  const onRegeneratePlan = vi.fn()
  function Wrapped(): React.JSX.Element {
    const api = result.current
    return (
      <SettingsScreen
        tweaks={api.tweaks}
        setTweaks={api.setTweaks}
        themeMode={api.themeMode}
        setThemeMode={api.setThemeMode}
        onClose={onClose}
        onRegeneratePlan={onRegeneratePlan}
        onReplanNextBlock={opts.onReplanNextBlock}
        checkinCount={opts.checkinCount}
        replanState={opts.replanState}
        onReplanClose={opts.onReplanClose}
        onReplanApply={opts.onReplanApply}
      />
    )
  }
  const utils = render(<Wrapped />)
  return { result, onClose, ...utils }
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('style')
  })
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('renders the Fraunces "Settings" heading and a close button', () => {
    renderWired()
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
    expect(screen.getByTestId('settings-close')).toBeInTheDocument()
  })

  it('renders all four sections (Appearance, Voice, About, Coming soon)', () => {
    renderWired()
    expect(screen.getByText(/appearance/i)).toBeInTheDocument()
    expect(screen.getByText(/^voice$/i)).toBeInTheDocument()
    expect(screen.getByText(/^about$/i)).toBeInTheDocument()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })

  it('embeds a ThemeToggle wired to useTweaks (click Light applies light palette + persists)', async () => {
    const { result } = renderWired()
    fireEvent.click(screen.getByTestId('theme-toggle-light'))
    await waitFor(() => {
      expect(result.current.themeMode).toBe('light')
    })
    expect(
      document.documentElement.style.getPropertyValue('--lumo-bg'),
    ).toBe(THEMES.light['--lumo-bg'])
    expect(window.localStorage.getItem(THEME_PREF_KEY)).toBe('light')
  })

  it('cheek segmented control updates cheek level AND persists to localStorage', async () => {
    const { result } = renderWired()
    fireEvent.click(screen.getByTestId('cheek-toggle-0'))
    await waitFor(() => {
      expect(result.current.tweaks.cheek).toBe(0)
      expect(result.current.tweaks.cheekiness).toBe(0)
    })
    expect(window.localStorage.getItem(CHEEK_PREF_KEY)).toBe('0')

    // And going back up to cheeky writes the new value too.
    fireEvent.click(screen.getByTestId('cheek-toggle-2'))
    await waitFor(() => {
      expect(result.current.tweaks.cheek).toBe(2)
    })
    expect(window.localStorage.getItem(CHEEK_PREF_KEY)).toBe('2')
  })

  it('cheek persistence hydrates on next mount', async () => {
    window.localStorage.setItem(CHEEK_PREF_KEY, '1')
    installMatchMediaMock()
    const { result } = renderHook(() => useTweaks())
    await waitFor(() => {
      expect(result.current.tweaks.cheek).toBe(1)
      expect(result.current.tweaks.cheekiness).toBe(1)
    })
  })

  it('close button calls onClose', () => {
    const { onClose } = renderWired()
    fireEvent.click(screen.getByTestId('settings-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Reset app row is disabled (coming soon)', () => {
    renderWired()
    const reset = screen.getByTestId('coming-soon-reset-app')
    expect(reset).toBeDisabled()
  })

  it('shows the app version', () => {
    renderWired()
    expect(screen.getByText(/0\.1\.0/)).toBeInTheDocument()
  })

  it('system theme mode is selectable from the toggle', async () => {
    const { result } = renderWired()
    fireEvent.click(screen.getByTestId('theme-toggle-system'))
    await waitFor(() => {
      expect(result.current.themeMode).toBe('system')
    })
    expect(window.localStorage.getItem(THEME_PREF_KEY)).toBe('system')
    // Resolved theme comes from matchMedia mock (matches=false → light).
    await waitFor(() => {
      expect(
        document.documentElement.style.getPropertyValue('--lumo-bg'),
      ).toBe(THEMES.light['--lumo-bg'])
    })
  })

  it('stays mounted across theme changes (no unmount flicker)', async () => {
    const { result } = renderWired()
    const before = screen.getByTestId('settings-screen')
    fireEvent.click(screen.getByTestId('theme-toggle-light'))
    await waitFor(() => {
      expect(result.current.themeMode).toBe('light')
    })
    const after = screen.getByTestId('settings-screen')
    expect(after).toBe(before)
  })

  // ─── Re-plan next block (end-of-block adaptive re-plan) ─────────────
  describe('Re-plan next block button', () => {
    it('hides the button entirely when onReplanNextBlock is not provided', () => {
      renderWired()
      expect(
        screen.queryByTestId('replan-next-block-button'),
      ).not.toBeInTheDocument()
    })

    it('renders the button disabled with a gate message when checkins < REPLAN_MIN_CHECKINS', () => {
      const onReplanNextBlock = vi.fn()
      renderWired({ onReplanNextBlock, checkinCount: 10 })
      const btn = screen.getByTestId('replan-next-block-button')
      expect(btn).toBeDisabled()
      expect(btn).toHaveAttribute(
        'title',
        `Complete more sessions first (10/${REPLAN_MIN_CHECKINS}).`,
      )
      expect(screen.getByTestId('replan-gate-message')).toHaveTextContent(
        /You've logged 10/,
      )
    })

    it('enables the button and calls handler (via confirm dialog) when checkins >= REPLAN_MIN_CHECKINS', () => {
      const onReplanNextBlock = vi.fn()
      renderWired({ onReplanNextBlock, checkinCount: 20 })

      const btn = screen.getByTestId('replan-next-block-button')
      expect(btn).not.toBeDisabled()

      // Opens confirm dialog first — doesn't fire the handler directly.
      fireEvent.click(btn)
      expect(onReplanNextBlock).not.toHaveBeenCalled()
      expect(screen.getByTestId('replan-confirm-dialog')).toBeInTheDocument()

      // Confirming fires the handler.
      fireEvent.click(screen.getByTestId('replan-confirm'))
      expect(onReplanNextBlock).toHaveBeenCalledTimes(1)
    })

    it('Cancel in the confirm dialog does not fire the handler', () => {
      const onReplanNextBlock = vi.fn()
      renderWired({ onReplanNextBlock, checkinCount: 25 })
      fireEvent.click(screen.getByTestId('replan-next-block-button'))
      fireEvent.click(screen.getByTestId('replan-cancel'))
      expect(onReplanNextBlock).not.toHaveBeenCalled()
      expect(
        screen.queryByTestId('replan-confirm-dialog'),
      ).not.toBeInTheDocument()
    })

    it('shows the loading overlay while the re-plan runs', () => {
      renderWired({
        onReplanNextBlock: vi.fn(),
        checkinCount: 20,
        replanState: { phase: 'loading' },
      })
      expect(screen.getByTestId('replan-loading-overlay')).toBeInTheDocument()
      // The button itself reflects the loading label.
      expect(screen.getByTestId('replan-next-block-button')).toHaveTextContent(
        /Re-planning/,
      )
      // The Fraunces italic header line shows up as plain text in the DOM.
      expect(screen.getByText(/Looking at your last 6 weeks/i)).toBeInTheDocument()
    })

    it('renders the review modal with rationale + adjustments; Apply fires onReplanApply, Discard fires onReplanClose', () => {
      const onReplanClose = vi.fn()
      const onReplanApply = vi.fn()
      renderWired({
        onReplanNextBlock: vi.fn(),
        checkinCount: 24,
        replanState: {
          phase: 'reviewing',
          rationale: 'you handled the hinge days well — kept most of the plan.',
          adjustments: [
            'Dropped Bulgarian split squats — knee flagged in weeks 3 & 5.',
            'Bumped accessory volume by one set on hinge days.',
          ],
        },
        onReplanClose,
        onReplanApply,
      })
      expect(screen.getByTestId('replan-review-modal')).toBeInTheDocument()
      expect(screen.getByTestId('replan-rationale')).toHaveTextContent(
        /hinge days/,
      )
      const adjustmentsList = screen.getByTestId('replan-adjustments')
      expect(adjustmentsList.querySelectorAll('li')).toHaveLength(2)
      // Apply commits the pending directives
      fireEvent.click(screen.getByTestId('replan-review-apply'))
      expect(onReplanApply).toHaveBeenCalledTimes(1)
      // Discard keeps the current plan
      fireEvent.click(screen.getByTestId('replan-review-discard'))
      expect(onReplanClose).toHaveBeenCalledTimes(1)
    })

    it('surfaces errors with a visible alert region', () => {
      renderWired({
        onReplanNextBlock: vi.fn(),
        checkinCount: 20,
        replanState: { phase: 'error', error: 'Network hiccup. Try again.' },
      })
      const err = screen.getByTestId('replan-error-message')
      expect(err).toHaveAttribute('role', 'alert')
      expect(err).toHaveTextContent(/Network hiccup/)
    })
  })

  // Sanity check that imperative setThemeMode updates the hook state.
  // UI reflection is covered by the click-based tests above — those go
  // through the same setter, so asserting `result.current.themeMode` here
  // is sufficient. (The earlier DOM assertion in this test only passed
  // accidentally when 'dark' was the default — with renderHook in a
  // separate tree from the rendered SettingsScreen, there's no React
  // subscription linking imperative hook mutations to the UI tree.)
  it('external setThemeMode updates the hook state', async () => {
    const { result } = renderWired()
    act(() => {
      result.current.setThemeMode('dark')
    })
    await waitFor(() => {
      expect(result.current.themeMode).toBe('dark')
    })
  })
})
