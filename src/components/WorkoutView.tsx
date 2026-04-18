import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { LogOut, Flame, Plus, BarChart3, Check, Timer, Loader2, Moon, RefreshCw } from 'lucide-react'
import { ProgressBar } from './ProgressBar'
import { SessionBar } from './SessionBar'
import { TimerOverlay } from './TimerOverlay'
import { DayStrip } from './DayStrip'
import { RoutineSlot } from './RoutineSlot'
import { useSession } from '../hooks/useSession'
import { usePlan } from '../hooks/usePlan'
import { getToday } from '../lib/planSelectors'
import { saveSession, saveLastWeight, updatePR, loadLastWeights, loadPRs } from '../lib/persistence'
import { loadProfileLocal } from '../lib/profileRepo'
import { generatePlan } from '../lib/planGen'
import { requestSwap, applySwap, type SwapReason } from '../lib/swap'
import { SwapSheet } from './SwapSheet'
import type { TimerState, SessionPhase } from '../types'
import type { PlannedSession, PlannedExercise } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'

// ─── Manual browser verification (not automated) ─────────────────────────
// 1. Load app → DayStrip shows 7 days, today is highlighted.
// 2. Today's session renders below the strip.
// 3. Tap Wednesday → Wed's session renders (or the rest card if Wed is rest).
// 4. Reload the page → selectedDow persists (Wednesday stays selected).
// 5. On rest days, "Rest day — recovery + mobility" card renders where
//    the session content used to be (engine doesn't generate rest content
//    yet — deferred).
// ─────────────────────────────────────────────────────────────────────────

// ─── localStorage keys ────────────────────────────────────────────────────
// Selection semantics moved from session id (Phase 1) to day-of-week
// (0-6, Mon=0). The old key is intentionally left alone — no cleanup — so
// users with Phase-1 state just fall back to today's dow on first load.
const SELECTED_DOW_KEY = 'workout-tracker:selected-dow'
const HAS_USED_KEY = 'workout-tracker:has-used'
const CHECKED_SETS_KEY = (sessionId: string) => `workout-tracker:checked-sets:${sessionId}`
const WEIGHTS_KEY = (sessionId: string) => `workout-tracker:weights:${sessionId}`

// JS Date.getDay(): 0=Sun..6=Sat. App convention: 0=Mon..6=Sun.
function toAppDow(jsDow: number): number {
  return (jsDow + 6) % 7
}

function todayDow(): number {
  return toAppDow(new Date().getDay())
}

/** Monday (local time) of the calendar week containing `d`. Pure. */
function getWeekStartDate(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  out.setDate(out.getDate() - toAppDow(out.getDay()))
  return out
}

function loadSelectedDow(): number {
  try {
    const raw = localStorage.getItem(SELECTED_DOW_KEY)
    if (raw === null) return todayDow()
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'number' && parsed >= 0 && parsed <= 6 && Number.isInteger(parsed)) {
      return parsed
    }
    return todayDow()
  } catch {
    return todayDow()
  }
}

function loadStoredRecord<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

interface WorkoutViewProps {
  userId: string
  profile: { display_name: string; avatar_emoji: string; streak: number; knee_flag: boolean } | null
  onSignOut: () => void
  onWorkoutComplete: () => void
  onNavigateToCapture: () => void
  onNavigateCardio: () => void
  onNavigateProgress: () => void
}

export function WorkoutView({
  userId,
  profile,
  onSignOut,
  onWorkoutComplete,
  onNavigateToCapture,
  onNavigateProgress,
}: WorkoutViewProps) {
  const { plan, loading } = usePlan(userId)

  // ─── Selected day-of-week ────────────────────────────────────────────────
  // Selection is by dow (0-6, Mon=0). The actual PlannedSession is derived
  // from plan + currentWeek + selectedDow — rest days resolve to null.
  const [selectedDow, setSelectedDow] = useState<number>(() => loadSelectedDow())

  useEffect(() => {
    localStorage.setItem(SELECTED_DOW_KEY, JSON.stringify(selectedDow))
  }, [selectedDow])

  // Which mesocycle week are we looking at? The week_number of the plan's
  // "upcoming" session (i.e., the next training day in progress order), or
  // 1 when the plan has no upcoming sessions left.
  const currentWeek = useMemo(() => getToday(plan)?.week_number ?? 1, [plan])

  const weekSessions = useMemo(
    () => (plan ? plan.sessions.filter(s => s.week_number === currentWeek) : []),
    [plan, currentWeek],
  )

  const selectedSession: PlannedSession | null = useMemo(() => {
    return weekSessions.find(s => s.day_of_week === selectedDow) ?? null
  }, [weekSessions, selectedDow])

  const selectedSessionKey = selectedSession?.id ?? null
  const weekStartDate = useMemo(() => getWeekStartDate(new Date()), [])

  // ─── Per-session persistence (checkedSets / weights) ─────────────────────
  // Keyed by session.id so each day of the mesocycle keeps its own progress.
  const [weights, setWeights] = useState<Record<string, number>>(() =>
    selectedSessionKey ? loadStoredRecord<Record<string, number>>(WEIGHTS_KEY(selectedSessionKey)) || {} : {},
  )
  const [lastWeights, setLastWeights] = useState<Record<string, number>>({})
  const [_prs, setPrs] = useState<Record<string, number>>({})
  const [checkedSets, setCheckedSets] = useState<Record<string, boolean>>(() =>
    selectedSessionKey
      ? loadStoredRecord<Record<string, boolean>>(CHECKED_SETS_KEY(selectedSessionKey)) || {}
      : {},
  )
  const [timer, setTimer] = useState<TimerState | null>(null)
  const [hasUsed, setHasUsed] = useState<boolean>(() => localStorage.getItem(HAS_USED_KEY) === 'true')
  const hydratedForRef = useRef<string | null>(selectedSessionKey)
  // Retry state for the "No plan yet" fallback. Lets a user whose
  // last generatePlan failed trigger a fresh generation from the
  // profile they've already persisted locally.
  const [retryingPlan, setRetryingPlan] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)

  const handleRetryPlan = useCallback(async () => {
    setRetryError(null)
    setRetryingPlan(true)
    try {
      const profile = await loadProfileLocal(userId)
      if (!profile) {
        setRetryError('No profile found — try signing out and back in.')
        setRetryingPlan(false)
        return
      }
      await generatePlan(profile, userId, 6)
      // usePlan is reactive — the new mesocycle will populate on its own.
      setRetryingPlan(false)
    } catch (err) {
      console.error('retry generatePlan failed', err)
      setRetryError(
        err instanceof Error && /network|fetch failed|timed out/i.test(err.message)
          ? 'Network hiccup. Try again in a moment.'
          : 'Something went wrong. Try again.',
      )
      setRetryingPlan(false)
    }
  }, [userId])

  const { session, startSession, switchPhase, endSession, clearSession } = useSession()

  // ─── Swap state ──────────────────────────────────────────────────────────
  // We keep the cached profile (for swap prompts) and the index of the
  // exercise the user is currently swapping. `null` means the sheet is closed.
  const [cachedProfile, setCachedProfile] = useState<UserProgramProfile | null>(null)
  const [swapIndex, setSwapIndex] = useState<number | null>(null)

  useEffect(() => {
    // Load on mount / when userId changes. App.tsx doesn't pass the profile
    // through, so we fetch it locally from Dexie here (it was persisted
    // during onboarding and/or pulled from Supabase by the auth hook).
    let cancelled = false
    loadProfileLocal(userId)
      .then(p => {
        if (!cancelled) setCachedProfile(p)
      })
      .catch(err => {
        console.error('WorkoutView: failed to load profile for swap', err)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const handleSwapRequest = useCallback(
    async (reason: SwapReason) => {
      if (!cachedProfile) throw new Error('Profile not loaded yet — try again in a moment.')
      if (!selectedSession || swapIndex == null) {
        throw new Error('No active session or exercise selected for swap.')
      }
      return requestSwap({
        profile: cachedProfile,
        session: selectedSession,
        exerciseIndex: swapIndex,
        reason,
      })
    },
    [cachedProfile, selectedSession, swapIndex],
  )

  const handleSwapAccept = useCallback(
    async (replacement: PlannedExercise) => {
      if (!plan || !selectedSession || swapIndex == null) return
      try {
        await applySwap(plan.id, selectedSession.id, swapIndex, replacement)
      } catch (err) {
        console.error('applySwap failed', err)
      } finally {
        setSwapIndex(null)
      }
    },
    [plan, selectedSession, swapIndex],
  )

  // Re-hydrate checkedSets/weights when the selected session changes.
  // The ref gate ensures the write effects below skip the racing commit that
  // runs with stale state on the frame we switched sessions.
  useEffect(() => {
    if (!selectedSessionKey) {
      hydratedForRef.current = null
      setCheckedSets({})
      setWeights({})
      return
    }
    if (hydratedForRef.current === selectedSessionKey) return
    const savedChecked = loadStoredRecord<Record<string, boolean>>(CHECKED_SETS_KEY(selectedSessionKey)) || {}
    const savedWeights = loadStoredRecord<Record<string, number>>(WEIGHTS_KEY(selectedSessionKey)) || {}
    setCheckedSets(savedChecked)
    setWeights(savedWeights)
    hydratedForRef.current = selectedSessionKey
  }, [selectedSessionKey])

  useEffect(() => {
    if (!selectedSessionKey || hydratedForRef.current !== selectedSessionKey) return
    localStorage.setItem(CHECKED_SETS_KEY(selectedSessionKey), JSON.stringify(checkedSets))
  }, [selectedSessionKey, checkedSets])

  useEffect(() => {
    if (!selectedSessionKey || hydratedForRef.current !== selectedSessionKey) return
    localStorage.setItem(WEIGHTS_KEY(selectedSessionKey), JSON.stringify(weights))
  }, [selectedSessionKey, weights])

  // First-time flag: mark used when a session starts
  useEffect(() => {
    if (session && !hasUsed) {
      localStorage.setItem(HAS_USED_KEY, 'true')
      setHasUsed(true)
    }
  }, [session, hasUsed])

  // Load saved weights and PRs
  useEffect(() => {
    if (userId) {
      loadLastWeights(userId).then(setLastWeights)
      loadPRs(userId).then(setPrs)
    }
  }, [userId])

  // ─── Derived: session progress ───────────────────────────────────────────
  const exercises = selectedSession?.exercises ?? []
  const totalSets = exercises.reduce((a, e) => a + e.sets, 0)
  const doneSets = exercises.reduce(
    (acc, e, ei) =>
      acc +
      Array.from({ length: e.sets }, (_, k) => (checkedSets[`${ei}-${k}`] ? 1 : 0)).reduce<number>(
        (x, y) => x + y,
        0,
      ),
    0,
  )

  const toggleSet = (exerciseIdx: number, setIdx: number) => {
    const key = `${exerciseIdx}-${setIdx}`
    setCheckedSets(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const startTimer = (seconds: number, label: string, type: 'rest' | 'work') => {
    setTimer({ seconds, label, type })
  }

  // Save session when ending workout
  const handleEndSession = useCallback(async () => {
    if (!session || !selectedSession) {
      endSession()
      return
    }

    const endedSession = { ...session }
    const finishedSessionId = selectedSession.id
    endSession()
    setCheckedSets({})
    localStorage.removeItem(CHECKED_SETS_KEY(finishedSessionId))
    localStorage.removeItem(WEIGHTS_KEY(finishedSessionId))

    const now = new Date().toISOString()
    await saveSession({
      userId,
      workoutId: finishedSessionId,
      workoutTitle: selectedSession.title,
      date: new Date().toISOString().split('T')[0],
      startedAt: endedSession.started_at,
      endedAt: now,
      phases: endedSession.phases.map(p => (p.ended_at ? p : { ...p, ended_at: now })),
      completedSets: doneSets,
      totalSets,
    })

    for (const [exerciseId, weight] of Object.entries(weights)) {
      if (weight > 0) {
        const ex = exercises.find(e => e.library_id === exerciseId)
        await saveLastWeight(userId, exerciseId, weight)
        await updatePR(userId, exerciseId, ex?.name || exerciseId, weight)
      }
    }

    if (doneSets > 0) onWorkoutComplete()

    loadLastWeights(userId).then(setLastWeights)
    loadPRs(userId).then(setPrs)
    setWeights({})
    clearSession()
  }, [
    session,
    selectedSession,
    userId,
    weights,
    doneSets,
    totalSets,
    endSession,
    onWorkoutComplete,
    exercises,
    clearSession,
  ])

  // ─── Render: shell (always shows header) ─────────────────────────────────
  const Header = (
    <div className="flex items-center justify-between pt-3 pb-4">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight bg-gradient-to-r from-brand to-orange-300 bg-clip-text text-transparent">
          My Training Plan
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          {profile?.display_name ? `Hey ${profile.display_name}` : 'Your adaptive program'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {(profile?.streak ?? 0) > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand/10 border border-brand/20">
            <Flame size={14} className="text-brand" />
            <span className="text-sm font-bold text-brand">{profile?.streak}</span>
          </div>
        )}
        <button
          onClick={onNavigateProgress}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 active:scale-95 transition-all"
          title="View progress"
        >
          <BarChart3 size={16} />
        </button>
        <button
          onClick={onNavigateToCapture}
          className="p-2 rounded-lg text-brand hover:text-orange-300 active:scale-95 transition-all"
          title="Add exercise from social media"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={onSignOut}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 active:scale-95 transition-all"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  )

  // Loading: no plan resolved yet
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 size={32} className="text-brand animate-spin" />
      </div>
    )
  }

  // No plan yet — this happens when the user onboarded but generation
  // failed (or after wiping IndexedDB while keeping Supabase). Offer a
  // Retry that pulls the persisted profile and regenerates.
  if (!plan) {
    return (
      <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
        <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">
          {Header}
          <div className="text-center py-16 bg-surface-raised rounded-2xl mt-5 border border-border-subtle">
            <div className="text-5xl mb-3">🏗️</div>
            <div className="text-xl font-bold">No plan yet</div>
            <div className="text-zinc-400 text-sm mt-1.5 px-6 mb-5">
              Your profile is saved. Regenerate your training block to get going.
            </div>
            <button
              onClick={handleRetryPlan}
              disabled={retryingPlan}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand text-black font-bold disabled:opacity-50"
            >
              {retryingPlan
                ? <><Loader2 size={16} className="animate-spin" /> Generating…</>
                : <><RefreshCw size={16} /> Generate plan</>}
            </button>
            {retryError && (
              <div className="text-sm text-red-400 mt-4">{retryError}</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: strip + (session | rest card) ──────────────────────────────
  return (
    <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
      <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">
        {Header}

        {/* 7-day strip (replaces the Phase-1 session chip row) */}
        <DayStrip
          plan={plan}
          weekNumber={currentWeek}
          todayDow={todayDow()}
          selectedDow={selectedDow}
          onSelect={setSelectedDow}
          weekStartDate={weekStartDate}
        />

        {/* Week label + mesocycle progress */}
        <div className="flex items-center gap-2 mt-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border-subtle bg-surface-raised text-xs font-bold text-zinc-300">
            Week {currentWeek} of {plan.length_weeks}
          </div>
          <span className="text-[11px] text-zinc-600">{plan.sessions.length} sessions this block</span>
        </div>

        {/* Workout content */}
        <div className="mt-3 space-y-2.5">
          {selectedSession ? (
            <>
              {/* Session bar */}
              <SessionBar
                started_at={session?.started_at || null}
                currentPhase={session?.current_phase || null}
                phases={session?.phases || []}
                onStart={() => startSession(selectedSession.id)}
                onSwitchPhase={(phase: SessionPhase['name']) => switchPhase(phase)}
                onEnd={handleEndSession}
              />

              {/* Progress */}
              <ProgressBar
                current={doneSets}
                total={totalSets}
                emoji="💪"
                title={selectedSession.title}
                estMinutes={selectedSession.estimated_minutes}
              />

              {/* Warmup slot (auto-generates on first view, locked until regenerate) */}
              {cachedProfile && (
                <RoutineSlot session={selectedSession} kind="warmup" profile={cachedProfile} />
              )}

              {/* Exercises (all roles — main, accessory, core, rehab — come from Gemini) */}
              <div className="bg-surface-raised border border-border-subtle rounded-2xl p-3.5">
                <div className="text-sm font-bold text-brand uppercase tracking-wide mb-1.5">
                  Exercises
                </div>
                <div className="text-[11px] text-zinc-600 mb-2">
                  Focus: {selectedSession.focus.join(', ')}
                </div>
                {exercises.map((ex, ei) => {
                  const isCompleted = Array.from({ length: ex.sets }, (_, k) => checkedSets[`${ei}-${k}`]).every(
                    Boolean,
                  )
                  return (
                    <div key={`${ex.library_id}-${ei}`} className={`py-2.5 ${ei > 0 ? 'border-t border-zinc-800/50' : ''}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className={`text-[13px] font-semibold ${isCompleted ? 'text-zinc-500 line-through' : ''}`}>
                              {ex.name}
                            </div>
                            <button
                              type="button"
                              onClick={() => setSwapIndex(ei)}
                              className="p-1 rounded-md text-zinc-500 hover:text-brand active:scale-90 transition-colors"
                              aria-label={`Swap ${ex.name}`}
                              title="Swap this exercise"
                            >
                              <RefreshCw size={12} />
                            </button>
                          </div>
                          <div className="text-[11px] text-zinc-600">
                            {ex.sets}×{ex.reps} @RIR {ex.rir} · {ex.rest_seconds}s rest · {ex.role}
                          </div>
                          {ex.notes && (
                            <div className="text-[11px] text-zinc-500 mt-0.5 italic">{ex.notes}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {ex.library_id in lastWeights && (
                            <span className="text-[10px] text-zinc-600 ml-1">
                              last: {lastWeights[ex.library_id]}lb
                            </span>
                          )}
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="lbs"
                            value={weights[ex.library_id] || ''}
                            onChange={e =>
                              setWeights(prev => ({ ...prev, [ex.library_id]: Number(e.target.value) }))
                            }
                            className="w-14 text-center text-xs bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 text-white placeholder-zinc-600"
                          />
                        </div>
                      </div>
                      {/* Set buttons */}
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: ex.sets }, (_, k) => (
                          <button
                            key={k}
                            onClick={() => toggleSet(ei, k)}
                            className={`flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all active:scale-90 ${
                              checkedSets[`${ei}-${k}`]
                                ? 'bg-brand text-white'
                                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                            }`}
                          >
                            {checkedSets[`${ei}-${k}`] ? <Check size={14} /> : k + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => startTimer(ex.rest_seconds, 'Rest', 'rest')}
                          className="h-8 px-2 rounded-lg bg-zinc-800 text-zinc-500 border border-zinc-700 active:scale-90"
                        >
                          <Timer size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Cardio + cool-down slots (auto-generate on first view) */}
              {cachedProfile && (
                <>
                  <RoutineSlot session={selectedSession} kind="cardio" profile={cachedProfile} />
                  <RoutineSlot session={selectedSession} kind="cooldown" profile={cachedProfile} />
                </>
              )}

              {/* Sleep reminder */}
              <div className="flex items-center gap-3 bg-purple-soft border border-purple-900/30 rounded-2xl px-3.5 py-3">
                <Moon size={18} className="text-purple-300 shrink-0" />
                <div className="text-[13px] text-purple-300">
                  <strong>Sleep is key!</strong> Aim for 7-9 hours.
                </div>
              </div>
            </>
          ) : (
            // Rest-day card. Engine doesn't currently generate recovery
            // content (deferred); this is a simple placeholder.
            <div className="bg-surface-raised border border-border-subtle rounded-2xl p-5 text-center">
              <div className="text-4xl mb-2">🛌</div>
              <div className="text-lg font-bold text-zinc-200">Rest day</div>
              <div className="text-sm text-zinc-500 mt-1">Recovery + mobility</div>
              {/* TODO(2P.x): generate a recovery routine for rest days */}
            </div>
          )}
        </div>
      </div>

      {/* Timer overlay */}
      {timer && (
        <TimerOverlay
          seconds={timer.seconds}
          label={timer.label}
          type={timer.type}
          onClose={() => setTimer(null)}
        />
      )}

      {/* Swap sheet */}
      {swapIndex != null && selectedSession && selectedSession.exercises[swapIndex] && (
        <SwapSheet
          open
          currentExercise={selectedSession.exercises[swapIndex]}
          onDismiss={() => setSwapIndex(null)}
          onAccept={handleSwapAccept}
          onRequest={handleSwapRequest}
        />
      )}
    </div>
  )
}
