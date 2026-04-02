import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Footprints, Moon, LogOut, Flame } from 'lucide-react'
import { ExerciseCard } from './ExerciseCard'
import { ProgressBar } from './ProgressBar'
import { SessionBar } from './SessionBar'
import { DaySelector } from './DaySelector'
import { TimerOverlay } from './TimerOverlay'
import { AdaptiveRoutine } from './AdaptiveRoutine'
import { useSession } from '../hooks/useSession'
import { DEFAULT_SCHEDULE } from '../data/schedule'
import { DEFAULT_WORKOUTS } from '../data/workouts'
import { WORKOUT_FOCUS } from '../data/workout-focus'
import { saveSession, saveLastWeight, updatePR, loadLastWeights, loadPRs } from '../lib/persistence'
import type { TimerState, SessionPhase } from '../types'

interface WorkoutViewProps {
  userId: string
  profile: { display_name: string; avatar_emoji: string; streak: number; knee_flag: boolean } | null
  onSignOut: () => void
  onWorkoutComplete: () => void
}

// Map exercise IDs to display names (until we have a full exercise DB)
const EXERCISE_NAMES: Record<string, string> = {
  'ex-glute-bridge': 'Glute Bridges',
  'ex-walking-lunge': 'Walking Lunges',
  'ex-leg-curl': 'Leg Curls',
  'ex-lat-pulldown': 'Lat Pulldowns',
  'ex-cable-row': 'Cable Rows',
  'ex-plank': 'Planks',
  'ex-shoulder-press': 'Machine Shoulder Press',
  'ex-lateral-raise': 'Lateral Raises',
  'ex-tricep-extension': 'Tricep Extensions',
  'ex-dumbbell-curl': 'Dumbbell Curls',
  'ex-rear-delt-fly': 'Rear Delt Flies',
  'ex-scissors': 'Scissors',
  'ex-toe-touches': 'Toe Touches',
  'ex-side-plank': 'Side Planks',
  'ex-leg-press': 'Leg Press',
  'ex-rdl': 'RDLs (heavy, go slow!)',
  'ex-hip-adduction': 'Hip Adduction Machine',
  'ex-reverse-lunge-elevated': 'Front Foot Elevated Reverse Lunges',
  'ex-hip-abduction': 'Hip Abduction Machine',
  'ex-cable-kickback': 'Cable Kickbacks',
  'ex-core-choice': 'Pick 3 fave core moves',
  'ex-lat-pulldown-wide': 'Lat Pulldowns (wide grip)',
  'ex-lat-pullover': 'Lat Pullover',
  'ex-single-arm-cable-row': 'Single Arm Cable Rows',
  'ex-face-pull': 'Face Pulls',
  'ex-leg-raise': 'Leg Raises',
  'ex-goblet-squat': 'Goblet Squats (kettlebell)',
  'ex-arnold-press': 'Dumbbell Arnold Press',
  'ex-kb-rdl': 'Kettlebell RDLs',
  'ex-floor-press': 'Floor Press (15s, slow!)',
  'ex-split-squat-kb': 'Split Squat (kettlebell)',
  'ex-kb-swing': 'Kettlebell Swings',
  'ex-db-rear-delt-fly': 'DB Rear Delt Flies',
  'ex-dead-bug': 'Dead Bugs',
  'ex-bicycle-crunch': 'Bicycle Crunches',
  'ex-russian-twist': 'Russian Twists',
}

export function WorkoutView({ userId, profile, onSignOut, onWorkoutComplete }: WorkoutViewProps) {
  const todayIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 })()
  const [selectedDay, setSelectedDay] = useState(todayIdx)
  const [timer, setTimer] = useState<TimerState | null>(null)
  const [showWarmup, setShowWarmup] = useState(false)
  const [showCooldown, setShowCooldown] = useState(false)
  const [weights, setWeights] = useState<Record<string, number>>({})
  const [lastWeights, setLastWeights] = useState<Record<string, number>>({})
  const [prs, setPrs] = useState<Record<string, number>>({})

  const { session, startSession, switchPhase, endSession, toggleSet } = useSession()

  // Load saved weights and PRs on mount
  useEffect(() => {
    if (userId) {
      loadLastWeights(userId).then(setLastWeights)
      loadPRs(userId).then(setPrs)
    }
  }, [userId])

  const schedule = DEFAULT_SCHEDULE
  const dayInfo = schedule[selectedDay]
  const workout = dayInfo.workout_id
    ? DEFAULT_WORKOUTS.find(w => w.id === dayInfo.workout_id)
    : null

  const checkedSets = session?.checked_sets || {}

  const totalSets = workout
    ? workout.sections.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets, 0), 0)
    : 0
  const doneSets = workout
    ? workout.sections.reduce((a, s, si) =>
        a + s.exercises.reduce((b, e, ei) =>
          b + Array.from({ length: e.sets }, (_, k) => checkedSets[`${si}-${ei}-${k}`] ? 1 as number : 0 as number).reduce((x: number, y: number) => x + y, 0), 0), 0)
    : 0

  const startTimer = (seconds: number, label: string, type: 'rest' | 'work') => {
    setTimer({ seconds, label, type })
  }

  // Save session to Supabase when ending workout
  const handleEndSession = useCallback(async () => {
    if (!session || !workout) {
      endSession()
      return
    }

    const endedSession = { ...session }
    endSession()

    // Save session
    const now = new Date().toISOString()
    await saveSession({
      userId,
      workoutId: workout.id,
      workoutTitle: workout.title,
      date: new Date().toISOString().split('T')[0],
      startedAt: endedSession.started_at,
      endedAt: now,
      phases: endedSession.phases.map(p => p.ended_at ? p : { ...p, ended_at: now }),
      completedSets: doneSets,
      totalSets,
    })

    // Save weights and check PRs
    for (const [exerciseId, weight] of Object.entries(weights)) {
      if (weight > 0) {
        await saveLastWeight(userId, exerciseId, weight)
        const name = EXERCISE_NAMES[exerciseId] || exerciseId
        await updatePR(userId, exerciseId, name, weight)
      }
    }

    // Update streak
    if (doneSets > 0) {
      onWorkoutComplete()
    }

    // Reload weights/PRs
    loadLastWeights(userId).then(setLastWeights)
    loadPRs(userId).then(setPrs)
    setWeights({})
  }, [session, workout, userId, weights, doneSets, totalSets, endSession, onWorkoutComplete])

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

        {/* Daily cardio banner */}
        <div className="flex items-center gap-3 bg-surface-raised border border-border-subtle rounded-2xl px-3.5 py-2.5 mt-3">
          <Footprints size={18} className="text-zinc-400 shrink-0" />
          <div>
            <div className="font-bold text-[13px]">Daily Cardio</div>
            <div className="text-xs text-zinc-500">10k steps + 30 min treadmill or 15 min stair master</div>
          </div>
        </div>

        {/* Rest day */}
        {!workout && (
          <div className="text-center py-16 bg-surface-raised rounded-2xl mt-5 border border-border-subtle">
            <div className="text-5xl mb-3">{'😴'}</div>
            <div className="text-xl font-bold">Rest Day</div>
            <div className="text-zinc-400 text-sm mt-1.5">Cardio, stretch, and sleep!</div>
          </div>
        )}

        {/* Workout content */}
        {workout && (
          <div className="mt-3 space-y-2.5">

            {/* Session bar (start/stop workout + phase tracking) */}
            <SessionBar
              started_at={session?.started_at || null}
              currentPhase={session?.current_phase || null}
              phases={session?.phases || []}
              onStart={() => startSession(workout.id)}
              onSwitchPhase={(phase: SessionPhase['name']) => switchPhase(phase)}
              onEnd={handleEndSession}
            />

            {/* Progress */}
            <ProgressBar
              current={doneSets}
              total={totalSets}
              emoji={workout.emoji}
              title={workout.title}
              estMinutes={workout.est_minutes}
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
                workoutFocus={WORKOUT_FOCUS[workout.id] || ['full_body']}
                kneeFlag={profile?.knee_flag}
                onStartTimer={startTimer}
              />
            )}

            {/* Exercise sections */}
            {workout.sections.map((section, si) => (
              <div key={si} className="bg-surface-raised border border-border-subtle rounded-2xl p-3.5">
                <div className="text-sm font-bold text-brand uppercase tracking-wide mb-1.5">
                  {section.name}
                </div>
                {section.note && (
                  <div className="text-xs text-orange-400 italic mb-2">{section.note}</div>
                )}
                {section.exercises.map((ex, ei) => (
                  <ExerciseCard
                    key={ei}
                    exercise={ex}
                    exerciseName={EXERCISE_NAMES[ex.exercise_id] || ex.exercise_id}
                    sectionIdx={si}
                    exerciseIdx={ei}
                    checkedSets={checkedSets}
                    onToggleSet={toggleSet}
                    onStartTimer={startTimer}
                    weight={weights[ex.exercise_id]}
                    lastWeight={lastWeights[ex.exercise_id]}
                    pr={prs[ex.exercise_id]}
                    onWeightChange={(id, w) => setWeights(prev => ({ ...prev, [id]: w }))}
                  />
                ))}
              </div>
            ))}

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
                workoutFocus={WORKOUT_FOCUS[workout.id] || ['full_body']}
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
    </div>
  )
}
