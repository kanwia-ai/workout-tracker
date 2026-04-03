import { ArrowLeft } from 'lucide-react'
import { ProgressCharts } from './ProgressCharts'

interface ProgressViewProps {
  onBack: () => void
}

export function ProgressView({ onBack }: ProgressViewProps) {
  return (
    <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
      <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">
        {/* Header */}
        <div className="flex items-center gap-3 pt-3 pb-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-zinc-200 active:scale-90 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight bg-gradient-to-r from-brand to-orange-300 bg-clip-text text-transparent">
              Progress
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              One insight at a time
            </p>
          </div>
        </div>

        {/* Charts */}
        <ProgressCharts />
      </div>
    </div>
  )
}
