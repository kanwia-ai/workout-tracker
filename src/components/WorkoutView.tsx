import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronRight, Footprints, Moon, LogOut, Flame, Plus, BarChart3, Check, Timer, TrendingUp, RefreshCw, X } from 'lucide-react'
import { ProgressBar } from './ProgressBar'
import { SessionBar } from './SessionBar'
import { DaySelector } from './DaySelector'
import { TimerOverlay } from './TimerOverlay'
import { AdaptiveRoutine } from './AdaptiveRoutine'
import { WeeklyRecap } from './WeeklyRecap'
import { ProtocolSection } from './ProtocolSection'
import { PainCheckIn } from './PainCheckIn'
import { useSession } from '../hooks/useSession'
import { useProtocol } from '../hooks/useProtocol'
import { QUAD_PROTOCOL } from '../data/protocols'
import { DEFAULT_SCHEDULE } from '../data/schedule'
import { WORKOUT_FOCUS } from '../data/workout-focus'
import { MOCK_WEEKLY_RECAP } from '../data/mock-progress'
import { getProgramWeek, getPeriodConfig, buildWorkoutForDay, initProgramIfNeeded, PROGRAM } from '../data/program'
import { getExerciseById } from '../data/exercises'
import { ExerciseDetail } from './ExerciseDetail'
import { saveSession, saveLastWeight, updatePR, loadLastWeights, loadPRs } from '../lib/persistence'
import type { TimerState, SessionPhase, Exercise } from '../types'

interface WorkoutViewProps {
  userId: string
  profile: { display_name: string; avatar_emoji: string; streak: number; knee_flag: boolean } | null
  onSignOut: () => void
  onWorkoutComplete: () => void
  onNavigateToCapture: () => void
  onNavigateCardio: () => void
  onNavigateProgress: () => void
}

export function WorkoutView({ userId, profile, onSignOut, onWorkoutComplete, onNavigateToCapture, onNavigateCardio, onNavigateProgress }: WorkoutViewProps) {
  const todayIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 })()
  const [selectedDay, setSelectedDay] = useState(todayIdx)
  const [timer, setTimer] = useState<TimerState | null>(null)
  const [showWarmup, setShowWarmup] = useState(false)
  const [showCooldown, setShowCooldown] = useState(false)
  const [weights, setWeights] = useState<Record<string, number>>({})
  const [lastWeights, setLastWeights] = useState<Record<string, number>>({})
  const [_prs, setPrs] = useState<Record<string, number>>({})
  const [showRecap, setShowRecap] = useState(true)
  const [showPainCheckIn, setShowPainCheckIn] = useState(false)
  const [checkedSets, setCheckedSets] = useState<Record<string, boolean>>({})
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null)
  const [skippedExercises, setSkippedExercises] = useState<Set<number>>(new Set())
  const [swaps, setSwaps] = useState<Record<number, number>>({}) // exerciseIdx -> swap offset

  const { session, startSession, switchPhase, endSession } = useSession()
  const { logPain } = useProtocol(QUAD_PROTOCOL.id, QUAD_PROTOCOL.total_weeks)

  // Initialize program week tracking
  useEffect(() => { initProgramIfNeeded() }, [])

  // Load saved weights and PRs on mount
  useEffect(() => {
    if (userId) {
      loadLastWeights(userId).then(setLastWeights)
      loadPRs(userId).then(setPrs)
    }
  }, [userId])

  const schedule = DEFAULT_SCHEDULE
  const dayInfo = schedule[selectedDay]
  const workoutId = dayInfo.workout_id

  // Build dynamic workout based on program week
  const programWeek = getProgramWeek()
  const period = getPeriodConfig(programWeek)
  const dynamicWorkout = useMemo(
    () => workoutId ? buildWorkoutForDay(workoutId, programWeek) : null,
    [workoutId, programWeek]
  )

  // Resolve swapped exercises
  const dayProgram = workoutId ? PROGRAM[workoutId] : null
  const resolvedExercises = useMemo(() => {
    if (!dynamicWorkout || !dayProgram) return []
    return dynamicWorkout.exercises.map((ex, i) => {
      const swapOffset = swaps[i] || 0
      if (swapOffset === 0) return ex
      const slot = dayProgram.slots[i]
      if (!slot) return ex
      const picked = slot.options[(programWeek - 1 + swapOffset) % slot.options.length]
      return { ...ex, id: picked.id, name: picked.name }
    })
  }, [dynamicWorkout, dayProgram, swaps, programWeek])

  const resolvedCore = useMemo(() => {
    if (!dynamicWorkout || !dayProgram) return []
    return dynamicWorkout.coreExercises.map((ex, i) => {
      const globalIdx = (dynamicWorkout?.exercises.length || 0) + i
      const swapOffset = swaps[globalIdx] || 0
      if (swapOffset === 0) return ex
      const slot = dayProgram.coreSlots[i]
      if (!slot) return ex
      const picked = slot.options[(programWeek - 1 + swapOffset) % slot.options.length]
      return { ...ex, id: picked.id, name: picked.name }
    })
  }, [dynamicWorkout, dayProgram, swaps, programWeek])

  const allExercises = [...resolvedExercises, ...resolvedCore]
  const totalSets = allExercises.reduce((a, e) => a + e.sets, 0)
  const doneSets = allExercises.reduce((a, e, ei) =>
    a + Array.from({ length: e.sets }, (_, k) => checkedSets[`${ei}-${k}`] ? 1 as number : 0 as number).reduce((x: number, y: number) => x + y, 0), 0)

  const toggleSet = (exerciseIdx: number, setIdx: number) => {
    const key = `${exerciseIdx}-${setIdx}`
    setCheckedSets(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const startTimer = (seconds: number, label: string, type: 'rest' | 'work') => {
    setTimer({ seconds, label, type })
  }

  // Save session when ending workout
  const handleEndSession = useCallback(async () => {
    if (!session || !dynamicWorkout) {
      endSession()
      return
    }

    const endedSession = { ...session }
    endSession()
    setCheckedSets({})

    const now = new Date().toISOString()
    await saveSession({
      userId,
      workoutId: workoutId || '',
      workoutTitle: dynamicWorkout.title,
      date: new Date().toISOString().split('T')[0],
      startedAt: endedSession.started_at,
      endedAt: now,
      phases: endedSession.phases.map(p => p.ended_at ? p : { ...p, ended_at: now }),
      completedSets: doneSets,
      totalSets,
    })

    for (const [exerciseId, weight] of Object.entries(weights)) {
      if (weight > 0) {
        const ex = allExercises.find(e => e.id === exerciseId)
        await saveLastWeight(userId, exerciseId, weight)
        await updatePR(userId, exerciseId, ex?.name || exerciseId, weight)
      }
    }

    if (doneSets > 0) onWorkoutComplete()

    loadLastWeights(userId).then(setLastWeights)
    loadPRs(userId).then(setPrs)
    setWeights({})

    // Pain check-in on lower body days
    const focus = workoutId ? WORKOUT_FOCUS[workoutId] || [] : []
    if (focus.some(f => ['legs', 'glutes'].includes(f))) {
      setShowPainCheckIn(true)
    }
  }, [session, dynamicWorkout, workoutId, userId, weights, doneSets, totalSets, endSession, onWorkoutComplete, allExercises])

  // Phase badge colors
  const phaseColors: Record<string, string> = {
    'hypertrophy': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'strength-hypertrophy': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'strength': 'bg-red-500/20 text-red-300 border-red-500/30',
    'deload': 'bg-green-500/20 text-green-300 border-green-500/30',
  }

  return (
    <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
      <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">

        {/* Header */}
        <div className="flex items-center justify-between pt-3 pb-4">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight bg-gradient-to-r from-brand to-orange-300 bg-clip-text text-transparent">
              My Training Plan
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {profile?.display_name ? `Hey ${profile.display_name}` : '4 gym days / 1 at-home'}
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

        {/* Day selector */}
        <DaySelector
          schedule={schedule}
          selectedDay={selectedDay}
          todayIdx={todayIdx}
          onSelect={setSelectedDay}
        />

        {/* Program week + phase badge */}
        <div className="flex items-center gap-2 mt-3">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${phaseColors[period.phase] || 'bg-zinc-800 text-zinc-300'}`}>
            <TrendingUp size={12} />
            Week {programWeek} — {period.label}
          </div>
          <span className="text-[11px] text-zinc-600">{period.intensity}</span>
        </div>

        {/* Weekly recap */}
        {showRecap && (
          <div className="mt-3">
            <WeeklyRecap
              data={MOCK_WEEKLY_RECAP}
              onDismiss={() => setShowRecap(false)}
              onViewProgress={onNavigateProgress}
            />
          </div>
        )}

        {/* Daily cardio banner */}
        <button
          onClick={onNavigateCardio}
          className="w-full flex items-center gap-3 bg-surface-raised border border-border-subtle rounded-2xl px-3.5 py-2.5 mt-3 text-left active:scale-[0.98] transition-transform"
        >
          <Footprints size={18} className="text-zinc-400 shrink-0" />
          <div className="flex-1">
            <div className="font-bold text-[13px]">Daily Cardio</div>
            <div className="text-xs text-zinc-500">10k steps + 30 min treadmill or 15 min stair master</div>
          </div>
          <ChevronRight size={16} className="text-zinc-600 shrink-0" />
        </button>

        {/* Rest day */}
        {!dynamicWorkout && (
          <div className="text-center py-16 bg-surface-raised rounded-2xl mt-5 border border-border-subtle">
            <div className="text-5xl mb-3">{'😴'}</div>
            <div className="text-xl font-bold">Rest Day</div>
            <div className="text-zinc-400 text-sm mt-1.5">Cardio, stretch, and sleep!</div>
          </div>
        )}

        {/* Workout content */}
        {dynamicWorkout && workoutId && (
          <div className="mt-3 space-y-2.5">

            {/* Session bar */}
            <SessionBar
              started_at={session?.started_at || null}
              currentPhase={session?.current_phase || null}
              phases={session?.phases || []}
              onStart={() => startSession(workoutId)}
              onSwitchPhase={(phase: SessionPhase['name']) => switchPhase(phase)}
              onEnd={handleEndSession}
            />

            {/* Progress */}
            <ProgressBar
              current={doneSets}
              total={totalSets}
              emoji={dynamicWorkout.emoji}
              title={dynamicWorkout.title}
              estMinutes={60}
            />

            {/* Adaptive Warm-Up */}
            <button
              onClick={() => setShowWarmup(!showWarmup)}
              className="w-full flex justify-between items-center bg-surface-raised border border-border-subtle rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-300"
            >
              <span>{'🔥'} Warm-Up</span>
              <ChevronDown size={16} className={`transition-transform ${showWarmup ? 'rotate-180' : ''}`} />
            </button>
            {showWarmup && (
              <AdaptiveRoutine
                mode="warmup"
                workoutFocus={WORKOUT_FOCUS[workoutId] || ['full_body']}
                kneeFlag={profile?.knee_flag}
                onStartTimer={startTimer}
              />
            )}

            {/* Integrated protocol (lower body days) */}
            <ProtocolSection
              workoutFocus={WORKOUT_FOCUS[workoutId] || ['full_body']}
              onStartTimer={startTimer}
            />

            {/* Main Lifts */}
            <div className="bg-surface-raised border border-border-subtle rounded-2xl p-3.5">
              <div className="text-sm font-bold text-brand uppercase tracking-wide mb-1.5">
                Main Lifts
              </div>
              <div className="text-[11px] text-zinc-600 mb-2">
                {period.setsMain}x{period.repsMain} • {period.restMain}s rest
              </div>
              {resolvedExercises.map((ex, ei) => {
                if (skippedExercises.has(ei)) return null
                const isCompleted = Array.from({ length: ex.sets }, (_, k) => checkedSets[`${ei}-${k}`]).every(Boolean)
                return (
                  <div key={`${ex.id}-${ei}`} className={`py-2.5 ${ei > 0 ? 'border-t border-zinc-800/50' : ''}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const detail = getExerciseById(ex.id)
                              if (detail) setViewingExercise(detail)
                            }}
                            className={`text-[13px] font-semibold text-left underline decoration-zinc-700 underline-offset-2 active:text-brand transition-colors ${isCompleted ? 'text-zinc-500 line-through' : ''}`}
                          >
                            {ex.name}
                          </button>
                        </div>
                        <div className="text-[11px] text-zinc-600">{ex.role}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Swap */}
                        <button
                          onClick={() => setSwaps(prev => ({ ...prev, [ei]: (prev[ei] || 0) + 1 }))}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 active:scale-90"
                          title="Swap exercise"
                        >
                          <RefreshCw size={13} />
                        </button>
                        {/* Skip */}
                        <button
                          onClick={() => setSkippedExercises(prev => new Set(prev).add(ei))}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 active:scale-90"
                          title="Skip exercise"
                        >
                          <X size={13} />
                        </button>
                        {/* Weight input */}
                        {lastWeights[ex.id] && (
                          <span className="text-[10px] text-zinc-600 ml-1">
                            last: {lastWeights[ex.id]}lb
                          </span>
                        )}
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="lbs"
                          value={weights[ex.id] || ''}
                          onChange={e => setWeights(prev => ({ ...prev, [ex.id]: Number(e.target.value) }))}
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
                        onClick={() => startTimer(ex.rest, 'Rest', 'rest')}
                        className="h-8 px-2 rounded-lg bg-zinc-800 text-zinc-500 border border-zinc-700 active:scale-90"
                      >
                        <Timer size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Core */}
            {resolvedCore.length > 0 && (
              <div className="bg-surface-raised border border-border-subtle rounded-2xl p-3.5">
                <div className="text-sm font-bold text-brand uppercase tracking-wide mb-1.5">
                  Core
                </div>
                {resolvedCore.map((ex, ci) => {
                  const globalIdx = resolvedExercises.length + ci
                  if (skippedExercises.has(globalIdx)) return null
                  const isCompleted = Array.from({ length: ex.sets }, (_, k) => checkedSets[`${globalIdx}-${k}`]).every(Boolean)
                  return (
                    <div key={`${ex.id}-${ci}`} className={`py-2.5 ${ci > 0 ? 'border-t border-zinc-800/50' : ''}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <button
                          onClick={() => {
                            const detail = getExerciseById(ex.id)
                            if (detail) setViewingExercise(detail)
                          }}
                          className={`text-[13px] font-semibold text-left underline decoration-zinc-700 underline-offset-2 active:text-brand transition-colors ${isCompleted ? 'text-zinc-500 line-through' : ''}`}
                        >
                          {ex.name}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSwaps(prev => ({ ...prev, [globalIdx]: (prev[globalIdx] || 0) + 1 }))}
                            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 active:scale-90"
                          >
                            <RefreshCw size={13} />
                          </button>
                          <button
                            onClick={() => setSkippedExercises(prev => new Set(prev).add(globalIdx))}
                            className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 active:scale-90"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: ex.sets }, (_, k) => (
                          <button
                            key={k}
                            onClick={() => toggleSet(globalIdx, k)}
                            className={`flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all active:scale-90 ${
                              checkedSets[`${globalIdx}-${k}`]
                                ? 'bg-brand text-white'
                                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                            }`}
                          >
                            {checkedSets[`${globalIdx}-${k}`] ? <Check size={14} /> : k + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => startTimer(ex.rest, 'Rest', 'rest')}
                          className="h-8 px-2 rounded-lg bg-zinc-800 text-zinc-500 border border-zinc-700 active:scale-90"
                        >
                          <Timer size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Adaptive Cool-Down */}
            <button
              onClick={() => setShowCooldown(!showCooldown)}
              className="w-full flex justify-between items-center bg-surface-raised border border-border-subtle rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-300"
            >
              <span>{'🧊'} Cool-Down</span>
              <ChevronDown size={16} className={`transition-transform ${showCooldown ? 'rotate-180' : ''}`} />
            </button>
            {showCooldown && (
              <AdaptiveRoutine
                mode="cooldown"
                workoutFocus={WORKOUT_FOCUS[workoutId] || ['full_body']}
                kneeFlag={profile?.knee_flag}
                onStartTimer={startTimer}
              />
            )}

            {/* Sleep reminder */}
            <div className="flex items-center gap-3 bg-purple-soft border border-purple-900/30 rounded-2xl px-3.5 py-3">
              <Moon size={18} className="text-purple-300 shrink-0" />
              <div className="text-[13px] text-purple-300">
                <strong>Sleep is key!</strong> Aim for 7-9 hours.
              </div>
            </div>
          </div>
        )}
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

      {/* Exercise detail modal */}
      {viewingExercise && (
        <div className="fixed inset-0 z-50 bg-surface overflow-y-auto">
          <ExerciseDetail
            exercise={viewingExercise}
            onBack={() => setViewingExercise(null)}
          />
        </div>
      )}

      {/* Pain check-in */}
      {showPainCheckIn && (
        <PainCheckIn
          onSubmit={(painLevel, swelling, notes) => {
            logPain(painLevel, swelling, notes)
            setShowPainCheckIn(false)
          }}
          onSkip={() => setShowPainCheckIn(false)}
        />
      )}
    </div>
  )
}
