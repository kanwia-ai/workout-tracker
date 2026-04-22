import { ArrowLeft } from 'lucide-react'
import { ProgressCharts } from './ProgressCharts'

interface ProgressViewProps {
  onBack: () => void
}

export function ProgressView({ onBack }: ProgressViewProps) {
  return (
    <div
      className="min-h-screen font-[system-ui,-apple-system,'Segoe_UI',sans-serif]"
      style={{
        background: 'var(--lumo-bg)',
        color: 'var(--lumo-text)',
      }}
    >
      <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">
        {/* Header */}
        <div className="flex items-center gap-3 pt-3 pb-4">
          <button
            onClick={onBack}
            aria-label="Back"
            className="p-2 -ml-2 rounded-xl active:scale-90 transition-all"
            style={{
              background: 'var(--lumo-raised)',
              border: '1px solid var(--lumo-border)',
              color: 'var(--lumo-text-sec)',
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--brand)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                lineHeight: 1.1,
              }}
            >
              progress
            </h1>
            <p
              style={{
                fontSize: 12,
                color: 'var(--lumo-text-ter)',
                marginTop: 2,
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
              }}
            >
              one insight at a time
            </p>
          </div>
        </div>

        {/* Charts */}
        <ProgressCharts />
      </div>
    </div>
  )
}
