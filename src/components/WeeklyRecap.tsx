import { useState } from 'react'
import { X, ChevronRight, Trophy, Flame, Timer } from 'lucide-react'
import type { WeeklyRecapData } from '../data/mock-progress'

interface WeeklyRecapProps {
  data: WeeklyRecapData
  onDismiss: () => void
  onViewProgress: () => void
}

export function WeeklyRecap({ data, onDismiss, onViewProgress }: WeeklyRecapProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)',
        borderRadius: 22,
      }}
    >
      {/* Soft brand glow — replaces the old gradient */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'color-mix(in srgb, var(--brand) 18%, transparent)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss weekly recap"
        className="absolute top-3 right-3 p-1.5 rounded-lg active:scale-90 transition-all z-10"
        style={{ color: 'var(--lumo-text-ter)' }}
      >
        <X size={16} />
      </button>

      {/* Collapsed: 1-2 highlights */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="relative w-full text-left p-4 pr-10"
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              borderRadius: 10,
              background: 'color-mix(in srgb, var(--brand) 20%, transparent)',
            }}
          >
            <Trophy size={14} style={{ color: 'var(--brand)' }} />
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--brand)',
            }}
          >
            {data.weekLabel}
          </span>
        </div>

        <div className="space-y-1.5">
          {data.highlights.slice(0, 2).map((h, i) => (
            <p
              key={i}
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--lumo-text)',
                lineHeight: 1.35,
              }}
            >
              {h}
            </p>
          ))}
        </div>

        {!expanded && (
          <div
            className="flex items-center gap-1 mt-3"
            style={{ fontSize: 12, color: 'var(--lumo-text-ter)' }}
          >
            <span>tap for details</span>
            <ChevronRight size={12} />
          </div>
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="relative px-4 pb-4 space-y-3 pt-3"
          style={{ borderTop: '1px solid var(--lumo-border)' }}
        >
          {/* Stats row */}
          <div className="flex gap-3">
            <div
              className="flex-1"
              style={{
                background: 'var(--lumo-overlay)',
                border: '1px solid var(--lumo-border)',
                borderRadius: 14,
                padding: 12,
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Flame size={12} style={{ color: 'var(--brand)' }} />
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--lumo-text-ter)',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  sessions
                </span>
              </div>
              <span
                className="tabular-nums"
                style={{ fontSize: 20, fontWeight: 800, color: 'var(--lumo-text)' }}
              >
                {data.workoutsCompleted}
              </span>
            </div>
            <div
              className="flex-1"
              style={{
                background: 'var(--lumo-overlay)',
                border: '1px solid var(--lumo-border)',
                borderRadius: 14,
                padding: 12,
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Timer size={12} style={{ color: 'var(--accent-plum)' }} />
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--lumo-text-ter)',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  total time
                </span>
              </div>
              <span
                className="tabular-nums"
                style={{ fontSize: 20, fontWeight: 800, color: 'var(--lumo-text)' }}
              >
                {Math.floor(data.totalMinutes / 60)}h {data.totalMinutes % 60}m
              </span>
            </div>
          </div>

          {/* PRs */}
          {data.newPRs.length > 0 && (
            <div
              style={{
                background: 'var(--lumo-overlay)',
                border: '1px solid var(--lumo-border)',
                borderRadius: 14,
                padding: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--lumo-text-ter)',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                new PRs
              </span>
              {data.newPRs.map((pr, i) => (
                <div key={i} className="flex items-center justify-between mt-1.5">
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--lumo-text)' }}>
                    {pr.exercise}
                  </span>
                  <span
                    className="tabular-nums"
                    style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-mint)' }}
                  >
                    {pr.weight} lbs
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Cardio highlight */}
          {data.cardioHighlight && (
            <div
              style={{
                background: 'var(--lumo-overlay)',
                border: '1px solid var(--lumo-border)',
                borderRadius: 14,
                padding: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--lumo-text-ter)',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                cardio
              </span>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--lumo-text)',
                  marginTop: 4,
                }}
              >
                {data.cardioHighlight}
              </p>
            </div>
          )}

          {/* View full progress */}
          <button
            onClick={onViewProgress}
            aria-label="View full progress"
            className="w-full flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{
              padding: 14,
              borderRadius: 14,
              background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)',
              color: 'var(--brand)',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            view full progress
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
