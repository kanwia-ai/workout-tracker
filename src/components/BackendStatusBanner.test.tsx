import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import {
  BackendStatusBanner,
  OFFLINE_BACKOFF_THRESHOLD,
  RETRY_INTERVAL_MS,
  BACKOFF_INTERVAL_MS,
} from './BackendStatusBanner'

const URL = 'https://dead-project.supabase.co'

// Flush the mount-time probe (async, no timer involved).
async function flushInitialProbe() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

// Advance one regular retry interval, firing the scheduled probe.
async function advanceOneRetry(ms = RETRY_INTERVAL_MS) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('BackendStatusBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders nothing when no supabase URL is configured', async () => {
    const probe = vi.fn().mockResolvedValue(false)
    render(<BackendStatusBanner supabaseUrl="" probe={probe} />)
    await flushInitialProbe()
    expect(screen.queryByTestId('backend-status-banner')).not.toBeInTheDocument()
    expect(probe).not.toHaveBeenCalled()
  })

  it('renders nothing while the backend is reachable', async () => {
    const probe = vi.fn().mockResolvedValue(true)
    render(<BackendStatusBanner supabaseUrl={URL} probe={probe} />)
    await flushInitialProbe()
    expect(probe).toHaveBeenCalledWith(URL)
    expect(screen.queryByTestId('backend-status-banner')).not.toBeInTheDocument()
  })

  it('shows the short-outage copy after the first failed probe', async () => {
    const probe = vi.fn().mockResolvedValue(false)
    render(<BackendStatusBanner supabaseUrl={URL} probe={probe} />)
    await flushInitialProbe()
    const banner = screen.getByTestId('backend-status-banner')
    expect(banner).toHaveTextContent('will catch up shortly')
  })

  it('switches to the honest long-dead copy after consecutive failed probes', async () => {
    const probe = vi.fn().mockResolvedValue(false)
    render(<BackendStatusBanner supabaseUrl={URL} probe={probe} />)
    await flushInitialProbe() // failure #1
    for (let i = 1; i < OFFLINE_BACKOFF_THRESHOLD; i++) {
      await advanceOneRetry() // failures #2..#N
    }
    expect(probe).toHaveBeenCalledTimes(OFFLINE_BACKOFF_THRESHOLD)
    const banner = screen.getByTestId('backend-status-banner')
    expect(banner).toHaveTextContent("can't reach the cloud")
    expect(banner).toHaveTextContent('your data is safe on this phone')
    expect(banner).toHaveTextContent('sync is paused')
    expect(banner).not.toHaveTextContent('will catch up shortly')
  })

  it('backs off probing to the long interval once long-dead', async () => {
    const probe = vi.fn().mockResolvedValue(false)
    render(<BackendStatusBanner supabaseUrl={URL} probe={probe} />)
    await flushInitialProbe()
    for (let i = 1; i < OFFLINE_BACKOFF_THRESHOLD; i++) {
      await advanceOneRetry()
    }
    probe.mockClear()
    // The regular interval no longer fires a probe…
    await advanceOneRetry()
    expect(probe).not.toHaveBeenCalled()
    // …but the long backoff interval does.
    await advanceOneRetry(BACKOFF_INTERVAL_MS - RETRY_INTERVAL_MS)
    expect(probe).toHaveBeenCalledTimes(1)
  })

  it('a successful probe recovers: banner hides and failure count resets', async () => {
    const probe = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false)
    render(<BackendStatusBanner supabaseUrl={URL} probe={probe} />)
    await flushInitialProbe()
    expect(screen.getByTestId('backend-status-banner')).toBeInTheDocument()

    await advanceOneRetry() // success → online
    expect(screen.queryByTestId('backend-status-banner')).not.toBeInTheDocument()

    await advanceOneRetry() // fresh failure #1 → short-outage copy again
    const banner = screen.getByTestId('backend-status-banner')
    expect(banner).toHaveTextContent('will catch up shortly')
    expect(banner).not.toHaveTextContent('sync is paused')
  })
})
