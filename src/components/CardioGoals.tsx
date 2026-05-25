import { useState, useMemo } from 'react'
import { Plus, Trash2, Trophy, ArrowLeft, Target } from 'lucide-react'
import { CARDIO_TYPES, loadGoals, addGoal, deleteGoal, generateId, getCardioLabel, loadCardioLogs, getWeeklyProgressForGoal } from '../data/cardio'
import type { UserGoal, CardioType, CardioLog } from '../types'

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
  // Re-read cardio logs on each render so the weekly-progress badge stays in
  // sync with logs added on other tabs. Lightweight (localStorage read).
  const logs = useMemo<CardioLog[]>(() => loadCardioLogs(), [goals])

  const handleCreateGoal = () => {
    const target = parseInt(targetValue, 10)
    if (isNaN(target) || target < 1) return

    // current_value is retained on the type for backward compat but is no
    // longer the source of truth — the card shows THIS WEEK's progress vs the
    // goal as a weekly target (adherence model). Seed with 0 so we never
    // surface a misleading "you're already at 200 minutes!" on goal creation.
    const goal: UserGoal = {
      id: generateId(),
      user_id: userId,
      goal_type: goalType,
      target_value: target,
      current_value: 0,
      unit,
      created_at: new Date().toISOString(),
    }

    const updated = addGoal(goal)
    setGoals(updated)
    setShowCreate(false)
    setTargetValue('')
  }

  const handleDelete = (goalId: string) => {
    const updated = deleteGoal(goalId)
    setGoals(updated)
    setConfirmDeleteId(null)
  }

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
            weekly target — e.g. "60 minutes on Stair Master / week" or "3 sessions of Treadmill / week"
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
            set a weekly cardio target to track adherence
          </div>
        </div>
      )}

      {goals.map(goal => {
        // Adherence model: target is the WEEKLY goal, progress is what the
        // user logged THIS WEEK. Trophy appears only when the user hit the
        // plan they set — same pattern as HomeScreen's AdherenceBadge.
        const weeklyProgress = getWeeklyProgressForGoal(
          logs,
          goal.goal_type as CardioType,
          goal.unit as 'minutes' | 'sessions',
        )
        const pct = goal.target_value > 0
          ? Math.min(100, (weeklyProgress / goal.target_value) * 100)
          : 0
        const hitGoalThisWeek = weeklyProgress >= goal.target_value && goal.target_value > 0
        const label = getCardioLabel(goal.goal_type as CardioType)
        const typeInfo = CARDIO_TYPES.find(t => t.value === goal.goal_type)
        const progressColor = hitGoalThisWeek ? 'var(--accent-mint)' : 'var(--accent-sun)'

        return (
          <div
            key={goal.id}
            className="space-y-3"
            style={{
              background: 'var(--lumo-raised)',
              border: hitGoalThisWeek
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
                    {goal.target_value} {goal.unit} of {label} / week
                  </div>
                  <div
                    className="tabular-nums flex items-center gap-1"
                    style={{ fontSize: 11, color: 'var(--lumo-text-ter)' }}
                  >
                    {weeklyProgress} / {goal.target_value} {goal.unit} this week
                    {hitGoalThisWeek && (
                      <Trophy
                        size={11}
                        style={{ color: 'var(--accent-mint)' }}
                        aria-label="hit your goal this week"
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
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

            {/* Percentage label — this week vs the weekly target. No
                cumulative-milestone trophies; the old 25/50/75/100% chain
                rewarded "more = better" minute totals (same anti-pattern as
                the day-streak we replaced on HomeScreen). Single trophy on
                the count line indicates hitting the plan this week. */}
            <div className="flex items-center justify-between">
              <span
                className="tabular-nums"
                style={{ fontSize: 12, fontWeight: 700, color: progressColor }}
              >
                {Math.round(pct)}% this week
              </span>
              <span
                style={{ fontSize: 10, color: 'var(--lumo-text-ter)' }}
              >
                resets each Monday
              </span>
            </div>

            {/* Adherence celebration — only fires when the user actually hit
                the weekly plan they set, not on arbitrary cumulative totals. */}
            {hitGoalThisWeek && (
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
                  Hit your weekly goal
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
