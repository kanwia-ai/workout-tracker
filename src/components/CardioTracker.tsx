import { useState, useCallback, useRef, useEffect } from 'react'
import { Play, Square, Timer, Plus } from 'lucide-react'
import { Lumo } from './Lumo'
import { CARDIO_TYPES, addCardioLog, generateId, getTodayString, formatDuration } from '../data/cardio'
import type { CardioType, CardioLog } from '../types'

interface CardioTrackerProps {
  userId: string
  onLogSaved: (log: CardioLog) => void
  onBack: () => void
}

type EntryMode = 'select' | 'manual' | 'timer'

const kickerStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--lumo-text-ter)',
}

// 36×36 rounded-square nav button (mirrors WorkoutView TopBar)
interface NavButtonProps {
  onClick: () => void
  ariaLabel: string
  children: React.ReactNode
}
function NavButton({ onClick, ariaLabel, children }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition"
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        color: 'var(--lumo-text-sec)',
      }}
    >
      {children}
    </button>
  )
}

function BackArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M9 2 L3 7 L9 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface TopBarProps {
  onBack: () => void
  title: string
  caption: string
}
function TopBar({ onBack, title, caption }: TopBarProps) {
  return (
    <div className="flex items-center justify-between pt-1 pb-3" data-testid="cardio-topbar">
      <NavButton onClick={onBack} ariaLabel="Back">
        <BackArrow />
      </NavButton>
      <div className="text-center flex-1 mx-2 min-w-0">
        <div style={kickerStyle}>{caption}</div>
        <div
          className="truncate"
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--lumo-text)',
            fontFamily: "'Fraunces', Georgia, serif",
            fontStyle: 'italic',
            letterSpacing: '-0.01em',
            marginTop: 1,
          }}
        >
          {title}
        </div>
      </div>
      <div className="w-9 h-9" aria-hidden="true" />
    </div>
  )
}

// Lumo intro bubble — shown in select + manual + timer modes
interface LumoIntroProps {
  state?: 'run' | 'curious'
  text: string
}
function LumoIntro({ state = 'run', text }: LumoIntroProps) {
  return (
    <div className="flex items-end gap-2.5 mt-1">
      <Lumo state={state} size={64} color="var(--accent-sun)" />
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
        {text}
      </div>
    </div>
  )
}

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
      <div>
        <TopBar onBack={onBack} title="log cardio" caption="new session" />
        <LumoIntro state="run" text="let's move. zone 2 keeps you honest." />

        <div style={{ ...kickerStyle, marginTop: 18, marginBottom: 8 }}>pick your poison</div>
        <div className="grid grid-cols-2 gap-2">
          {CARDIO_TYPES.map(ct => (
            <button
              key={ct.value}
              onClick={() => handleSelectType(ct.value)}
              className="flex items-center gap-3 text-left active:scale-[0.97] transition"
              style={{
                padding: 14,
                borderRadius: 18,
                background: 'var(--lumo-raised)',
                border: '1px solid var(--lumo-border)',
                color: 'var(--lumo-text)',
                cursor: 'pointer',
              }}
            >
              <span className="text-2xl">{ct.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{ct.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─── Timer mode ─────────────────────────────────────────────────────────
  if (mode === 'timer') {
    const typeInfo = CARDIO_TYPES.find(t => t.value === selectedType)
    const radius = 52
    const circumference = 2 * Math.PI * radius

    return (
      <div className="space-y-4">
        <TopBar
          onBack={() => { handleStopTimer(); setMode('manual') }}
          title={typeInfo?.label ?? 'cardio'}
          caption="in session"
        />

        <div className="text-center" style={{ marginTop: 4 }}>
          <div className="text-3xl mb-1">{typeInfo?.emoji}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--lumo-text-sec)' }}>
            {typeInfo?.label}
          </div>
        </div>

        {/* Timer display */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg viewBox="0 0 120 120" width="220" height="220">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="var(--lumo-overlay)"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={timerRunning ? 'var(--accent-sun)' : 'var(--brand)'}
                strokeWidth="8"
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={0}
                style={{ transition: 'stroke 0.3s' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="tabular-nums"
                style={{
                  fontSize: 44,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: 'var(--lumo-text)',
                  lineHeight: 1,
                }}
              >
                {formatTimerDisplay(timerSeconds)}
              </span>
              <span
                className="tabular-nums"
                style={{ fontSize: 12, color: 'var(--lumo-text-sec)', marginTop: 6 }}
              >
                {formatDuration(Math.round(timerSeconds / 60))} elapsed
              </span>
            </div>
          </div>
        </div>

        {/* Timer controls */}
        <div className="flex gap-3 justify-center">
          {timerRunning ? (
            <button
              onClick={handleStopTimer}
              className="flex items-center gap-2 active:scale-95 transition"
              style={{
                padding: '14px 24px',
                borderRadius: 16,
                fontSize: 14,
                fontWeight: 700,
                background: 'color-mix(in srgb, var(--accent-blush) 85%, var(--lumo-bg))',
                color: 'var(--lumo-bg)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Square size={16} />
              Stop
            </button>
          ) : timerSeconds > 0 ? (
            <>
              <button
                onClick={() => setTimerRunning(true)}
                className="flex items-center gap-2 active:scale-95 transition"
                style={{
                  padding: '14px 20px',
                  borderRadius: 16,
                  fontSize: 14,
                  fontWeight: 700,
                  background: 'var(--brand)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Play size={16} />
                Resume
              </button>
              <button
                onClick={handleSaveTimerLog}
                className="flex items-center gap-2 active:scale-95 transition"
                style={{
                  padding: '14px 20px',
                  borderRadius: 16,
                  fontSize: 14,
                  fontWeight: 700,
                  background: 'var(--accent-mint)',
                  color: 'var(--lumo-bg)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => setTimerRunning(true)}
              className="flex items-center gap-2 active:scale-95 transition"
              style={{
                padding: '14px 24px',
                borderRadius: 16,
                fontSize: 14,
                fontWeight: 700,
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Play size={16} />
              Start
            </button>
          )}
        </div>

        {/* Optional fields while timer runs */}
        <div
          className="space-y-3"
          style={{
            background: 'var(--lumo-raised)',
            border: '1px solid var(--lumo-border)',
            borderRadius: 20,
            padding: 16,
          }}
        >
          <div style={kickerStyle}>optional details</div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label style={{ ...kickerStyle, display: 'block', marginBottom: 6 }}>incline %</label>
              <input
                type="number"
                inputMode="decimal"
                value={incline}
                onChange={e => setIncline(e.target.value)}
                className="w-full outline-none"
                style={{
                  padding: '10px 12px',
                  borderRadius: 14,
                  fontSize: 14,
                  background: 'var(--lumo-overlay)',
                  border: '1px solid var(--lumo-border-strong)',
                  color: 'var(--lumo-text)',
                }}
                placeholder="e.g. 12"
              />
            </div>
            <div className="flex-1">
              <label style={{ ...kickerStyle, display: 'block', marginBottom: 6 }}>distance (mi)</label>
              <input
                type="number"
                inputMode="decimal"
                value={distance}
                onChange={e => setDistance(e.target.value)}
                className="w-full outline-none"
                style={{
                  padding: '10px 12px',
                  borderRadius: 14,
                  fontSize: 14,
                  background: 'var(--lumo-overlay)',
                  border: '1px solid var(--lumo-border-strong)',
                  color: 'var(--lumo-text)',
                }}
                placeholder="e.g. 1.5"
              />
            </div>
          </div>
          <div>
            <label style={{ ...kickerStyle, display: 'block', marginBottom: 6 }}>notes</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full outline-none"
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                fontSize: 14,
                background: 'var(--lumo-overlay)',
                border: '1px solid var(--lumo-border-strong)',
                color: 'var(--lumo-text)',
              }}
              placeholder="how did it feel?"
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
      <TopBar onBack={resetForm} title={typeInfo?.label ?? 'cardio'} caption="log session" />

      <div className="flex items-center gap-3" style={{ marginTop: 4 }}>
        <span className="text-3xl">{typeInfo?.emoji}</span>
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--lumo-text)',
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
              lineHeight: 1.1,
            }}
          >
            {typeInfo?.label}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--lumo-text-sec)', marginTop: 2 }}>
            log your session
          </p>
        </div>
      </div>

      {/* Use timer or manual */}
      <button
        onClick={handleStartTimer}
        className="w-full flex items-center justify-center gap-2 active:scale-[0.98] transition"
        style={{
          padding: 14,
          borderRadius: 16,
          fontSize: 14,
          fontWeight: 700,
          background: 'var(--lumo-raised)',
          border: '1px solid color-mix(in srgb, var(--accent-sun) 40%, transparent)',
          color: 'var(--accent-sun)',
          cursor: 'pointer',
        }}
      >
        <Timer size={16} />
        Use Timer Instead
      </button>

      {/* Manual form */}
      <div
        className="space-y-3"
        style={{
          background: 'var(--lumo-raised)',
          border: '1px solid var(--lumo-border)',
          borderRadius: 20,
          padding: 16,
        }}
      >
        <div>
          <label style={{ ...kickerStyle, display: 'block', marginBottom: 6 }}>duration (minutes) *</label>
          <input
            type="number"
            inputMode="numeric"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="w-full outline-none font-semibold"
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              fontSize: 16,
              background: 'var(--lumo-overlay)',
              border: '1px solid var(--lumo-border-strong)',
              color: 'var(--lumo-text)',
            }}
            placeholder="e.g. 30"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label style={{ ...kickerStyle, display: 'block', marginBottom: 6 }}>incline %</label>
            <input
              type="number"
              inputMode="decimal"
              value={incline}
              onChange={e => setIncline(e.target.value)}
              className="w-full outline-none"
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                fontSize: 14,
                background: 'var(--lumo-overlay)',
                border: '1px solid var(--lumo-border-strong)',
                color: 'var(--lumo-text)',
              }}
              placeholder="e.g. 12"
            />
          </div>
          <div className="flex-1">
            <label style={{ ...kickerStyle, display: 'block', marginBottom: 6 }}>distance (mi)</label>
            <input
              type="number"
              inputMode="decimal"
              value={distance}
              onChange={e => setDistance(e.target.value)}
              className="w-full outline-none"
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                fontSize: 14,
                background: 'var(--lumo-overlay)',
                border: '1px solid var(--lumo-border-strong)',
                color: 'var(--lumo-text)',
              }}
              placeholder="e.g. 1.5"
            />
          </div>
        </div>

        <div>
          <label style={{ ...kickerStyle, display: 'block', marginBottom: 6 }}>notes</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full outline-none"
            style={{
              padding: '10px 12px',
              borderRadius: 14,
              fontSize: 14,
              background: 'var(--lumo-overlay)',
              border: '1px solid var(--lumo-border-strong)',
              color: 'var(--lumo-text)',
            }}
            placeholder="how did it feel?"
          />
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSaveManualLog}
        disabled={!duration || parseInt(duration, 10) < 1}
        className="w-full flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-40 disabled:active:scale-100"
        style={{
          padding: 14,
          borderRadius: 16,
          fontSize: 15,
          fontWeight: 700,
          background: duration && parseInt(duration, 10) >= 1
            ? 'var(--accent-mint)'
            : 'var(--lumo-overlay)',
          color: duration && parseInt(duration, 10) >= 1
            ? 'var(--lumo-bg)'
            : 'var(--lumo-text-ter)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <Plus size={18} />
        Save Cardio Log
      </button>
    </div>
  )
}
