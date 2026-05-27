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
import { SessionCheckinSheet } from './SessionCheckinSheet'
import { CheckinSummary } from './CheckinSummary'
import { useSession } from '../hooks/useSession'
import { usePlan } from '../hooks/usePlan'
import { useDayOverrides } from '../hooks/useDayOverrides'
import { getToday, getSessionForDate } from '../lib/planSelectors'
import {
  saveSession,
  saveLastWeight,
  updatePR,
  loadPRs,
} from '../lib/persistence'
import { loadProfileLocal } from '../lib/profileRepo'
import { generatePlan } from '../lib/planGen'
import { requestSwap, applySwap, type SwapReason } from '../lib/swap'
import { swapVariantLocal } from '../lib/swapLocal'
import { saveCheckin } from '../lib/checkins'
import {
  computeAutoProgressionForSession,
  computeWarmupDeltasForSession,
} from '../lib/planner/autoProgress'
import { isHardToFeel } from '../lib/planner/constants'
import { affectedMuscleGroupsFor, exerciseIsAffected } from '../lib/planner/bodyPartMuscleMap'
import { loadBodyCheck } from './BodyCheckSheet'
import { getExerciseById } from '../data/exercises'
import { SwapSheet } from './SwapSheet'
import type { SessionCheckin, SetRating } from '../types/checkin'
import { getCopy, pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../lib/copy'
import { remapTitleIfGeneric } from '../lib/legacyTitleRemap'
import type { TimerState, SessionPhase } from '../types'
import type { PlannedSession, PlannedExercise, BandTension } from '../types/plan'
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
// Per-exercise band-tension picks. Mirrors WEIGHTS_KEY shape but stores a
// BandTension string instead of a number. Only populated when a banded
// exercise is detected (see `isBandedExercise`).
const BAND_TENSIONS_KEY = (sessionId: string) =>
  `workout-tracker:band-tensions:${sessionId}`
// ─── Micro-feedback affordance state (per-session, localStorage) ──────────
// Per-set effort tap. Keyed by `${exerciseIdx}-${setIdx}` → SetRating.
// Mirrors checkedSets — same key shape so iteration logic stays parallel.
// Skipping the tap is fine; absent key = "no signal captured" (not "easy").
const SET_RATINGS_KEY = (sessionId: string) =>
  `workout-tracker:set-ratings:${sessionId}`
// Per-set rest-needed seconds. Keyed by `${exerciseIdx}-${setIdx}` →
// number (seconds elapsed when user tapped "ready already?"). Absent key
// = "user let the timer run", no signal.
const REST_NEEDED_KEY = (sessionId: string) =>
  `workout-tracker:rest-needed:${sessionId}`
// Per-exercise mind-muscle tap on hard-to-feel exercises. Keyed by
// library_id → 'felt' | 'missed'. At most one entry per exercise per
// session; absent = tap was skipped (or exercise isn't hard-to-feel).
const MIND_MUSCLE_KEY = (sessionId: string) =>
  `workout-tracker:mind-muscle:${sessionId}`

// ─── Banded-exercise detection + tension ↔ load sentinel mapping ─────────
// A banded exercise has no pound load — the user picks a band by feel
// (light/medium/heavy/x-heavy). We detect via name match because
// PlannedExercise carries no equipment field; the variants table (the only
// authoritative source) lives behind library_id, which we don't resolve
// here. The bodyweight branch in autoProgress already handles
// suggested_weight_lbs===undefined for true bodyweight movements (push-ups,
// hanging leg raises) — the band regex won't match those, so the two paths
// stay disjoint.
const BAND_NAME_RE = /\bband(ed|s)?\b/i
function isBandedExercise(ex: PlannedExercise): boolean {
  if (ex.suggested_weight_lbs !== undefined) return false
  return BAND_NAME_RE.test(ex.name)
}

// WHY a sentinel: the SessionCheckin schema only has `used_weight_lb?: number`
// per exercise (see src/types/checkin.ts — agent A owns it, schema frozen).
// To let the auto-progression engine read tension changes between sessions
// without breaking that contract, we encode tension as a fake load on a
// 10/20/30/40 ladder. autoProgress's bump/hold/drop logic is monotonic on
// this scalar, so "user moved up a band" looks like "+10 lb" → bump path.
// Reverse-mapped on hydration in the band detection branch so the user
// still sees light/medium/heavy/x-heavy in the UI.
const BAND_TENSION_TO_LB: Record<BandTension, number> = {
  light: 10,
  medium: 20,
  heavy: 30,
  'x-heavy': 40,
}
const BAND_LB_TO_TENSION: Record<number, BandTension> = {
  10: 'light',
  20: 'medium',
  30: 'heavy',
  40: 'x-heavy',
}

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
  const overrides = useDayOverrides(userId)

  // ─── Selected day-of-week — in-session shows today's session only now.
  const [selectedDow] = useState<number>(() => loadSelectedDow())

  const currentWeek = useMemo(() => getToday(plan)?.week_number ?? 1, [plan])

  const selectedDate = useMemo(() => {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - toAppDow(weekStart.getDay()))
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + selectedDow)
    return d
  }, [selectedDow])

  const selectedSession: PlannedSession | null = useMemo(() => {
    if (!plan) return null
    return getSessionForDate(plan, overrides, selectedDate, currentWeek)
  }, [plan, overrides, selectedDate, currentWeek])

  const selectedSessionKey = selectedSession?.id ?? null

  // ─── Per-session persistence ───────────────────────────────────────────
  const [weights, setWeights] = useState<Record<string, number>>(() =>
    selectedSessionKey
      ? loadStoredRecord<Record<string, number>>(WEIGHTS_KEY(selectedSessionKey)) || {}
      : {},
  )
  // Day-of body check: which library_ids the user has chosen to scale -10%
  // for today because they flagged a related body part as "off". Stored in
  // component state only — the scaling is a one-session intent, not a
  // permanent profile change. Keyed by library_id.
  const [scaledExercises, setScaledExercises] = useState<Record<string, boolean>>({})
  // Adaptive rep-target recommendations for bodyweight main lifts (pull-ups,
  // dips, etc.) where there's no weight to bump. Populated by the same async
  // auto-progression effect that seeds `weights`. Keyed by library_id; only
  // present when the recommendation actually differs from the planner's
  // prescribed range (i.e. add-rep or drop branches).
  const [repTargets, setRepTargets] = useState<Record<string, number>>({})
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
  // Per-exercise band-tension picks for banded exercises (clamshells,
  // monster walks, etc.). Keyed by library_id. Lives alongside `weights`
  // because a banded exercise renders the tension control in the spot the
  // weight pill would otherwise occupy.
  const [bandTensions, setBandTensions] = useState<Record<string, BandTension>>(() =>
    selectedSessionKey
      ? loadStoredRecord<Record<string, BandTension>>(BAND_TENSIONS_KEY(selectedSessionKey)) || {}
      : {},
  )
  const [perSetExpanded, setPerSetExpanded] = useState<Record<string, boolean>>({})
  // ─── Micro-feedback affordances ─────────────────────────────────────────
  // Per-set effort tap. Keyed `${exIdx}-${setIdx}`. See SET_RATINGS_KEY.
  const [setRatings, setSetRatings] = useState<Record<string, SetRating>>(() =>
    selectedSessionKey
      ? loadStoredRecord<Record<string, SetRating>>(SET_RATINGS_KEY(selectedSessionKey)) || {}
      : {},
  )
  // Per-set rest-needed seconds. Keyed `${exIdx}-${setIdx}`. See REST_NEEDED_KEY.
  const [restNeededSecs, setRestNeededSecs] = useState<Record<string, number>>(() =>
    selectedSessionKey
      ? loadStoredRecord<Record<string, number>>(REST_NEEDED_KEY(selectedSessionKey)) || {}
      : {},
  )
  // Per-exercise mind-muscle tap. Keyed by library_id. See MIND_MUSCLE_KEY.
  const [mindMuscleFelt, setMindMuscleFelt] = useState<Record<string, 'felt' | 'missed'>>(() =>
    selectedSessionKey
      ? loadStoredRecord<Record<string, 'felt' | 'missed'>>(MIND_MUSCLE_KEY(selectedSessionKey)) || {}
      : {},
  )
  // History-derived warmup-count delta per exercise (library_id → +N).
  // Populated by computeWarmupDeltasForSession on session hydrate, reset
  // on session switch. Only hard-to-feel exercises ever appear here.
  const [warmupDeltas, setWarmupDeltas] = useState<Record<string, number>>({})
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
    /** The set this rest period follows. Used by the "ready already?" tap
     *  to record `rest_needed_seconds` against the correct set slot. */
    priorSet: { exIdx: number; setIdx: number } | null
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
  // Variant ids already proposed for the current swap slot. Accumulates across
  // "try another" taps so the local swapper walks through unique candidates.
  // Reset whenever the sheet closes or retargets a different exercise.
  const attemptedSwapIdsRef = useRef<{ slot: number | null; ids: string[] }>({
    slot: null,
    ids: [],
  })

  // ─── Post-session check-in sheet ───────────────────────────────────────
  // Snapshot captured at end-session time. We freeze the exercise list,
  // session id, week, and completed weights so the sheet can still render
  // after the underlying PlannedSession state gets cleared below.
  interface CheckinSnapshot {
    sessionId: string
    weekNumber: number
    exercises: PlannedExercise[]
    completedWeights: Record<string, number>
    // Per-set micro-feedback signals — frozen at end-session so the sheet
    // can mirror them into the persisted ExerciseCheckin without racing
    // React state cleanup in finalizeSession.
    setRatings: Record<string, ReadonlyArray<SetRating | null>>
    restNeededSeconds: Record<string, ReadonlyArray<number | null>>
    mindMuscleFelt: Record<string, 'felt' | 'missed'>
  }
  const [checkinSnapshot, setCheckinSnapshot] = useState<CheckinSnapshot | null>(null)

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

  // Clear the attempted-ids accumulator when the swap sheet closes so the
  // next swap for this slot starts fresh.
  useEffect(() => {
    if (swapIndex == null) {
      attemptedSwapIdsRef.current = { slot: null, ids: [] }
    }
  }, [swapIndex])

  const handleSwapRequest = useCallback(
    async (reason: SwapReason) => {
      if (!cachedProfile) throw new Error('Profile not loaded yet — try again in a moment.')
      if (!selectedSession || swapIndex == null) {
        throw new Error('No active session or exercise selected for swap.')
      }
      const current = selectedSession.exercises[swapIndex]

      // Reset the attempted-ids accumulator whenever the swap target changes.
      if (attemptedSwapIdsRef.current.slot !== swapIndex) {
        attemptedSwapIdsRef.current = { slot: swapIndex, ids: [] }
      }

      // Local variant path — runs entirely client-side when the current
      // exercise is one the rule-based planner emitted. Falls through to the
      // edge only when the local pool can't produce a candidate (unresolvable
      // id, no compatible variant), so at least an error surfaces gracefully.
      if (current.library_id.startsWith('variant:')) {
        try {
          const result = swapVariantLocal({
            currentExercise: current,
            session: selectedSession,
            profile: cachedProfile,
            reason,
            attemptedIds: attemptedSwapIdsRef.current.ids,
          })
          const chosenId = result.replacement.library_id.startsWith('variant:')
            ? result.replacement.library_id.slice('variant:'.length)
            : result.replacement.library_id
          attemptedSwapIdsRef.current.ids.push(chosenId)
          return result
        } catch {
          // Fall through to the edge path below.
        }
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
      setRepTargets({})
      setPerSetWeights({})
      setBandTensions({})
      setPerSetExpanded({})
      setRestState(null)
      setSetRatings({})
      setRestNeededSecs({})
      setMindMuscleFelt({})
      setWarmupDeltas({})
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
    const savedTensions =
      loadStoredRecord<Record<string, BandTension>>(BAND_TENSIONS_KEY(selectedSessionKey)) || {}
    // Seed missing entries from the planner's starting-weight suggestion so
    // the weight pill doesn't render "—" on an accessory the user hasn't yet
    // logged a load for. Real saved weights always win — we only fill gaps.
    const seeded: Record<string, number> = { ...savedWeights }
    if (selectedSession) {
      for (const ex of selectedSession.exercises) {
        if (
          seeded[ex.library_id] === undefined &&
          ex.suggested_weight_lbs !== undefined &&
          ex.suggested_weight_lbs > 0
        ) {
          seeded[ex.library_id] = ex.suggested_weight_lbs
        }
      }
    }
    setCheckedSets(savedChecked)
    setCheckedWarmups(savedWarmups)
    setWeights(seeded)
    setRepTargets({})
    setPerSetWeights(savedPerSet)
    setBandTensions(savedTensions)
    setPerSetExpanded({})
    setRestState(null)
    // Re-hydrate per-session micro-feedback state from localStorage.
    const savedSetRatings =
      loadStoredRecord<Record<string, SetRating>>(SET_RATINGS_KEY(selectedSessionKey)) || {}
    const savedRestNeeded =
      loadStoredRecord<Record<string, number>>(REST_NEEDED_KEY(selectedSessionKey)) || {}
    const savedMindMuscle =
      loadStoredRecord<Record<string, 'felt' | 'missed'>>(MIND_MUSCLE_KEY(selectedSessionKey)) || {}
    setSetRatings(savedSetRatings)
    setRestNeededSecs(savedRestNeeded)
    setMindMuscleFelt(savedMindMuscle)
    setWarmupDeltas({})
    hydratedForRef.current = selectedSessionKey

    // Async second pass: replace the planner's static suggestion with a
    // history-aware recommendation when one exists. Reads Dexie, so we have
    // to guard against (a) the effect re-running before the read returns
    // and (b) overwriting weights the user manually saved last session.
    if (!userId || !selectedSession) return
    let cancelled = false
    const sessionKeyAtStart = selectedSessionKey
    void computeAutoProgressionForSession(userId, selectedSession.id, selectedSession.exercises)
      .then((autoMap) => {
        if (cancelled) return
        if (hydratedForRef.current !== sessionKeyAtStart) return
        if (Object.keys(autoMap).length === 0) return
        // Build a libId → exercise map once so the banded reverse-map
        // doesn't re-scan exercises for every entry.
        const exById = new Map<string, PlannedExercise>(
          selectedSession.exercises.map((e) => [e.library_id, e]),
        )
        const tensionUpdates: Record<string, BandTension> = {}
        setWeights((prev) => {
          const next = { ...prev }
          for (const [libId, result] of Object.entries(autoMap)) {
            if (savedWeights[libId] !== undefined) continue
            // Bodyweight branch: rep-target lives in `repTargets` (below);
            // skip writing 0 to the weight pill so it doesn't render "0 lb".
            if (result.weight === 0 && result.rep_target !== undefined) continue
            // Banded branch: the auto-progression engine sees the sentinel
            // load (10/20/30/40) we wrote at session-end and may bump it
            // to the next rung. Reverse-map back to a tension so the user
            // sees light/medium/heavy/x-heavy in the UI, NOT a raw "20 lb".
            const ex = exById.get(libId)
            if (ex && isBandedExercise(ex)) {
              if (savedTensions[libId] === undefined) {
                const tension = BAND_LB_TO_TENSION[result.weight]
                if (tension !== undefined) tensionUpdates[libId] = tension
              }
              continue
            }
            next[libId] = result.weight
          }
          return next
        })
        if (Object.keys(tensionUpdates).length > 0) {
          setBandTensions((prev) => ({ ...prev, ...tensionUpdates }))
        }
        // Surface rep-target only when it actually differs from the
        // planner's prescribed range — add-rep (target above ceiling) or
        // drop (target reset to floor). `hold` returns the ceiling, which
        // is already visible in the prescribed reps string.
        const rtUpdates: Record<string, number> = {}
        for (const [libId, result] of Object.entries(autoMap)) {
          if (result.rep_target === undefined) continue
          if (result.action !== 'add-rep' && result.action !== 'drop') continue
          rtUpdates[libId] = result.rep_target
        }
        if (Object.keys(rtUpdates).length > 0) {
          setRepTargets((prev) => ({ ...prev, ...rtUpdates }))
        }
      })
      .catch((err) => {
        console.error('computeAutoProgressionForSession failed', err)
      })
    // History-derived warmup deltas for hard-to-feel exercises. Best-
    // effort: failure leaves deltas empty (no warmup augment), which is
    // strictly the existing behavior — so we swallow errors.
    void computeWarmupDeltasForSession(userId, selectedSession.id, selectedSession.exercises)
      .then((deltaMap) => {
        if (cancelled) return
        if (hydratedForRef.current !== sessionKeyAtStart) return
        if (Object.keys(deltaMap).length === 0) return
        setWarmupDeltas(deltaMap)
      })
      .catch((err) => {
        console.error('computeWarmupDeltasForSession failed', err)
      })
    return () => {
      cancelled = true
    }
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
    if (!selectedSessionKey || hydratedForRef.current !== selectedSessionKey) return
    localStorage.setItem(BAND_TENSIONS_KEY(selectedSessionKey), JSON.stringify(bandTensions))
  }, [selectedSessionKey, bandTensions])

  // ─── Persist micro-feedback state ────────────────────────────────────────
  useEffect(() => {
    if (!selectedSessionKey || hydratedForRef.current !== selectedSessionKey) return
    localStorage.setItem(SET_RATINGS_KEY(selectedSessionKey), JSON.stringify(setRatings))
  }, [selectedSessionKey, setRatings])

  useEffect(() => {
    if (!selectedSessionKey || hydratedForRef.current !== selectedSessionKey) return
    localStorage.setItem(REST_NEEDED_KEY(selectedSessionKey), JSON.stringify(restNeededSecs))
  }, [selectedSessionKey, restNeededSecs])

  useEffect(() => {
    if (!selectedSessionKey || hydratedForRef.current !== selectedSessionKey) return
    localStorage.setItem(MIND_MUSCLE_KEY(selectedSessionKey), JSON.stringify(mindMuscleFelt))
  }, [selectedSessionKey, mindMuscleFelt])

  useEffect(() => {
    if (session && !hasUsed) {
      localStorage.setItem(HAS_USED_KEY, 'true')
      setHasUsed(true)
    }
  }, [session, hasUsed])

  useEffect(() => {
    if (userId) {
      loadPRs(userId).then(setPrs)
    }
  }, [userId])

  // ─── Derived: session progress ─────────────────────────────────────────
  const exercises = selectedSession?.exercises ?? []

  // Day-of body-check signal: which muscle groups did the user flag "off"
  // today? Used to surface inline scale/swap prompts on affected exercises.
  // Read once on mount + when the user updates the check from HomeScreen
  // (storage event would be cleaner, but mount-on-session-entry is enough
  // for the common case since the user picks Home → "anything off?" → "go").
  const bodyCheckToday = useMemo(() => {
    if (typeof window === 'undefined') return null
    const iso = new Date().toISOString().slice(0, 10)
    return loadBodyCheck(iso)
  }, [])
  const affectedMuscles = useMemo(
    () => affectedMuscleGroupsFor(bodyCheckToday?.flagged ?? []),
    [bodyCheckToday],
  )
  const flaggedLabel = useMemo(() => {
    const parts = bodyCheckToday?.flagged ?? []
    if (parts.length === 0) return ''
    if (parts.length === 1) return parts[0].replace(/_/g, ' ')
    return `${parts.length} parts`
  }, [bodyCheckToday])
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
        priorSet: { exIdx: exerciseIdx, setIdx: setIdx },
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


  // Finalize the session after the user saves or skips the check-in. Runs
  // all the cleanup handleEndSession used to do inline.
  const finalizeSession = useCallback(
    async (finishedSessionId: string, endedSession: typeof session, sessionTitle: string) => {
      if (!endedSession) return
      setCheckedSets({})
      setCheckedWarmups({})
      setRestState(null)
      setSetRatings({})
      setRestNeededSecs({})
      setMindMuscleFelt({})
      localStorage.removeItem(CHECKED_SETS_KEY(finishedSessionId))
      localStorage.removeItem(WARMUP_CHECKED_KEY(finishedSessionId))
      localStorage.removeItem(WEIGHTS_KEY(finishedSessionId))
      localStorage.removeItem(PER_SET_WEIGHTS_KEY(finishedSessionId))
      localStorage.removeItem(BAND_TENSIONS_KEY(finishedSessionId))
      localStorage.removeItem(SET_RATINGS_KEY(finishedSessionId))
      localStorage.removeItem(REST_NEEDED_KEY(finishedSessionId))
      localStorage.removeItem(MIND_MUSCLE_KEY(finishedSessionId))

      const now = new Date().toISOString()
      await saveSession({
        userId,
        workoutId: finishedSessionId,
        workoutTitle: sessionTitle,
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
      // Banded exercises: encode tension as a sentinel pound value
      // (light=10/medium=20/heavy=30/x-heavy=40) so the SessionCheckin
      // schema (which only carries `used_weight_lb?: number`) can round-trip
      // the user's pick into the auto-progression engine. See the comment
      // on BAND_TENSION_TO_LB above for why.
      for (const [exerciseId, tension] of Object.entries(bandTensions)) {
        effectiveWeights[exerciseId] = BAND_TENSION_TO_LB[tension]
      }
      for (const [exerciseId, weight] of Object.entries(effectiveWeights)) {
        if (weight > 0) {
          const ex = exercises.find((e) => e.library_id === exerciseId)
          // Skip PR / lastWeight writes for banded exercises — the sentinel
          // (10/20/30/40) is a tension proxy for autoProgress, not a real
          // load. Persisting it would surface a bogus "Banded Clamshell PR
          // 20 lb" record. The tension still round-trips via the checkin.
          if (ex && isBandedExercise(ex)) continue
          await saveLastWeight(userId, exerciseId, weight)
          await updatePR(userId, exerciseId, ex?.name || exerciseId, weight)
        }
      }

      if (doneSets > 0) onWorkoutComplete()

      loadPRs(userId).then(setPrs)
      setWeights({})
      setPerSetWeights({})
      setBandTensions({})
      setPerSetExpanded({})
      clearSession()
    },
    [
      userId,
      weights,
      perSetWeights,
      bandTensions,
      doneSets,
      totalSets,
      onWorkoutComplete,
      exercises,
      clearSession,
    ],
  )

  // Pending finalization tuple — stashed while the check-in sheet is open
  // so save/skip handlers can run cleanup without racing React state.
  const pendingFinalizeRef = useRef<{
    sessionId: string
    endedSession: typeof session
    title: string
  } | null>(null)

  const handleEndSession = useCallback(async () => {
    if (!session || !selectedSession) {
      endSession()
      return
    }

    const endedSession = { ...session }
    const finishedSessionId = selectedSession.id
    // End the timer-tracked session immediately — the in-session UI won't
    // show anymore, but the underlying plan state stays rendered behind
    // the modal check-in sheet.
    endSession()

    // Compute effective weights now (while in-session state is still live)
    // so the sheet has accurate per-exercise weights to show + persist.
    const effectiveWeights: Record<string, number> = { ...weights }
    for (const [exerciseId, arr] of Object.entries(perSetWeights)) {
      const max = arr.reduce((m, v) => (v > m ? v : m), 0)
      if (max > 0) effectiveWeights[exerciseId] = max
    }
    // Sentinel-encode banded picks into the same map (see finalizeSession
    // for the WHY).
    for (const [exerciseId, tension] of Object.entries(bandTensions)) {
      effectiveWeights[exerciseId] = BAND_TENSION_TO_LB[tension]
    }

    pendingFinalizeRef.current = {
      sessionId: finishedSessionId,
      endedSession,
      title: selectedSession.title,
    }
    // ─── Freeze per-exercise micro-feedback arrays for the check-in ───
    // The state vars are keyed at the granularity each affordance writes
    // (e.g. "${exIdx}-${setIdx}" for setRatings). We collapse to the
    // (library_id → per-set array) shape ExerciseCheckin consumes.
    const setRatingsByLib: Record<string, ReadonlyArray<SetRating | null>> = {}
    const restNeededByLib: Record<string, ReadonlyArray<number | null>> = {}
    selectedSession.exercises.forEach((ex, ei) => {
      const ratings: Array<SetRating | null> = []
      const rests: Array<number | null> = []
      let sawRating = false
      let sawRest = false
      for (let si = 0; si < ex.sets; si++) {
        const r = setRatings[`${ei}-${si}`] ?? null
        const rs = restNeededSecs[`${ei}-${si}`] ?? null
        if (r !== null) sawRating = true
        if (rs !== null) sawRest = true
        ratings.push(r)
        rests.push(rs)
      }
      if (sawRating) setRatingsByLib[ex.library_id] = ratings
      if (sawRest) restNeededByLib[ex.library_id] = rests
    })
    setCheckinSnapshot({
      sessionId: finishedSessionId,
      weekNumber: selectedSession.week_number,
      exercises: selectedSession.exercises,
      completedWeights: effectiveWeights,
      setRatings: setRatingsByLib,
      restNeededSeconds: restNeededByLib,
      mindMuscleFelt: { ...mindMuscleFelt },
    })
  }, [
    session,
    selectedSession,
    weights,
    perSetWeights,
    bandTensions,
    setRatings,
    restNeededSecs,
    mindMuscleFelt,
    endSession,
  ])

  const handleCheckinSave = useCallback(
    async (checkin: SessionCheckin) => {
      try {
        await saveCheckin(checkin)
      } catch (err) {
        console.error('saveCheckin failed', err)
      }
      const pending = pendingFinalizeRef.current
      pendingFinalizeRef.current = null
      setCheckinSnapshot(null)
      if (pending) {
        await finalizeSession(pending.sessionId, pending.endedSession, pending.title)
      }
    },
    [finalizeSession],
  )

  const handleCheckinSkip = useCallback(async () => {
    const pending = pendingFinalizeRef.current
    pendingFinalizeRef.current = null
    setCheckinSnapshot(null)
    if (pending) {
      await finalizeSession(pending.sessionId, pending.endedSession, pending.title)
    }
  }, [finalizeSession])

  // Display-side remap: legacy Dexie plans may have generic titles like
  // "Lower A"/"Upper B". Derive a body-part title from the exercise list
  // when that happens. The stored plan is never mutated.
  const displayTitle = selectedSession
    ? remapTitleIfGeneric(selectedSession.title, selectedSession.exercises)
    : null

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
          {displayTitle ?? 'rest day'}
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
              title={displayTitle ?? selectedSession.title}
              estMinutes={selectedSession.estimated_minutes}
            />
          </div>
        )}

        {/* Inline rest banner — fires auto on working-set complete.
            "ready already?" tap captures actual seconds-needed onto the
            prior set log as an INPUT signal (no in-moment behavior
            change). Only wired when we know which set this rest follows. */}
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
              onReadyAlready={
                restState.priorSet
                  ? (elapsedSeconds) => {
                      const ps = restState.priorSet!
                      setRestNeededSecs((prev) => ({
                        ...prev,
                        [`${ps.exIdx}-${ps.setIdx}`]: elapsedSeconds,
                      }))
                      setRestState(null)
                    }
                  : undefined
              }
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
                  const displayedWeight = perSetActive
                    ? perSetMax
                    : weights[ex.library_id] || 0
                  const hasPRFlag = (prs[ex.library_id] ?? 0) > 0
                  const banded = isBandedExercise(ex)
                  const hardToFeel = isHardToFeel(ex.library_id, ex.name)
                  // Day-of body check: does this exercise load any flagged
                  // body part? Resolve the exercise's muscle list via the
                  // library lookup (PlannedExercise carries only library_id;
                  // muscle data lives on the canonical Exercise entry). If
                  // the exercise isn't in the curated library (variant/
                  // LLM-emitted name), fall back to no match — better to
                  // miss a flag than to false-positive on every exercise.
                  const libEntry = getExerciseById(ex.library_id)
                  const bodyAffected =
                    affectedMuscles.size > 0 &&
                    libEntry !== undefined &&
                    exerciseIsAffected(
                      libEntry.primary_muscles,
                      libEntry.secondary_muscles,
                      affectedMuscles,
                    )
                  const isScaled = scaledExercises[ex.library_id] === true
                  return (
                    <div key={`${ex.library_id}-${ei}`}>
                    {bodyAffected && (
                      <BodyAffectedNote
                        flaggedLabel={flaggedLabel}
                        isScaled={isScaled}
                        onScale={() => {
                          setScaledExercises((prev) => ({ ...prev, [ex.library_id]: true }))
                          // Apply a 10% reduction to the displayed weight,
                          // rounded down to nearest 2.5lb. Only applies
                          // when an existing weight is set (skip for
                          // unconfigured bodyweight exercises).
                          const current = weights[ex.library_id] || 0
                          if (current > 0) {
                            const scaled = Math.max(0, Math.floor((current * 0.9) / 2.5) * 2.5)
                            setWeights((prev) => ({ ...prev, [ex.library_id]: scaled }))
                          }
                        }}
                        onUndoScale={() => {
                          setScaledExercises((prev) => {
                            const next = { ...prev }
                            delete next[ex.library_id]
                            return next
                          })
                        }}
                        onSwap={() => setSwapIndex(ei)}
                      />
                    )}
                    <LiftCard
                      ex={ex}
                      exIdx={ei}
                      isCompleted={isCompleted}
                      displayedWeight={displayedWeight}
                      bandTension={banded ? bandTensions[ex.library_id] : undefined}
                      isBanded={banded}
                      repTarget={repTargets[ex.library_id]}
                      perSetActive={perSetActive}
                      perSetArr={perSetArr}
                      expanded={expanded}
                      hasPRFlag={hasPRFlag}
                      checkedSets={checkedSets}
                      burstKey={burstKey}
                      burstTrigger={burstTrigger}
                      burstIsWarmup={burstIsWarmup}
                      setRatings={setRatings}
                      isHardToFeelEx={hardToFeel}
                      mindMuscleFelt={mindMuscleFelt[ex.library_id]}
                      warmupDelta={warmupDeltas[ex.library_id] ?? 0}
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
                      onChangeBandTension={(t) =>
                        setBandTensions((prev) => ({ ...prev, [ex.library_id]: t }))
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
                      onSetRating={(si, rating) =>
                        setSetRatings((prev) => ({
                          ...prev,
                          [`${ei}-${si}`]: rating,
                        }))
                      }
                      onMindMuscleFelt={(value) =>
                        setMindMuscleFelt((prev) => ({
                          ...prev,
                          [ex.library_id]: value,
                        }))
                      }
                    />
                    </div>
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

              {/* Post-session check-in recall — only after the user finishes
                  every set. Reads from Dexie so the user can see (and trust)
                  the rating + notes they captured a moment ago. Read-only;
                  no state side-effects. */}
              {sessionComplete && (
                <CheckinSummary sessionId={selectedSession.id} />
              )}
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

      <ExerciseInfoSheet
        libraryId={infoLibraryId}
        onClose={() => setInfoLibraryId(null)}
        // Surface the LLM nuance layer's per-exercise rationale at the
        // top of the info sheet when present. Looked up from the
        // selected session's exercise list by library_id so the
        // rationale stays paired with this session's prescription (the
        // same exercise on a different session may have different
        // coaching context). Falls back gracefully to undefined.
        rationale={
          infoLibraryId
            ? selectedSession?.exercises.find((e) => e.library_id === infoLibraryId)?.rationale
            : undefined
        }
      />

      {prPayload && (
        <PRCelebration
          open
          exerciseName={prPayload.exerciseName}
          oldValue={prPayload.oldValue}
          newValue={prPayload.newValue}
          onClose={() => setPrPayload(null)}
        />
      )}

      {checkinSnapshot && (
        <SessionCheckinSheet
          open
          userId={userId}
          sessionId={checkinSnapshot.sessionId}
          weekNumber={checkinSnapshot.weekNumber}
          exercises={checkinSnapshot.exercises}
          completedWeights={checkinSnapshot.completedWeights}
          setRatings={checkinSnapshot.setRatings}
          restNeededSeconds={checkinSnapshot.restNeededSeconds}
          mindMuscleFelt={checkinSnapshot.mindMuscleFelt}
          onSave={handleCheckinSave}
          onSkip={handleCheckinSkip}
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

// ─── BodyAffectedNote ───────────────────────────────────────────────────
// Quiet plum-tinted note that renders above a LiftCard when today's
// body-check flagged a part this exercise loads. Surfaces scale -10% and
// swap actions — does NOT auto-modify the prescription. Tap is the user's
// authorization; without it the program runs as planned.
interface BodyAffectedNoteProps {
  flaggedLabel: string
  isScaled: boolean
  onScale: () => void
  onUndoScale: () => void
  onSwap: () => void
}

function BodyAffectedNote({
  flaggedLabel,
  isScaled,
  onScale,
  onUndoScale,
  onSwap,
}: BodyAffectedNoteProps) {
  return (
    <div
      data-testid="body-affected-note"
      style={{
        padding: '8px 12px',
        marginBottom: 6,
        background: 'color-mix(in srgb, var(--accent-plum) 12%, transparent)',
        border: '1px solid color-mix(in srgb, var(--accent-plum) 45%, transparent)',
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--lumo-text)', lineHeight: 1.4 }}>
        you flagged{' '}
        <span style={{ color: 'var(--accent-plum)', fontWeight: 700 }}>{flaggedLabel}</span>
        {' '}off today — consider lighter load or swap
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {isScaled ? (
          <button
            type="button"
            onClick={onUndoScale}
            data-testid="body-affected-undo"
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: 'color-mix(in srgb, var(--accent-plum) 22%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent-plum) 55%, transparent)',
              color: 'var(--accent-plum)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            scaled -10% · undo
          </button>
        ) : (
          <button
            type="button"
            onClick={onScale}
            data-testid="body-affected-scale"
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: 'transparent',
              border: '1px solid color-mix(in srgb, var(--accent-plum) 55%, transparent)',
              color: 'var(--accent-plum)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            scale -10%
          </button>
        )}
        <button
          type="button"
          onClick={onSwap}
          data-testid="body-affected-swap"
          style={{
            padding: '4px 10px',
            borderRadius: 999,
            background: 'transparent',
            border: '1px solid color-mix(in srgb, var(--accent-plum) 55%, transparent)',
            color: 'var(--accent-plum)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          swap
        </button>
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
  /** Selected band tension for banded exercises (clamshells etc.). */
  bandTension?: BandTension
  /** When true, render the band-tension segmented control instead of the
   *  weight pill. Detected by the parent via `isBandedExercise`. */
  isBanded?: boolean
  repTarget: number | undefined
  perSetActive: boolean
  perSetArr: number[]
  expanded: boolean
  hasPRFlag: boolean
  checkedSets?: Record<string, boolean>
  burstKey: string | null
  burstTrigger: number
  burstIsWarmup: boolean
  /** Per-set effort taps. Keyed `${exIdx}-${setIdx}`. Optional —
   *  defaults to empty so legacy callers (tests, isolated mounts) work
   *  without plumbing the affordance state. */
  setRatings?: Record<string, SetRating>
  /** True when this exercise belongs in the hard-to-feel bucket. */
  isHardToFeelEx?: boolean
  /** Current mind-muscle tap for this exercise (felt/missed), if any. */
  mindMuscleFelt?: 'felt' | 'missed'
  /** History-derived extra warmup-set count delta (only for hard-to-feel). */
  warmupDelta?: number
  onTapSet: (setIdx: number) => void
  onInfo: () => void
  onSwap: () => void
  onToggleExpand: () => void
  onChangeWeight: (v: number) => void
  onChangeBandTension?: (t: BandTension) => void
  onChangePerSet: (setIdx: number, v: number) => void
  onSetRating?: (setIdx: number, rating: SetRating) => void
  onMindMuscleFelt?: (value: 'felt' | 'missed') => void
}

export function LiftCard({
  ex,
  exIdx,
  isCompleted,
  displayedWeight,
  bandTension,
  isBanded = false,
  repTarget,
  perSetActive,
  perSetArr,
  expanded,
  hasPRFlag,
  checkedSets: checkedSetsProp,
  burstKey,
  burstTrigger,
  burstIsWarmup,
  setRatings: setRatingsProp,
  isHardToFeelEx = false,
  mindMuscleFelt,
  warmupDelta = 0,
  onTapSet,
  onInfo,
  onSwap,
  onToggleExpand,
  onChangeWeight,
  onChangeBandTension,
  onChangePerSet,
  onSetRating,
  onMindMuscleFelt,
}: LiftCardProps) {
  const checkedSets = checkedSetsProp ?? {}
  const setRatings = setRatingsProp ?? {}
  // Number of working sets currently marked done — used to decide when to
  // surface the mind-muscle tap (after the FIRST working set is logged).
  const doneCount = Array.from({ length: ex.sets }, (_, k) =>
    checkedSets[`${exIdx}-${k}`] ? 1 : 0,
  ).reduce<number>((a, b) => a + b, 0)
  const showMindMuscle = isHardToFeelEx && doneCount >= 1 && mindMuscleFelt === undefined
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
      {/* Header: name + info + swap + PR badge. Weight lives in its own
          full-width row below (see WeightRow) — no corner pill. */}
      <div>
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
          {ex.sets} × {ex.reps}
          {repTarget !== undefined && (
            <>
              {' · '}
              <span
                data-testid={`rep-target-${ex.library_id}`}
                style={{ color: 'var(--brand)', fontWeight: 700 }}
                title="Adaptive rep target based on your last session"
              >
                aim {repTarget}
              </span>
            </>
          )}
          {' · '}{ex.rest_seconds}s rest · RIR {ex.rir}
        </div>
        {(ex.warmup_sets.length > 0 || warmupDelta > 0) && (() => {
          // History delta: prior session's mind-muscle tap was 'missed' →
          // prepend (warmupDelta) extra light warmup rows so the user gets
          // more reps to find the target muscle this session. Cosmetic /
          // suggestive only — does not mutate the stored plan, and skipping
          // them costs nothing.
          const baseSteps = ex.warmup_sets.map((w) => ({
            pct: w.percent / 100,
            reps: w.reps,
            isDelta: false,
          }))
          // Extra warmup rows clone the lightest existing percent (capped
          // at 50%) so we extend the ramp at the bottom — that's where the
          // mind-muscle work happens, not closer to working weight.
          const extras = Array.from({ length: warmupDelta }, () => ({
            pct: ex.warmup_sets[0]
              ? Math.min(0.5, ex.warmup_sets[0].percent / 100)
              : 0.5,
            reps: ex.warmup_sets[0]?.reps ?? 8,
            isDelta: true,
          }))
          const allSteps = [...extras, ...baseSteps]
          const steps = allSteps.map(({ pct, reps, isDelta }) => {
            const rawW = displayedWeight * pct
            const rW = Math.round(rawW / 5) * 5
            const useNumeric = displayedWeight > 0 && rW > 0
            const verbal = pct < 0.55 ? 'light' : pct < 0.8 ? 'medium' : 'almost working'
            const head = useNumeric ? `${rW}` : verbal
            const label = `${head} × ${reps}`
            // Tag extra warmup rows so the rendered string makes the source
            // of the delta legible to the user — "one extra · light × 8".
            return isDelta ? `extra · ${label}` : label
          })
          return (
            <div
              className="mt-3"
              data-testid="warmup-block"
              style={{
                padding: '10px 12px',
                background: 'var(--lumo-overlay)',
                borderRadius: 10,
                borderLeft: '3px solid var(--brand)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  color: 'var(--brand)',
                  textTransform: 'uppercase',
                }}
              >
                Warmup
              </div>
              <div
                className="tabular-nums"
                style={{
                  fontSize: 13,
                  color: 'var(--lumo-text)',
                  marginTop: 2,
                  lineHeight: 1.45,
                }}
              >
                {steps.join(' → ')}
              </div>
            </div>
          )
        })()}
        {ex.notes && (
          <div
            className="text-[12px] mt-2"
            style={{
              color: 'var(--lumo-text-sec)',
              lineHeight: 1.45,
            }}
          >
            {ex.notes}
          </div>
        )}
      </div>

      {/* Full-width working-weight row — tap to edit the number.
          For banded exercises (clamshells, monster walks, …) there's no
          pound load, so we swap in a 4-button tension picker instead. */}
      {isBanded ? (
        <BandTensionRow
          libraryId={ex.library_id}
          tension={bandTension}
          onChange={(t) => onChangeBandTension?.(t)}
        />
      ) : (
        !perSetActive && (
          <WeightRow
            current={displayedWeight}
            onChange={onChangeWeight}
            onTogglePerSet={onToggleExpand}
            perSetExpanded={expanded}
          />
        )
      )}

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

      {/* Circular working-set buttons row + inline 3-tap effort pill.
          The pill row only renders for sets the user has already marked
          done — capturing the signal while the experience is fresh, but
          not nagging the user before they've actually finished the set.
          The taps are optional; absent state is null = "not rated". */}
      <div className="flex items-start gap-2.5 mt-3 flex-wrap">
        {Array.from({ length: ex.sets }, (_, k) => {
          const done = !!checkedSets[`${exIdx}-${k}`]
          const circleKey = `${exIdx}-${k}`
          const burstHere = burstKey === circleKey && burstTrigger > 0 && !burstIsWarmup
          const currentRating = setRatings[circleKey]
          return (
            <div
              key={k}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
            >
              <SetCircle
                done={done}
                label={k + 1}
                exerciseName={ex.name}
                setIndex={k}
                onTap={() => onTapSet(k)}
                showBurst={burstHere}
                burstTrigger={burstTrigger}
              />
              {done && onSetRating && (
                <SetRatingPill
                  exerciseName={ex.name}
                  setIndex={k}
                  current={currentRating}
                  onSelect={(rating) => onSetRating(k, rating)}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mind-muscle tap — only on hard-to-feel exercises, once per session
          per exercise, surfaced after the first working set is marked done.
          Single tap, no modal. Skipping is fine. */}
      {showMindMuscle && onMindMuscleFelt && (
        <MindMusclePill
          exerciseName={ex.name}
          onSelect={(value) => onMindMuscleFelt(value)}
        />
      )}
      {mindMuscleFelt !== undefined && (
        <MindMuscleConfirm value={mindMuscleFelt} />
      )}
    </div>
  )
}

// ─── SetRatingPill ──────────────────────────────────────────────────────
// 3-tap effort capture pill row, surfaced inline below a completed set
// circle. Single tap, no modal. Mint for "easy", brand for "on it",
// plum for "cooked" — the existing palette. Compact (28px tall, 36px wide
// per chip) so the working-set row stays the visual focus.
interface SetRatingPillProps {
  exerciseName: string
  setIndex: number
  current?: SetRating
  onSelect: (rating: SetRating) => void
}

const SET_RATING_OPTIONS: ReadonlyArray<{
  value: SetRating
  label: string
  selectedBg: string
  selectedFg: string
}> = [
  {
    value: 'easy',
    label: 'easy',
    selectedBg: 'color-mix(in srgb, var(--accent-mint) 32%, transparent)',
    selectedFg: 'var(--accent-mint)',
  },
  {
    value: 'on it',
    label: 'on it',
    selectedBg: 'var(--brand)',
    selectedFg: '#fff',
  },
  {
    value: 'cooked',
    label: 'cooked',
    selectedBg: 'color-mix(in srgb, var(--accent-plum) 30%, transparent)',
    selectedFg: 'var(--accent-plum)',
  },
]

function SetRatingPill({ exerciseName, setIndex, current, onSelect }: SetRatingPillProps) {
  return (
    <div
      role="radiogroup"
      aria-label={`Effort for set ${setIndex + 1} of ${exerciseName}`}
      data-testid={`set-rating-${setIndex}`}
      style={{
        display: 'flex',
        gap: 3,
        padding: 3,
        background: 'var(--lumo-overlay)',
        border: '1px solid var(--lumo-border)',
        borderRadius: 999,
      }}
    >
      {SET_RATING_OPTIONS.map(({ value, label, selectedBg, selectedFg }) => {
        const selected = current === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`set-rating-${setIndex}-${value.replace(/\s+/g, '-')}`}
            onClick={() => onSelect(value)}
            style={{
              padding: '3px 8px',
              fontSize: 10,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: '0.02em',
              background: selected ? selectedBg : 'transparent',
              color: selected ? selectedFg : 'var(--lumo-text-ter)',
              border: 'none',
              borderRadius: 999,
              cursor: 'pointer',
              transition: 'background 140ms, color 140ms',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ─── MindMusclePill ─────────────────────────────────────────────────────
// 2-tap "felt it / didn't feel it" prompt for hard-to-feel exercises.
// Surfaced inline once per session after the first working set is logged.
// Single tap, no modal. Renders into the LiftCard footer (below set row)
// so it doesn't pull the user's eye away from active sets.
interface MindMusclePillProps {
  exerciseName: string
  onSelect: (value: 'felt' | 'missed') => void
}

function MindMusclePill({ exerciseName, onSelect }: MindMusclePillProps) {
  return (
    <div
      data-testid="mind-muscle-pill"
      style={{
        marginTop: 12,
        padding: '10px 12px',
        background: 'var(--lumo-overlay)',
        border: '1px solid var(--lumo-border)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--lumo-text-sec)',
          fontFamily: "'Fraunces', Georgia, serif",
          fontStyle: 'italic',
          flex: 1,
          minWidth: 0,
        }}
      >
        feeling it where you should?
      </div>
      <div role="radiogroup" aria-label={`Mind-muscle for ${exerciseName}`} style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          role="radio"
          aria-checked={false}
          data-testid="mind-muscle-felt"
          onClick={() => onSelect('felt')}
          style={{
            padding: '5px 12px',
            fontSize: 11,
            fontWeight: 700,
            background: 'color-mix(in srgb, var(--accent-mint) 18%, transparent)',
            color: 'var(--accent-mint)',
            border: '1px solid color-mix(in srgb, var(--accent-mint) 40%, transparent)',
            borderRadius: 999,
            cursor: 'pointer',
          }}
        >
          felt it
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={false}
          data-testid="mind-muscle-missed"
          onClick={() => onSelect('missed')}
          style={{
            padding: '5px 12px',
            fontSize: 11,
            fontWeight: 700,
            background: 'transparent',
            color: 'var(--lumo-text-sec)',
            border: '1px solid var(--lumo-border-strong)',
            borderRadius: 999,
            cursor: 'pointer',
          }}
        >
          didn't feel it
        </button>
      </div>
    </div>
  )
}

// Compact confirmation chip once the user has answered the mind-muscle
// prompt. Lets them see they tapped without re-surfacing the prompt; no
// way to change the answer (intentional — keep the surface area tiny).
function MindMuscleConfirm({ value }: { value: 'felt' | 'missed' }) {
  const label = value === 'felt' ? 'logged: felt it' : 'logged: noted'
  return (
    <div
      data-testid="mind-muscle-confirm"
      data-mind-muscle-value={value}
      style={{
        marginTop: 10,
        fontSize: 11,
        color: 'var(--lumo-text-ter)',
        fontFamily: "'Fraunces', Georgia, serif",
        fontStyle: 'italic',
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </div>
  )
}

// ─── WeightRow ──────────────────────────────────────────────────────────
// Full-width working-weight field. Tap anywhere on the row to open a
// numeric keyboard and edit. No ± chips, no step selector — the planner's
// suggestion is the default; the user only touches it if they need to.
// Per-set override (rare) is reachable via the chevron which toggles the
// per-set editor in the parent LiftCard.
interface WeightRowProps {
  current: number
  onChange: (next: number) => void
  onTogglePerSet: () => void
  perSetExpanded: boolean
}

function WeightRow({ current, onChange, onTogglePerSet, perSetExpanded }: WeightRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const startEdit = () => {
    setDraft(current > 0 ? String(current) : '')
    setEditing(true)
  }

  const commitEdit = () => {
    const n = Number(draft)
    if (Number.isFinite(n) && n >= 0) onChange(Math.round(n * 2) / 2)
    setEditing(false)
  }

  const hasWeight = current > 0

  return (
    <div
      data-testid="weight-row"
      onClick={(e) => e.stopPropagation()}
      className="mt-3"
      style={{
        padding: '14px 16px',
        background: 'var(--lumo-input-bg)',
        border: editing ? '1px solid var(--brand)' : '1px solid var(--lumo-border-strong)',
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        transition: 'border-color 160ms',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.14em',
          color: 'var(--lumo-text-ter)',
          textTransform: 'uppercase',
        }}
      >
        Working weight
      </div>

      <div className="flex items-center gap-2">
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            step={0.5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              else if (e.key === 'Escape') setEditing(false)
            }}
            aria-label="Edit current weight"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--lumo-text)',
              fontSize: 26,
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              textAlign: 'right',
              width: 100,
              padding: 0,
            }}
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            aria-label={hasWeight ? `Edit weight (${current} lb)` : 'Set weight'}
            style={{
              background: 'transparent',
              border: 'none',
              color: hasWeight ? 'var(--lumo-text)' : 'var(--lumo-text-ter)',
              fontSize: 26,
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {hasWeight ? current : 'tap to set'}
          </button>
        )}
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--lumo-text-sec)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          lb
        </span>
        <button
          type="button"
          onClick={onTogglePerSet}
          aria-label={perSetExpanded ? 'Hide per-set weights' : 'Override per set'}
          aria-expanded={perSetExpanded}
          title="Override per set"
          style={{
            marginLeft: 4,
            color: 'var(--lumo-text-ter)',
            background: 'transparent',
            border: 'none',
            padding: 4,
            cursor: 'pointer',
          }}
        >
          <ChevronDown
            size={16}
            style={{
              transition: 'transform 200ms',
              transform: perSetExpanded ? 'rotate(180deg)' : 'none',
            }}
          />
        </button>
      </div>
    </div>
  )
}

// ─── BandTensionRow ─────────────────────────────────────────────────────
// Banded exercises (clamshells, monster walks, …) have no meaningful pound
// load. The user picks a band by feel, on a 4-step ladder. This component
// occupies the same vertical slot as WeightRow so the LiftCard layout
// stays consistent. Default state is "nothing selected" — that pick is the
// user's call (we don't auto-default to 'light').
const BAND_TENSION_OPTIONS: ReadonlyArray<{ value: BandTension; label: string }> = [
  { value: 'light', label: 'light' },
  { value: 'medium', label: 'medium' },
  { value: 'heavy', label: 'heavy' },
  { value: 'x-heavy', label: 'x-heavy' },
]

interface BandTensionRowProps {
  libraryId: string
  tension: BandTension | undefined
  onChange: (next: BandTension) => void
}

function BandTensionRow({ libraryId, tension, onChange }: BandTensionRowProps) {
  return (
    <div
      data-testid={`band-tension-${libraryId}`}
      onClick={(e) => e.stopPropagation()}
      className="mt-3"
      style={{
        padding: '10px 12px',
        background: 'var(--lumo-input-bg)',
        border: '1px solid var(--lumo-border-strong)',
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.14em',
          color: 'var(--lumo-text-ter)',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        Band
      </div>
      <div
        role="radiogroup"
        aria-label="Band tension"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'var(--lumo-overlay)',
          borderRadius: 10,
          padding: 3,
          flex: 1,
          justifyContent: 'space-between',
          minWidth: 0,
        }}
      >
        {BAND_TENSION_OPTIONS.map(({ value, label }) => {
          const selected = tension === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`band-tension-${libraryId}-${value}`}
              onClick={() => onChange(value)}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '6px 4px',
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                transition: 'background 160ms, color 160ms',
                background: selected ? 'var(--brand)' : 'transparent',
                color: selected ? '#fff' : 'var(--lumo-text-sec)',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
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
