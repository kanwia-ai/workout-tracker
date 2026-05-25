import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { loadProfileLocal, pullProfileFromCloud } from '../lib/profileRepo'

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
 * Auth user as exposed to the rest of the app. Always non-null after first
 * render — either a real Supabase session OR a stable local-only identity
 * persisted in localStorage. The `isLocal` flag tells Settings whether the
 * user is signed in (false) or running app-only (true).
 *
 * We keep `id` shaped like a Supabase `User` (string UUID) so all the Dexie
 * keys, plan generation, check-ins, etc. work unchanged for both paths.
 */
export interface AppUser {
  id: string
  email: string | null
  isLocal: boolean
}

// Dev bypass: skip auth entirely in development
const DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS === 'true'
const DEV_PROFILE: Profile = {
  id: 'dev-user',
  email: 'dev@localhost',
  display_name: 'Kyra',
  avatar_emoji: '💪',
  knee_flag: true,
  streak: 0,
  last_workout_date: null,
}

// localStorage key for the persistent local-only user UUID. Stable across
// reloads so a user who never signs in still keeps their plan + history
// after a refresh. Wiping localStorage (Settings → Start fresh) regenerates
// a fresh id on the next load, which is the desired "blow it all away"
// behaviour.
const LOCAL_USER_ID_KEY = 'workout-tracker:local-user-id'

/**
 * Generate or fetch the persisted local-only user id. UUIDs are produced
 * via `crypto.randomUUID()` when available (every modern browser + Node 19+)
 * and fall back to a Math.random hex so this still works in jsdom / SSR
 * environments that haven't shimmed crypto. The fallback isn't crypto-grade
 * but it's only used as a Dexie key, not a secret.
 */
function getOrCreateLocalUserId(): string {
  if (typeof window === 'undefined') {
    // SSR / non-browser path — caller will replace once on the client.
    return 'local-pending'
  }
  try {
    const existing = window.localStorage.getItem(LOCAL_USER_ID_KEY)
    if (existing && existing.length > 0) return existing
  } catch {
    // localStorage unavailable (private mode); fall through and mint a
    // throwaway id for this session.
  }
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  try {
    window.localStorage.setItem(LOCAL_USER_ID_KEY, id)
  } catch {
    // Best-effort persistence.
  }
  return id
}

export function useAuth() {
  // `user` is always non-null. Start with the local identity so the app
  // renders instantly without a loading spinner; if a Supabase session
  // exists, we upgrade to it in the background (see effect below).
  const [user, setUser] = useState<AppUser>(() => {
    if (DEV_BYPASS) {
      return { id: 'dev-user', email: 'dev@localhost', isLocal: false }
    }
    return { id: getOrCreateLocalUserId(), email: null, isLocal: true }
  })
  const [profile, setProfile] = useState<Profile | null>(() =>
    DEV_BYPASS ? DEV_PROFILE : null,
  )
  const [hasProfile, setHasProfile] = useState(false)
  /**
   * Surfaces background failures from `loadProfileLocal` /
   * `pullProfileFromCloud` so App.tsx can render a non-blocking banner.
   * Local-first means the app keeps working even if cloud pull fails — we
   * just want the user to know sync is degraded.
   */
  const [profileError, setProfileError] = useState<string | null>(null)
  // Tracks whether the UserProgramProfile resolution (local + optional cloud)
  // has finished for the current user. While this is true, gate the
  // "needs onboarding?" decision on a spinner instead of rendering
  // OnboardingFlow prematurely.
  const [programProfileResolving, setProgramProfileResolving] = useState(true)

  // Generation token — incremented on every auth change. Async resolvers
  // capture their generation at call time and no-op if a new auth event
  // has superseded them (stale sign-ins, rapid user switches).
  const authGenRef = useRef(0)

  useEffect(() => {
    if (DEV_BYPASS) {
      const devUser: AppUser = { id: 'dev-user', email: 'dev@localhost', isLocal: false }
      authGenRef.current += 1
      const gen = authGenRef.current
      setUser(devUser)
      setProfile(DEV_PROFILE)
      setProgramProfileResolving(true)
      void resolveProgramProfile(devUser.id, gen, { skipCloud: true })
      return
    }

    // Kick off resolution against the local user immediately so the app
    // can render even if Supabase is unreachable / unconfigured.
    authGenRef.current += 1
    const initialGen = authGenRef.current
    void resolveProgramProfile(user.id, initialGen, { skipCloud: true })

    // In the background, check for an existing Supabase session — if one
    // exists, upgrade to the cloud identity. Wrapped in try/catch so a
    // broken Supabase config (missing env vars, network failure) doesn't
    // crash the local-first path.
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const session = data.session
        if (!session?.user) return
        authGenRef.current += 1
        const gen = authGenRef.current
        setUser({
          id: session.user.id,
          email: session.user.email ?? null,
          isLocal: false,
        })
        setProgramProfileResolving(true)
        fetchProfile(session.user.id, gen)
        void resolveProgramProfile(session.user.id, gen)
      } catch (err) {
        console.warn('supabase.auth.getSession failed (continuing local-only)', err)
      }
    })()

    let subscription: { unsubscribe: () => void } | null = null
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        authGenRef.current += 1
        const gen = authGenRef.current
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? null,
            isLocal: false,
          })
          setProgramProfileResolving(true)
          fetchProfile(session.user.id, gen)
          void resolveProgramProfile(session.user.id, gen)
        } else {
          // Signed out — drop back to a local identity but keep all local
          // data intact. Reuses the same persisted local id so the user's
          // plan/history stays put.
          const localId = getOrCreateLocalUserId()
          setUser({ id: localId, email: null, isLocal: true })
          setProfile(null)
          setProgramProfileResolving(true)
          void resolveProgramProfile(localId, gen, { skipCloud: true })
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
   * Resolve whether the user has a UserProgramProfile. Offline-first:
   * check the local Dexie cache, then attempt a cloud pull that can also
   * populate the cache (and flip hasProfile to true) if the user
   * onboarded on another device.
   *
   * `gen` is captured at call time — if a newer auth event has
   * incremented `authGenRef`, all setter calls below are dropped to
   * avoid stale-user writes after sign-out / user-switch.
   *
   * skipCloud: true for the dev-bypass + local-only paths — no auth
   * session means the Supabase query would 401; just trust the local
   * cache.
   */
  async function resolveProgramProfile(
    userId: string,
    gen: number,
    opts: { skipCloud?: boolean } = {},
  ) {
    const stale = () => authGenRef.current !== gen

    try {
      const local = await loadProfileLocal(userId)
      if (stale()) return
      if (local) {
        setHasProfile(true)
        setProgramProfileResolving(false)
        return
      }
    } catch (err) {
      console.warn('loadProfileLocal failed', err)
      if (!stale()) {
        setProfileError(
          err instanceof Error
            ? `Couldn't load your saved profile: ${err.message}`
            : "Couldn't load your saved profile.",
        )
      }
    }

    if (opts.skipCloud) {
      if (!stale()) setProgramProfileResolving(false)
      return
    }

    try {
      const cloud = await pullProfileFromCloud(userId)
      if (stale()) return
      if (cloud) setHasProfile(true)
    } catch (err) {
      console.warn('pullProfileFromCloud failed', err)
      if (!stale()) {
        setProfileError(
          err instanceof Error
            ? `Sync hiccup: ${err.message}`
            : 'Cloud sync unavailable right now.',
        )
      }
    } finally {
      if (!stale()) setProgramProfileResolving(false)
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

  async function signInWithMagicLink(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })
      return { error: error?.message ?? null }
    } catch (err) {
      return {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to reach the sign-in service.',
      }
    }
  }

  /**
   * `signIn` is a no-op for the local-only path — sign-in is opt-in via
   * the Settings flow which calls `signInWithMagicLink` directly. Kept on
   * the returned API for backwards compatibility with any caller that
   * still references it.
   */
  function signIn() {
    // intentional no-op — see jsdoc above.
  }

  async function signOut() {
    authGenRef.current += 1  // invalidate any in-flight resolvers
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('supabase.auth.signOut failed (continuing)', err)
    }
    // Drop back to the local identity. Keep local Dexie data intact —
    // sign-out clears the session token, not the user's workouts.
    const localId = getOrCreateLocalUserId()
    setUser({ id: localId, email: null, isLocal: true })
    setProfile(null)
    setProfileError(null)
    setProgramProfileResolving(true)
    const gen = authGenRef.current
    void resolveProgramProfile(localId, gen, { skipCloud: true })
  }

  async function updateStreak() {
    if (!profile) return

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

    // Local-only users have no Supabase row to update; bump the in-memory
    // profile and bail. (Streak persistence for local users is a Phase 3
    // problem — for now it resets on reload, which is no worse than the
    // old behaviour for users who never signed in.)
    if (user.isLocal) {
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
    // No auth-loading wait anymore — the local identity is available
    // synchronously. We still want the app to gate onboarding decisions on
    // the profile-resolve so it doesn't briefly render the onboarding flow
    // while we're still checking Dexie.
    loading: programProfileResolving,
    hasProfile,
    setHasProfile,
    profileError,
    clearProfileError: () => setProfileError(null),
    signIn,
    signInWithMagicLink,
    signOut,
    updateStreak,
  }
}
