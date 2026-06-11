import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { pullProfileFromCloud } from '../lib/profileRepo'
import { pullCheckinsFromCloud } from '../lib/checkins'
import { flushDirtyToCloud } from '../lib/syncBackfill'
import { wipeUserData } from '../lib/db'

interface Profile {
  id: string
  email: string
  display_name: string
  avatar_emoji: string
  knee_flag: boolean
  streak: number
  last_workout_date: string | null
}

/**
 * Auth user as exposed to the rest of the app. NULL when no Supabase session
 * exists — the app routes to LoginScreen in that case. We no longer mount a
 * "local-only" identity: Supabase is the source of truth, sign-in is
 * required, and Dexie acts purely as a cache.
 *
 * The `id` is always the Supabase user UUID, which Postgres RLS policies
 * gate on (`auth.uid() = user_id`).
 */
export interface AppUser {
  id: string
  email: string | null
}

// Dev bypass: skip auth entirely in development. Mounts a stable fake
// user so localhost work doesn't require a Supabase session every reload.
// PROD builds ignore this flag completely. Also OFF under vitest
// (import.meta.env.TEST) — `.env` carries VITE_DEV_BYPASS=true for local
// dev serving and would otherwise leak the fake user into hook tests.
const DEV_BYPASS =
  import.meta.env.DEV && !import.meta.env.TEST && import.meta.env.VITE_DEV_BYPASS === 'true'
const DEV_USER: AppUser = { id: 'dev-user', email: 'dev@localhost' }
const DEV_PROFILE: Profile = {
  id: 'dev-user',
  email: 'dev@localhost',
  display_name: 'Kyra',
  avatar_emoji: '💪',
  knee_flag: true,
  streak: 0,
  last_workout_date: null,
}

/**
 * Sync status surfaced to the UI so the app can render "syncing…" /
 * "out of sync" affordances. Doesn't gate any feature — Dexie is the
 * read path. Status is best-effort and reflects the most recent push.
 *
 *   - 'idle': no sync activity (just-mounted, or last push succeeded)
 *   - 'syncing': a background push or pull is in flight
 *   - 'error': the most recent sync attempt failed; retry on next write
 */
export type SyncStatus = 'idle' | 'syncing' | 'error'

export function useAuth() {
  // `user` is null until the first session check resolves OR the user
  // signs in. App.tsx gates on `loading` + `user` to decide whether to
  // render LoginScreen.
  const [user, setUser] = useState<AppUser | null>(() =>
    DEV_BYPASS ? DEV_USER : null,
  )
  const [profile, setProfile] = useState<Profile | null>(() =>
    DEV_BYPASS ? DEV_PROFILE : null,
  )
  const [hasProfile, setHasProfile] = useState(false)
  /**
   * Surfaces background failures from `pullProfileFromCloud` so App.tsx
   * can render a non-blocking banner. Cloud-as-source-of-truth means a
   * pull failure usually still leaves Dexie populated — we surface the
   * hiccup but keep the app responsive.
   */
  const [profileError, setProfileError] = useState<string | null>(null)
  // Tracks whether the auth resolution (session check + profile pull) has
  // finished. While true, App.tsx renders a spinner instead of routing
  // to LoginScreen or onboarding prematurely.
  const [loading, setLoading] = useState(!DEV_BYPASS)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  // Generation token — incremented on every auth change. Async resolvers
  // capture their generation at call time and no-op if a new auth event
  // has superseded them (stale sign-ins, rapid user switches).
  const authGenRef = useRef(0)
  // Identity of the user we last ran the full sign-in resolution for.
  // supabase-js re-emits auth events for the SAME session (TOKEN_REFRESHED
  // ~hourly, SIGNED_IN again on tab refocus, INITIAL_SESSION on subscribe).
  // Before this guard, every one of those re-ran the full pull with
  // setLoading(true) — which swapped the whole app for a spinner and
  // unmounted onboarding/workout screens mid-flow. Only an actual identity
  // change should restart resolution.
  const lastAuthUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (DEV_BYPASS) {
      // DEV path — skip Supabase entirely. The app behaves as if a stable
      // dev user is signed in.
      authGenRef.current += 1
      const gen = authGenRef.current
      void resolveProgramProfile(DEV_USER.id, gen, { skipCloud: true })
      return
    }

    // PROD path — check for an existing Supabase session. If present, the
    // app routes into onboarding (no profile yet) or directly into the
    // app (profile exists, even if Dexie is empty — we'll pull it).
    authGenRef.current += 1
    const initialGen = authGenRef.current

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const session = data.session
        if (session?.user) {
          if (lastAuthUserIdRef.current === session.user.id) {
            // The INITIAL_SESSION emission already kicked off resolution
            // for this user — don't run the whole pull twice.
            return
          }
          lastAuthUserIdRef.current = session.user.id
          setUser({
            id: session.user.id,
            email: session.user.email ?? null,
          })
          void fetchProfile(session.user.id, initialGen)
          void resolveProgramProfile(session.user.id, initialGen)
        } else {
          // No session — App routes to LoginScreen.
          setLoading(false)
        }
      } catch (err) {
        console.warn('supabase.auth.getSession failed', err)
        // Treat session-check failure as "no session" — surface a profile
        // error banner so the user knows something went wrong, then let
        // them try sign-in (which will probably also fail loudly).
        setProfileError(
          err instanceof Error
            ? `Sign-in service unavailable: ${err.message}`
            : 'Sign-in service unavailable.',
        )
        setLoading(false)
      }
    })()

    let subscription: { unsubscribe: () => void } | null = null
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        const nextUserId = session?.user?.id ?? null
        if (nextUserId && nextUserId === lastAuthUserIdRef.current) {
          // Same user, refreshed token (TOKEN_REFRESHED / focus re-emit /
          // USER_UPDATED). Identity didn't change — re-running the full
          // pull here used to flash the app to a loading spinner roughly
          // hourly, destroying in-progress onboarding answers. No-op.
          return
        }
        authGenRef.current += 1
        const gen = authGenRef.current
        if (session?.user) {
          lastAuthUserIdRef.current = session.user.id
          setUser({
            id: session.user.id,
            email: session.user.email ?? null,
          })
          setLoading(true)
          void fetchProfile(session.user.id, gen)
          void resolveProgramProfile(session.user.id, gen)
        } else {
          // Signed out — drop to null, App routes to LoginScreen.
          lastAuthUserIdRef.current = null
          setUser(null)
          setProfile(null)
          setHasProfile(false)
          setLoading(false)
        }
      })
      subscription = data.subscription
    } catch (err) {
      console.warn('supabase.auth.onAuthStateChange failed', err)
    }

    return () => {
      subscription?.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Resolve whether the user has a UserProgramProfile. Pulls from the
   * cloud first (Supabase is source of truth) and writes to Dexie as a
   * cache. Falls back gracefully if the cloud fetch fails — the local
   * Dexie row, if any, becomes the authoritative read.
   *
   * `gen` is captured at call time — if a newer auth event has
   * incremented `authGenRef`, all setter calls below are dropped to
   * avoid stale-user writes after sign-out / user-switch.
   *
   * skipCloud: true for the dev-bypass path only — no auth session means
   * the Supabase query would 401; trust the local cache.
   */
  async function resolveProgramProfile(
    userId: string,
    gen: number,
    opts: { skipCloud?: boolean } = {},
  ) {
    const stale = () => authGenRef.current !== gen

    if (opts.skipCloud) {
      // DEV path only — Dexie is the only source.
      try {
        const { loadProfileLocal } = await import('../lib/profileRepo')
        const local = await loadProfileLocal(userId)
        if (stale()) return
        if (local) setHasProfile(true)
      } catch (err) {
        console.warn('loadProfileLocal failed', err)
      } finally {
        if (!stale()) setLoading(false)
      }
      return
    }

    setSyncStatus('syncing')
    try {
      // Cloud is source of truth — pull first so a fresh-Dexie device
      // (re-install, new browser) gets the user's profile back without
      // forcing them through onboarding again.
      const cloud = await pullProfileFromCloud(userId)
      if (stale()) return
      if (cloud) {
        setHasProfile(true)
      } else {
        // No cloud profile yet — fall back to local (covers race where
        // user just saved their onboarding answers and hasn't synced
        // up). If local also empty, App routes to onboarding.
        const { loadProfileLocal } = await import('../lib/profileRepo')
        const local = await loadProfileLocal(userId)
        if (stale()) return
        if (local) setHasProfile(true)
      }
      // Pull check-ins after the profile pull so a fresh-Dexie device
      // gets the user's history back even on a brand-new browser.
      let syncError = false
      try {
        await pullCheckinsFromCloud(userId)
        if (stale()) return
      } catch (err) {
        console.warn('checkin pull on sign-in failed', err)
        syncError = true
      }
      // The backend is reachable right now — push everything that never
      // made it up: profile, check-ins, and workout rows (sessions, sets,
      // PRs, weights, cardio). Before this sweep existed here, rows
      // written while the backend was down stayed dirty forever (their
      // one-shot background push had already failed) and were silently
      // destroyed by the sign-out wipe. The pull guards above never
      // clobber dirty rows, so pull-then-flush is safe in this order.
      const flush = await flushDirtyToCloud(userId)
      if (!flush.ok) syncError = true
      if (stale()) return
      setSyncStatus(syncError ? 'error' : 'idle')
    } catch (err) {
      console.warn('pullProfileFromCloud failed', err)
      if (!stale()) {
        setProfileError(
          err instanceof Error
            ? `Sync hiccup: ${err.message}`
            : 'Cloud sync unavailable right now.',
        )
        setSyncStatus('error')
      }
      // Cloud failed — fall back to local cache so the user isn't locked
      // out by a flaky network.
      try {
        const { loadProfileLocal } = await import('../lib/profileRepo')
        const local = await loadProfileLocal(userId)
        if (stale()) return
        if (local) setHasProfile(true)
      } catch (innerErr) {
        console.warn('loadProfileLocal fallback failed', innerErr)
      }
    } finally {
      if (!stale()) setLoading(false)
    }
  }

  async function fetchProfile(userId: string, gen: number) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (authGenRef.current !== gen) return  // superseded by a newer auth event

      if (data && !error) {
        setProfile(data as Profile)
      }
    } catch (err) {
      console.warn('fetchProfile failed', err)
    }
  }

  async function signOut() {
    const previousUserId = user?.id
    // Flush dirty rows BEFORE killing the session — RLS only accepts the
    // upserts while the user is still authenticated. Without this, any
    // row whose background push had failed (offline workout, backend
    // outage) was destroyed by the wipe below with zero warning.
    if (previousUserId && previousUserId !== 'dev-user') {
      let flushOk = false
      try {
        const result = await flushDirtyToCloud(previousUserId)
        flushOk = result.ok
        if (!result.ok) {
          console.warn(
            'signOut: rows still dirty after flush — at risk of deletion',
            result.stillDirty,
          )
        }
      } catch (err) {
        console.warn('signOut: dirty flush failed', err)
      }
      if (!flushOk) {
        // Plain-language stakes: signing out wipes this device's copy.
        const proceed = window.confirm(
          "Some of your recent workout data hasn't backed up to the cloud yet (you might be offline). " +
            'Signing out will remove it from this device for good. Sign out anyway?',
        )
        if (!proceed) return
      }
    }
    authGenRef.current += 1  // invalidate any in-flight resolvers
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('supabase.auth.signOut failed (continuing)', err)
    }
    // Clear local Dexie cache so the next user starting fresh (e.g.
    // friend signing in on Kyra's laptop) doesn't see Kyra's leftover
    // workout data. The onAuthStateChange handler will null-out user
    // state and App routes to LoginScreen.
    if (previousUserId && previousUserId !== 'dev-user') {
      try {
        await wipeUserData()
      } catch (err) {
        console.warn('wipeUserData on sign-out failed', err)
      }
    }
    setUser(null)
    setProfile(null)
    setHasProfile(false)
    setProfileError(null)
    setLoading(false)
  }

  async function updateStreak() {
    if (!profile || !user) return

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    let newStreak = profile.streak || 0

    if (profile.last_workout_date === today) {
      // Already logged today, no change
      return
    } else if (profile.last_workout_date === yesterday || !profile.last_workout_date) {
      newStreak += 1
    } else {
      // Check if the gap was only rest days (Wed/Sun = indices 2,6)
      // If all days between last_workout_date and today were rest days, maintain streak
      const lastDate = new Date(profile.last_workout_date)
      const todayDate = new Date(today)
      let allRest = true

      const d = new Date(lastDate)
      d.setDate(d.getDate() + 1) // start from day after last workout

      while (d < todayDate) {
        const dayOfWeek = d.getDay()
        // Sunday=0, Wednesday=3 are rest days
        const isRestDay = dayOfWeek === 0 || dayOfWeek === 3
        if (!isRestDay) {
          allRest = false
          break
        }
        d.setDate(d.getDate() + 1)
      }

      if (allRest) {
        newStreak += 1
      } else {
        newStreak = 1 // streak broken
      }
    }

    // Dev user has no Supabase row to update; bump the in-memory profile.
    if (DEV_BYPASS) {
      setProfile({ ...profile, streak: newStreak, last_workout_date: today })
      return
    }

    try {
      const { data } = await supabase
        .from('profiles')
        .update({ streak: newStreak, last_workout_date: today })
        .eq('id', profile.id)
        .select()
        .single()

      if (data) setProfile(data as Profile)
    } catch (err) {
      console.warn('updateStreak failed', err)
    }
  }

  return {
    user,
    profile,
    loading,
    hasProfile,
    setHasProfile,
    profileError,
    clearProfileError: () => setProfileError(null),
    signOut,
    updateStreak,
    syncStatus,
    setSyncStatus,
  }
}
