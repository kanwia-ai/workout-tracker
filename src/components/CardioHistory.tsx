import { useState } from 'react'
import { ArrowLeft, Trash2, Filter, Clock } from 'lucide-react'
import { Lumo } from './Lumo'
import { CARDIO_TYPES, loadCardioLogs, deleteCardioLog, getCardioLabel, getCardioEmoji, formatDuration } from '../data/cardio'
import type { CardioLog, CardioType } from '../types'

interface CardioHistoryProps {
  onBack: () => void
}

const kickerStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--lumo-text-ter)',
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
  const filterActive = filterType !== 'all'

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
          <Clock size={20} style={{ color: 'var(--accent-sun)' }} />
          cardio history
        </h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 active:scale-95 transition"
          style={{
            padding: '8px 12px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            background: filterActive
              ? 'color-mix(in srgb, var(--accent-sun) 15%, transparent)'
              : 'var(--lumo-raised)',
            color: filterActive ? 'var(--accent-sun)' : 'var(--lumo-text-sec)',
            border: filterActive
              ? '1.5px solid color-mix(in srgb, var(--accent-sun) 40%, transparent)'
              : '1.5px solid var(--lumo-border)',
            cursor: 'pointer',
          }}
        >
          <Filter size={14} />
          {filterType === 'all' ? 'Filter' : getCardioLabel(filterType)}
        </button>
      </div>

      {/* Filter chips */}
      {showFilters && (
        <div
          className="flex flex-wrap gap-1.5"
          style={{
            background: 'var(--lumo-raised)',
            border: '1px solid var(--lumo-border)',
            borderRadius: 20,
            padding: 12,
          }}
        >
          <button
            onClick={() => { setFilterType('all'); setShowFilters(false) }}
            className="active:scale-95 transition"
            style={{
              padding: '6px 12px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              background: filterType === 'all' ? 'var(--brand)' : 'var(--lumo-overlay)',
              color: filterType === 'all' ? '#fff' : 'var(--lumo-text-sec)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            All
          </button>
          {CARDIO_TYPES.map(ct => {
            const active = filterType === ct.value
            return (
              <button
                key={ct.value}
                onClick={() => { setFilterType(ct.value); setShowFilters(false) }}
                className="active:scale-95 transition"
                style={{
                  padding: '6px 12px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  background: active ? 'var(--brand)' : 'var(--lumo-overlay)',
                  color: active ? '#fff' : 'var(--lumo-text-sec)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {ct.emoji} {ct.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Stats bar */}
      {totalSessions > 0 && (
        <div className="flex gap-3">
          <StatBlock label="sessions" value={String(totalSessions)} accent="var(--accent-sun)" />
          <StatBlock label="total time" value={formatDuration(totalMinutes)} accent="var(--accent-mint)" />
          <StatBlock
            label="avg/session"
            value={`${totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0}m`}
            accent="var(--accent-plum)"
          />
        </div>
      )}

      {/* Empty state */}
      {filteredLogs.length === 0 && (
        <div
          className="text-center flex flex-col items-center gap-3"
          style={{
            padding: '40px 20px',
            background: 'var(--lumo-raised)',
            border: '1px solid var(--lumo-border)',
            borderRadius: 20,
          }}
        >
          <Lumo state="sleepy" size={72} color="var(--accent-sun)" />
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--lumo-text)',
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
              letterSpacing: '-0.01em',
            }}
          >
            {filterType === 'all' ? 'nothing yet. rest days count too.' : `no ${getCardioLabel(filterType)} sessions`}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--lumo-text-sec)',
              lineHeight: 1.4,
              maxWidth: 260,
            }}
          >
            {filterType === 'all' ? 'log your first session and it shows up right here.' : 'try a different filter'}
          </div>
        </div>
      )}

      {/* Grouped by date */}
      {sortedDates.map(date => (
        <div key={date}>
          <div style={{ ...kickerStyle, marginBottom: 6, paddingLeft: 4 }}>
            {formatDate(date)}
          </div>
          <div className="space-y-2">
            {grouped[date].map(log => (
              <div
                key={log.id}
                style={{
                  background: 'var(--lumo-raised)',
                  border: '1px solid var(--lumo-border)',
                  borderRadius: 18,
                  padding: 14,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{getCardioEmoji(log.type)}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--lumo-text)' }}>
                        {getCardioLabel(log.type)}
                      </div>
                      <div className="tabular-nums" style={{ fontSize: 11, color: 'var(--lumo-text-ter)' }}>
                        {formatDuration(log.duration_minutes)}
                        {log.incline ? ` · ${log.incline}% incline` : ''}
                        {log.distance ? ` · ${log.distance} mi` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {log.started_at && (
                      <span
                        className="tabular-nums"
                        style={{ fontSize: 10, color: 'var(--lumo-text-ter)' }}
                      >
                        {formatTime(log.started_at)}
                      </span>
                    )}
                    {confirmDeleteId === log.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="active:scale-95 transition"
                          style={{
                            padding: '4px 8px',
                            borderRadius: 10,
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--accent-blush)',
                            background: 'color-mix(in srgb, var(--accent-blush) 15%, transparent)',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="active:scale-95 transition"
                          style={{
                            padding: '4px 8px',
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
                        onClick={() => setConfirmDeleteId(log.id)}
                        className="p-1.5 rounded-lg active:scale-95 transition"
                        style={{
                          color: 'var(--lumo-text-ter)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {log.notes && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--lumo-text-sec)',
                      fontStyle: 'italic',
                      fontFamily: "'Fraunces', Georgia, serif",
                      marginTop: 6,
                      paddingLeft: 32,
                    }}
                  >
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

// ─── StatBlock ──────────────────────────────────────────────────────────
function StatBlock({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="flex-1 text-center"
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        borderRadius: 16,
        padding: 12,
      }}
    >
      <div
        className="tabular-nums"
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: accent,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--lumo-text-ter)',
          marginTop: 3,
        }}
      >
        {label}
      </div>
    </div>
  )
}
