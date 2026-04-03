import { useState } from 'react'
import { ChevronLeft, ChevronDown, Timer, Clock } from 'lucide-react'

// ─── Routine definitions ────────────────────────────────────────────────────

interface MobilityExercise {
  name: string
  duration: string
  seconds?: number
  cue: string
}

interface MobilityRoutine {
  id: string
  title: string
  emoji: string
  duration: string
  description: string
  exercises: MobilityExercise[]
}

const ROUTINES: MobilityRoutine[] = [
  {
    id: 'hip-mobility',
    title: 'Hip Mobility',
    emoji: '\u{1F9D8}',
    duration: '10-15 min',
    description: 'Open up tight hips from sitting all day. Great before leg day or as a standalone routine. Targets hip flexors, adductors, external rotators, and glute activation.',
    exercises: [
      { name: '90/90 Hip Stretch', duration: '45s each side', seconds: 45, cue: 'Sit tall, both legs at 90 degrees. Breathe into the stretch.' },
      { name: 'Half-Kneeling Hip Flexor Stretch', duration: '30s each side', seconds: 30, cue: 'Pad under back knee, squeeze back glute, lean forward gently.' },
      { name: 'Pigeon Pose', duration: '45s each side', seconds: 45, cue: 'Square hips, sink down. Use figure-4 if knee-sensitive.' },
      { name: 'Frog Stretch', duration: '45s', seconds: 45, cue: 'On all fours, knees wide. Sink hips back to feel inner thigh stretch.' },
      { name: 'Standing Hip Circle', duration: '10 each direction per leg', cue: 'Big slow circles. Hold wall for balance.' },
      { name: 'Leg Swing (front-to-back)', duration: '10 each leg', cue: 'Hold wall for balance. Controlled swing, gradually increase range.' },
      { name: 'Leg Swing (side-to-side)', duration: '10 each leg', cue: 'Face the wall. Swing across body.' },
      { name: 'Fire Hydrant', duration: '10 each side', cue: 'Keep core tight, lift from the hip.' },
      { name: 'Banded Clamshell', duration: '12 each side', cue: 'Keep feet together, rotate from hip. Slow and controlled.' },
      { name: 'Butterfly Stretch', duration: '45s', seconds: 45, cue: 'Soles of feet together, sit tall, gentle press with elbows.' },
      { name: 'Happy Baby Pose', duration: '30s', seconds: 30, cue: 'Grab outside of feet, pull knees toward armpits, rock side to side.' },
    ],
  },
  {
    id: 'back-spine',
    title: 'Back & Spine',
    emoji: '\u{1F9B4}',
    duration: '10-12 min',
    description: 'Release tension in the thoracic spine, lower back, and surrounding muscles. Essential if you sit at a desk or feel "tight as a knot."',
    exercises: [
      { name: 'Cat-Cow (slow)', duration: '10 slow cycles', cue: 'Hold each position 3 seconds. Move through the entire spine.' },
      { name: 'Thread the Needle', duration: '8 each side', cue: 'From all fours, reach under and rotate. Follow hand with eyes.' },
      { name: 'Thoracic Spine Rotation', duration: '8 each side', cue: 'Hand behind head, rotate open. Move from upper back, not lower.' },
      { name: 'Child\'s Pose', duration: '45s', seconds: 45, cue: 'Knees wide, reach arms forward, sink hips to heels.' },
      { name: 'Supine Spinal Twist', duration: '30s each side', seconds: 30, cue: 'Lie on back, drop knees to one side, look opposite direction.' },
      { name: 'Cobra / Upward Dog', duration: '20s', seconds: 20, cue: 'Hips on floor, press up through hands, open chest.' },
      { name: 'Knees-to-Chest Hug', duration: '30s', seconds: 30, cue: 'Lie on back, hug both knees to chest, rock gently side to side.' },
      { name: 'Foam Roll Upper Back', duration: '60s', seconds: 60, cue: 'Roller under upper back, arms crossed. Roll mid to upper back slowly.' },
      { name: 'Bird Dog', duration: '8 each side', cue: 'Extend opposite arm and leg. Keep hips square, slow and controlled.' },
    ],
  },
  {
    id: 'general-flexibility',
    title: 'General Flexibility',
    emoji: '\u{1F938}',
    duration: '15-20 min',
    description: 'Full-body stretch and flexibility routine. Covers hips, shoulders, back, and legs. Perfect for rest days or after any workout.',
    exercises: [
      { name: 'Cat-Cow', duration: '10 cycles', cue: 'Arch and round spine, move segment by segment.' },
      { name: 'Downward Dog', duration: '30s', seconds: 30, cue: 'Inverted V, push hips up and back, pedal feet.' },
      { name: 'Half-Kneeling Hip Flexor Stretch', duration: '30s each side', seconds: 30, cue: 'Pad under back knee, squeeze glute, tall posture.' },
      { name: 'Pigeon Pose', duration: '45s each side', seconds: 45, cue: 'Square hips, sink down gently.' },
      { name: 'Standing Hamstring Stretch', duration: '30s each side', seconds: 30, cue: 'Foot on low surface, hinge at hips, keep back flat.' },
      { name: 'Standing Calf Stretch (wall)', duration: '30s each side', seconds: 30, cue: 'Back leg straight, heel down, lean forward.' },
      { name: 'Standing Quad Stretch', duration: '20s each side', seconds: 20, cue: 'Hold wall for balance, keep knees together, gentle pull.' },
      { name: 'Doorway Chest Stretch', duration: '30s each side', seconds: 30, cue: 'Arm on doorframe at 90 degrees, step through.' },
      { name: 'Cross-Body Shoulder Stretch', duration: '20s each arm', seconds: 20, cue: 'Pull arm across chest, don\'t rotate torso.' },
      { name: 'Wall Slide (Wall Angel)', duration: '10 reps', cue: 'Back flat against wall, slide arms up and down keeping contact.' },
      { name: 'Supine Spinal Twist', duration: '30s each side', seconds: 30, cue: 'Lie on back, drop knees to one side, look opposite.' },
      { name: 'Figure-4 Stretch', duration: '30s each side', seconds: 30, cue: 'Lie on back, ankle on opposite knee, pull bottom leg toward chest.' },
      { name: 'Neck Side Bend', duration: '20s each side', seconds: 20, cue: 'Ear toward shoulder, gentle hand pressure.' },
      { name: 'Deep Breathing (4-4-6)', duration: '60s', seconds: 60, cue: 'Inhale 4s, hold 4s, exhale 6s. Belly breathing, close eyes.' },
    ],
  },
]

// ─── Component ──────────────────────────────────────────────────────────────

interface MobilityRoutinesProps {
  onBack: () => void
  onStartTimer?: (seconds: number, label: string, type: 'rest' | 'work') => void
}

export function MobilityRoutines({ onBack, onStartTimer }: MobilityRoutinesProps) {
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null)
  const [checkedExercises, setCheckedExercises] = useState<Record<string, boolean>>({})

  const toggleRoutine = (id: string) => {
    setExpandedRoutine(expandedRoutine === id ? null : id)
  }

  const toggleExercise = (routineId: string, exerciseIdx: number) => {
    const key = `${routineId}-${exerciseIdx}`
    setCheckedExercises(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const getRoutineProgress = (routine: MobilityRoutine) => {
    let done = 0
    for (let i = 0; i < routine.exercises.length; i++) {
      if (checkedExercises[`${routine.id}-${i}`]) done++
    }
    return done
  }

  return (
    <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
      <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">

        {/* Header */}
        <div className="flex items-center gap-3 pt-3 pb-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg text-zinc-400 active:scale-95 transition-transform"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-[20px] font-extrabold tracking-tight bg-gradient-to-r from-brand to-orange-300 bg-clip-text text-transparent">
              Mobility Routines
            </h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Pre-built routines for flexibility and recovery
            </p>
          </div>
        </div>

        {/* Routines */}
        <div className="space-y-3">
          {ROUTINES.map(routine => {
            const isExpanded = expandedRoutine === routine.id
            const progress = getRoutineProgress(routine)
            const total = routine.exercises.length

            return (
              <div key={routine.id} className="bg-surface-raised border border-border-subtle rounded-2xl overflow-hidden">
                {/* Routine header */}
                <button
                  onClick={() => toggleRoutine(routine.id)}
                  className="w-full text-left px-4 py-4 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl">{routine.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-bold text-zinc-200">{routine.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                            <Clock size={10} />
                            {routine.duration}
                          </div>
                          <span className="text-[11px] text-zinc-600">
                            {total} exercises
                          </span>
                          {progress > 0 && (
                            <span className="text-[11px] font-bold text-brand">
                              {progress}/{total}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                  {!isExpanded && (
                    <div className="text-[11px] text-zinc-500 mt-1.5 line-clamp-2 ml-11">
                      {routine.description}
                    </div>
                  )}
                </button>

                {/* Expanded routine */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <div className="text-[12px] text-zinc-400 mb-3 leading-relaxed">
                      {routine.description}
                    </div>

                    {/* Progress bar */}
                    {progress > 0 && (
                      <div className="h-1 bg-surface-overlay rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out bg-brand"
                          style={{ width: `${(progress / total) * 100}%` }}
                        />
                      </div>
                    )}

                    {/* Exercise list */}
                    <div className="space-y-0.5">
                      {routine.exercises.map((exercise, idx) => {
                        const isChecked = checkedExercises[`${routine.id}-${idx}`]
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2.5 py-2.5 px-1 rounded-lg transition-opacity"
                            style={{ opacity: isChecked ? 0.4 : 1 }}
                          >
                            <input
                              type="checkbox"
                              checked={!!isChecked}
                              onChange={() => toggleExercise(routine.id, idx)}
                              className="w-4 h-4 shrink-0 accent-brand rounded"
                            />

                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => toggleExercise(routine.id, idx)}
                            >
                              <div className="flex items-baseline gap-2">
                                <span
                                  className="text-[13px] font-medium"
                                  style={{
                                    textDecoration: isChecked ? 'line-through' : 'none',
                                    color: isChecked ? '#555' : '#ccc',
                                  }}
                                >
                                  {exercise.name}
                                </span>
                                <span className="text-[11px] text-zinc-500 font-semibold whitespace-nowrap">
                                  {exercise.duration}
                                </span>
                              </div>
                              {!isChecked && (
                                <div className="text-[10px] text-zinc-600 mt-0.5">{exercise.cue}</div>
                              )}
                            </div>

                            {exercise.seconds && exercise.seconds > 0 && onStartTimer && (
                              <button
                                onClick={() => onStartTimer(exercise.seconds!, exercise.name, 'work')}
                                className="px-2 py-1 rounded-lg text-[11px] font-semibold border border-brand/30 text-brand bg-transparent active:scale-95 transition-transform flex items-center gap-1 shrink-0"
                              >
                                <Timer size={10} />
                                {exercise.seconds}s
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Completed message */}
                    {progress === total && (
                      <div className="text-center mt-3 py-2">
                        <div className="text-success text-sm font-bold">Routine complete!</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Info banner */}
        <div className="flex items-center gap-3 bg-purple-soft border border-purple-900/30 rounded-2xl px-3.5 py-3 mt-4">
          <span className="text-lg shrink-0">{'\u{1F4A1}'}</span>
          <div className="text-[12px] text-purple-300 leading-relaxed">
            <strong>Tip:</strong> Do these routines on rest days, before bed, or as a standalone session. Consistency beats intensity for flexibility.
          </div>
        </div>
      </div>
    </div>
  )
}
