// Regression tests for the 2026-06-10 resurrection-sweep fixes:
//
//  1. supabase-js re-emits auth events for the SAME session (TOKEN_REFRESHED
//     ~hourly, SIGNED_IN on tab refocus, INITIAL_SESSION on subscribe).
//     Before the fix, every one of those re-ran the full sign-in resolution
//     with setLoading(true) — swapping the whole app for a spinner and
//     unmounting onboarding/workout screens mid-flow.
//
//  2. signOut wiped Dexie without pushing dirty rows first — any row whose
//     one-shot background push had failed (offline workout, backend outage)
//     was silently destroyed. The flush must run BEFORE auth.signOut()
//     because RLS only accepts the upserts while the session is alive.
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'

type AuthCallback = (event: string, session: unknown) => void

const SESSION_U1 = { user: { id: 'u1', email: 'kyra@example.com' } }

let authCallback: AuthCallback | null = null

function mockAuth(session: unknown) {
  vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
    data: { session },
    error: null,
  } as never)
  vi.spyOn(supabase.auth, 'onAuthStateChange').mockImplementation(((cb: AuthCallback) => {
    authCallback = cb
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  }) as never)
  vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null } as never)
}

interface CloudWrite {
  table: string
  op: 'insert' | 'upsert'
  payload: Record<string, unknown>
}

/**
 * Healthy backend for every table: reads come back empty, writes succeed
 * and are recorded. `calls` records every from(table) so tests can count
 * how many times a pull ran.
 */
function mockCloud() {
  const calls: string[] = []
  const writes: CloudWrite[] = []
  vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
    calls.push(table)
    const envelope = Promise.resolve({ data: null, error: null })
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => envelope,
      maybeSingle: () => envelope,
      insert: (payload: Record<string, unknown>) => {
        writes.push({ table, op: 'insert', payload })
        return Promise.resolve({ data: null, error: null })
      },
      upsert: (payload: Record<string, unknown>) => {
        writes.push({ table, op: 'upsert', payload })
        return Promise.resolve({ data: null, error: null })
      },
      then: (onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        envelope.then(onFulfilled, onRejected),
    }
    return chain
  }) as never)
  return { calls, writes }
}

function profilePullCount(calls: string[]): number {
  return calls.filter((t) => t === 'user_program_profiles').length
}

async function seedDirtySession(userId: string, id = 'log-1') {
  await db.sessionLogs.put({
    id,
    user_id: userId,
    workout_id: 'wk-1',
    workout_title: 'lower a',
    date: '2026-06-10',
    started_at: '2026-06-10T10:00:00.000Z',
    ended_at: '2026-06-10T11:00:00.000Z',
    phases_json: '[]',
    completed_sets: 10,
    total_sets: 12,
    synced: false,
  })
}

async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 25))
  })
}

describe('useAuth — auth-event filtering (mid-flow race fix)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    authCallback = null
    await Promise.all([
      db.sessionLogs.clear(),
      db.userProgramProfiles.clear(),
      db.sessionCheckins.clear(),
    ])
  })

  it('resolves the initial session once and exposes the user', async () => {
    mockAuth(SESSION_U1)
    const { calls } = mockCloud()
    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user?.id).toBe('u1')
    expect(profilePullCount(calls)).toBeGreaterThan(0)
  })

  it('TOKEN_REFRESHED for the same user does NOT flip loading or re-pull', async () => {
    mockAuth(SESSION_U1)
    const { calls } = mockCloud()
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const pullsBefore = profilePullCount(calls)

    act(() => {
      authCallback!('TOKEN_REFRESHED', SESSION_U1)
    })
    // The pre-fix behavior was synchronous setLoading(true) — assert it
    // never happens, then give async work a chance to (not) run.
    expect(result.current.loading).toBe(false)
    await settle()

    expect(result.current.loading).toBe(false)
    expect(result.current.user?.id).toBe('u1')
    expect(profilePullCount(calls)).toBe(pullsBefore)
  })

  it('INITIAL_SESSION duplicate emission does not double-run resolution', async () => {
    mockAuth(SESSION_U1)
    const { calls } = mockCloud()
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const pullsBefore = profilePullCount(calls)

    act(() => {
      authCallback!('INITIAL_SESSION', SESSION_U1)
    })
    await settle()

    expect(profilePullCount(calls)).toBe(pullsBefore)
  })

  it('an actual user switch DOES restart resolution', async () => {
    mockAuth(SESSION_U1)
    const { calls } = mockCloud()
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const pullsBefore = profilePullCount(calls)

    act(() => {
      authCallback!('SIGNED_IN', { user: { id: 'u2', email: null } })
    })

    await waitFor(() => expect(result.current.user?.id).toBe('u2'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(profilePullCount(calls)).toBeGreaterThan(pullsBefore)
  })

  it('sign-out resets identity so the SAME user signing back in re-resolves', async () => {
    mockAuth(SESSION_U1)
    const { calls } = mockCloud()
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const pullsBefore = profilePullCount(calls)

    act(() => {
      authCallback!('SIGNED_OUT', null)
    })
    expect(result.current.user).toBeNull()

    act(() => {
      authCallback!('SIGNED_IN', SESSION_U1)
    })
    await waitFor(() => expect(result.current.user?.id).toBe('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(profilePullCount(calls)).toBeGreaterThan(pullsBefore)
  })
})

describe('useAuth — signOut flushes dirty rows before wiping (data-loss fix)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    authCallback = null
    await Promise.all([
      db.sessionLogs.clear(),
      db.userProgramProfiles.clear(),
      db.sessionCheckins.clear(),
    ])
  })

  it('pushes a dirty workout up to the cloud, then wipes the device', async () => {
    mockAuth(SESSION_U1)
    const { writes } = mockCloud()
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    // A workout whose background push failed (e.g. finished offline).
    await seedDirtySession('u1')

    await act(async () => {
      await result.current.signOut()
    })

    // The row reached the cloud BEFORE the wipe destroyed the local copy.
    const sessionPush = writes.find((w) => w.table === 'session_logs')
    expect(sessionPush).toBeTruthy()
    expect(sessionPush?.payload.id).toBe('log-1')
    expect(await db.sessionLogs.count()).toBe(0) // wiped
    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(result.current.user).toBeNull()
  })

  it('asks before destroying rows that could not be pushed — declining aborts sign-out', async () => {
    mockAuth(SESSION_U1)
    mockCloud()
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await seedDirtySession('u1')
    // Backend dies before the user taps sign out.
    vi.spyOn(supabase, 'from').mockImplementation((() => {
      throw new Error('backend unreachable')
    }) as never)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    await act(async () => {
      await result.current.signOut()
    })

    expect(confirmSpy).toHaveBeenCalled()
    // Nothing was destroyed and the user is still signed in.
    expect(await db.sessionLogs.count()).toBe(1)
    expect((await db.sessionLogs.get('log-1'))?.synced).toBe(false)
    expect(result.current.user?.id).toBe('u1')
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })

  it('proceeds with sign-out when the user accepts losing unpushed rows', async () => {
    mockAuth(SESSION_U1)
    mockCloud()
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await seedDirtySession('u1')
    vi.spyOn(supabase, 'from').mockImplementation((() => {
      throw new Error('backend unreachable')
    }) as never)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    await act(async () => {
      await result.current.signOut()
    })

    expect(await db.sessionLogs.count()).toBe(0)
    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(result.current.user).toBeNull()
  })
})
