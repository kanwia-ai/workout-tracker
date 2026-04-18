import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { LogOut, Flame, Plus, BarChart3, Check, Timer, Loader2, Moon } from 'lucide-react'
import { ProgressBar } from './ProgressBar'
import { SessionBar } from './SessionBar'
import { TimerOverlay } from './TimerOverlay'
import { useSession } from '../hooks/useSession'
import { usePlan } from '../hooks/usePlan'
import { getToday, getWeekView } from '../lib/planSelectors'
import { saveSession, saveLastWeight, updatePR, loadLastWeights, loadPRs } from '../lib/persistence'
import type { TimerState, SessionPhase } from '../types'
import type { PlannedSession } from '../types/plan'

// ─── localStorage keys ────────────────────────────────────────────────────
// Session selection is no longer date-based — we persist the session *id*
// the user is viewing so they can jump between days of the mesocycle and
// have the choice survive a reload.
const SELECTED_SESSION_KEY = 'workout-tracker:selected-session-id'
const HAS_USED_KEY = 'workout-tracker:has-used'
const CHECKED_SETS_KEY = (sessionId: string) => `workout-tracker:checked-sets:${sessionId}`
const WEIGHTS_KEY = (sessionId: string) => `workout-tracker:weights:${sessionId}`

function loadSelectedSessionId(): string | null {
  try {
    const raw = localStorage.getItem(SELECTED_SESSION_KEY)
    return raw ? (JSON.parse(raw) as string) : null
  } catch {
    return null
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

  // ─── Selected session ────────────────────────────────────────────────────
  // Priority: user's explicit choice (persisted) → plan's getToday() →
  // first available session. Falls back to null when the plan is complete.
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    () => loadSelectedSessionId(),
  )

  useEffect(() => {
    if (selectedSessionId) {
      localStorage.setItem(SELECTED_SESSION_KEY, JSON.stringify(selectedSessionId))
    } else {
      localStorage.removeItem(SELECTED_SESSION_KEY)
    }
  }, [selectedSessionId])

  const selectedSession: PlannedSession | null = useMemo(() => {
    if (!plan) return null
    if (selectedSessionId) {
      const match = plan.sessions.find(s => s.id === selectedSessionId)
      if (match) return match
      // Stored id no longer exists in the plan (e.g., plan regenerated) —
      // fall through to getToday below. Don't clear state here to avoid
      // firing a render-phase setState; the effect below handles cleanup.
    }
    return getToday(plan)
  }, [plan, selectedSessionId])

  // If the persisted id points to a session that isn't in this plan, clear it
  // so a future reload doesn't keep trying to find a ghost session.
  useEffect(() => {
    if (!plan || !selectedSessionId) return
    const exists = plan.sessions.some(s => s.id === selectedSessionId)
    if (!exists) setSelectedSessionId(null)
  }, [plan, selectedSessionId])

  const selectedSessionKey = selectedSession?.id ?? null

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

  const { session, startSession, switchPhase, endSession, clearSession } = useSession()

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

  // ─── Derived: week view chips + progress ─────────────────────────────────
  const currentWeek = selectedSession?.week_number ?? 1
  const weekSessions = useMemo(() => getWeekView(plan, currentWeek), [plan, currentWeek])

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

  // No plan yet (user landed here without onboarding — defensive fallback)
  if (!plan) {
    return (
      <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
        <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">
          {Header}
          <div className="text-center py-16 bg-surface-raised rounded-2xl mt-5 border border-border-subtle">
            <div className="text-5xl mb-3">🏗️</div>
            <div className="text-xl font-bold">No plan yet</div>
            <div className="text-zinc-400 text-sm mt-1.5 px-6">
              Complete onboarding to generate your personalized training block.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Plan exists but every session is done — hold for a future "generate next block" flow
  if (!selectedSession) {
    return (
      <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
        <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">
          {Header}
          <div className="text-center py-16 bg-surface-raised rounded-2xl mt-5 border border-border-subtle">
            <div className="text-5xl mb-3">🎉</div>
            <div className="text-xl font-bold">Plan complete!</div>
            <div className="text-zinc-400 text-sm mt-1.5 px-6">
              You finished this block. Generate a new one to keep going.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: active session ──────────────────────────────────────────────
  const statusDotClass: Record<PlannedSession['status'], string> = {
    upcoming: 'bg-zinc-500',
    in_progress: 'bg-brand',
    completed: 'bg-zinc-700',
    skipped: 'bg-zinc-800',
  }

  return (
    <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
      <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">
        {Header}

        {/* Week label + mesocycle progress */}
        <div className="flex items-center gap-2 mt-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border-subtle bg-surface-raised text-xs font-bold text-zinc-300">
            Week {currentWeek} of {plan.length_weeks}
          </div>
          <span className="text-[11px] text-zinc-600">{plan.sessions.length} sessions this block</span>
        </div>

        {/* Week view: horizontal-scroll session chips */}
        <div
          className="flex gap-2 overflow-x-auto mt-3 pb-1 -mx-3 px-3"
          style={{ scrollbarWidth: 'none' }}
        >
          {weekSessions.map(s => {
            const isSelected = s.id === selectedSession.id
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                  isSelected
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-border-subtle bg-surface-raised text-zinc-400'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass[s.status]}`} />
                <span className="whitespace-nowrap">{s.title}</span>
              </button>
            )
          })}
        </div>

        {/* Workout content */}
        <div className="mt-3 space-y-2.5">
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
                      <div className={`text-[13px] font-semibold ${isCompleted ? 'text-zinc-500 line-through' : ''}`}>
                        {ex.name}
                      </div>
                      <div className="text-[11px] text-zinc-600">
                        {ex.sets}×{ex.reps} @RIR {ex.rir} · {ex.rest_seconds}s rest · {ex.role}
                      </div>
                      {ex.notes && (
                        <div className="text-[11px] text-zinc-500 mt-0.5 italic">{ex.notes}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {lastWeights[ex.library_id] && (
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

          {/* Sleep reminder */}
          <div className="flex items-center gap-3 bg-purple-soft border border-purple-900/30 rounded-2xl px-3.5 py-3">
            <Moon size={18} className="text-purple-300 shrink-0" />
            <div className="text-[13px] text-purple-300">
              <strong>Sleep is key!</strong> Aim for 7-9 hours.
            </div>
          </div>
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
    </div>
  )
}
