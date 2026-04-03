import { useState } from 'react'
import { Plus, Clock, Target, ArrowLeft } from 'lucide-react'
import { CardioTracker } from './CardioTracker'
import { CardioGoals } from './CardioGoals'
import { CardioHistory } from './CardioHistory'
import { loadCardioLogs, getCardioLabel, getCardioEmoji, formatDuration, getTodayString } from '../data/cardio'
import type { CardioLog } from '../types'

interface CardioPageProps {
  userId: string
  onBack: () => void
}

type CardioView = 'home' | 'log' | 'history' | 'goals'

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
      <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
        <div className="max-w-lg mx-auto px-3 pb-20 pt-3 safe-top safe-bottom">
          <CardioTracker userId={userId} onLogSaved={handleLogSaved} onBack={() => setView('home')} />
        </div>
      </div>
    )
  }

  if (view === 'history') {
    return (
      <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
        <div className="max-w-lg mx-auto px-3 pb-20 pt-3 safe-top safe-bottom">
          <CardioHistory onBack={() => { refreshToday(); setView('home') }} />
        </div>
      </div>
    )
  }

  if (view === 'goals') {
    return (
      <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
        <div className="max-w-lg mx-auto px-3 pb-20 pt-3 safe-top safe-bottom">
          <CardioGoals userId={userId} onBack={() => setView('home')} />
        </div>
      </div>
    )
  }

  // ─── Home view ──────────────────────────────────────────────────────────
  const todayMinutes = todayLogs.reduce((s, l) => s + l.duration_minutes, 0)

  return (
    <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
      <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">
        {/* Header */}
        <div className="flex items-center justify-between pt-3 pb-4">
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-zinc-400 font-semibold active:scale-95 transition-transform mb-1"
            >
              <ArrowLeft size={16} />
              Workouts
            </button>
            <h1 className="text-[22px] font-extrabold tracking-tight bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              Cardio Tracker
            </h1>
          </div>
        </div>

        {/* Today's summary */}
        <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4 mb-3">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2">Today</div>
          {todayLogs.length === 0 ? (
            <div className="text-sm text-zinc-400">No cardio logged yet today</div>
          ) : (
            <div className="space-y-2">
              <div className="text-2xl font-extrabold text-success">{formatDuration(todayMinutes)}</div>
              {todayLogs.map(log => (
                <div key={log.id} className="flex items-center gap-2 text-sm">
                  <span>{getCardioEmoji(log.type)}</span>
                  <span className="font-semibold">{getCardioLabel(log.type)}</span>
                  <span className="text-zinc-500">{formatDuration(log.duration_minutes)}</span>
                  {log.incline ? <span className="text-zinc-600 text-xs">{log.incline}%</span> : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <button
            onClick={() => setView('log')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-brand text-white font-bold text-sm active:scale-[0.98] transition-transform"
          >
            <Plus size={20} />
            Log Cardio Session
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setView('history')}
              className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-surface-raised border border-border-subtle text-sm font-bold text-zinc-300 active:scale-[0.98] transition-transform"
            >
              <Clock size={16} className="text-zinc-400" />
              History
            </button>
            <button
              onClick={() => setView('goals')}
              className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-surface-raised border border-border-subtle text-sm font-bold text-zinc-300 active:scale-[0.98] transition-transform"
            >
              <Target size={16} className="text-brand" />
              Goals
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
