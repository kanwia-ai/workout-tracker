import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronDown, Timer, Clock } from 'lucide-react'
import { Lumo } from './Lumo'
import {
  MOBILITY_SECTIONS,
  pickRoutineForDay,
  type MobilityRoutine,
  type MobilitySection,
} from '../data/mobility-routines'

// A section + the routine chosen for today. The render code below works off
// this flattened shape so section metadata (emoji/title/description) and the
// chosen routine's exercises sit side by side.
interface DailyRoutine {
  sectionId: string
  sectionTitle: string
  emoji: string
  sectionDescription: string
  routine: MobilityRoutine
}

function buildDailyRoutines(sections: MobilitySection[], date: Date): DailyRoutine[] {
  return sections.map(section => ({
    sectionId: section.id,
    sectionTitle: section.title,
    emoji: section.emoji,
    sectionDescription: section.description,
    routine: pickRoutineForDay(section, date),
  }))
}

// ─── Component ──────────────────────────────────────────────────────────────

interface MobilityRoutinesProps {
  onBack: () => void
  onStartTimer?: (seconds: number, label: string, type: 'rest' | 'work') => void
}

const kickerStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--lumo-text-ter)',
}

export function MobilityRoutines({ onBack, onStartTimer }: MobilityRoutinesProps) {
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null)
  const [checkedExercises, setCheckedExercises] = useState<Record<string, boolean>>({})

  const dailyRoutines = useMemo(() => buildDailyRoutines(MOBILITY_SECTIONS, new Date()), [])

  const toggleRoutine = (id: string) => {
    setExpandedRoutine(expandedRoutine === id ? null : id)
  }

  const exerciseKey = (sectionId: string, routineId: string, idx: number) =>
    `${sectionId}-${routineId}-${idx}`

  const toggleExercise = (sectionId: string, routineId: string, exerciseIdx: number) => {
    const key = exerciseKey(sectionId, routineId, exerciseIdx)
    setCheckedExercises(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const getRoutineProgress = (daily: DailyRoutine) => {
    let done = 0
    for (let i = 0; i < daily.routine.exercises.length; i++) {
      if (checkedExercises[exerciseKey(daily.sectionId, daily.routine.id, i)]) done++
    }
    return done
  }

  const hasAnyProgress = dailyRoutines.some(r => getRoutineProgress(r) > 0)

  return (
    <div
      className="font-[system-ui,-apple-system,'Segoe_UI',sans-serif]"
      style={{
        minHeight: '100dvh',
        background: 'var(--lumo-bg)',
        color: 'var(--lumo-text)',
      }}
    >
      <div className="max-w-lg mx-auto px-4 pb-20 safe-top safe-bottom">

        {/* Header */}
        <div className="flex items-center gap-3 pt-3 pb-3">
          <button
            onClick={onBack}
            aria-label="Back"
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition"
            style={{
              background: 'var(--lumo-raised)',
              border: '1px solid var(--lumo-border)',
              color: 'var(--lumo-text-sec)',
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={kickerStyle}>mobility</div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--accent-plum)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                marginTop: 1,
                lineHeight: 1.1,
              }}
            >
              mobility routines
            </h1>
          </div>
        </div>

        {/* Lumo intro */}
        <div className="flex items-end gap-2.5 mb-4">
          <Lumo state="curious" size={64} color="var(--accent-plum)" />
          <div
            className="flex-1 relative"
            style={{
              background: 'var(--lumo-raised)',
              border: '1px solid var(--lumo-border)',
              padding: '12px 14px',
              borderRadius: 16,
              borderBottomLeftRadius: 4,
              fontSize: 13,
              lineHeight: 1.4,
              color: 'var(--lumo-text)',
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
            }}
          >
            pick a routine, roll out the kinks.
          </div>
        </div>

        {/* Routines */}
        <div className="space-y-3">
          {dailyRoutines.map(daily => {
            const isExpanded = expandedRoutine === daily.sectionId
            const progress = getRoutineProgress(daily)
            const { routine } = daily
            const total = routine.exercises.length

            return (
              <div
                key={daily.sectionId}
                style={{
                  background: 'var(--lumo-raised)',
                  border: '1px solid var(--lumo-border)',
                  borderRadius: 20,
                  overflow: 'hidden',
                }}
              >
                {/* Routine header */}
                <button
                  onClick={() => toggleRoutine(daily.sectionId)}
                  className="w-full text-left active:scale-[0.99] transition"
                  style={{ padding: 16, background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl">{daily.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--lumo-text)' }}>
                          {daily.sectionTitle}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div
                            className="flex items-center gap-1"
                            style={{ fontSize: 11, color: 'var(--lumo-text-sec)' }}
                          >
                            <Clock size={10} />
                            {routine.duration}
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--lumo-text-ter)' }}>
                            {total} exercises
                          </span>
                          {progress > 0 && (
                            <span
                              className="tabular-nums"
                              style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-plum)' }}
                            >
                              {progress}/{total}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--accent-plum)',
                            marginTop: 4,
                            fontFamily: "'Fraunces', Georgia, serif",
                            fontStyle: 'italic',
                          }}
                        >
                          today: {routine.title}
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      style={{
                        color: 'var(--lumo-text-sec)',
                        transition: 'transform 200ms',
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                      }}
                    />
                  </div>
                  {!isExpanded && (
                    <div
                      className="line-clamp-2"
                      style={{
                        fontSize: 11,
                        color: 'var(--lumo-text-sec)',
                        marginTop: 6,
                        marginLeft: 44,
                        lineHeight: 1.4,
                      }}
                    >
                      {routine.description}
                    </div>
                  )}
                </button>

                {/* Expanded routine */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px' }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--lumo-text-sec)',
                        marginBottom: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      {routine.description}
                    </div>

                    {/* Progress bar */}
                    {progress > 0 && (
                      <div
                        style={{
                          height: 4,
                          background: 'var(--lumo-overlay)',
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginBottom: 12,
                        }}
                      >
                        <div
                          className="transition-all duration-500 ease-out"
                          style={{
                            height: '100%',
                            width: `${(progress / total) * 100}%`,
                            background: 'var(--accent-plum)',
                            borderRadius: 999,
                          }}
                        />
                      </div>
                    )}

                    {/* Exercise list */}
                    <div className="space-y-0.5">
                      {routine.exercises.map((exercise, idx) => {
                        const isChecked = checkedExercises[exerciseKey(daily.sectionId, routine.id, idx)]
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2.5"
                            style={{
                              padding: '10px 4px',
                              borderRadius: 10,
                              opacity: isChecked ? 0.4 : 1,
                              transition: 'opacity 200ms',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!!isChecked}
                              onChange={() => toggleExercise(daily.sectionId, routine.id, idx)}
                              className="w-4 h-4 shrink-0 rounded"
                              style={{ accentColor: 'var(--accent-plum)' }}
                            />

                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => toggleExercise(daily.sectionId, routine.id, idx)}
                            >
                              <div className="flex items-baseline gap-2">
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    textDecoration: isChecked ? 'line-through' : 'none',
                                    color: isChecked ? 'var(--lumo-text-ter)' : 'var(--lumo-text)',
                                  }}
                                >
                                  {exercise.name}
                                </span>
                                <span
                                  className="whitespace-nowrap"
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: 'var(--lumo-text-sec)',
                                  }}
                                >
                                  {exercise.duration}
                                </span>
                              </div>
                              {!isChecked && (
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: 'var(--lumo-text-ter)',
                                    marginTop: 2,
                                  }}
                                >
                                  {exercise.cue}
                                </div>
                              )}
                            </div>

                            {exercise.seconds && exercise.seconds > 0 && onStartTimer && (
                              <button
                                onClick={() => onStartTimer(exercise.seconds!, exercise.name, 'work')}
                                className="flex items-center gap-1 shrink-0 active:scale-95 transition"
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: 10,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  border: '1px solid color-mix(in srgb, var(--accent-plum) 40%, transparent)',
                                  color: 'var(--accent-plum)',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                }}
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
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: 'var(--accent-mint)',
                            fontFamily: "'Fraunces', Georgia, serif",
                            fontStyle: 'italic',
                          }}
                        >
                          routine complete.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Empty invitation — no routine has any progress yet */}
        {!hasAnyProgress && expandedRoutine === null && (
          <div
            className="text-center flex flex-col items-center gap-3 mt-4"
            style={{
              padding: '32px 20px',
              background: 'var(--lumo-raised)',
              border: '1px solid color-mix(in srgb, var(--accent-plum) 25%, transparent)',
              borderRadius: 20,
            }}
          >
            <Lumo state="sleepy" size={72} color="var(--accent-plum)" />
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--lumo-text)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                letterSpacing: '-0.01em',
              }}
            >
              stiff shoulders? open one up.
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--lumo-text-sec)',
                lineHeight: 1.4,
                maxWidth: 280,
              }}
            >
              tap a routine above and start wherever feels good.
            </div>
          </div>
        )}

        {/* Info banner */}
        <div
          className="flex items-center gap-3 mt-4"
          style={{
            background: 'color-mix(in srgb, var(--accent-plum) 15%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-plum) 30%, transparent)',
            borderRadius: 18,
            padding: '12px 14px',
          }}
        >
          <span className="text-lg shrink-0">{'\u{1F4A1}'}</span>
          <div
            style={{
              fontSize: 12,
              color: 'var(--accent-plum)',
              lineHeight: 1.5,
            }}
          >
            <strong>Tip:</strong> Do these routines on rest days, before bed, or as a standalone session. Consistency beats intensity for flexibility.
          </div>
        </div>
      </div>
    </div>
  )
}
