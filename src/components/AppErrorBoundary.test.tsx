import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppErrorBoundary } from './AppErrorBoundary'

// A child that throws during render — same failure mode as
// dexie-react-hooks rethrowing a parse error inside useLiveQuery.
function Bomb(): never {
  throw new Error('kaboom: render-time explosion')
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    // React logs caught render errors via console.error — silence them so
    // test output stays readable. componentDidCatch logs too.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when nothing throws', () => {
    render(
      <AppErrorBoundary>
        <div>all good</div>
      </AppErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeInTheDocument()
    expect(
      screen.queryByText("something broke that shouldn't have"),
    ).not.toBeInTheDocument()
  })

  it('renders the fallback instead of white-screening when a child throws during render', () => {
    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    )
    expect(
      screen.getByText("something broke that shouldn't have"),
    ).toBeInTheDocument()
    // Sad Lumo fronts the apology.
    expect(document.querySelector('[data-lumo-state="sad"]')).toBeTruthy()
    // Non-destructive escape first, destructive one clearly labeled.
    expect(screen.getByRole('button', { name: 'reload' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'start fresh (wipes data)' }),
    ).toBeInTheDocument()
  })

  it('reload button triggers a page reload (non-destructive)', () => {
    const reload = vi.fn()
    render(
      <AppErrorBoundary reload={reload}>
        <Bomb />
      </AppErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'reload' }))
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('start fresh routes to the existing ?reset=1 escape hatch', () => {
    const navigate = vi.fn()
    render(
      <AppErrorBoundary navigate={navigate}>
        <Bomb />
      </AppErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'start fresh (wipes data)' }))
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('reset=1'))
  })
})
