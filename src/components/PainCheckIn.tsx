import { useState } from 'react'
import { X } from 'lucide-react'
import type { PainLevel } from '../data/protocols'

interface PainCheckInProps {
  onSubmit: (painLevel: PainLevel, swelling: boolean, notes?: string) => void
  onSkip: () => void
}

const PAIN_OPTIONS: { level: PainLevel; emoji: string; label: string; color: string }[] = [
  { level: 'none', emoji: '😊', label: 'No pain', color: 'bg-green-500/20 border-green-500/40 text-green-300' },
  { level: 'mild', emoji: '😐', label: 'Mild', color: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' },
  { level: 'moderate', emoji: '😣', label: 'Moderate', color: 'bg-orange-500/20 border-orange-500/40 text-orange-300' },
  { level: 'severe', emoji: '😫', label: 'Severe', color: 'bg-red-500/20 border-red-500/40 text-red-300' },
]

export function PainCheckIn({ onSubmit, onSkip }: PainCheckInProps) {
  const [selected, setSelected] = useState<PainLevel | null>(null)
  const [swelling, setSwelling] = useState(false)

  const shouldWarn = selected === 'moderate' || selected === 'severe' || swelling

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className="w-full max-w-lg bg-surface-raised border-t border-border-subtle rounded-t-3xl p-5 pb-8 safe-bottom">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold">{'🦵'} Quick Knee Check</h3>
            <p className="text-xs text-zinc-500 mt-0.5">How did your knee feel today?</p>
          </div>
          <button onClick={onSkip} className="p-2 text-zinc-500 active:scale-90">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {PAIN_OPTIONS.map(opt => (
            <button
              key={opt.level}
              onClick={() => setSelected(opt.level)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all active:scale-95 ${
                selected === opt.level ? opt.color : 'border-zinc-700 bg-zinc-800/50'
              }`}
            >
              <span className="text-xl">{opt.emoji}</span>
              <span className="text-[11px] font-medium">{opt.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setSwelling(!swelling)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all mb-4 ${
            swelling ? 'border-red-500/40 bg-red-500/10' : 'border-zinc-700 bg-zinc-800/50'
          }`}
        >
          <span className="text-lg">{swelling ? '🔴' : '⚪'}</span>
          <span className="text-sm">Any swelling?</span>
        </button>

        {shouldWarn && (
          <div className="text-xs text-orange-400 bg-orange-500/10 rounded-xl px-3 py-2 mb-4">
            This will scale back to the previous week's exercises. Your knee needs time to recover.
          </div>
        )}

        <button
          onClick={() => selected && onSubmit(selected, swelling)}
          disabled={!selected}
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
            selected ? 'bg-brand text-white' : 'bg-zinc-700 text-zinc-500'
          }`}
        >
          Save & Continue
        </button>
      </div>
    </div>
  )
}
