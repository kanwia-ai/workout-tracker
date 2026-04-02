import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

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
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
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

  return { user, profile, loading, signInWithMagicLink, signOut, updateStreak }
}
