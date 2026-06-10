/**
 * App-level regression tests for the 2026-06-09 audit triage items:
 *
 *   1. Generation errors must be visible to EXISTING users (hasProfile=true).
 *      Pre-fix, the error/retry UI only rendered inside the !hasProfile
 *      branch, so a failed regenerate silently dumped the user back on the
 *      home screen with no explanation.
 *   2. End-of-block CTA: a finished block surfaces a "build my next block"
 *      card wired into the regenerate flow instead of pinning "Week 6 of 6"
 *      forever.
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'
import { db } from './lib/db'
import { saveProfileLocal } from './lib/profileRepo'
import { generatePlan, loadLatestMesocycleForUser } from './lib/planGen'
import { replanNextBlock } from './lib/planner/replan'
import { REPLAN_MIN_CHECKINS } from './components/Settings'
import type { UserProgramProfile } from './types/profile'
import type { Mesocycle, PlannedSession, SessionStatus } from './types/plan'

vi.mock('./lib/planGen', () => ({
  generatePlan: vi.fn(),
  generatePlanFromDirectives: vi.fn(),
  loadLatestMesocycleForUser: vi.fn(),
}))

vi.mock('./lib/planner/replan', () => {
  class InsufficientCheckinsError extends Error {}
  return {
    replanNextBlock: vi.fn(),
    InsufficientCheckinsError,
  }
})

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    profile: null,
    loading: false,
    hasProfile: true,
    setHasProfile: vi.fn(),
    profileError: null,
    clearProfileError: vi.fn(),
    signOut: vi.fn(),
    updateStreak: vi.fn(),
  }),
}))

// The banner would probe the real (dead) VITE_SUPABASE_URL from .env in
// tests. It has its own test file — stub it out here for hermetic App tests.
vi.mock('./components/BackendStatusBanner', () => ({
  BackendStatusBanner: () => null,
}))

const PROFILE: UserProgramProfile = {
  goal: 'glutes',
  sessions_per_week: 4,
  training_age_months: 18,
  equipment: ['full_gym'],
  injuries: [],
  time_budget_min: 60,
  sex: 'female',
  posture_notes: 'desk',
}

function makeSession(ordinal: number, status: SessionStatus): PlannedSession {
  return {
    id: `s-1-${ordinal}`,
    week_number: 1,
    ordinal,
    focus: ['glutes'],
    title: 'Glutes + Hamstrings',
    subtitle: 'LOWER',
    estimated_minutes: 45,
    exercises: [
      {
        library_id: 'fedb:glute-bridge',
        name: 'Glute Bridge',
        sets: 3,
        reps: '8-12',
        rir: 2,
        rest_seconds: 120,
        role: 'main lift',
        warmup_sets: [],
      },
    ],
    day_of_week: ordinal - 1,
    rationale: 'test session',
    status,
  }
}

function makeMeso(statuses: SessionStatus[]): Mesocycle {
  return {
    id: 'meso-1',
    user_id: 'test-user',
    // Generated "today" so week 1 is the current training week and the
    // fixture's week-1 sessions populate the visible strip.
    generated_at: new Date().toISOString(),
    length_weeks: 6,
    sessions: statuses.map((status, i) => makeSession(i + 1, status)),
    profile_snapshot: {},
  }
}

describe('App generation-error surfacing (existing users)', () => {
  beforeEach(async () => {
    vi.mocked(generatePlan).mockReset()
    vi.mocked(loadLatestMesocycleForUser).mockReset()
    localStorage.clear()
    sessionStorage.clear()
    await db.userProgramProfiles.clear()
    await db.sessionCheckins.clear()
    await db.dayOverrides.clear()
  })

  it('shows the error + retry when a regenerate fails for a user with a profile', async () => {
    vi.mocked(loadLatestMesocycleForUser).mockResolvedValue(null)
    vi.mocked(generatePlan).mockRejectedValue(new Error('network down: fetch failed'))
    await saveProfileLocal('test-user', PROFILE)

    render(<App />)

    // Plan-less dashboard → "Rebuild my plan" entry point.
    const rebuild = await screen.findByRole('button', { name: 'Rebuild my plan' })
    fireEvent.click(rebuild)

    // Pre-fix: the rejection was swallowed because the error UI was gated
    // behind !hasProfile — the user landed back on HomeScreen, none the wiser.
    await waitFor(() => {
      expect(screen.getByTestId('generation-error-sheet')).toBeInTheDocument()
    })
    expect(screen.getByText(/network hiccup/i)).toBeInTheDocument()

    // Retry affordance re-fires generation.
    fireEvent.click(screen.getByRole('button', { name: 'try again' }))
    await waitFor(() => {
      expect(vi.mocked(generatePlan)).toHaveBeenCalledTimes(2)
    })
  })

  it('dismissing the error sheet clears it', async () => {
    vi.mocked(loadLatestMesocycleForUser).mockResolvedValue(null)
    vi.mocked(generatePlan).mockRejectedValue(new Error('network down: fetch failed'))
    await saveProfileLocal('test-user', PROFILE)

    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rebuild my plan' }))
    await waitFor(() => {
      expect(screen.getByTestId('generation-error-sheet')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss generation error' }))
    expect(screen.queryByTestId('generation-error-sheet')).not.toBeInTheDocument()
  })
})

describe('App end-of-block CTA', () => {
  beforeEach(async () => {
    vi.mocked(generatePlan).mockReset()
    vi.mocked(loadLatestMesocycleForUser).mockReset()
    vi.mocked(replanNextBlock).mockReset()
    localStorage.clear()
    sessionStorage.clear()
    await db.userProgramProfiles.clear()
    await db.sessionCheckins.clear()
    await db.dayOverrides.clear()
  })

  it('shows the end-of-block card when every session is done and wires the CTA to regeneration', async () => {
    vi.mocked(loadLatestMesocycleForUser).mockResolvedValue(
      makeMeso(['completed', 'completed', 'skipped', 'completed']),
    )
    vi.mocked(generatePlan).mockResolvedValue(undefined as never)
    await saveProfileLocal('test-user', PROFILE)

    render(<App />)

    const cta = await screen.findByRole('button', { name: 'Build my next block' })
    fireEvent.click(cta)

    // 0 check-ins < replan threshold → falls back to regenerate with the
    // stored profile.
    await waitFor(() => {
      expect(vi.mocked(generatePlan)).toHaveBeenCalledTimes(1)
    })
    const [profileArg, userArg] = vi.mocked(generatePlan).mock.calls[0]
    expect(userArg).toBe('test-user')
    expect(profileArg).toMatchObject({ goal: 'glutes' })
  })

  it('routes the CTA through replan (in Settings) when enough check-ins exist', async () => {
    vi.mocked(loadLatestMesocycleForUser).mockResolvedValue(
      makeMeso(['completed', 'completed', 'skipped', 'completed']),
    )
    vi.mocked(replanNextBlock).mockRejectedValue(new Error('the cloud coach is unreachable'))
    await saveProfileLocal('test-user', PROFILE)
    // Enough check-ins to clear the replan gate.
    for (let i = 0; i < REPLAN_MIN_CHECKINS; i++) {
      const checkin = {
        session_id: `s-checkin-${i}`,
        user_id: 'test-user',
        completed_at: new Date(Date.now() - i * 86_400_000).toISOString(),
        week_number: 1,
        overall_feel: 3,
        exercises: [],
        synced: false,
      }
      await db.sessionCheckins.put({
        session_id: checkin.session_id,
        user_id: 'test-user',
        completed_at: checkin.completed_at,
        checkin_json: JSON.stringify(checkin),
        synced: false,
      })
    }

    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Build my next block' }))

    // Adaptive path: Settings opens (the replan review modal lives there)
    // and the replan kicks off against the current block.
    await waitFor(() => {
      expect(vi.mocked(replanNextBlock)).toHaveBeenCalledWith('test-user', 'meso-1')
    })
    expect(screen.getByTestId('settings-close')).toBeInTheDocument()
    expect(vi.mocked(generatePlan)).not.toHaveBeenCalled()
    // The failure surfaces in Settings instead of vanishing.
    expect(await screen.findByTestId('replan-error-message')).toBeInTheDocument()
  })

  it('does not show the end-of-block card mid-block', async () => {
    vi.mocked(loadLatestMesocycleForUser).mockResolvedValue(
      makeMeso(['completed', 'upcoming', 'upcoming', 'upcoming']),
    )
    await saveProfileLocal('test-user', PROFILE)

    render(<App />)

    // Wait for the dashboard to settle on real plan content first.
    await screen.findByText('Glutes + Hamstrings')
    expect(screen.queryByTestId('end-of-block-card')).not.toBeInTheDocument()
  })
})
