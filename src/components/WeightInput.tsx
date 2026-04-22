// Legacy — replaced by LiftCard's WeightChipRow. Kept for any external callers
// (currently: ExerciseCard, itself no longer wired into the app tree). Mark
// for removal once ExerciseCard is deleted.
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
          className="active:scale-95 transition-transform"
          style={{
            padding: '6px 12px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--lumo-text-sec)',
            background: 'var(--lumo-overlay)',
            border: '1px solid var(--lumo-border)',
          }}
        >
          + log weight
        </button>
        {lastWeight && (
          <span
            style={{
              fontSize: 10,
              color: 'var(--lumo-text-ter)',
            }}
          >
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
        className="active:scale-95 transition-transform"
        style={{
          padding: '6px 12px',
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 600,
          background: isPR
            ? 'color-mix(in srgb, var(--accent-mint) 18%, transparent)'
            : 'var(--lumo-overlay)',
          border: isPR
            ? '1px solid color-mix(in srgb, var(--accent-mint) 45%, transparent)'
            : '1px solid var(--lumo-border)',
          color: isPR ? 'var(--accent-mint)' : 'var(--lumo-text)',
        }}
      >
        {value} lbs {isPR ? '★' : ''}
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
        className="tabular-nums outline-none"
        style={{
          width: 64,
          padding: '6px 10px',
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--lumo-text)',
          background: 'var(--lumo-input-bg)',
          border: '1px solid var(--brand)',
        }}
        placeholder={lastWeight?.toString() || 'lbs'}
      />
      <span style={{ fontSize: 12, color: 'var(--lumo-text-ter)' }}>lbs</span>
    </div>
  )
}
