import { useState, useRef, useEffect } from 'react'

interface WeightInputProps {
  value?: number
  lastWeight?: number
  pr?: number
  onChange: (weight: number) => void
}

export function WeightInput({ value, lastWeight, pr, onChange }: WeightInputProps) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value?.toString() || '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  // No value logged yet
  if (!editing && !value) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setEditing(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 bg-surface-overlay border border-border-medium active:scale-95 transition-transform"
        >
          + log weight
        </button>
        {lastWeight && (
          <span className="text-[10px] text-warning">
            Last: {lastWeight} lbs
          </span>
        )}
      </div>
    )
  }

  // Value logged, show it
  if (!editing && value) {
    const isPR = pr && value >= pr
    return (
      <button
        onClick={() => { setVal(value.toString()); setEditing(true) }}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold border active:scale-95 transition-transform"
        style={{
          background: '#1e3a2e',
          borderColor: '#4ade8044',
          color: '#4ade80',
        }}
      >
        {value} lbs {isPR ? '🏆' : ''}
      </button>
    )
  }

  // Editing
  return (
    <div className="flex gap-2 items-center">
      <input
        ref={inputRef}
        type="number"
        inputMode="decimal"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => { if (val) onChange(parseFloat(val)); setEditing(false) }}
        onKeyDown={e => { if (e.key === 'Enter') { if (val) onChange(parseFloat(val)); setEditing(false) } }}
        className="w-16 px-2 py-1.5 rounded-lg text-sm text-white bg-surface-overlay border border-brand outline-none font-medium"
        placeholder={lastWeight?.toString() || 'lbs'}
      />
      <span className="text-xs text-zinc-500">lbs</span>
    </div>
  )
}
