import { useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, Timer, Info } from 'lucide-react'
import { GLUTE_PROTOCOL } from '../data/protocols'
import type { GluteCategory } from '../data/protocols'

interface GluteProtocolProps {
  onBack: () => void
  onStartTimer?: (seconds: number, label: string, type: 'rest' | 'work') => void
}

export function GluteProtocol({ onBack, onStartTimer }: GluteProtocolProps) {
  const protocol = GLUTE_PROTOCOL
  const [expandedCategory, setExpandedCategory] = useState<string | null>(protocol.categories[0].id)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [showIntegration, setShowIntegration] = useState(false)

  const toggleCheck = (exerciseId: string) => {
    setChecked(prev => ({ ...prev, [exerciseId]: !prev[exerciseId] }))
  }

  const categoryColors: Record<string, string> = {
    'glute-max': '#f97316',
    'glute-med-min': '#a78bfa',
    'glute-stabilizers': '#60a5fa',
  }

  const categoryEmojis: Record<string, string> = {
    'glute-max': '🔥',
    'glute-med-min': '🎯',
    'glute-stabilizers': '🧘',
  }

  const totalExercises = protocol.categories.reduce((a, c) => a + c.exercises.length, 0)
  const totalChecked = Object.values(checked).filter(Boolean).length

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

        {/* Session progress */}
        <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Today's Session</div>
            <span className="text-sm text-zinc-400 font-semibold">{totalChecked}/{totalExercises}</span>
          </div>
          <div className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${totalExercises > 0 ? (totalChecked / totalExercises) * 100 : 0}%`,
                background: totalChecked === totalExercises && totalExercises > 0 ? '#4ade80' : '#f97316',
              }}
            />
          </div>
          {totalChecked === totalExercises && totalExercises > 0 && (
            <div className="text-success text-[13px] font-bold mt-2 text-center">
              All exercises complete! Great session! 🍑🔥
            </div>
          )}
        </div>

        {/* Integration tip */}
        <button
          onClick={() => setShowIntegration(!showIntegration)}
          className="w-full flex items-center justify-between bg-purple-soft border border-purple-900/30 rounded-2xl px-4 py-3 mb-3"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-purple-300">
            <Info size={16} />
            How to integrate
          </span>
          {showIntegration ? <ChevronUp size={14} className="text-purple-400" /> : <ChevronDown size={14} className="text-purple-400" />}
        </button>

        {showIntegration && (
          <div className="bg-purple-soft border border-purple-900/30 rounded-2xl px-4 py-3 mb-3 space-y-2">
            <div className="text-sm text-purple-200 font-semibold">Suggested Integration</div>
            <div className="space-y-2 text-xs text-zinc-400">
              <div className="flex gap-2">
                <span className="text-purple-400 font-bold shrink-0">Warm-up:</span>
                <span>Use banded activation (clamshells, lateral walks, fire hydrants) before any lower-body day. 2 sets each, 5 minutes total.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-purple-400 font-bold shrink-0">Main lifts:</span>
                <span>Program Glute Max exercises (hip thrusts, RDLs) as your primary lower-body compound movements.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-purple-400 font-bold shrink-0">Accessories:</span>
                <span>Add 2-3 Med/Min exercises after compounds for hip stability and knee protection.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-purple-400 font-bold shrink-0">Recovery:</span>
                <span>Deep stabilizer work (CARs, hip circles) on rest days or as cool-down finishers.</span>
              </div>
            </div>
          </div>
        )}

        {/* Category sections */}
        <div className="space-y-2.5">
          {protocol.categories.map((category: GluteCategory) => {
            const isExpanded = expandedCategory === category.id
            const color = categoryColors[category.id] || '#f97316'
            const emoji = categoryEmojis[category.id] || '💪'
            const catChecked = category.exercises.filter(e => checked[e.id]).length

            return (
              <div key={category.id} className="bg-surface-raised border border-border-subtle rounded-2xl overflow-hidden">
                {/* Category header */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{emoji}</span>
                    <div>
                      <div className="text-sm font-bold" style={{ color }}>{category.name}</div>
                      <div className="text-[11px] text-zinc-500">{category.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500 font-semibold">{catChecked}/{category.exercises.length}</span>
                    {isExpanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                  </div>
                </button>

                {/* Exercises */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 space-y-2">
                    {category.exercises.map(exercise => {
                      const done = checked[exercise.id]
                      return (
                        <div
                          key={exercise.id}
                          className="rounded-xl p-3.5 transition-opacity"
                          style={{ background: '#222226', opacity: done ? 0.45 : 1 }}
                        >
                          <div className="flex items-start gap-2.5">
                            <button
                              onClick={() => toggleCheck(exercise.id)}
                              className="mt-0.5 w-5 h-5 rounded-md shrink-0 flex items-center justify-center transition-colors active:scale-95"
                              style={{
                                background: done ? '#4ade80' : '#2a2a2e',
                                border: done ? '2px solid #4ade80' : '2px solid #3a3a3e',
                              }}
                            >
                              {done && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </button>
                            <div className="flex-1">
                              <div className="flex justify-between items-baseline mb-0.5">
                                <span
                                  className="text-sm font-bold"
                                  style={{ textDecoration: done ? 'line-through' : 'none', color: done ? '#555' : '#ccc' }}
                                >
                                  {exercise.name}
                                </span>
                                <span className="text-sm text-zinc-400 font-semibold whitespace-nowrap ml-2">
                                  {exercise.sets}x{exercise.reps}
                                </span>
                              </div>
                              {exercise.note && (
                                <div className="text-[11px] italic mb-1" style={{ color }}>{exercise.note}</div>
                              )}
                              {/* Protocol badge */}
                              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-1"
                                style={{ background: `${color}22`, color }}
                              >
                                {category.name}
                              </div>
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
      </div>
    </div>
  )
}
