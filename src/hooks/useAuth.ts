import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { loadProfileLocal, pullProfileFromCloud } from '../lib/profileRepo'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string
  display_name: string
  avatar_emoji: string
  knee_flag: boolean
  streak: number
  last_workout_date: string | null
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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState(false)
  // Tracks whether the UserProgramProfile resolution (local + optional cloud)
  // has finished for the current user. While this is true, gate the
  // "needs onboarding?" decision on a spinner instead of rendering
  // OnboardingFlow prematurely.
  const [programProfileResolving, setProgramProfileResolving] = useState(false)

  // Generation token — incremented on every auth change. Async resolvers
  // capture their generation at call time and no-op if a new auth event
  // has superseded them (stale sign-ins, rapid user switches).
  const authGenRef = useRef(0)

  useEffect(() => {
    if (DEV_BYPASS) {
      const devUser = { id: 'dev-user' } as User
      authGenRef.current += 1
      const gen = authGenRef.current
      setUser(devUser)
      setProfile(DEV_PROFILE)
      setLoading(false)
      setProgramProfileResolving(true)
      void resolveProgramProfile(devUser.id, gen, { skipCloud: true })
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      authGenRef.current += 1
      const gen = authGenRef.current
      setUser(session?.user ?? null)
      if (session?.user) {
        setProgramProfileResolving(true)
        fetchProfile(session.user.id, gen)
        void resolveProgramProfile(session.user.id, gen)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authGenRef.current += 1
      const gen = authGenRef.current
      setUser(session?.user ?? null)
      if (session?.user) {
        setProgramProfileResolving(true)
        fetchProfile(session.user.id, gen)
        void resolveProgramProfile(session.user.id, gen)
      } else {
        setProfile(null)
        setHasProfile(false)
        setProgramProfileResolving(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
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
   * skipCloud: true for the dev-bypass path — no auth session means the
   * Supabase query would 401; just trust the local cache.
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
    } finally {
      if (!stale()) setProgramProfileResolving(false)
    }
  }

  async function fetchProfile(userId: string, gen: number) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (authGenRef.current !== gen) return  // superseded by a newer auth event

    if (data && !error) {
      setProfile(data as Profile)
    }
    setLoading(false)
  }

  async function signInWithMagicLink(email: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    authGenRef.current += 1  // invalidate any in-flight resolvers
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setHasProfile(false)
    setProgramProfileResolving(false)
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

    const { data } = await supabase
      .from('profiles')
      .update({ streak: newStreak, last_workout_date: today })
      .eq('id', profile.id)
      .select()
      .single()

    if (data) setProfile(data as Profile)
  }

  return {
    user,
    profile,
    loading: loading || programProfileResolving,
    hasProfile,
    setHasProfile,
    signInWithMagicLink,
    signOut,
    updateStreak,
  }
}
