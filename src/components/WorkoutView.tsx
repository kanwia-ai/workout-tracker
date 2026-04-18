import { useState, useEffect, useCallback, useMemo, useRef, type CSSProperties } from 'react'
import { LogOut, Flame, Plus, BarChart3, Timer, Loader2, Moon, RefreshCw, Info, ChevronDown } from 'lucide-react'
import { ProgressBar } from './ProgressBar'
import { SessionBar } from './SessionBar'
import { TimerOverlay } from './TimerOverlay'
import { DayStrip } from './DayStrip'
import { RoutineSlot } from './RoutineSlot'
import { ExerciseInfoSheet } from './ExerciseInfoSheet'
import { Lumo, type LumoState } from './Lumo'
import { ParticleBurst } from './ParticleBurst'
import { PRCelebration } from './PRCelebration'
import { RestBanner } from './RestBanner'
import { useSession } from '../hooks/useSession'
import { usePlan } from '../hooks/usePlan'
import { getToday } from '../lib/planSelectors'
import { saveSession, saveLastWeight, updatePR, loadLastWeights, loadPRs } from '../lib/persistence'
import { loadProfileLocal } from '../lib/profileRepo'
import { generatePlan } from '../lib/planGen'
import { requestSwap, applySwap, type SwapReason } from '../lib/swap'
import { SwapSheet } from './SwapSheet'
import { getCopy, DEFAULT_CHEEK, type CheekLevel } from '../lib/copy'
import type { TimerState, SessionPhase } from '../types'
import type { PlannedSession, PlannedExercise } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'

// ─── Manual browser verification (not automated) ─────────────────────────
// 1. Load app → DayStrip shows 7 days, today is highlighted.
// 2. Today's session renders below the strip.
// 3. Tap Wednesday → Wed's session renders (or the rest card if Wed is rest).
// 4. Reload the page → selectedDow persists (Wednesday stays selected).
// 5. On rest days, a Lumo sleepy-state rest card renders where the session
//    content used to be (engine doesn't generate rest content yet — deferred).
// 6. Per-set weight expand (2P.12): tap chevron next to weight input →
//    row of N small Set 1/Set 2/... inputs appears. Typing in any input
//    disables the single-weight input and makes it display the max value.
//    Collapsing the caret hides the per-set inputs but preserves the data.
//    Reload → per-set values persist per session.
// 7. (P3.B3) Tapping a set-complete circle: fills the circle, fires a
//    particle burst, 10ms haptic (if supported), shows a rest banner for
//    the exercise's rest_seconds, and surfaces the PR celebration when
//    the logged weight beats the stored PR. Lumo state reflects all of
//    the above (thinking → cheer → flex during rest → celebrate at 100%).
// ─────────────────────────────────────────────────────────────────────────

// ─── localStorage keys ────────────────────────────────────────────────────
// Selection semantics moved from session id (Phase 1) to day-of-week
// (0-6, Mon=0). The old key is intentionally left alone — no cleanup — so
// users with Phase-1 state just fall back to today's dow on first load.
const SELECTED_DOW_KEY = 'workout-tracker:selected-dow'
const HAS_USED_KEY = 'workout-tracker:has-used'
const CHECKED_SETS_KEY = (sessionId: string) => `workout-tracker:checked-sets:${sessionId}`
const WEIGHTS_KEY = (sessionId: string) => `workout-tracker:weights:${sessionId}`
// Per-set weights (Task 2P.12). Outer key = ex.library_id; inner array
// indexed 0..sets-1. Stored alongside the single weight value and treated
// as the source of truth when ANY entry is non-zero.
const PER_SET_WEIGHTS_KEY = (sessionId: string) => `workout-tracker:per-set-weights:${sessionId}`

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

// Resolve the cheekiness level for microcopy. We read it from the
// `data-cheek` attribute the useTweaks hook may set on <html>, falling back
// to the library default (2). Keeps WorkoutView unaware of the Tweaks
// context plumbing while still honoring host live-edits.
function readCheekLevel(): CheekLevel {
  if (typeof document === 'undefined') return DEFAULT_CHEEK
  const raw = document.documentElement.getAttribute('data-cheek')
  const n = raw == null ? NaN : Number(raw)
  if (n === 0 || n === 1 || n === 2) return n as CheekLevel
  return DEFAULT_CHEEK
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
  const [prs, setPrs] = useState<Record<string, number>>({})
  const [checkedSets, setCheckedSets] = useState<Record<string, boolean>>(() =>
    selectedSessionKey
      ? loadStoredRecord<Record<string, boolean>>(CHECKED_SETS_KEY(selectedSessionKey)) || {}
      : {},
  )
  // Per-set weights: Record<ex.library_id, number[]>. Persists to localStorage
  // under PER_SET_WEIGHTS_KEY(sessionId). When any entry is non-zero, the
  // single-weight input is disabled and shows the max per-set value.
  const [perSetWeights, setPerSetWeights] = useState<Record<string, number[]>>(() =>
    selectedSessionKey
      ? loadStoredRecord<Record<string, number[]>>(PER_SET_WEIGHTS_KEY(selectedSessionKey)) || {}
      : {},
  )
  // Which exercise rows have the per-set panel expanded (keyed by library_id).
  // Not persisted — always starts collapsed on session load.
  const [perSetExpanded, setPerSetExpanded] = useState<Record<string, boolean>>({})
  const [timer, setTimer] = useState<TimerState | null>(null)
  const [hasUsed, setHasUsed] = useState<boolean>(() => localStorage.getItem(HAS_USED_KEY) === 'true')
  const hydratedForRef = useRef<string | null>(selectedSessionKey)
  // Retry state for the "No plan yet" fallback. Lets a user whose
  // last generatePlan failed trigger a fresh generation from the
  // profile they've already persisted locally.
  const [retryingPlan, setRetryingPlan] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)

  // ─── Lumo / celebration / rest ──────────────────────────────────────────
  // Inline rest banner state; hides the legacy TimerOverlay for auto-triggered
  // rest while still allowing manual "start timer" taps to use it.
  interface RestState {
    seconds: number
    startedAt: number
    exerciseName: string
  }
  const [restState, setRestState] = useState<RestState | null>(null)
  // Particle burst trigger — bumping this number fires a fresh burst.
  const [particleTrigger, setParticleTrigger] = useState(0)
  // PR celebration payload (null = hidden).
  interface PRPayload {
    exerciseName: string
    oldValue: string
    newValue: string
  }
  const [prPayload, setPrPayload] = useState<PRPayload | null>(null)
  const cheekLevel = readCheekLevel()

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
  const [infoLibraryId, setInfoLibraryId] = useState<string | null>(null)

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
      setPerSetWeights({})
      setPerSetExpanded({})
      setRestState(null)
      return
    }
    if (hydratedForRef.current === selectedSessionKey) return
    const savedChecked = loadStoredRecord<Record<string, boolean>>(CHECKED_SETS_KEY(selectedSessionKey)) || {}
    const savedWeights = loadStoredRecord<Record<string, number>>(WEIGHTS_KEY(selectedSessionKey)) || {}
    const savedPerSet =
      loadStoredRecord<Record<string, number[]>>(PER_SET_WEIGHTS_KEY(selectedSessionKey)) || {}
    setCheckedSets(savedChecked)
    setWeights(savedWeights)
    setPerSetWeights(savedPerSet)
    setPerSetExpanded({})
    setRestState(null)
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

  useEffect(() => {
    if (!selectedSessionKey || hydratedForRef.current !== selectedSessionKey) return
    localStorage.setItem(PER_SET_WEIGHTS_KEY(selectedSessionKey), JSON.stringify(perSetWeights))
  }, [selectedSessionKey, perSetWeights])

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

  // Lumo state derived from session progress + rest. The plan-loading and
  // rest-day branches early-return before this computation runs.
  const lumoSessionState: LumoState = restState
    ? 'flex'
    : doneSets === 0
      ? 'cheer'
      : doneSets >= totalSets && totalSets > 0
        ? 'celebrate'
        : 'cheer'

  // Effective per-exercise working weight: prefer per-set max when any entry
  // is non-zero, else fall back to the single weight input. Used for PR
  // detection on set-complete.
  function effectiveWeight(ex: PlannedExercise): number {
    const perSetArr = perSetWeights[ex.library_id] ?? []
    const perSetMax = perSetArr.reduce((m, v) => (v > m ? v : m), 0)
    if (perSetMax > 0) return perSetMax
    return weights[ex.library_id] || 0
  }

  const toggleSet = (exerciseIdx: number, setIdx: number) => {
    const key = `${exerciseIdx}-${setIdx}`
    const wasDone = !!checkedSets[key]
    setCheckedSets(prev => ({ ...prev, [key]: !wasDone }))
    if (wasDone) return // untoggle — don't fire side-effects

    const ex = exercises[exerciseIdx]
    if (!ex) return

    // Haptic
    try {
      navigator.vibrate?.(10)
    } catch {
      // vibrate can throw in some privacy modes; safe to swallow
    }

    // Fire particle burst
    setParticleTrigger(t => t + 1)

    // Trigger inline rest banner. Zero rest on an exercise skips the banner.
    if (ex.rest_seconds > 0) {
      setRestState({
        seconds: ex.rest_seconds,
        startedAt: Date.now(),
        exerciseName: ex.name,
      })
    }

    // PR detection. Compare the exercise's effective working weight against
    // the stored PR. The actual supabase upsert happens on handleEndSession
    // (updatePR), we just surface the celebration modal immediately so the
    // user gets the "ok, menace" moment at the right time.
    const w = effectiveWeight(ex)
    const prev = prs[ex.library_id] ?? 0
    if (w > 0 && w > prev) {
      // Optimistically bump the local PR map so consecutive sets on the same
      // exercise at the same weight don't re-fire the modal.
      setPrs(prevPrs => ({ ...prevPrs, [ex.library_id]: w }))
      setPrPayload({
        exerciseName: ex.name,
        oldValue: prev > 0 ? `${prev} lb` : '—',
        newValue: `${w} lb`,
      })
    }
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
    setRestState(null)
    localStorage.removeItem(CHECKED_SETS_KEY(finishedSessionId))
    localStorage.removeItem(WEIGHTS_KEY(finishedSessionId))
    localStorage.removeItem(PER_SET_WEIGHTS_KEY(finishedSessionId))

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

    // Merge single-weight + per-set-max so per-set data is persisted for
    // last-weight/PR tracking even when the single input is empty.
    const effectiveWeights: Record<string, number> = { ...weights }
    for (const [exerciseId, arr] of Object.entries(perSetWeights)) {
      const max = arr.reduce((m, v) => (v > m ? v : m), 0)
      if (max > 0) effectiveWeights[exerciseId] = max
    }
    for (const [exerciseId, weight] of Object.entries(effectiveWeights)) {
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
    setPerSetWeights({})
    setPerSetExpanded({})
    clearSession()
  }, [
    session,
    selectedSession,
    userId,
    weights,
    perSetWeights,
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
        <h1
          className="text-[22px] font-extrabold tracking-tight"
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontStyle: 'italic',
            color: 'var(--lumo-text)',
            letterSpacing: '-0.01em',
          }}
        >
          My Training Plan
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--lumo-text-ter)' }}>
          {profile?.display_name ? `Hey ${profile.display_name}` : 'Your adaptive program'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {(profile?.streak ?? 0) > 0 && (
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
            style={{
              background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)',
            }}
          >
            <Flame size={14} style={{ color: 'var(--brand)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>
              {profile?.streak}
            </span>
          </div>
        )}
        <button
          onClick={onNavigateProgress}
          className="p-2 rounded-lg active:scale-95 transition-all"
          style={{ color: 'var(--lumo-text-ter)' }}
          title="View progress"
        >
          <BarChart3 size={16} />
        </button>
        <button
          onClick={onNavigateToCapture}
          className="p-2 rounded-lg active:scale-95 transition-all"
          style={{ color: 'var(--brand)' }}
          title="Add exercise from social media"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={onSignOut}
          className="p-2 rounded-lg active:scale-95 transition-all"
          style={{ color: 'var(--lumo-text-ter)' }}
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
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ background: 'var(--lumo-bg)', color: 'var(--lumo-text)' }}
      >
        <Lumo state="thinking" size={72} />
        <div
          className="text-sm"
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontStyle: 'italic',
            color: 'var(--lumo-text-sec)',
          }}
        >
          building your plan…
        </div>
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  // No plan yet — this happens when the user onboarded but generation
  // failed (or after wiping IndexedDB while keeping Supabase). Offer a
  // Retry that pulls the persisted profile and regenerates.
  if (!plan) {
    return (
      <div
        className="min-h-screen font-[system-ui,-apple-system,'Segoe_UI',sans-serif]"
        style={{ background: 'var(--lumo-bg)', color: 'var(--lumo-text)' }}
      >
        <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">
          {Header}
          <div
            className="py-10 rounded-2xl mt-5 flex flex-col items-center gap-3"
            style={{
              background: 'var(--lumo-raised)',
              border: '1px solid var(--lumo-border)',
            }}
          >
            <Lumo state="sad" size={80} />
            <div className="text-xl font-bold" style={{ color: 'var(--lumo-text)' }}>
              no plan yet
            </div>
            <div
              className="text-sm mt-1 px-6 mb-2 text-center"
              style={{
                color: 'var(--lumo-text-sec)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
              }}
            >
              your profile's saved. let's rebuild your block.
            </div>
            <button
              onClick={handleRetryPlan}
              disabled={retryingPlan}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold disabled:opacity-50"
              style={{ background: 'var(--brand)', color: '#fff' }}
            >
              {retryingPlan ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <RefreshCw size={16} /> Generate plan
                </>
              )}
            </button>
            {retryError && (
              <div className="text-sm mt-2" style={{ color: '#f87171' }}>
                {retryError}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Lumo preamble bubble (session vs rest vs loading inside body) ─────
  const isRestDay = !selectedSession
  const preambleLumoState: LumoState = isRestDay ? 'sleepy' : lumoSessionState
  const preambleText: string = isRestDay
    ? 'rest day. sleeping in counts.'
    : restState
      ? getCopy('restFlex', cheekLevel)
      : doneSets >= totalSets && totalSets > 0
        ? 'you finished. flop backwards with me.'
        : doneSets > 0
          ? "go go go. you're doing great."
          : (() => {
              const hour = new Date().getHours()
              const greet = hour < 12 ? 'greetMorning' : 'greetAfternoon'
              const name = profile?.display_name || 'you'
              return getCopy(greet, cheekLevel, { name })
            })()

  const preamble = (
    <div
      className="flex items-end gap-2.5 mt-2"
      data-testid="workout-preamble"
    >
      <Lumo state={preambleLumoState} size={64} />
      <div
        className="flex-1 px-3 py-2.5 text-[13px] leading-snug"
        style={{
          background: 'var(--lumo-raised)',
          border: '1px solid var(--lumo-border)',
          borderRadius: 16,
          borderBottomLeftRadius: 4,
          color: 'var(--lumo-text)',
          fontFamily: "'Fraunces', Georgia, serif",
          fontStyle: 'italic',
        }}
      >
        {preambleText}
      </div>
    </div>
  )

  // ─── Render: strip + (session | rest card) ──────────────────────────────
  return (
    <div
      className="min-h-screen font-[system-ui,-apple-system,'Segoe_UI',sans-serif]"
      style={{ background: 'var(--lumo-bg)', color: 'var(--lumo-text)' }}
    >
      <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">
        {Header}

        {preamble}

        {/* 7-day strip (replaces the Phase-1 session chip row) */}
        <div className="mt-4">
          <DayStrip
            plan={plan}
            weekNumber={currentWeek}
            todayDow={todayDow()}
            selectedDow={selectedDow}
            onSelect={setSelectedDow}
            weekStartDate={weekStartDate}
          />
        </div>

        {/* Week label + mesocycle progress */}
        <div className="flex items-center gap-2 mt-3">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
            style={{
              background: 'var(--lumo-raised)',
              border: '1px solid var(--lumo-border)',
              color: 'var(--lumo-text-sec)',
            }}
          >
            Week {currentWeek} of {plan.length_weeks}
          </div>
          <span className="text-[11px]" style={{ color: 'var(--lumo-text-ter)' }}>
            {plan.sessions.length} sessions this block
          </span>
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

              {/* Inline rest banner — fired auto on set-complete */}
              {restState && (
                <RestBanner
                  seconds={restState.seconds}
                  startedAt={restState.startedAt}
                  message={restState.exerciseName}
                  onSkip={() => setRestState(null)}
                  onDone={() => setRestState(null)}
                />
              )}

              {/* Session preamble — surfaces engine's rationale for placing this session today */}
              {selectedSession.rationale && (
                <div
                  className="rounded-2xl px-4 py-3"
                  style={{
                    background: 'color-mix(in srgb, var(--brand) 10%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--brand) 22%, transparent)',
                  }}
                >
                  <div
                    className="text-xs uppercase tracking-wide mb-1"
                    style={{ color: 'var(--brand)' }}
                  >
                    📍 Today's focus
                  </div>
                  <div className="text-sm leading-snug" style={{ color: 'var(--lumo-text)' }}>
                    {selectedSession.rationale}
                  </div>
                </div>
              )}

              {/* Warmup slot (auto-generates on first view, locked until regenerate) */}
              {cachedProfile && (
                <RoutineSlot session={selectedSession} kind="warmup" profile={cachedProfile} />
              )}

              {/* Exercises (all roles — main, accessory, core, rehab — come from Gemini) */}
              <div
                className="rounded-2xl p-3.5"
                style={{
                  background: 'var(--lumo-raised)',
                  border: '1px solid var(--lumo-border)',
                }}
                data-testid="exercises-card"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div
                    className="text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: 'var(--lumo-text-ter)', letterSpacing: '0.14em' }}
                  >
                    the work
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--lumo-text-ter)' }}>
                    tap a circle when the set's done
                  </div>
                </div>
                <div className="text-[11px] mb-2" style={{ color: 'var(--lumo-text-ter)' }}>
                  Focus: {selectedSession.focus.join(', ')}
                </div>
                {exercises.map((ex, ei) => {
                  const isCompleted = Array.from({ length: ex.sets }, (_, k) => checkedSets[`${ei}-${k}`]).every(
                    Boolean,
                  )
                  const perSetArr = perSetWeights[ex.library_id] ?? []
                  const perSetMax = perSetArr.reduce((m, v) => (v > m ? v : m), 0)
                  const perSetActive = perSetMax > 0
                  const expanded = !!perSetExpanded[ex.library_id]
                  const lastW = lastWeights[ex.library_id]
                  return (
                    <div
                      key={`${ex.library_id}-${ei}`}
                      className="py-2.5"
                      style={{
                        borderTop: ei > 0 ? '1px solid var(--lumo-border)' : 'none',
                        opacity: isCompleted ? 0.65 : 1,
                        transition: 'opacity 300ms',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="text-[13px] font-semibold"
                              style={{
                                color: 'var(--lumo-text)',
                                textDecoration: isCompleted ? 'line-through' : 'none',
                                textDecorationColor: 'var(--lumo-text-ter)',
                              }}
                            >
                              {ex.name}
                            </div>
                            <button
                              type="button"
                              onClick={() => setInfoLibraryId(ex.library_id)}
                              className="p-1.5 rounded-md active:scale-90 transition-colors"
                              style={{ color: 'var(--lumo-text-ter)' }}
                              aria-label={`Info about ${ex.name}`}
                              title="Exercise info"
                            >
                              <Info size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSwapIndex(ei)}
                              className="p-1 rounded-md active:scale-90 transition-colors"
                              style={{ color: 'var(--lumo-text-ter)' }}
                              aria-label={`Swap ${ex.name}`}
                              title="Swap this exercise"
                            >
                              <RefreshCw size={12} />
                            </button>
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--lumo-text-ter)' }}>
                            {ex.sets}×{ex.reps} @RIR {ex.rir} · {ex.rest_seconds}s rest · {ex.role}
                          </div>
                          {ex.notes && (
                            <div
                              className="text-[11px] mt-0.5 italic"
                              style={{
                                color: 'var(--lumo-text-sec)',
                                fontFamily: "'Fraunces', Georgia, serif",
                              }}
                            >
                              {ex.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {lastW !== undefined && (
                            <span className="text-[10px] ml-1" style={{ color: 'var(--lumo-text-ter)' }}>
                              last: {lastW}lb
                            </span>
                          )}
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="lbs"
                            // When per-set weights are active, display the max and disable
                            // the single input to prevent drift between the two stores.
                            value={perSetActive ? perSetMax : weights[ex.library_id] || ''}
                            disabled={perSetActive}
                            onChange={e =>
                              setWeights(prev => ({ ...prev, [ex.library_id]: Number(e.target.value) }))
                            }
                            className="w-14 text-center text-xs rounded-lg py-1.5 tabular-nums disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                              background: 'var(--lumo-input-bg)',
                              border: '1px solid var(--lumo-border-strong)',
                              color: 'var(--lumo-text)',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setPerSetExpanded(prev => ({ ...prev, [ex.library_id]: !prev[ex.library_id] }))
                            }
                            className="p-1 rounded-md active:scale-90 transition-transform"
                            style={{ color: 'var(--lumo-text-ter)' }}
                            aria-label={expanded ? 'Collapse per-set weights' : 'Expand per-set weights'}
                            aria-expanded={expanded}
                            title="Per-set weights"
                          >
                            <ChevronDown
                              size={14}
                              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </div>
                      </div>
                      {/* Per-set weight inputs (expand on caret tap). Collapsing keeps
                          stored data so toggling is non-destructive. */}
                      {expanded && (
                        <div className="mb-1.5 flex items-end gap-1 overflow-x-auto">
                          {Array.from({ length: ex.sets }, (_, k) => (
                            <div key={k} className="flex flex-col items-center shrink-0">
                              <div
                                className="text-[9px] uppercase tracking-wide mb-0.5"
                                style={{ color: 'var(--lumo-text-ter)' }}
                              >
                                Set {k + 1}
                              </div>
                              <input
                                type="number"
                                inputMode="numeric"
                                placeholder="lb"
                                value={perSetArr[k] || ''}
                                onChange={e => {
                                  const raw = e.target.value
                                  const next = raw === '' ? 0 : Number(raw)
                                  setPerSetWeights(prev => {
                                    const cur = prev[ex.library_id] ?? []
                                    const arr = cur.slice()
                                    while (arr.length < ex.sets) arr.push(0)
                                    arr[k] = next
                                    return { ...prev, [ex.library_id]: arr }
                                  })
                                }}
                                className="w-10 text-center text-xs rounded-lg py-1 tabular-nums"
                                style={{
                                  background: 'var(--lumo-input-bg)',
                                  border: '1px solid var(--lumo-border-strong)',
                                  color: 'var(--lumo-text)',
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Set circles */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {Array.from({ length: ex.sets }, (_, k) => {
                          const done = !!checkedSets[`${ei}-${k}`]
                          return (
                            <SetCircle
                              key={k}
                              done={done}
                              label={k + 1}
                              exerciseName={ex.name}
                              setIndex={k}
                              onTap={() => toggleSet(ei, k)}
                            />
                          )
                        })}
                        <button
                          onClick={() => startTimer(ex.rest_seconds, 'Rest', 'rest')}
                          className="h-9 px-2.5 rounded-lg active:scale-90 flex items-center gap-1"
                          style={{
                            background: 'var(--lumo-input-bg)',
                            border: '1px solid var(--lumo-border-strong)',
                            color: 'var(--lumo-text-ter)',
                          }}
                          aria-label={`Open rest timer for ${ex.name}`}
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
              <div
                className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
                style={{
                  background: 'color-mix(in srgb, var(--accent-plum) 15%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent-plum) 30%, transparent)',
                  color: 'var(--accent-plum)',
                }}
              >
                <Moon size={18} className="shrink-0" />
                <div className="text-[13px]">
                  <strong>Sleep is key!</strong> Aim for 7-9 hours.
                </div>
              </div>
            </>
          ) : (
            // Rest-day card. Engine doesn't currently generate recovery
            // content (deferred); this is the Lumo-themed placeholder.
            <div
              className="rounded-2xl p-5 flex items-center gap-4"
              style={{
                background:
                  'linear-gradient(160deg, color-mix(in srgb, var(--accent-plum) 14%, transparent), var(--lumo-raised))',
                border: '1px solid color-mix(in srgb, var(--accent-plum) 25%, transparent)',
              }}
              data-testid="rest-day-card"
            >
              <Lumo state="sleepy" size={64} />
              <div>
                <div className="text-sm font-bold" style={{ color: 'var(--accent-plum)' }}>
                  rest day
                </div>
                <div
                  className="text-[13px] mt-1"
                  style={{
                    color: 'var(--lumo-text-sec)',
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontStyle: 'italic',
                  }}
                >
                  sleeping in is training too.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global particle burst overlay — anchored near the top-right. The
          radial animation bounces outward so exact anchoring matters less
          than that it fires at all. */}
      <ParticleBurstAnchor trigger={particleTrigger} />

      {/* Timer overlay (manual "Timer" button on each exercise row) */}
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

      {/* Exercise info overlay */}
      <ExerciseInfoSheet libraryId={infoLibraryId} onClose={() => setInfoLibraryId(null)} />

      {/* PR celebration */}
      {prPayload && (
        <PRCelebration
          open
          exerciseName={prPayload.exerciseName}
          oldValue={prPayload.oldValue}
          newValue={prPayload.newValue}
          onClose={() => setPrPayload(null)}
        />
      )}
    </div>
  )
}

// ─── SetCircle: circular tap-to-complete set button ────────────────────────
interface SetCircleProps {
  done: boolean
  label: number
  exerciseName: string
  setIndex: number
  onTap: () => void
}

const SET_CIRCLE_KEYFRAMES = `
@keyframes setcircle-pop {
  0%   { transform: scale(1); }
  35%  { transform: scale(1.2); }
  55%  { transform: scale(0.94); }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .setcircle-pop { animation: none !important; }
}
`

function SetCircle({ done, label, exerciseName, setIndex, onTap }: SetCircleProps) {
  const [pressed, setPressed] = useState(false)
  const handle = () => {
    onTap()
    if (!done) {
      setPressed(true)
      window.setTimeout(() => setPressed(false), 500)
    }
  }

  const baseStyle: CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: done ? 'var(--brand)' : 'var(--lumo-input-bg)',
    border: done
      ? '2px solid var(--brand)'
      : '2px solid var(--lumo-border-strong)',
    color: done ? '#fff' : 'var(--lumo-text-ter)',
    fontSize: done ? 18 : 14,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: done
      ? '0 6px 18px color-mix(in srgb, var(--brand) 40%, transparent)'
      : 'none',
    transition: 'background 200ms, border-color 200ms, color 200ms',
    fontVariantNumeric: 'tabular-nums',
    padding: 0,
    cursor: 'pointer',
  }
  return (
    <button
      type="button"
      onClick={handle}
      data-testid={`set-circle-${setIndex}`}
      data-set-done={done ? 'true' : 'false'}
      aria-label={`${done ? 'Unmark' : 'Mark'} set ${label} of ${exerciseName} as complete`}
      aria-pressed={done}
      className={pressed ? 'setcircle-pop' : undefined}
      style={{
        ...baseStyle,
        animation: pressed ? 'setcircle-pop 500ms cubic-bezier(.34,1.56,.64,1)' : 'none',
      }}
    >
      <style>{SET_CIRCLE_KEYFRAMES}</style>
      {done ? (
        <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 13 L10 17 L18 8"
            stroke="#fff"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        label
      )}
    </button>
  )
}

// ─── ParticleBurstAnchor: positioned pop host ──────────────────────────────
// ParticleBurst is absolutely positioned — to fire it from an app-level spot
// (without pinning to a specific set circle's rect) we give it its own fixed
// anchor in the top-right of the screen. The burst itself is radial so the
// anchor location is intentionally broad; it just has to be "visible".
interface ParticleBurstAnchorProps {
  trigger: number
}

function ParticleBurstAnchor({ trigger }: ParticleBurstAnchorProps) {
  if (trigger === 0) return null
  return (
    <div
      aria-hidden="true"
      data-testid="workout-particle-anchor"
      style={{
        position: 'fixed',
        top: '30%',
        right: 48,
        width: 0,
        height: 0,
        pointerEvents: 'none',
        zIndex: 40,
      }}
    >
      <ParticleBurst key={trigger} trigger={trigger} color="var(--brand)" />
    </div>
  )
}
