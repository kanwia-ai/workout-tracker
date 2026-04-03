import { useState } from 'react'
import { Plus, Trash2, Trophy, ArrowLeft, Target } from 'lucide-react'
import { CARDIO_TYPES, loadGoals, addGoal, updateGoalProgress, deleteGoal, generateId, getMilestones, getCardioLabel, loadCardioLogs, getTotalMinutesForType } from '../data/cardio'
import type { UserGoal, CardioType } from '../types'

interface CardioGoalsProps {
  userId: string
  onBack: () => void
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
        className="flex items-center gap-1.5 text-sm text-zinc-400 font-semibold active:scale-95 transition-transform mb-1"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold flex items-center gap-2">
          <Target size={20} className="text-brand" />
          Cardio Goals
        </h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-brand text-white active:scale-95 transition-transform"
        >
          <Plus size={14} />
          New Goal
        </button>
      </div>

      {/* Create goal form */}
      {showCreate && (
        <div className="bg-surface-raised border border-brand/30 rounded-2xl p-4 space-y-3">
          <div className="text-sm font-bold text-brand">Set a New Goal</div>

          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Cardio Type</label>
            <div className="flex flex-wrap gap-1.5">
              {CARDIO_TYPES.map(ct => (
                <button
                  key={ct.value}
                  onClick={() => setGoalType(ct.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-all"
                  style={{
                    background: goalType === ct.value ? '#f97316' : '#2a2a2e',
                    color: goalType === ct.value ? '#fff' : '#aaa',
                    border: goalType === ct.value ? '1.5px solid #f9731666' : '1.5px solid transparent',
                  }}
                >
                  {ct.emoji} {ct.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] text-zinc-500 block mb-1">Target</label>
              <input
                type="number"
                inputMode="numeric"
                value={targetValue}
                onChange={e => setTargetValue(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-surface-overlay border border-border-medium text-white outline-none focus:border-brand transition-colors font-semibold"
                placeholder="e.g. 60"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] text-zinc-500 block mb-1">Unit</label>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setUnit('minutes')}
                  className="flex-1 px-3 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all"
                  style={{
                    background: unit === 'minutes' ? '#f97316' : '#2a2a2e',
                    color: unit === 'minutes' ? '#fff' : '#aaa',
                  }}
                >
                  Minutes
                </button>
                <button
                  onClick={() => setUnit('sessions')}
                  className="flex-1 px-3 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all"
                  style={{
                    background: unit === 'sessions' ? '#f97316' : '#2a2a2e',
                    color: unit === 'sessions' ? '#fff' : '#aaa',
                  }}
                >
                  Sessions
                </button>
              </div>
            </div>
          </div>

          <div className="text-xs text-zinc-500">
            e.g. "60 minutes on Stair Master" or "10 sessions of Treadmill"
          </div>

          <button
            onClick={handleCreateGoal}
            disabled={!targetValue || parseInt(targetValue, 10) < 1}
            className="w-full py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-40"
            style={{
              background: targetValue && parseInt(targetValue, 10) >= 1 ? '#4ade80' : '#2a2a2e',
              color: targetValue && parseInt(targetValue, 10) >= 1 ? '#111' : '#666',
            }}
          >
            Create Goal
          </button>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 && !showCreate && (
        <div className="text-center py-12 bg-surface-raised rounded-2xl border border-border-subtle">
          <Target size={36} className="mx-auto text-zinc-600 mb-3" />
          <div className="text-sm font-bold text-zinc-400">No goals yet</div>
          <div className="text-xs text-zinc-600 mt-1">Set a cardio goal to track your progress</div>
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

        return (
          <div
            key={goal.id}
            className="bg-surface-raised border rounded-2xl p-4 space-y-3"
            style={{
              borderColor: complete ? '#4ade8044' : '#2a2a2e',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{typeInfo?.emoji || '💪'}</span>
                <div>
                  <div className="text-sm font-bold">
                    {goal.target_value} {goal.unit} of {label}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {goal.current_value} / {goal.target_value} {goal.unit}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleRefreshProgress(goal)}
                  className="px-2 py-1.5 rounded-lg text-[10px] font-bold text-zinc-400 bg-surface-overlay active:scale-95 transition-transform"
                >
                  Refresh
                </button>
                {confirmDeleteId === goal.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="px-2 py-1.5 rounded-lg text-[10px] font-bold text-danger bg-danger/10 active:scale-95 transition-transform"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1.5 rounded-lg text-[10px] font-bold text-zinc-400 bg-surface-overlay active:scale-95 transition-transform"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(goal.id)}
                    className="p-1.5 rounded-lg text-zinc-600 active:scale-95 transition-transform"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2.5 bg-surface-overlay rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  background: complete ? '#4ade80' : '#f97316',
                }}
              />
            </div>

            {/* Percentage label */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: complete ? '#4ade80' : '#f97316' }}>
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
                      className="flex items-center gap-0.5 text-[10px] font-bold"
                      style={{ color: hit ? '#4ade80' : '#555' }}
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
              <div className="text-center py-2 rounded-xl bg-success/10 border border-success/20">
                <div className="text-sm font-bold text-success">Goal Complete!</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
