import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react'
import {
  Loader2,
  Moon,
  RefreshCw,
  Info,
  ChevronDown,
} from 'lucide-react'
import { SessionBar } from './SessionBar'
import { TimerOverlay } from './TimerOverlay'
import { RoutineSlot } from './RoutineSlot'
import { ExerciseInfoSheet } from './ExerciseInfoSheet'
import { Lumo, type LumoState } from './Lumo'
import { ParticleBurst } from './ParticleBurst'
import { PRCelebration } from './PRCelebration'
import { RestBanner } from './RestBanner'
import { useSession } from '../hooks/useSession'
import { usePlan } from '../hooks/usePlan'
import { getToday } from '../lib/planSelectors'
import {
  saveSession,
  saveLastWeight,
  updatePR,
  loadLastWeights,
  loadPRs,
} from '../lib/persistence'
import { loadProfileLocal } from '../lib/profileRepo'
import { generatePlan } from '../lib/planGen'
import { requestSwap, applySwap, type SwapReason } from '../lib/swap'
import { SwapSheet } from './SwapSheet'
import { getCopy, pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../lib/copy'
import type { TimerState, SessionPhase } from '../types'
import type { PlannedSession, PlannedExercise } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'

// ─── Design reference ────────────────────────────────────────────────────
// Layout ported from /tmp/workout-app-design/screens.jsx → SessionScreen.
// Elements preserved verbatim in spirit:
//   - Lumo + speech bubble at the top (Fraunces italic, left tail)
//   - ProgressStrip ("today's work") showing done / total sets + a gradient bar
//   - Inline RestBanner that auto-opens on set-complete
//   - LiftCards with circular set buttons (54px) — not pill chips
//   - Per-tap Lumo reaction bubble, rotating through a large cheeky pool
//   - PR celebration triggered on set-complete when effective weight beats
//     the stored PR
//
// What's new vs. screens.jsx: WARMUP SETS (R3 Tier A) render as distinct,
// lighter-opacity rows BEFORE the working-set circles. Compound lifts get 3
// ramp sets (50% × 10, 70% × 5, 85% × 3), accessory lifts get 1 light set.
// Rehab / mobility roles skip warmups entirely.
//
// Also preserved (not in the mock): Dexie-backed persistence, Gemini
// plan generation, swap flow (SwapSheet), info overlay (ExerciseInfoSheet),
// per-set expand chevron, routine slots (warmup/cardio/cooldown),
// 7-day DayStrip.
// ─────────────────────────────────────────────────────────────────────────

// ─── localStorage keys ───────────────────────────────────────────────────
const SELECTED_DOW_KEY = 'workout-tracker:selected-dow'
const HAS_USED_KEY = 'workout-tracker:has-used'
const CHECKED_SETS_KEY = (sessionId: string) =>
  `workout-tracker:checked-sets:${sessionId}`
const WEIGHTS_KEY = (sessionId: string) =>
  `workout-tracker:weights:${sessionId}`
// Per-set weights. Outer key = ex.library_id; inner array indexed 0..sets-1.
const PER_SET_WEIGHTS_KEY = (sessionId: string) =>
  `workout-tracker:per-set-weights:${sessionId}`
// Warmup checked state. Keyed "ei-wi" (exercise index, warmup index).
const WARMUP_CHECKED_KEY = (sessionId: string) =>
  `workout-tracker:warmup-checked:${sessionId}`

// JS Date.getDay(): 0=Sun..6=Sat. App convention: 0=Mon..6=Sun.
function toAppDow(jsDow: number): number {
  return (jsDow + 6) % 7
}

function todayDow(): number {
  return toAppDow(new Date().getDay())
}

function loadSelectedDow(): number {
  try {
    const raw = localStorage.getItem(SELECTED_DOW_KEY)
    if (raw === null) return todayDow()
    const parsed = JSON.parse(raw)
    if (
      typeof parsed === 'number' &&
      parsed >= 0 &&
      parsed <= 6 &&
      Number.isInteger(parsed)
    ) {
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

type TimeOfDay = 'morning' | 'afternoon' | 'evening'

function timeOfDay(hour: number): TimeOfDay {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

function preambleKey(tod: TimeOfDay): 'preamble_morning' | 'preamble_afternoon' | 'preamble_evening' {
  return tod === 'morning'
    ? 'preamble_morning'
    : tod === 'afternoon'
      ? 'preamble_afternoon'
      : 'preamble_evening'
}


/**
 * Compute the ramp-set rows for an exercise. Pure — safe to call per render.
 *
 * Returns:
 *   - compound:  3 rows at 50/70/85% × 10/5/3 reps
 *   - accessory: 1 row at 60% × 8 reps
 *   - none:      empty array
 *
 * Weights are rounded to the nearest 5 lb for clean plate math. If no working
 * weight is known yet, each row's `weight` is null and the render shows
 * "light" / "easy" instead of a number.
 */

// ─── Props ──────────────────────────────────────────────────────────────

interface WorkoutViewProps {
  userId: string
  profile: {
    display_name: string
    avatar_emoji: string
    streak: number
    knee_flag: boolean
  } | null
  onSignOut: () => void
  onWorkoutComplete: () => void
  onNavigateToCapture: () => void
  onNavigateCardio: () => void
  onNavigateProgress: () => void
  /** Back-to-home from the in-session view. */
  onExitSession?: () => void
}

export function WorkoutView({
  userId,
  profile,
  onWorkoutComplete,
  onNavigateProgress,
  onExitSession,
}: WorkoutViewProps) {
  const { plan, loading } = usePlan(userId)

  // ─── Selected day-of-week — in-session shows today's session only now.
  const [selectedDow] = useState<number>(() => loadSelectedDow())

  const currentWeek = useMemo(() => getToday(plan)?.week_number ?? 1, [plan])

  const weekSessions = useMemo(
    () => (plan ? plan.sessions.filter((s) => s.week_number === currentWeek) : []),
    [plan, currentWeek],
  )

  const selectedSession: PlannedSession | null = useMemo(() => {
    return weekSessions.find((s) => s.day_of_week === selectedDow) ?? null
  }, [weekSessions, selectedDow])

  const selectedSessionKey = selectedSession?.id ?? null

  // ─── Per-session persistence ───────────────────────────────────────────
  const [weights, setWeights] = useState<Record<string, number>>(() =>
    selectedSessionKey
      ? loadStoredRecord<Record<string, number>>(WEIGHTS_KEY(selectedSessionKey)) || {}
      : {},
  )
  const [lastWeights, setLastWeights] = useState<Record<string, number>>({})
  const [prs, setPrs] = useState<Record<string, number>>({})
  const [checkedSets, setCheckedSets] = useState<Record<string, boolean>>(() =>
    selectedSessionKey
      ? loadStoredRecord<Record<string, boolean>>(CHECKED_SETS_KEY(selectedSessionKey)) || {}
      : {},
  )
  const [checkedWarmups, setCheckedWarmups] = useState<Record<string, boolean>>(() =>
    selectedSessionKey
      ? loadStoredRecord<Record<string, boolean>>(WARMUP_CHECKED_KEY(selectedSessionKey)) || {}
      : {},
  )
  const [perSetWeights, setPerSetWeights] = useState<Record<string, number[]>>(() =>
    selectedSessionKey
      ? loadStoredRecord<Record<string, number[]>>(PER_SET_WEIGHTS_KEY(selectedSessionKey)) || {}
      : {},
  )
  const [perSetExpanded, setPerSetExpanded] = useState<Record<string, boolean>>({})
  const [timer, setTimer] = useState<TimerState | null>(null)
  const [hasUsed, setHasUsed] = useState<boolean>(
    () => localStorage.getItem(HAS_USED_KEY) === 'true',
  )
  const hydratedForRef = useRef<string | null>(selectedSessionKey)
  const [retryingPlan, setRetryingPlan] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)

  // ─── Lumo / celebration / rest ─────────────────────────────────────────
  interface RestState {
    seconds: number
    startedAt: number
    exerciseName: string
    encouragement: string
  }
  const [restState, setRestState] = useState<RestState | null>(null)
  const [burstKey, setBurstKey] = useState<string | null>(null)
  const [burstTrigger, setBurstTrigger] = useState(0)
  // Warmup bursts are smaller (count=4) than working-set bursts (count=8).
  const [burstIsWarmup, setBurstIsWarmup] = useState(false)
  interface PRPayload {
    exerciseName: string
    oldValue: string
    newValue: string
  }
  const [prPayload, setPrPayload] = useState<PRPayload | null>(null)
  const cheekLevel = readCheekLevel()

  // Per-set Lumo reaction bubble state.
  interface ReactionState {
    text: string
    isPR: boolean
    id: number
  }
  const [reaction, setReaction] = useState<ReactionState | null>(null)
  const reactionTimeoutRef = useRef<number | null>(null)
  // Anti-repeat refs for pool-sampled copy. Each pool gets its own ref.
  const lastSetDoneRef = useRef<string | null>(null)
  const lastSetDonePRRef = useRef<string | null>(null)
  const lastRestStartRef = useRef<string | null>(null)
  const lastRestSkipRef = useRef<string | null>(null)
  // Preamble line is picked once per session-mount.
  const preambleRef = useRef<{ sessionId: string | null; text: string } | null>(
    null,
  )

  useEffect(() => {
    return () => {
      if (reactionTimeoutRef.current !== null) {
        window.clearTimeout(reactionTimeoutRef.current)
      }
    }
  }, [])

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

  // ─── Swap state ────────────────────────────────────────────────────────
  const [cachedProfile, setCachedProfile] = useState<UserProgramProfile | null>(null)
  const [swapIndex, setSwapIndex] = useState<number | null>(null)
  const [infoLibraryId, setInfoLibraryId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadProfileLocal(userId)
      .then((p) => {
        if (!cancelled) setCachedProfile(p)
      })
      .catch((err) => {
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
  useEffect(() => {
    if (!selectedSessionKey) {
      hydratedForRef.current = null
      setCheckedSets({})
      setCheckedWarmups({})
      setWeights({})
      setPerSetWeights({})
      setPerSetExpanded({})
      setRestState(null)
      return
    }
    if (hydratedForRef.current === selectedSessionKey) return
    const savedChecked =
      loadStoredRecord<Record<string, boolean>>(CHECKED_SETS_KEY(selectedSessionKey)) || {}
    const savedWarmups =
      loadStoredRecord<Record<string, boolean>>(WARMUP_CHECKED_KEY(selectedSessionKey)) || {}
    const savedWeights =
      loadStoredRecord<Record<string, number>>(WEIGHTS_KEY(selectedSessionKey)) || {}
    const savedPerSet =
      loadStoredRecord<Record<string, number[]>>(PER_SET_WEIGHTS_KEY(selectedSessionKey)) || {}
    setCheckedSets(savedChecked)
    setCheckedWarmups(savedWarmups)
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
    localStorage.setItem(WARMUP_CHECKED_KEY(selectedSessionKey), JSON.stringify(checkedWarmups))
  }, [selectedSessionKey, checkedWarmups])

  useEffect(() => {
    if (!selectedSessionKey || hydratedForRef.current !== selectedSessionKey) return
    localStorage.setItem(WEIGHTS_KEY(selectedSessionKey), JSON.stringify(weights))
  }, [selectedSessionKey, weights])

  useEffect(() => {
    if (!selectedSessionKey || hydratedForRef.current !== selectedSessionKey) return
    localStorage.setItem(PER_SET_WEIGHTS_KEY(selectedSessionKey), JSON.stringify(perSetWeights))
  }, [selectedSessionKey, perSetWeights])

  useEffect(() => {
    if (session && !hasUsed) {
      localStorage.setItem(HAS_USED_KEY, 'true')
      setHasUsed(true)
    }
  }, [session, hasUsed])

  useEffect(() => {
    if (userId) {
      loadLastWeights(userId).then(setLastWeights)
      loadPRs(userId).then(setPrs)
    }
  }, [userId])

  // ─── Derived: session progress ─────────────────────────────────────────
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

  const sessionComplete = totalSets > 0 && doneSets >= totalSets

  function effectiveWeight(ex: PlannedExercise): number {
    const perSetArr = perSetWeights[ex.library_id] ?? []
    const perSetMax = perSetArr.reduce((m, v) => (v > m ? v : m), 0)
    if (perSetMax > 0) return perSetMax
    return weights[ex.library_id] || 0
  }

  const hasAnyPR = Object.values(prs).some((v) => v > 0)

  const preambleText: string = useMemo(() => {
    if (!selectedSession) return ''
    const sid = selectedSession.id + (sessionComplete ? ':complete' : '')
    if (preambleRef.current && preambleRef.current.sessionId === sid) {
      return preambleRef.current.text
    }
    const name = profile?.display_name || 'you'
    if (sessionComplete) {
      const text = pickCopy('setDonePR', cheekLevel)
      preambleRef.current = { sessionId: sid, text }
      return text
    }
    const hour = new Date().getHours()
    const key = preambleKey(timeOfDay(hour))
    const text = pickCopy(key, cheekLevel, undefined, { name })
    preambleRef.current = { sessionId: sid, text }
    return text
  }, [selectedSession, sessionComplete, profile?.display_name, cheekLevel])

  const preambleLumoState: LumoState = useMemo(() => {
    if (!selectedSession) return 'sleepy'
    if (sessionComplete) return 'celebrate'
    if (restState) return 'flex'
    if (doneSets > 0) return 'cheer'
    const hour = new Date().getHours()
    if (hour < 12) return 'cheer'
    if (hasAnyPR) return 'flex'
    return 'thinking'
  }, [selectedSession, sessionComplete, restState, doneSets, hasAnyPR])

  // Fire a Lumo reaction bubble for ~2s.
  const fireReaction = useCallback((text: string, isPR: boolean) => {
    if (reactionTimeoutRef.current !== null) {
      window.clearTimeout(reactionTimeoutRef.current)
    }
    const id = Date.now()
    setReaction({ text, isPR, id })
    reactionTimeoutRef.current = window.setTimeout(() => {
      setReaction((cur) => (cur && cur.id === id ? null : cur))
      reactionTimeoutRef.current = null
    }, 2000)
  }, [])

  // ─── Toggle a WORKING set. Wires haptic + burst + rest + PR + reaction. ──
  const toggleSet = (exerciseIdx: number, setIdx: number) => {
    const key = `${exerciseIdx}-${setIdx}`
    const wasDone = !!checkedSets[key]
    setCheckedSets((prev) => ({ ...prev, [key]: !wasDone }))
    if (wasDone) return

    const ex = exercises[exerciseIdx]
    if (!ex) return

    try {
      navigator.vibrate?.(10)
    } catch {
      // swallow
    }

    setBurstKey(key)
    setBurstIsWarmup(false)
    setBurstTrigger((t) => t + 1)

    if (ex.rest_seconds > 0) {
      setRestState({
        seconds: ex.rest_seconds,
        startedAt: Date.now(),
        exerciseName: ex.name,
        encouragement: pickCopy('restStart', cheekLevel, lastRestStartRef),
      })
    }

    const w = effectiveWeight(ex)
    const prev = prs[ex.library_id] ?? 0
    const beatPR = w > 0 && w > prev

    if (beatPR) {
      setPrs((prevPrs) => ({ ...prevPrs, [ex.library_id]: w }))
      setPrPayload({
        exerciseName: ex.name,
        oldValue: prev > 0 ? `${prev} lb` : '—',
        newValue: `${w} lb`,
      })
      fireReaction(pickCopy('setDonePR', cheekLevel, lastSetDonePRRef), true)
    } else {
      fireReaction(pickCopy('setDone', cheekLevel, lastSetDoneRef), false)
    }
  }


  const handleEndSession = useCallback(async () => {
    if (!session || !selectedSession) {
      endSession()
      return
    }

    const endedSession = { ...session }
    const finishedSessionId = selectedSession.id
    endSession()
    setCheckedSets({})
    setCheckedWarmups({})
    setRestState(null)
    localStorage.removeItem(CHECKED_SETS_KEY(finishedSessionId))
    localStorage.removeItem(WARMUP_CHECKED_KEY(finishedSessionId))
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
      phases: endedSession.phases.map((p) => (p.ended_at ? p : { ...p, ended_at: now })),
      completedSets: doneSets,
      totalSets,
    })

    const effectiveWeights: Record<string, number> = { ...weights }
    for (const [exerciseId, arr] of Object.entries(perSetWeights)) {
      const max = arr.reduce((m, v) => (v > m ? v : m), 0)
      if (max > 0) effectiveWeights[exerciseId] = max
    }
    for (const [exerciseId, weight] of Object.entries(effectiveWeights)) {
      if (weight > 0) {
        const ex = exercises.find((e) => e.library_id === exerciseId)
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

  // ─── Top bar (matches design: back arrow / centered IN SESSION + title / kebab)
  const TopBar = (
    <div className="flex items-center justify-between pt-1 pb-3" data-testid="workout-topbar">
      <button
        onClick={onExitSession}
        aria-label="Back to home"
        className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition"
        style={{
          background: 'var(--lumo-raised)',
          border: '1px solid var(--lumo-border)',
          color: 'var(--lumo-text-sec)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M9 2 L3 7 L9 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className="text-center flex-1 mx-2 min-w-0">
        <div
          className="text-[10px] font-bold uppercase"
          style={{ color: 'var(--lumo-text-ter)', letterSpacing: '0.14em' }}
        >
          {selectedSession ? 'in session' : 'rest day'}
        </div>
        <div
          className="text-[15px] font-bold truncate"
          style={{
            color: 'var(--lumo-text)',
            fontFamily: "'Fraunces', Georgia, serif",
            fontStyle: 'italic',
            letterSpacing: '-0.01em',
            marginTop: 1,
          }}
        >
          {selectedSession?.title ?? 'rest day'}
        </div>
      </div>
      <button
        aria-label="Session menu"
        onClick={onNavigateProgress}
        className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition"
        style={{
          background: 'var(--lumo-raised)',
          border: '1px solid var(--lumo-border)',
          color: 'var(--lumo-text-sec)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <circle cx="3" cy="7" r="1.5" fill="currentColor"/>
          <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
          <circle cx="11" cy="7" r="1.5" fill="currentColor"/>
        </svg>
      </button>
    </div>
  )

  // ── Loading: no plan resolved yet ────────────────────────────────────
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

  // ── No plan yet — Gemini gen failed or Dexie wiped ──────────────────
  if (!plan) {
    return (
      <div
        className="min-h-screen font-[system-ui,-apple-system,'Segoe_UI',sans-serif]"
        style={{ background: 'var(--lumo-bg)', color: 'var(--lumo-text)' }}
      >
        <div className="max-w-lg mx-auto px-4 pb-20 safe-top safe-bottom">
          {TopBar}
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

  // ── Preamble bubble text / Lumo state ────────────────────────────────
  const isRestDay = !selectedSession
  const bubbleText: string = isRestDay
    ? 'rest day. sleeping in counts.'
    : restState
      ? getCopy('restFlex', cheekLevel)
      : preambleText
  const bubbleLumoState: LumoState = isRestDay ? 'sleepy' : preambleLumoState

  const preamble = (
    <div
      className="flex items-end gap-2.5 relative"
      data-testid="workout-preamble"
    >
      <Lumo state={bubbleLumoState} size={64} />
      <div
        className="flex-1 px-3 py-2.5 text-[13px] leading-snug relative"
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
        {bubbleText}
      </div>
      {reaction && (
        <ReactionBubble
          key={reaction.id}
          text={reaction.text}
          isPR={reaction.isPR}
        />
      )}
    </div>
  )

  // ─── Render: session screen ────────────────────────────────────────────
  return (
    <div
      className="min-h-screen font-[system-ui,-apple-system,'Segoe_UI',sans-serif]"
      style={{ background: 'var(--lumo-bg)', color: 'var(--lumo-text)' }}
    >
      <div className="max-w-lg mx-auto px-4 pb-20 safe-top safe-bottom">
        {TopBar}

        {/* Lumo + speech bubble (the real greeting — cheeky, Lumo-voiced) */}
        <div className="mt-2">{preamble}</div>

        {/* ProgressStrip — "today's work" */}
        {selectedSession && (
          <div className="mt-3">
            <ProgressStrip
              done={doneSets}
              total={totalSets}
              title={selectedSession.title}
              estMinutes={selectedSession.estimated_minutes}
            />
          </div>
        )}

        {/* Inline rest banner — fires auto on working-set complete */}
        {restState && (
          <div className="mt-3">
            <RestBanner
              seconds={restState.seconds}
              startedAt={restState.startedAt}
              message={restState.encouragement}
              onSkip={() => {
                setRestState(null)
                fireReaction(
                  pickCopy('restSkipEarly', cheekLevel, lastRestSkipRef),
                  false,
                )
              }}
              onDone={() => setRestState(null)}
            />
          </div>
        )}

        {/* Session content */}
        <div className="mt-3 space-y-2.5">
          {selectedSession ? (
            <>
              {/* Session bar (start / phase / end controls) */}
              <SessionBar
                started_at={session?.started_at || null}
                currentPhase={session?.current_phase || null}
                phases={session?.phases || []}
                onStart={() => startSession(selectedSession.id)}
                onSwitchPhase={(phase: SessionPhase['name']) => switchPhase(phase)}
                onEnd={handleEndSession}
              />

              {/* Warmup routine slot (Gemini-generated mobility bundle) */}
              {cachedProfile && (
                <RoutineSlot session={selectedSession} kind="warmup" profile={cachedProfile} />
              )}

              {/* ── THE WORK: LiftCards, one per exercise ─────────────── */}
              <div
                className="flex items-center justify-between mt-3 mb-1 px-1.5"
                data-testid="exercises-heading"
              >
                <div
                  className="text-[11px] font-bold uppercase"
                  style={{ color: 'var(--lumo-text-ter)', letterSpacing: '0.14em' }}
                >
                  the work
                </div>
                <div className="text-[10px]" style={{ color: 'var(--lumo-text-ter)' }}>
                  tap a circle when the set's done
                </div>
              </div>

              <div data-testid="exercises-card" className="space-y-2.5">
                {exercises.map((ex, ei) => {
                  const workingDone = Array.from({ length: ex.sets }, (_, k) =>
                    checkedSets[`${ei}-${k}`],
                  ).every(Boolean)
                  const isCompleted = workingDone

                  const perSetArr = perSetWeights[ex.library_id] ?? []
                  const perSetMax = perSetArr.reduce((m, v) => (v > m ? v : m), 0)
                  const perSetActive = perSetMax > 0
                  const expanded = !!perSetExpanded[ex.library_id]
                  const lastW = lastWeights[ex.library_id]
                  const displayedWeight = perSetActive
                    ? perSetMax
                    : weights[ex.library_id] || 0
                  const hasPRFlag = (prs[ex.library_id] ?? 0) > 0
                  return (
                    <LiftCard
                      key={`${ex.library_id}-${ei}`}
                      ex={ex}
                      exIdx={ei}
                      isCompleted={isCompleted}
                      displayedWeight={displayedWeight}
                      perSetActive={perSetActive}
                      perSetArr={perSetArr}
                      expanded={expanded}
                      lastWeight={lastW}
                      hasPRFlag={hasPRFlag}
                      checkedSets={checkedSets}
                      burstKey={burstKey}
                      burstTrigger={burstTrigger}
                      burstIsWarmup={burstIsWarmup}
                      onTapSet={(si) => toggleSet(ei, si)}
                      onInfo={() => setInfoLibraryId(ex.library_id)}
                      onSwap={() => setSwapIndex(ei)}
                      onToggleExpand={() =>
                        setPerSetExpanded((prev) => ({
                          ...prev,
                          [ex.library_id]: !prev[ex.library_id],
                        }))
                      }
                      onChangeWeight={(v) =>
                        setWeights((prev) => ({ ...prev, [ex.library_id]: v }))
                      }
                      onChangePerSet={(k, v) =>
                        setPerSetWeights((prev) => {
                          const cur = prev[ex.library_id] ?? []
                          const arr = cur.slice()
                          while (arr.length < ex.sets) arr.push(0)
                          arr[k] = v
                          return { ...prev, [ex.library_id]: arr }
                        })
                      }
                    />
                  )
                })}
              </div>

              {/* Cardio + cool-down slots */}
              {cachedProfile && (
                <>
                  <RoutineSlot session={selectedSession} kind="cardio" profile={cachedProfile} />
                  <RoutineSlot session={selectedSession} kind="cooldown" profile={cachedProfile} />
                </>
              )}

              {/* Sleep reminder (preserved — not in mock) */}
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

      {timer && (
        <TimerOverlay
          seconds={timer.seconds}
          label={timer.label}
          type={timer.type}
          onClose={() => setTimer(null)}
        />
      )}

      {swapIndex != null && selectedSession && selectedSession.exercises[swapIndex] && (
        <SwapSheet
          open
          currentExercise={selectedSession.exercises[swapIndex]}
          onDismiss={() => setSwapIndex(null)}
          onAccept={handleSwapAccept}
          onRequest={handleSwapRequest}
        />
      )}

      <ExerciseInfoSheet libraryId={infoLibraryId} onClose={() => setInfoLibraryId(null)} />

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

// ─── ProgressStrip — ported from screens.jsx ─────────────────────────────
interface ProgressStripProps {
  done: number
  total: number
  title: string
  estMinutes: number
}

function ProgressStrip({ done, total, title, estMinutes }: ProgressStripProps) {
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <div
      className="rounded-2xl p-3.5"
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
      }}
      data-testid="progress-strip"
    >
      <div className="flex items-baseline justify-between mb-2">
        <div className="min-w-0">
          <div
            className="text-[10px] font-bold uppercase"
            style={{ color: 'var(--lumo-text-ter)', letterSpacing: '0.12em' }}
          >
            today's work
          </div>
          <div
            className="text-[14px] font-bold truncate"
            style={{
              color: 'var(--lumo-text)',
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
            }}
          >
            {title}
          </div>
        </div>
        <div
          className="text-[13px] font-bold tabular-nums shrink-0"
          style={{ color: 'var(--lumo-text)' }}
        >
          {done}
          <span style={{ color: 'var(--lumo-text-ter)', fontWeight: 500 }}>
            {' / '}
            {total} sets
          </span>
        </div>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{
          background: 'var(--lumo-input-bg)',
          border: '1px solid var(--lumo-border)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background:
              'linear-gradient(90deg, var(--brand), color-mix(in srgb, var(--brand) 70%, white))',
            transition: 'width 500ms cubic-bezier(.34,1.56,.64,1)',
            borderRadius: 4,
          }}
        />
      </div>
      <div
        className="flex items-center justify-between mt-2 text-[10px]"
        style={{ color: 'var(--lumo-text-ter)' }}
      >
        <span>{estMinutes}min estimated</span>
        {pct >= 100 && (
          <span style={{ color: 'var(--accent-mint)', fontWeight: 700 }}>done. flop backwards.</span>
        )}
      </div>
    </div>
  )
}

// ─── LiftCard — ported from screens.jsx ─────────────────────────────────
// Header (name + info + swap + PR badge + weight pill) on top, optional
// per-set weight panel, WARMUP ROWS (new), then the row of working-set
// circles. Compound lifts render 3 warmup rows; accessory renders 1;
// rehab / mobility renders none.

interface LiftCardProps {
  ex: PlannedExercise
  exIdx: number
  isCompleted: boolean
  displayedWeight: number
  perSetActive: boolean
  perSetArr: number[]
  expanded: boolean
  lastWeight?: number
  hasPRFlag: boolean
  checkedSets: Record<string, boolean>
  burstKey: string | null
  burstTrigger: number
  burstIsWarmup: boolean
  onTapSet: (setIdx: number) => void
  onInfo: () => void
  onSwap: () => void
  onToggleExpand: () => void
  onChangeWeight: (v: number) => void
  onChangePerSet: (setIdx: number, v: number) => void
}

function LiftCard({
  ex,
  exIdx,
  isCompleted,
  displayedWeight,
  perSetActive,
  perSetArr,
  expanded,
  lastWeight,
  hasPRFlag,
  checkedSets,
  burstKey,
  burstTrigger,
  burstIsWarmup,
  onTapSet,
  onInfo,
  onSwap,
  onToggleExpand,
  onChangeWeight,
  onChangePerSet,
}: LiftCardProps) {
  return (
    <div
      className="rounded-2xl p-3.5"
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        opacity: isCompleted ? 0.65 : 1,
        transition: 'opacity 300ms',
      }}
      data-testid="lift-card"
    >
      {/* Header row: name + info + swap + PR badge, weight pill on right */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div
              className="text-[15px] font-bold"
              style={{
                color: 'var(--lumo-text)',
                textDecoration: isCompleted ? 'line-through' : 'none',
                textDecorationColor: 'var(--lumo-text-ter)',
                letterSpacing: '-0.01em',
              }}
            >
              {ex.name}
            </div>
            <button
              type="button"
              onClick={onInfo}
              className="p-1 rounded-md active:scale-90 transition-colors"
              style={{
                color: 'var(--lumo-text-ter)',
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: '1px solid var(--lumo-border-strong)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label={`Info about ${ex.name}`}
              title="Exercise info"
            >
              <Info size={10} />
            </button>
            <button
              type="button"
              onClick={onSwap}
              className="p-1 rounded-md active:scale-90 transition-colors"
              style={{ color: 'var(--lumo-text-ter)' }}
              aria-label={`Swap ${ex.name}`}
              title="Swap this exercise"
            >
              <RefreshCw size={12} />
            </button>
            {hasPRFlag && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  background: 'color-mix(in srgb, var(--accent-plum) 18%, transparent)',
                  color: 'var(--accent-plum)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
                title="You've set a PR on this exercise"
              >
                pr shot
              </span>
            )}
          </div>
          <div
            className="text-[11px] mt-1 tabular-nums"
            style={{ color: 'var(--lumo-text-ter)' }}
          >
            {ex.sets} × {ex.reps} · {ex.rest_seconds}s rest · RIR {ex.rir}
          </div>
          {ex.notes && (
            <div
              className="text-[11px] mt-1"
              style={{
                color: 'var(--lumo-text-sec)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
              }}
            >
              {ex.notes}
            </div>
          )}
        </div>

        {/* Weight pill — tap to expand per-set inputs */}
        <div className="shrink-0 flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex flex-col items-center px-2.5 py-1.5 rounded-xl active:scale-95 transition-all"
            style={{
              background: 'var(--lumo-input-bg)',
              border: '1px solid var(--lumo-border)',
              minWidth: 60,
            }}
            aria-label={expanded ? 'Collapse per-set weights' : 'Expand per-set weights'}
            aria-expanded={expanded}
            title="Per-set weights"
          >
            <div
              className="text-[9px] font-bold"
              style={{ color: 'var(--lumo-text-ter)', letterSpacing: '0.1em' }}
            >
              LBS
            </div>
            <input
              type="number"
              inputMode="numeric"
              placeholder="lbs"
              value={perSetActive ? displayedWeight : weightsInputValue(displayedWeight)}
              disabled={perSetActive}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onChangeWeight(Number(e.target.value))}
              className="w-12 text-center text-[17px] font-bold bg-transparent outline-none tabular-nums disabled:opacity-60"
              style={{ color: 'var(--lumo-text)', padding: 0 }}
            />
            <div
              className="text-[9px] tabular-nums mt-0.5"
              style={{
                color:
                  lastWeight !== undefined && displayedWeight > lastWeight
                    ? 'var(--accent-mint)'
                    : 'var(--lumo-text-ter)',
              }}
            >
              {lastWeight !== undefined ? `last ${lastWeight}` : '—'}
            </div>
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1 rounded-md active:scale-90 transition-transform"
            style={{ color: 'var(--lumo-text-ter)' }}
            aria-label={expanded ? 'Collapse per-set weights' : 'Expand per-set weights'}
            aria-expanded={expanded}
            title="Per-set weights"
          >
            <ChevronDown
              size={14}
              style={{
                transition: 'transform 200ms',
                transform: expanded ? 'rotate(180deg)' : 'none',
              }}
            />
          </button>
        </div>
      </div>

      {/* Per-set weight inputs (expand on caret tap) */}
      {expanded && (
        <div
          className="mt-3 pt-2.5 flex items-end gap-2 overflow-x-auto"
          style={{ borderTop: '1px solid var(--lumo-border)' }}
        >
          {Array.from({ length: ex.sets }, (_, k) => (
            <div key={k} className="flex flex-col items-center shrink-0">
              <div
                className="text-[9px] uppercase mb-0.5"
                style={{ color: 'var(--lumo-text-ter)', letterSpacing: '0.1em' }}
              >
                Set {k + 1}
              </div>
              <input
                type="number"
                inputMode="numeric"
                placeholder="lb"
                value={perSetArr[k] || ''}
                onChange={(e) => {
                  const raw = e.target.value
                  const next = raw === '' ? 0 : Number(raw)
                  onChangePerSet(k, next)
                }}
                className="w-12 text-center text-xs rounded-lg py-1 tabular-nums"
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

      {/* Circular working-set buttons row */}
      <div className="flex items-center gap-2.5 mt-3 flex-wrap">
        {Array.from({ length: ex.sets }, (_, k) => {
          const done = !!checkedSets[`${exIdx}-${k}`]
          const circleKey = `${exIdx}-${k}`
          const burstHere = burstKey === circleKey && burstTrigger > 0 && !burstIsWarmup
          return (
            <SetCircle
              key={k}
              done={done}
              label={k + 1}
              exerciseName={ex.name}
              setIndex={k}
              onTap={() => onTapSet(k)}
              showBurst={burstHere}
              burstTrigger={burstTrigger}
            />
          )
        })}
      </div>
    </div>
  )
}

function weightsInputValue(n: number): number | '' {
  return n > 0 ? n : ''
}

// ─── SetCircle ──────────────────────────────────────────────────────────
interface SetCircleProps {
  done: boolean
  label: number
  exerciseName: string
  setIndex: number
  onTap: () => void
  showBurst: boolean
  burstTrigger: number
}

const SET_CIRCLE_KEYFRAMES = `
@keyframes setcircle-pop {
  0%   { transform: scale(1); }
  35%  { transform: scale(1.2); }
  55%  { transform: scale(0.94); }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .setcircle-pop,
  .setcircle-pop * { animation: none !important; }
}
`

function SetCircle({
  done,
  label,
  exerciseName,
  setIndex,
  onTap,
  showBurst,
  burstTrigger,
}: SetCircleProps) {
  const [pressed, setPressed] = useState(false)
  const handle = () => {
    onTap()
    if (!done) {
      setPressed(true)
      window.setTimeout(() => setPressed(false), 500)
    }
  }

  const baseStyle: CSSProperties = {
    width: 54,
    height: 54,
    borderRadius: '50%',
    background: done ? 'var(--brand)' : 'var(--lumo-input-bg)',
    border: done
      ? '2px solid var(--brand)'
      : '2px solid var(--lumo-border-strong)',
    color: done ? '#fff' : 'var(--lumo-text-ter)',
    fontSize: done ? 20 : 15,
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
    position: 'relative',
  }
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
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
          <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true">
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
      {showBurst && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 27,
            left: 27,
            width: 0,
            height: 0,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <ParticleBurst key={burstTrigger} trigger={burstTrigger} color="var(--brand)" count={8} />
        </div>
      )}
    </div>
  )
}

// ─── ReactionBubble ─────────────────────────────────────────────────────
interface ReactionBubbleProps {
  text: string
  isPR: boolean
}

const REACTION_KEYFRAMES = `
@keyframes reaction-bubble-in {
  0%   { opacity: 0; transform: translateY(6px) scale(0.9); }
  30%  { opacity: 1; transform: translateY(0) scale(1.04); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes reaction-bubble-out {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-4px) scale(0.96); }
}
@media (prefers-reduced-motion: reduce) {
  .reaction-bubble { animation: none !important; }
}
`

function ReactionBubble({ text, isPR }: ReactionBubbleProps) {
  // Fixed-position toast so it's visible regardless of scroll — you tap a set
  // circle far from the preamble and need to see Lumo's reaction immediately.
  return (
    <div
      data-testid="lumo-reaction"
      data-is-pr={isPR ? 'true' : 'false'}
      className="reaction-bubble"
      style={{
        position: 'fixed',
        bottom: 88,
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 320,
        padding: '10px 16px',
        borderRadius: 20,
        background: isPR
          ? 'color-mix(in srgb, var(--accent-plum) 22%, var(--lumo-raised))'
          : 'var(--lumo-raised)',
        border: isPR
          ? '1px solid color-mix(in srgb, var(--accent-plum) 45%, transparent)'
          : '1px solid var(--lumo-border-strong)',
        color: isPR ? 'var(--accent-plum)' : 'var(--lumo-text)',
        fontFamily: "'Fraunces', Georgia, serif",
        fontStyle: 'italic',
        fontSize: 14,
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
        animation:
          'reaction-bubble-in 220ms cubic-bezier(.34,1.56,.64,1) both, reaction-bubble-out 260ms 1600ms ease-in both',
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      <style>{REACTION_KEYFRAMES}</style>
      <span data-testid="lumo-reaction-text">{text}</span>
    </div>
  )
}
