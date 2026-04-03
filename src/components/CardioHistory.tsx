import { useState } from 'react'
import { ArrowLeft, Trash2, Filter, Clock } from 'lucide-react'
import { CARDIO_TYPES, loadCardioLogs, deleteCardioLog, getCardioLabel, getCardioEmoji, formatDuration } from '../data/cardio'
import type { CardioLog, CardioType } from '../types'

interface CardioHistoryProps {
  onBack: () => void
}

export function CardioHistory({ onBack }: CardioHistoryProps) {
  const [logs, setLogs] = useState<CardioLog[]>(() => loadCardioLogs())
  const [filterType, setFilterType] = useState<CardioType | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const filteredLogs = filterType === 'all'
    ? logs
    : logs.filter(l => l.type === filterType)

  // Group by date
  const grouped = filteredLogs.reduce<Record<string, CardioLog[]>>((acc, log) => {
    const key = log.date
    if (!acc[key]) acc[key] = []
    acc[key].push(log)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const handleDelete = (logId: string) => {
    const updated = deleteCardioLog(logId)
    setLogs(updated)
    setConfirmDeleteId(null)
  }

  const formatDate = (dateStr: string): string => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (dateStr === today) return 'Today'
    if (dateStr === yesterday) return 'Yesterday'
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatTime = (isoString?: string): string => {
    if (!isoString) return ''
    const d = new Date(isoString)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  // Stats
  const totalMinutes = filteredLogs.reduce((s, l) => s + l.duration_minutes, 0)
  const totalSessions = filteredLogs.length

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
          <Clock size={20} className="text-brand" />
          Cardio History
        </h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
          style={{
            background: filterType !== 'all' ? '#f9731622' : '#2a2a2e',
            color: filterType !== 'all' ? '#f97316' : '#aaa',
            border: filterType !== 'all' ? '1.5px solid #f9731644' : '1.5px solid transparent',
          }}
        >
          <Filter size={14} />
          {filterType === 'all' ? 'Filter' : getCardioLabel(filterType)}
        </button>
      </div>

      {/* Filter chips */}
      {showFilters && (
        <div className="flex flex-wrap gap-1.5 bg-surface-raised border border-border-subtle rounded-2xl p-3">
          <button
            onClick={() => { setFilterType('all'); setShowFilters(false) }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-all"
            style={{
              background: filterType === 'all' ? '#f97316' : '#2a2a2e',
              color: filterType === 'all' ? '#fff' : '#aaa',
            }}
          >
            All
          </button>
          {CARDIO_TYPES.map(ct => (
            <button
              key={ct.value}
              onClick={() => { setFilterType(ct.value); setShowFilters(false) }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-all"
              style={{
                background: filterType === ct.value ? '#f97316' : '#2a2a2e',
                color: filterType === ct.value ? '#fff' : '#aaa',
              }}
            >
              {ct.emoji} {ct.label}
            </button>
          ))}
        </div>
      )}

      {/* Stats bar */}
      {totalSessions > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 bg-surface-raised border border-border-subtle rounded-2xl p-3 text-center">
            <div className="text-xl font-extrabold text-brand">{totalSessions}</div>
            <div className="text-[10px] text-zinc-500 font-semibold uppercase">Sessions</div>
          </div>
          <div className="flex-1 bg-surface-raised border border-border-subtle rounded-2xl p-3 text-center">
            <div className="text-xl font-extrabold text-success">{formatDuration(totalMinutes)}</div>
            <div className="text-[10px] text-zinc-500 font-semibold uppercase">Total Time</div>
          </div>
          <div className="flex-1 bg-surface-raised border border-border-subtle rounded-2xl p-3 text-center">
            <div className="text-xl font-extrabold text-purple-400">
              {totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0}m
            </div>
            <div className="text-[10px] text-zinc-500 font-semibold uppercase">Avg/Session</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredLogs.length === 0 && (
        <div className="text-center py-12 bg-surface-raised rounded-2xl border border-border-subtle">
          <Clock size={36} className="mx-auto text-zinc-600 mb-3" />
          <div className="text-sm font-bold text-zinc-400">
            {filterType === 'all' ? 'No cardio logged yet' : `No ${getCardioLabel(filterType)} sessions`}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            {filterType === 'all' ? 'Log your first session to see it here' : 'Try a different filter'}
          </div>
        </div>
      )}

      {/* Grouped by date */}
      {sortedDates.map(date => (
        <div key={date}>
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5 px-1">
            {formatDate(date)}
          </div>
          <div className="space-y-2">
            {grouped[date].map(log => (
              <div
                key={log.id}
                className="bg-surface-raised border border-border-subtle rounded-2xl p-3.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{getCardioEmoji(log.type)}</span>
                    <div>
                      <div className="text-sm font-bold">{getCardioLabel(log.type)}</div>
                      <div className="text-[11px] text-zinc-500">
                        {formatDuration(log.duration_minutes)}
                        {log.incline ? ` / ${log.incline}% incline` : ''}
                        {log.distance ? ` / ${log.distance} mi` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {log.started_at && (
                      <span className="text-[10px] text-zinc-600">{formatTime(log.started_at)}</span>
                    )}
                    {confirmDeleteId === log.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold text-danger bg-danger/10 active:scale-95 transition-transform"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-400 bg-surface-overlay active:scale-95 transition-transform"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(log.id)}
                        className="p-1.5 rounded-lg text-zinc-600 active:scale-95 transition-transform"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {log.notes && (
                  <div className="text-[11px] text-zinc-400 italic mt-1.5 px-8">
                    {log.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
