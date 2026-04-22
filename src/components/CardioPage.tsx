import { useState } from 'react'
import { Plus, Clock, Target, ArrowRight } from 'lucide-react'
import { CardioTracker } from './CardioTracker'
import { CardioGoals } from './CardioGoals'
import { CardioHistory } from './CardioHistory'
import { Lumo } from './Lumo'
import { loadCardioLogs, getCardioLabel, getCardioEmoji, formatDuration, getTodayString } from '../data/cardio'
import type { CardioLog } from '../types'

interface CardioPageProps {
  userId: string
  onBack: () => void
}

type CardioView = 'home' | 'log' | 'history' | 'goals'

const shellStyle: React.CSSProperties = {
  minHeight: '100dvh',
  background: 'var(--lumo-bg)',
  color: 'var(--lumo-text)',
}

const kickerStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--lumo-text-ter)',
}

export function CardioPage({ userId, onBack }: CardioPageProps) {
  const [view, setView] = useState<CardioView>('home')
  const [todayLogs, setTodayLogs] = useState<CardioLog[]>(() => {
    const today = getTodayString()
    return loadCardioLogs().filter(l => l.date === today)
  })

  const refreshToday = () => {
    const today = getTodayString()
    setTodayLogs(loadCardioLogs().filter(l => l.date === today))
  }

  const handleLogSaved = (log: CardioLog) => {
    setTodayLogs(prev => [log, ...prev])
    setView('home')
  }

  // Sub-views
  if (view === 'log') {
    return (
      <div className="font-[system-ui,-apple-system,'Segoe_UI',sans-serif]" style={shellStyle}>
        <div className="max-w-lg mx-auto px-3 pb-20 pt-3 safe-top safe-bottom">
          <CardioTracker userId={userId} onLogSaved={handleLogSaved} onBack={() => setView('home')} />
        </div>
      </div>
    )
  }

  if (view === 'history') {
    return (
      <div className="font-[system-ui,-apple-system,'Segoe_UI',sans-serif]" style={shellStyle}>
        <div className="max-w-lg mx-auto px-3 pb-20 pt-3 safe-top safe-bottom">
          <CardioHistory onBack={() => { refreshToday(); setView('home') }} />
        </div>
      </div>
    )
  }

  if (view === 'goals') {
    return (
      <div className="font-[system-ui,-apple-system,'Segoe_UI',sans-serif]" style={shellStyle}>
        <div className="max-w-lg mx-auto px-3 pb-20 pt-3 safe-top safe-bottom">
          <CardioGoals userId={userId} onBack={() => setView('home')} />
        </div>
      </div>
    )
  }

  // ─── Home view ──────────────────────────────────────────────────────────
  const todayMinutes = todayLogs.reduce((s, l) => s + l.duration_minutes, 0)
  const isEmpty = todayLogs.length === 0

  return (
    <div className="font-[system-ui,-apple-system,'Segoe_UI',sans-serif]" style={shellStyle}>
      <div className="max-w-lg mx-auto px-4 pb-20 safe-top safe-bottom">
        {/* Top bar: back button + title */}
        <div className="flex items-center justify-between pt-3 pb-3">
          <button
            onClick={onBack}
            aria-label="Back to workouts"
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition"
            style={{
              background: 'var(--lumo-raised)',
              border: '1px solid var(--lumo-border)',
              color: 'var(--lumo-text-sec)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M9 2 L3 7 L9 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="text-center flex-1 mx-2 min-w-0">
            <div style={kickerStyle}>cardio</div>
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
              keep the engine running
            </div>
          </div>
          <div className="w-9 h-9" aria-hidden="true" />
        </div>

        {/* Today's summary */}
        {isEmpty ? (
          <div
            style={{
              background: 'var(--lumo-raised)',
              border: '1px solid var(--lumo-border)',
              borderRadius: 22,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <Lumo state="curious" size={72} color="var(--accent-sun)" />
            <div style={kickerStyle}>today</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--lumo-text)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}
            >
              your heart rate's waiting.
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--lumo-text-sec)',
                lineHeight: 1.4,
                maxWidth: 280,
              }}
            >
              pick a session, hit start, let's go.
            </div>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--lumo-raised)',
              border: '1px solid var(--lumo-border)',
              borderRadius: 22,
              padding: 16,
              marginBottom: 14,
            }}
          >
            <div style={{ ...kickerStyle, marginBottom: 8 }}>today</div>
            <div className="space-y-2">
              <div
                className="tabular-nums"
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--accent-sun)',
                }}
              >
                {formatDuration(todayMinutes)}
              </div>
              <div className="space-y-1.5 mt-2">
                {todayLogs.map(log => (
                  <div
                    key={log.id}
                    className="flex items-center gap-2"
                    style={{
                      padding: '7px 10px',
                      borderRadius: 10,
                      background: 'var(--lumo-bg)',
                      border: '1px solid var(--lumo-border)',
                      fontSize: 13,
                      color: 'var(--lumo-text)',
                    }}
                  >
                    <span>{getCardioEmoji(log.type)}</span>
                    <span style={{ fontWeight: 600, flex: 1 }}>{getCardioLabel(log.type)}</span>
                    <span className="tabular-nums" style={{ color: 'var(--lumo-text-sec)' }}>
                      {formatDuration(log.duration_minutes)}
                    </span>
                    {log.incline ? (
                      <span className="tabular-nums" style={{ color: 'var(--lumo-text-ter)', fontSize: 11 }}>
                        {log.incline}%
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          <button
            onClick={() => setView('log')}
            className="w-full flex items-center justify-center gap-2 active:scale-[0.98] transition"
            style={{
              padding: 16,
              borderRadius: 16,
              background: 'var(--brand)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '-0.01em',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={18} />
            log cardio session
            <ArrowRight size={14} />
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setView('history')}
              className="flex-1 flex items-center justify-center gap-2 active:scale-[0.98] transition"
              style={{
                padding: 14,
                borderRadius: 16,
                background: 'var(--lumo-raised)',
                border: '1px solid var(--lumo-border)',
                color: 'var(--lumo-text)',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              <Clock size={16} style={{ color: 'var(--accent-sun)' }} />
              history
            </button>
            <button
              onClick={() => setView('goals')}
              className="flex-1 flex items-center justify-center gap-2 active:scale-[0.98] transition"
              style={{
                padding: 14,
                borderRadius: 16,
                background: 'var(--lumo-raised)',
                border: '1px solid var(--lumo-border)',
                color: 'var(--lumo-text)',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              <Target size={16} style={{ color: 'var(--accent-sun)' }} />
              goals
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
