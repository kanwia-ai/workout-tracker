import { useState } from 'react'
import { Plus, Trash2, Trophy, ArrowLeft, Target } from 'lucide-react'
import { CARDIO_TYPES, loadGoals, addGoal, updateGoalProgress, deleteGoal, generateId, getMilestones, getCardioLabel, loadCardioLogs, getTotalMinutesForType } from '../data/cardio'
import type { UserGoal, CardioType } from '../types'

interface CardioGoalsProps {
  userId: string
  onBack: () => void
}

const kickerStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--lumo-text-ter)',
}

export function CardioGoals({ userId, onBack }: CardioGoalsProps) {
  const [goals, setGoals] = useState<UserGoal[]>(() => loadGoals())
  const [showCreate, setShowCreate] = useState(false)
  const [goalType, setGoalType] = useState<CardioType>('stairmaster')
  const [targetValue, setTargetValue] = useState('')
  const [unit, setUnit] = useState<'minutes' | 'sessions'>('minutes')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleCreateGoal = () => {
    const target = parseInt(targetValue, 10)
    if (isNaN(target) || target < 1) return

    // Calculate current progress from existing logs
    const logs = loadCardioLogs()
    let currentValue = 0
    if (unit === 'minutes') {
      currentValue = getTotalMinutesForType(logs, goalType)
    } else {
      currentValue = logs.filter(l => l.type === goalType).length
    }

    const goal: UserGoal = {
      id: generateId(),
      user_id: userId,
      goal_type: goalType,
      target_value: target,
      current_value: currentValue,
      unit,
      created_at: new Date().toISOString(),
    }

    const updated = addGoal(goal)
    setGoals(updated)
    setShowCreate(false)
    setTargetValue('')
  }

  const handleRefreshProgress = (goal: UserGoal) => {
    const logs = loadCardioLogs()
    let currentValue = 0
    if (goal.unit === 'minutes') {
      currentValue = getTotalMinutesForType(logs, goal.goal_type as CardioType)
    } else {
      currentValue = logs.filter(l => l.type === goal.goal_type).length
    }
    const updated = updateGoalProgress(goal.id, currentValue)
    setGoals(updated)
  }

  const handleDelete = (goalId: string) => {
    const updated = deleteGoal(goalId)
    setGoals(updated)
    setConfirmDeleteId(null)
  }

  // Refresh all goals on mount
  const refreshAll = () => {
    const logs = loadCardioLogs()
    let updated = loadGoals()
    for (const goal of updated) {
      let currentValue = 0
      if (goal.unit === 'minutes') {
        currentValue = getTotalMinutesForType(logs, goal.goal_type as CardioType)
      } else {
        currentValue = logs.filter(l => l.type === goal.goal_type).length
      }
      updated = updateGoalProgress(goal.id, currentValue)
    }
    setGoals(updated)
  }

  // Refresh on first render
  useState(() => { refreshAll() })

  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 font-semibold active:scale-95 transition"
        style={{ fontSize: 13, color: 'var(--lumo-text-sec)', marginBottom: 2 }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="flex items-center justify-between">
        <h2
          className="flex items-center gap-2"
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--lumo-text)',
            fontFamily: "'Fraunces', Georgia, serif",
            fontStyle: 'italic',
          }}
        >
          <Target size={20} style={{ color: 'var(--accent-sun)' }} />
          cardio goals
        </h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 active:scale-95 transition"
          style={{
            padding: '8px 12px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            background: 'var(--brand)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          new goal
        </button>
      </div>

      {/* Create goal form */}
      {showCreate && (
        <div
          style={{
            background: 'var(--lumo-raised)',
            border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)',
            borderRadius: 20,
            padding: 16,
          }}
          className="space-y-3"
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)' }}>set a new goal</div>

          <div>
            <label style={{ ...kickerStyle, display: 'block', marginBottom: 6 }}>cardio type</label>
            <div className="flex flex-wrap gap-1.5">
              {CARDIO_TYPES.map(ct => {
                const active = goalType === ct.value
                return (
                  <button
                    key={ct.value}
                    onClick={() => setGoalType(ct.value)}
                    className="active:scale-95 transition"
                    style={{
                      padding: '7px 12px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      background: active ? 'var(--brand)' : 'var(--lumo-overlay)',
                      color: active ? '#fff' : 'var(--lumo-text-sec)',
                      border: active
                        ? '1.5px solid color-mix(in srgb, var(--brand) 40%, transparent)'
                        : '1.5px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {ct.emoji} {ct.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label style={{ ...kickerStyle, display: 'block', marginBottom: 6 }}>target</label>
              <input
                type="number"
                inputMode="numeric"
                value={targetValue}
                onChange={e => setTargetValue(e.target.value)}
                className="w-full outline-none font-semibold"
                style={{
                  padding: '10px 12px',
                  borderRadius: 14,
                  fontSize: 14,
                  background: 'var(--lumo-overlay)',
                  border: '1px solid var(--lumo-border-strong)',
                  color: 'var(--lumo-text)',
                }}
                placeholder="e.g. 60"
              />
            </div>
            <div className="flex-1">
              <label style={{ ...kickerStyle, display: 'block', marginBottom: 6 }}>unit</label>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setUnit('minutes')}
                  className="flex-1 active:scale-95 transition"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 14,
                    fontSize: 12,
                    fontWeight: 700,
                    background: unit === 'minutes' ? 'var(--brand)' : 'var(--lumo-overlay)',
                    color: unit === 'minutes' ? '#fff' : 'var(--lumo-text-sec)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Minutes
                </button>
                <button
                  onClick={() => setUnit('sessions')}
                  className="flex-1 active:scale-95 transition"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 14,
                    fontSize: 12,
                    fontWeight: 700,
                    background: unit === 'sessions' ? 'var(--brand)' : 'var(--lumo-overlay)',
                    color: unit === 'sessions' ? '#fff' : 'var(--lumo-text-sec)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Sessions
                </button>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--lumo-text-ter)' }}>
            e.g. "60 minutes on Stair Master" or "10 sessions of Treadmill"
          </div>

          <button
            onClick={handleCreateGoal}
            disabled={!targetValue || parseInt(targetValue, 10) < 1}
            className="w-full active:scale-[0.98] transition disabled:opacity-40"
            style={{
              padding: 12,
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              background: targetValue && parseInt(targetValue, 10) >= 1
                ? 'var(--accent-mint)'
                : 'var(--lumo-overlay)',
              color: targetValue && parseInt(targetValue, 10) >= 1
                ? 'var(--lumo-bg)'
                : 'var(--lumo-text-ter)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Create Goal
          </button>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 && !showCreate && (
        <div
          className="text-center"
          style={{
            padding: '48px 20px',
            background: 'var(--lumo-raised)',
            border: '1px solid var(--lumo-border)',
            borderRadius: 20,
          }}
        >
          <Target size={36} className="mx-auto mb-3" style={{ color: 'var(--lumo-text-ter)' }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--lumo-text-sec)' }}>no goals yet</div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--lumo-text-ter)',
              marginTop: 4,
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
            }}
          >
            set a cardio goal to track your progress
          </div>
        </div>
      )}

      {goals.map(goal => {
        const pct = goal.target_value > 0
          ? Math.min(100, (goal.current_value / goal.target_value) * 100)
          : 0
        const complete = pct >= 100
        const milestones = getMilestones(goal.current_value, goal.target_value)
        const label = getCardioLabel(goal.goal_type as CardioType)
        const typeInfo = CARDIO_TYPES.find(t => t.value === goal.goal_type)
        const progressColor = complete ? 'var(--accent-mint)' : 'var(--accent-sun)'

        return (
          <div
            key={goal.id}
            className="space-y-3"
            style={{
              background: 'var(--lumo-raised)',
              border: complete
                ? '1px solid color-mix(in srgb, var(--accent-mint) 40%, transparent)'
                : '1px solid var(--lumo-border)',
              borderRadius: 20,
              padding: 16,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{typeInfo?.emoji || '💪'}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--lumo-text)' }}>
                    {goal.target_value} {goal.unit} of {label}
                  </div>
                  <div className="tabular-nums" style={{ fontSize: 11, color: 'var(--lumo-text-ter)' }}>
                    {goal.current_value} / {goal.target_value} {goal.unit}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleRefreshProgress(goal)}
                  className="active:scale-95 transition"
                  style={{
                    padding: '6px 10px',
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--lumo-text-sec)',
                    background: 'var(--lumo-overlay)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Refresh
                </button>
                {confirmDeleteId === goal.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="active:scale-95 transition"
                      style={{
                        padding: '6px 10px',
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--accent-blush)',
                        background: 'color-mix(in srgb, var(--accent-blush) 15%, transparent)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="active:scale-95 transition"
                      style={{
                        padding: '6px 10px',
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--lumo-text-sec)',
                        background: 'var(--lumo-overlay)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(goal.id)}
                    className="p-1.5 rounded-lg active:scale-95 transition"
                    style={{ color: 'var(--lumo-text-ter)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: 10,
                background: 'var(--lumo-overlay)',
                borderRadius: 999,
                overflow: 'hidden',
                border: '1px solid var(--lumo-border)',
              }}
            >
              <div
                className="transition-all duration-700 ease-out"
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: progressColor,
                  borderRadius: 999,
                }}
              />
            </div>

            {/* Percentage label */}
            <div className="flex items-center justify-between">
              <span
                className="tabular-nums"
                style={{ fontSize: 12, fontWeight: 700, color: progressColor }}
              >
                {Math.round(pct)}%
              </span>

              {/* Milestones */}
              <div className="flex gap-1.5">
                {[25, 50, 75, 100].map(m => {
                  const milestoneValue = Math.round((m / 100) * goal.target_value)
                  const hit = milestones.includes(milestoneValue)
                  return (
                    <div
                      key={m}
                      className="flex items-center gap-0.5"
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: hit ? 'var(--accent-mint)' : 'var(--lumo-text-ter)',
                      }}
                    >
                      {hit && <Trophy size={10} />}
                      {m}%
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Celebration */}
            {complete && (
              <div
                className="text-center"
                style={{
                  padding: '8px 0',
                  borderRadius: 12,
                  background: 'color-mix(in srgb, var(--accent-mint) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent-mint) 30%, transparent)',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-mint)' }}>
                  Goal Complete!
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
