import { useState } from 'react'

interface Props {
  value?: string
  onNext: (notes: string) => void
}

const MAX_LEN = 500

export function StepPosture({ value, onNext }: Props) {
  const [text, setText] = useState<string>(value ?? '')

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Anything about your body or lifestyle?</h1>
      <p className="text-zinc-500 mb-6">
        Posture quirks, work habits, mobility limits — optional, but it helps.
      </p>

      <label className="block mb-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          maxLength={MAX_LEN}
          placeholder="Desk worker? Tight hips? Anything else…"
          rows={6}
          className="w-full p-4 rounded-2xl bg-surface-raised border-2 border-border-subtle resize-none"
          aria-label="Posture and lifestyle notes"
        />
      </label>
      <div className="flex justify-end text-xs text-zinc-500 mb-6">
        {text.length} / {MAX_LEN}
      </div>

      <button
        type="button"
        onClick={() => onNext(text)}
        className="w-full min-h-[56px] p-4 rounded-2xl font-bold bg-brand text-black active:scale-[0.98]"
      >
        Next
      </button>
    </div>
  )
}
