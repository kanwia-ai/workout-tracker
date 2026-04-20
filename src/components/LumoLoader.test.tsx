import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { LumoLoader } from './LumoLoader'

// matchMedia shim. Defaults to "motion-ok"; individual tests can swap the
// return-shape to simulate prefers-reduced-motion.
function installMatchMedia(reduced: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduced : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('LumoLoader', () => {
  beforeEach(() => {
    installMatchMedia(false)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders the scene + children overlay when motion is allowed', () => {
    render(
      <LumoLoader>
        <p data-testid="child-copy">hang tight</p>
      </LumoLoader>,
    )
    expect(screen.getByTestId('lumo-loader')).toHaveAttribute(
      'data-reduced-motion',
      'false',
    )
    expect(screen.getByTestId('lumo-scene')).toBeInTheDocument()
    expect(screen.getByTestId('child-copy')).toBeInTheDocument()
    expect(screen.getByTestId('child-copy').textContent).toBe('hang tight')
  })

  it('respects prefers-reduced-motion (renders the static fallback, no animated scene)', () => {
    installMatchMedia(true)
    render(
      <LumoLoader>
        <p data-testid="child-copy">hang tight</p>
      </LumoLoader>,
    )
    const loader = screen.getByTestId('lumo-loader')
    expect(loader).toHaveAttribute('data-reduced-motion', 'true')
    expect(screen.getByTestId('lumo-loader-static')).toBeInTheDocument()
    // Animated scene is NOT mounted under reduced motion.
    expect(screen.queryByTestId('lumo-scene')).not.toBeInTheDocument()
    // Children still render.
    expect(screen.getByTestId('child-copy')).toBeInTheDocument()
  })

  it('renders without children', () => {
    render(<LumoLoader />)
    expect(screen.getByTestId('lumo-loader')).toBeInTheDocument()
    expect(screen.getByTestId('lumo-scene')).toBeInTheDocument()
  })

  it('uses a full-viewport fixed overlay', () => {
    render(<LumoLoader />)
    const loader = screen.getByTestId('lumo-loader')
    expect(loader.style.position).toBe('fixed')
    expect(loader.style.inset).toBe('0px')
  })
})
