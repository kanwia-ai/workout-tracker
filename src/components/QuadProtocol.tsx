import { useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, Lock, Check, AlertTriangle, Timer, Play, Pause, RotateCcw } from 'lucide-react'
import { QUAD_PROTOCOL } from '../data/protocols'
import type { PainLevel } from '../data/protocols'
import { useProtocol } from '../hooks/useProtocol'

interface QuadProtocolProps {
  onBack: () => void
  onStartTimer?: (seconds: number, label: string, type: 'rest' | 'work') => void
}

const PAIN_OPTIONS: { level: PainLevel; label: string; emoji: string; color: string }[] = [
  { level: 'none', label: 'No pain', emoji: '💚', color: '#4ade80' },
  { level: 'mild', label: 'Mild discomfort', emoji: '💛', color: '#f59e0b' },
  { level: 'moderate', label: 'Moderate pain', emoji: '🟠', color: '#f97316' },
  { level: 'severe', label: 'Severe pain', emoji: '🔴', color: '#ef4444' },
]

export function QuadProtocol({ onBack, onStartTimer }: QuadProtocolProps) {
  const protocol = QUAD_PROTOCOL
  const {
    progress,
    startProtocol,
    pauseProtocol,
    resumeProtocol,
    resetProtocol,
    advanceWeek,
    toggleExercise,
    logPain,
    isExerciseCompleted,
    getWeekCompletionCount,
  } = useProtocol(protocol.id, protocol.total_weeks)

  const [expandedWeek, setExpandedWeek] = useState<number | null>(null)
  const [showPainCheck, setShowPainCheck] = useState(false)
  const [painNotes, setPainNotes] = useState('')
  const [swelling, setSwelling] = useState(false)
  const [showReset, setShowReset] = useState(false)

  const currentWeek = progress?.current_week ?? 0

  // Auto-expand current week
  const activeExpandedWeek = expandedWeek ?? currentWeek

  const handlePainSubmit = (level: PainLevel) => {
    logPain(level, swelling, painNotes || undefined)
    setShowPainCheck(false)
    setPainNotes('')
    setSwelling(false)
  }

  const handleReset = () => {
    resetProtocol()
    setShowReset(false)
  }

  return (
    <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
      <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">
        {/* Header */}
        <div className="flex items-center gap-3 pt-3 pb-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-[20px] font-extrabold tracking-tight">
              {protocol.emoji} {protocol.name}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">{protocol.description}</p>
          </div>
        </div>

        {/* Protocol status / start */}
        {!progress && (
          <div className="bg-surface-raised border border-border-subtle rounded-2xl p-5 mb-4">
            <div className="text-center">
              <div className="text-4xl mb-3">{protocol.emoji}</div>
              <h2 className="text-lg font-bold mb-2">Ready to start?</h2>
              <p className="text-sm text-zinc-400 mb-4">
                9-week progressive quad strengthening program designed for meniscus recovery.
                Starts gentle with isometrics and builds to functional movements.
              </p>
              <button
                onClick={startProtocol}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-base bg-brand text-white active:scale-[0.98] transition-transform"
              >
                <Play size={18} fill="white" />
                Start Protocol
              </button>
            </div>
          </div>
        )}

        {progress && (
          <>
            {/* Progress overview card */}
            <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Current Week</div>
                  <div className="text-2xl font-extrabold text-brand">{currentWeek} <span className="text-sm text-zinc-500 font-normal">/ {protocol.total_weeks}</span></div>
                </div>
                <div className="flex items-center gap-2">
                  {progress.status === 'active' ? (
                    <button
                      onClick={pauseProtocol}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-warning bg-warning/10 border border-warning/20 active:scale-95 transition-transform"
                    >
                      <Pause size={12} />
                      Pause
                    </button>
                  ) : progress.status === 'paused' ? (
                    <button
                      onClick={resumeProtocol}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-success bg-success-soft border border-success/20 active:scale-95 transition-transform"
                    >
                      <Play size={12} />
                      Resume
                    </button>
                  ) : null}
                  <button
                    onClick={() => setShowReset(!showReset)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 active:scale-95 transition-all"
                    title="Reset protocol"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              {/* Reset confirmation */}
              {showReset && (
                <div className="flex items-center justify-between bg-danger/10 border border-danger/20 rounded-xl px-3 py-2 mb-3">
                  <span className="text-xs text-zinc-300">Reset all progress?</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleReset}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-danger active:scale-95 transition-transform"
                    >
                      Yes, reset
                    </button>
                    <button
                      onClick={() => setShowReset(false)}
                      className="px-2 py-1 rounded-lg text-xs font-bold text-zinc-400 bg-surface-overlay active:scale-95 transition-transform"
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {/* Completed status */}
              {progress.status === 'completed' && (
                <div className="bg-success-soft border border-success/20 rounded-xl px-3 py-2.5 mb-3">
                  <div className="text-sm font-bold text-success text-center">
                    Protocol Complete! You did it! 🎉
                  </div>
                </div>
              )}

              {/* Week progress bar */}
              <div className="flex gap-1">
                {Array.from({ length: protocol.total_weeks }, (_, i) => {
                  const weekNum = i + 1
                  const isCurrent = weekNum === currentWeek
                  const isPast = weekNum < currentWeek
                  const weekExercises = protocol.weeks[i].exercises
                  const completed = getWeekCompletionCount(weekNum, weekExercises.map(e => e.id))
                  const total = weekExercises.length
                  const allDone = completed === total && total > 0

                  return (
                    <button
                      key={i}
                      onClick={() => setExpandedWeek(weekNum === activeExpandedWeek ? null : weekNum)}
                      className="flex-1 h-2 rounded-full transition-all"
                      style={{
                        background: allDone || isPast
                          ? '#4ade80'
                          : isCurrent
                            ? '#f97316'
                            : '#2a2a2e',
                        opacity: isPast && !allDone ? 0.5 : 1,
                      }}
                      title={`Week ${weekNum}`}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-zinc-600">Week 1</span>
                <span className="text-[10px] text-zinc-600">Week {protocol.total_weeks}</span>
              </div>
            </div>

            {/* Pain/Swelling check-in */}
            <button
              onClick={() => setShowPainCheck(!showPainCheck)}
              className="w-full flex items-center justify-between bg-surface-raised border border-border-subtle rounded-2xl px-4 py-3 mb-3 text-sm font-semibold text-zinc-300"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-warning" />
                Pain / Swelling Check-In
              </span>
              {showPainCheck ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showPainCheck && (
              <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4 mb-3">
                <p className="text-xs text-zinc-400 mb-3">
                  How does your knee feel after this session? If you report moderate/severe pain or swelling, the protocol will auto-regress to the previous week.
                </p>

                {/* Pain level buttons */}
                <div className="space-y-1.5 mb-3">
                  {PAIN_OPTIONS.map(opt => (
                    <button
                      key={opt.level}
                      onClick={() => handlePainSubmit(opt.level)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium active:scale-[0.98] transition-all"
                      style={{
                        background: '#222226',
                        border: `1.5px solid ${opt.color}33`,
                        color: opt.color,
                      }}
                    >
                      <span>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>

                {/* Swelling toggle */}
                <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-overlay mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={swelling}
                    onChange={e => setSwelling(e.target.checked)}
                    className="w-4 h-4 accent-warning rounded"
                  />
                  <span className="text-sm text-zinc-300">Noticeable swelling</span>
                </label>

                {/* Notes */}
                <textarea
                  value={painNotes}
                  onChange={e => setPainNotes(e.target.value)}
                  placeholder="Any notes? (optional)"
                  className="w-full px-3 py-2 rounded-xl text-sm bg-surface-overlay border border-border-medium text-white placeholder:text-zinc-600 outline-none resize-none h-16"
                />

                {/* Recent pain history */}
                {progress.pain_logs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <div className="text-[11px] text-zinc-500 font-semibold mb-1.5">Recent check-ins</div>
                    {progress.pain_logs.slice(-3).reverse().map((log, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-400 mb-1">
                        <span>{PAIN_OPTIONS.find(o => o.level === log.pain_level)?.emoji}</span>
                        <span>Week {log.week} — {log.pain_level}</span>
                        {log.swelling && <span className="text-warning">(swelling)</span>}
                        {log.auto_regressed && <span className="text-danger">(regressed)</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Advance week button */}
            {progress.status === 'active' && currentWeek < protocol.total_weeks && (
              <button
                onClick={advanceWeek}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-success/10 text-success border border-success/20 active:scale-[0.98] transition-transform mb-3"
              >
                <Check size={16} />
                Complete Week {currentWeek} & Advance
              </button>
            )}
            {progress.status === 'active' && currentWeek >= protocol.total_weeks && (
              <button
                onClick={advanceWeek}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-success text-black active:scale-[0.98] transition-transform mb-3"
              >
                <Check size={16} />
                Complete Protocol!
              </button>
            )}

            {/* Week-by-week exercises */}
            <div className="space-y-2">
              {protocol.weeks.map((week) => {
                const isLocked = progress.status !== 'completed' && week.week > currentWeek
                const isCurrent = week.week === currentWeek
                const isExpanded = week.week === activeExpandedWeek
                const completedCount = getWeekCompletionCount(week.week, week.exercises.map(e => e.id))
                const allDone = completedCount === week.exercises.length

                return (
                  <div key={week.week} className="bg-surface-raised border border-border-subtle rounded-2xl overflow-hidden">
                    {/* Week header */}
                    <button
                      onClick={() => {
                        if (!isLocked) {
                          setExpandedWeek(isExpanded ? null : week.week)
                        }
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                      style={{ opacity: isLocked ? 0.4 : 1 }}
                    >
                      <div className="flex items-center gap-2.5">
                        {isLocked ? (
                          <Lock size={14} className="text-zinc-600" />
                        ) : allDone ? (
                          <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center">
                            <Check size={12} className="text-black" />
                          </div>
                        ) : isCurrent ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                        )}
                        <div>
                          <div className="text-sm font-bold" style={{ color: isCurrent ? '#f97316' : isLocked ? '#555' : '#ccc' }}>
                            {week.label}
                          </div>
                          <div className="text-[11px] text-zinc-500">{week.focus}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isLocked && (
                          <span className="text-[11px] text-zinc-500 font-semibold">{completedCount}/{week.exercises.length}</span>
                        )}
                        {!isLocked && (isExpanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />)}
                      </div>
                    </button>

                    {/* Exercises */}
                    {isExpanded && !isLocked && (
                      <div className="px-3.5 pb-3.5 space-y-2">
                        {week.exercises.map(exercise => {
                          const done = isExerciseCompleted(week.week, exercise.id)
                          return (
                            <div
                              key={exercise.id}
                              className="rounded-xl p-3.5 transition-opacity"
                              style={{ background: '#222226', opacity: done ? 0.45 : 1 }}
                            >
                              <div className="flex items-start gap-2.5">
                                <button
                                  onClick={() => toggleExercise(week.week, exercise.id)}
                                  className="mt-0.5 w-5 h-5 rounded-md shrink-0 flex items-center justify-center transition-colors active:scale-95"
                                  style={{
                                    background: done ? '#4ade80' : '#2a2a2e',
                                    border: done ? '2px solid #4ade80' : '2px solid #3a3a3e',
                                  }}
                                >
                                  {done && <Check size={12} className="text-black" />}
                                </button>
                                <div className="flex-1">
                                  <div className="flex justify-between items-baseline mb-0.5">
                                    <span className="text-sm font-bold" style={{ textDecoration: done ? 'line-through' : 'none', color: done ? '#555' : '#ccc' }}>
                                      {exercise.name}
                                    </span>
                                    <span className="text-sm text-zinc-400 font-semibold whitespace-nowrap ml-2">
                                      {exercise.sets}x{exercise.reps}
                                    </span>
                                  </div>
                                  {exercise.note && (
                                    <div className="text-[11px] text-brand italic mb-1">{exercise.note}</div>
                                  )}
                                  {exercise.cues.length > 0 && !done && (
                                    <div className="mt-1 space-y-0.5">
                                      {exercise.cues.map((cue, ci) => (
                                        <div key={ci} className="text-[10px] text-zinc-600">
                                          {cue}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex gap-1.5 mt-2">
                                    {exercise.work_seconds && exercise.work_seconds > 0 && onStartTimer && (
                                      <button
                                        onClick={() => onStartTimer(exercise.work_seconds!, exercise.name, 'work')}
                                        className="px-2 py-1.5 rounded-lg text-[11px] font-semibold border border-purple-500/30 text-purple-400 bg-transparent active:scale-95 transition-transform flex items-center gap-1"
                                      >
                                        <Timer size={12} />
                                        {exercise.work_seconds}s
                                      </button>
                                    )}
                                    {exercise.rest_seconds > 0 && onStartTimer && (
                                      <button
                                        onClick={() => onStartTimer(exercise.rest_seconds, exercise.name, 'rest')}
                                        className="px-2 py-1.5 rounded-lg text-[11px] font-semibold border border-brand/30 text-brand bg-transparent active:scale-95 transition-transform flex items-center gap-1"
                                      >
                                        <Timer size={12} />
                                        {exercise.rest_seconds}s rest
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
