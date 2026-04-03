import { useState, useCallback, useRef, useEffect } from 'react'
import { Play, Square, Timer, Plus, ArrowLeft } from 'lucide-react'
import { CARDIO_TYPES, addCardioLog, generateId, getTodayString, formatDuration } from '../data/cardio'
import type { CardioType, CardioLog } from '../types'

interface CardioTrackerProps {
  userId: string
  onLogSaved: (log: CardioLog) => void
  onBack: () => void
}

type EntryMode = 'select' | 'manual' | 'timer'

export function CardioTracker({ userId, onLogSaved, onBack }: CardioTrackerProps) {
  const [mode, setMode] = useState<EntryMode>('select')
  const [selectedType, setSelectedType] = useState<CardioType | null>(null)
  const [duration, setDuration] = useState('')
  const [incline, setIncline] = useState('')
  const [distance, setDistance] = useState('')
  const [notes, setNotes] = useState('')

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Timer tick
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerRunning])

  const formatTimerDisplay = (secs: number): string => {
    const mm = Math.floor(secs / 60)
    const ss = secs % 60
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }

  const handleSelectType = (type: CardioType) => {
    setSelectedType(type)
    setMode('manual')
  }

  const handleStartTimer = () => {
    if (!selectedType) return
    setMode('timer')
    setTimerRunning(true)
    setTimerSeconds(0)
    setTimerStartedAt(new Date().toISOString())
  }

  const handleStopTimer = () => {
    setTimerRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const handleSaveTimerLog = useCallback(() => {
    if (!selectedType || timerSeconds < 1) return
    const endedAt = new Date().toISOString()
    const durationMinutes = Math.max(1, Math.round(timerSeconds / 60))

    const log: CardioLog = {
      id: generateId(),
      user_id: userId,
      date: getTodayString(),
      type: selectedType,
      duration_minutes: durationMinutes,
      incline: incline ? parseFloat(incline) : undefined,
      distance: distance ? parseFloat(distance) : undefined,
      notes: notes || undefined,
      started_at: timerStartedAt || undefined,
      ended_at: endedAt,
    }

    addCardioLog(log)
    onLogSaved(log)
    resetForm()
  }, [selectedType, timerSeconds, incline, distance, notes, timerStartedAt, userId, onLogSaved])

  const handleSaveManualLog = useCallback(() => {
    if (!selectedType || !duration) return
    const durationMinutes = parseInt(duration, 10)
    if (isNaN(durationMinutes) || durationMinutes < 1) return

    const now = new Date().toISOString()
    const log: CardioLog = {
      id: generateId(),
      user_id: userId,
      date: getTodayString(),
      type: selectedType,
      duration_minutes: durationMinutes,
      incline: incline ? parseFloat(incline) : undefined,
      distance: distance ? parseFloat(distance) : undefined,
      notes: notes || undefined,
      started_at: now,
      ended_at: now,
    }

    addCardioLog(log)
    onLogSaved(log)
    resetForm()
  }, [selectedType, duration, incline, distance, notes, userId, onLogSaved])

  const resetForm = () => {
    setMode('select')
    setSelectedType(null)
    setDuration('')
    setIncline('')
    setDistance('')
    setNotes('')
    setTimerRunning(false)
    setTimerSeconds(0)
    setTimerStartedAt(null)
  }

  // ─── Type selection ─────────────────────────────────────────────────────
  if (mode === 'select') {
    return (
      <div className="space-y-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-zinc-400 font-semibold active:scale-95 transition-transform mb-1"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <h2 className="text-lg font-extrabold">Log Cardio</h2>
        <p className="text-xs text-zinc-500">What did you do today?</p>

        <div className="grid grid-cols-2 gap-2">
          {CARDIO_TYPES.map(ct => (
            <button
              key={ct.value}
              onClick={() => handleSelectType(ct.value)}
              className="flex items-center gap-3 p-4 rounded-2xl bg-surface-raised border border-border-subtle text-left active:scale-[0.97] transition-transform"
            >
              <span className="text-2xl">{ct.emoji}</span>
              <span className="text-sm font-bold">{ct.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─── Timer mode ─────────────────────────────────────────────────────────
  if (mode === 'timer') {
    const typeInfo = CARDIO_TYPES.find(t => t.value === selectedType)

    return (
      <div className="space-y-4">
        <button
          onClick={() => { handleStopTimer(); setMode('manual') }}
          className="flex items-center gap-1.5 text-sm text-zinc-400 font-semibold active:scale-95 transition-transform"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="text-center">
          <div className="text-3xl mb-1">{typeInfo?.emoji}</div>
          <div className="text-sm font-bold text-zinc-300">{typeInfo?.label}</div>
        </div>

        {/* Timer display */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg viewBox="0 0 120 120" width="200" height="200">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#2a2a2e" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={timerRunning ? '#4ade80' : '#f97316'}
                strokeWidth="8"
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={0}
                style={{ transition: 'stroke 0.3s' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-extrabold tabular-nums">
                {formatTimerDisplay(timerSeconds)}
              </span>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-zinc-500">
          {formatDuration(Math.round(timerSeconds / 60))} elapsed
        </div>

        {/* Timer controls */}
        <div className="flex gap-3 justify-center">
          {timerRunning ? (
            <button
              onClick={handleStopTimer}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-danger text-white active:scale-95 transition-transform"
            >
              <Square size={16} />
              Stop
            </button>
          ) : timerSeconds > 0 ? (
            <>
              <button
                onClick={() => setTimerRunning(true)}
                className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm bg-brand text-white active:scale-95 transition-transform"
              >
                <Play size={16} />
                Resume
              </button>
              <button
                onClick={handleSaveTimerLog}
                className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm bg-success text-black active:scale-95 transition-transform"
              >
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => setTimerRunning(true)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-brand text-white active:scale-95 transition-transform"
            >
              <Play size={16} />
              Start
            </button>
          )}
        </div>

        {/* Optional fields while timer runs */}
        <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4 space-y-3">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Optional Details</div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] text-zinc-500 block mb-1">Incline %</label>
              <input
                type="number"
                inputMode="decimal"
                value={incline}
                onChange={e => setIncline(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-surface-overlay border border-border-medium text-white outline-none focus:border-brand transition-colors"
                placeholder="e.g. 12"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] text-zinc-500 block mb-1">Distance (mi)</label>
              <input
                type="number"
                inputMode="decimal"
                value={distance}
                onChange={e => setDistance(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-surface-overlay border border-border-medium text-white outline-none focus:border-brand transition-colors"
                placeholder="e.g. 1.5"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-surface-overlay border border-border-medium text-white outline-none focus:border-brand transition-colors"
              placeholder="How did it feel?"
            />
          </div>
        </div>
      </div>
    )
  }

  // ─── Manual entry mode ──────────────────────────────────────────────────
  const typeInfo = CARDIO_TYPES.find(t => t.value === selectedType)

  return (
    <div className="space-y-4">
      <button
        onClick={resetForm}
        className="flex items-center gap-1.5 text-sm text-zinc-400 font-semibold active:scale-95 transition-transform"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">{typeInfo?.emoji}</span>
        <div>
          <h2 className="text-lg font-extrabold">{typeInfo?.label}</h2>
          <p className="text-xs text-zinc-500">Log your session</p>
        </div>
      </div>

      {/* Use timer or manual */}
      <button
        onClick={handleStartTimer}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm bg-surface-raised border border-brand/30 text-brand active:scale-[0.98] transition-transform"
      >
        <Timer size={16} />
        Use Timer Instead
      </button>

      {/* Manual form */}
      <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4 space-y-3">
        <div>
          <label className="text-[11px] text-zinc-500 block mb-1">Duration (minutes) *</label>
          <input
            type="number"
            inputMode="numeric"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="w-full px-3 py-3 rounded-xl text-base bg-surface-overlay border border-border-medium text-white outline-none focus:border-brand transition-colors font-semibold"
            placeholder="e.g. 30"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[11px] text-zinc-500 block mb-1">Incline %</label>
            <input
              type="number"
              inputMode="decimal"
              value={incline}
              onChange={e => setIncline(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-surface-overlay border border-border-medium text-white outline-none focus:border-brand transition-colors"
              placeholder="e.g. 12"
            />
          </div>
          <div className="flex-1">
            <label className="text-[11px] text-zinc-500 block mb-1">Distance (mi)</label>
            <input
              type="number"
              inputMode="decimal"
              value={distance}
              onChange={e => setDistance(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-surface-overlay border border-border-medium text-white outline-none focus:border-brand transition-colors"
              placeholder="e.g. 1.5"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-zinc-500 block mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm bg-surface-overlay border border-border-medium text-white outline-none focus:border-brand transition-colors"
            placeholder="How did it feel?"
          />
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSaveManualLog}
        disabled={!duration || parseInt(duration, 10) < 1}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100"
        style={{
          background: duration && parseInt(duration, 10) >= 1 ? '#4ade80' : '#2a2a2e',
          color: duration && parseInt(duration, 10) >= 1 ? '#111' : '#666',
        }}
      >
        <Plus size={18} />
        Save Cardio Log
      </button>
    </div>
  )
}
