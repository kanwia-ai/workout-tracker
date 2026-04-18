import { useState, useRef, useCallback } from 'react'
import {
  ArrowLeft, Link2, Camera, Loader2, X, Plus,
  ChevronDown, Sparkles, AlertCircle, Check, ImagePlus, Trash2,
} from 'lucide-react'
import {
  extractFromUrl,
  extractFromScreenshots,
  type ExtractedExercise,
  type ExtractionResult,
} from '../lib/gemini'

// ─── Types ───────────────────────────────────────────────────────────────────

type CaptureMode = 'choose' | 'url' | 'screenshot'
type FlowStep = 'input' | 'loading' | 'review' | 'save-target' | 'done'

interface ExerciseCaptureProps {
  onBack: () => void
  onSaveToLibrary: (exercises: ExtractedExercise[]) => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExerciseCapture({ onBack, onSaveToLibrary }: ExerciseCaptureProps) {
  const [mode, setMode] = useState<CaptureMode>('choose')
  const [step, setStep] = useState<FlowStep>('input')
  const [url, setUrl] = useState('')
  const [images, setImages] = useState<Array<{ base64: string; mimeType: string; preview: string }>>([])
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [editingExercises, setEditingExercises] = useState<ExtractedExercise[]>([])
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [selectedExercises, setSelectedExercises] = useState<Set<number>>(new Set())
  const [savedMessage, setSavedMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── URL submission ────────────────────────────────────────────────────────

  const handleUrlSubmit = useCallback(async () => {
    if (!url.trim()) return
    setStep('loading')

    const res = await extractFromUrl(url.trim())

    if (res.error === 'SCREENSHOT_NEEDED') {
      // Redirect to screenshot mode with explanation
      setMode('screenshot')
      setStep('input')
      setResult({
        exercises: [],
        source_url: url,
        error: 'This platform requires screenshots. Take 1-3 screenshots of the exercise from the video, then upload them below.',
      })
      return
    }

    setResult(res)
    if (res.exercises.length > 0) {
      setEditingExercises(res.exercises.map(e => ({ ...e })))
      setSelectedExercises(new Set(res.exercises.map((_, i) => i)))
      setStep('review')
    } else {
      setStep('input')
    }
  }, [url])

  // ─── Screenshot handling ───────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages: Array<{ base64: string; mimeType: string; preview: string }> = []

    for (let i = 0; i < Math.min(files.length, 3 - images.length); i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue

      const base64 = await fileToBase64(file)
      const preview = URL.createObjectURL(file)
      newImages.push({ base64, mimeType: file.type, preview })
    }

    setImages(prev => [...prev, ...newImages].slice(0, 3))
    // Reset the input so the same file can be selected again
    e.target.value = ''
  }, [images.length])

  const removeImage = useCallback((idx: number) => {
    setImages(prev => {
      const next = [...prev]
      URL.revokeObjectURL(next[idx].preview)
      next.splice(idx, 1)
      return next
    })
  }, [])

  const handleScreenshotSubmit = useCallback(async () => {
    if (images.length === 0) return
    setStep('loading')

    const res = await extractFromScreenshots(
      images.map(img => ({ base64: img.base64, mimeType: img.mimeType })),
    )

    setResult(res)
    if (res.exercises.length > 0) {
      setEditingExercises(res.exercises.map(e => ({ ...e })))
      setSelectedExercises(new Set(res.exercises.map((_, i) => i)))
      setStep('review')
    } else {
      setStep('input')
    }
  }, [images])

  // ─── Exercise editing ──────────────────────────────────────────────────────

  const updateExercise = useCallback((idx: number, field: keyof ExtractedExercise, value: unknown) => {
    setEditingExercises(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }, [])

  const toggleExerciseSelected = useCallback((idx: number) => {
    setSelectedExercises(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])

  const removeExercise = useCallback((idx: number) => {
    setEditingExercises(prev => prev.filter((_, i) => i !== idx))
    setSelectedExercises(prev => {
      const next = new Set<number>()
      for (const i of prev) {
        if (i < idx) next.add(i)
        else if (i > idx) next.add(i - 1)
      }
      return next
    })
    if (editingIdx === idx) setEditingIdx(null)
    else if (editingIdx !== null && editingIdx > idx) setEditingIdx(editingIdx - 1)
  }, [editingIdx])

  // ─── Save actions ──────────────────────────────────────────────────────────

  const getSelectedExercises = useCallback(() => {
    return editingExercises.filter((_, i) => selectedExercises.has(i))
  }, [editingExercises, selectedExercises])

  const handleSaveToLibrary = useCallback(() => {
    const selected = getSelectedExercises()
    if (selected.length === 0) return
    onSaveToLibrary(selected)
    setSavedMessage(`${selected.length} exercise${selected.length > 1 ? 's' : ''} added to library`)
    setStep('done')
  }, [getSelectedExercises, onSaveToLibrary])

  // ─── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setMode('choose')
    setStep('input')
    setUrl('')
    setImages(prev => {
      prev.forEach(img => URL.revokeObjectURL(img.preview))
      return []
    })
    setResult(null)
    setEditingExercises([])
    setEditingIdx(null)
    setSelectedExercises(new Set())
    setSavedMessage('')
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
      <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">

        {/* Header */}
        <div className="flex items-center gap-3 pt-3 pb-4">
          <button
            onClick={step === 'done' ? handleReset : mode === 'choose' ? onBack : () => { setMode('choose'); setStep('input'); setResult(null) }}
            className="p-2 -ml-2 rounded-lg text-zinc-400 active:scale-95 transition-transform"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">
              {step === 'done' ? 'Saved!' : step === 'review' ? 'Review Exercises' : 'Add Exercise'}
            </h1>
            <p className="text-xs text-zinc-500">
              {step === 'done' ? savedMessage : step === 'review' ? 'Edit fields, then save' : 'From social media or screenshots'}
            </p>
          </div>
        </div>

        {/* ─── Mode Chooser ─────────────────────────────────────────────── */}
        {mode === 'choose' && step === 'input' && (
          <div className="space-y-3 mt-2">
            <button
              onClick={() => setMode('url')}
              className="w-full flex items-center gap-4 bg-surface-raised border border-border-subtle rounded-2xl px-4 py-5 active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                <Link2 size={22} className="text-brand" />
              </div>
              <div className="text-left">
                <div className="font-bold text-sm">From YouTube URL</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Paste a YouTube link — AI extracts the exercises
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('screenshot')}
              className="w-full flex items-center gap-4 bg-surface-raised border border-border-subtle rounded-2xl px-4 py-5 active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-soft border border-purple-900/30 flex items-center justify-center shrink-0">
                <Camera size={22} className="text-purple-400" />
              </div>
              <div className="text-left">
                <div className="font-bold text-sm">From Screenshots</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Upload 1-3 screenshots from TikTok, IG, or any source
                </div>
              </div>
            </button>

            <div className="bg-surface-raised border border-border-subtle rounded-2xl px-4 py-3 mt-4">
              <div className="flex items-start gap-2.5">
                <Sparkles size={16} className="text-brand mt-0.5 shrink-0" />
                <div className="text-xs text-zinc-400">
                  <strong className="text-zinc-300">How it works:</strong> AI analyzes the video or images to identify exercises,
                  muscle groups, equipment, sets/reps, and form cues. You review and edit before saving.
                </div>
              </div>
            </div>

            <div className="bg-surface-raised border border-border-subtle rounded-2xl px-4 py-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={16} className="text-zinc-500 mt-0.5 shrink-0" />
                <div className="text-xs text-zinc-500">
                  <strong className="text-zinc-400">TikTok & Instagram:</strong> These platforms block direct video access.
                  Use the screenshot option instead — just screenshot the exercises from the video.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── URL Input ────────────────────────────────────────────────── */}
        {mode === 'url' && step === 'input' && (
          <div className="space-y-3 mt-2">
            <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4">
              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                YouTube URL
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-surface-overlay border border-border-medium text-white text-sm placeholder:text-zinc-600 outline-none focus:border-brand transition-colors"
              />
              {result?.error && result.error !== 'SCREENSHOT_NEEDED' && (
                <div className="flex items-start gap-2 mt-3 text-xs text-danger">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{result.error}</span>
                </div>
              )}
              <button
                onClick={handleUrlSubmit}
                disabled={!url.trim()}
                className="w-full mt-4 py-3 rounded-xl font-bold text-sm bg-brand text-white active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                Extract Exercises
              </button>
            </div>

            <div className="text-xs text-zinc-500 text-center px-4">
              Works with YouTube videos and Shorts. For TikTok or Instagram, use the screenshot option.
            </div>
          </div>
        )}

        {/* ─── Screenshot Input ─────────────────────────────────────────── */}
        {mode === 'screenshot' && step === 'input' && (
          <div className="space-y-3 mt-2">
            {/* Info banner if redirected from URL */}
            {result?.error && result.error !== 'SCREENSHOT_NEEDED' && (
              <div className="flex items-start gap-2.5 bg-brand-soft border border-brand/20 rounded-2xl px-4 py-3">
                <AlertCircle size={16} className="text-brand mt-0.5 shrink-0" />
                <div className="text-xs text-zinc-300">{result.error}</div>
              </div>
            )}
            {result?.error === 'SCREENSHOT_NEEDED' && (
              <div className="flex items-start gap-2.5 bg-brand-soft border border-brand/20 rounded-2xl px-4 py-3">
                <AlertCircle size={16} className="text-brand mt-0.5 shrink-0" />
                <div className="text-xs text-zinc-300">
                  This platform requires screenshots. Take 1-3 screenshots of the exercise from the video, then upload them below.
                </div>
              </div>
            )}

            <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4">
              <label className="block text-sm font-semibold text-zinc-300 mb-3">
                Upload Screenshots ({images.length}/3)
              </label>

              {/* Image previews */}
              {images.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {images.map((img, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border-medium">
                      <img src={img.preview} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <X size={12} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              {images.length < 3 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 rounded-xl border-2 border-dashed border-border-medium text-zinc-500 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform hover:border-zinc-500"
                >
                  <ImagePlus size={24} />
                  <span className="text-xs font-semibold">Tap to add screenshot</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={handleScreenshotSubmit}
                disabled={images.length === 0}
                className="w-full mt-4 py-3 rounded-xl font-bold text-sm bg-brand text-white active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                Extract Exercises
              </button>
            </div>

            <div className="text-xs text-zinc-500 text-center px-4">
              Tip: Screenshot the exercise being performed, plus any text showing sets/reps.
            </div>
          </div>
        )}

        {/* ─── Loading ──────────────────────────────────────────────────── */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-4">
              <Loader2 size={28} className="text-brand animate-spin" />
            </div>
            <div className="text-sm font-bold text-zinc-300">Analyzing with AI...</div>
            <div className="text-xs text-zinc-500 mt-1">This may take 10-30 seconds</div>
          </div>
        )}

        {/* ─── Review & Edit ────────────────────────────────────────────── */}
        {step === 'review' && (
          <div className="space-y-3 mt-1">
            {/* Source info */}
            {result?.source_url && (
              <div className="text-xs text-zinc-500 truncate px-1">
                Source: {result.source_url}
              </div>
            )}

            {/* Exercise cards */}
            {editingExercises.map((exercise, idx) => {
              const isExpanded = editingIdx === idx
              const isSelected = selectedExercises.has(idx)

              return (
                <div
                  key={idx}
                  className="bg-surface-raised border rounded-2xl overflow-hidden transition-colors"
                  style={{
                    borderColor: isSelected ? '#f97316' : '#2a2a2e',
                  }}
                >
                  {/* Card header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => toggleExerciseSelected(idx)}
                      className="w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors active:scale-90"
                      style={{
                        borderColor: isSelected ? '#f97316' : '#3a3a3e',
                        background: isSelected ? '#f97316' : 'transparent',
                      }}
                    >
                      {isSelected && <Check size={14} className="text-white" />}
                    </button>

                    <button
                      onClick={() => setEditingIdx(isExpanded ? null : idx)}
                      className="flex-1 text-left"
                    >
                      <div className="font-bold text-sm">{exercise.name}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {exercise.muscle_groups.map(mg => (
                          <span key={mg} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand/10 text-brand">
                            {mg}
                          </span>
                        ))}
                        {exercise.sets && exercise.reps && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-soft text-purple-400">
                            {exercise.sets}x{exercise.reps}
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => removeExercise(idx)}
                        className="p-1.5 rounded-lg text-zinc-600 active:scale-90 transition-transform"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => setEditingIdx(isExpanded ? null : idx)}
                        className="p-1.5 rounded-lg text-zinc-400 active:scale-90 transition-transform"
                      >
                        <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded edit form */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border-subtle pt-3">
                      {/* Name */}
                      <Field label="Exercise Name">
                        <input
                          type="text"
                          value={exercise.name}
                          onChange={e => updateExercise(idx, 'name', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-border-medium text-white text-sm outline-none focus:border-brand transition-colors"
                        />
                      </Field>

                      {/* Muscle groups */}
                      <Field label="Muscle Groups (comma-separated)">
                        <input
                          type="text"
                          value={exercise.muscle_groups.join(', ')}
                          onChange={e => updateExercise(idx, 'muscle_groups', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          className="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-border-medium text-white text-sm outline-none focus:border-brand transition-colors"
                        />
                      </Field>

                      {/* Equipment */}
                      <Field label="Equipment (comma-separated)">
                        <input
                          type="text"
                          value={exercise.equipment.join(', ')}
                          onChange={e => updateExercise(idx, 'equipment', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          className="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-border-medium text-white text-sm outline-none focus:border-brand transition-colors"
                        />
                      </Field>

                      {/* Sets / Reps row */}
                      <div className="flex gap-3">
                        <Field label="Sets" className="flex-1">
                          <input
                            type="number"
                            value={exercise.sets ?? ''}
                            onChange={e => updateExercise(idx, 'sets', e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="3"
                            className="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-border-medium text-white text-sm outline-none focus:border-brand transition-colors"
                          />
                        </Field>
                        <Field label="Reps" className="flex-1">
                          <input
                            type="text"
                            value={exercise.reps ?? ''}
                            onChange={e => updateExercise(idx, 'reps', e.target.value || undefined)}
                            placeholder="12"
                            className="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-border-medium text-white text-sm outline-none focus:border-brand transition-colors"
                          />
                        </Field>
                      </div>

                      {/* Form cues */}
                      <Field label="Form Cues">
                        {exercise.form_cues.map((cue, ci) => (
                          <div key={ci} className="flex gap-2 mb-1.5">
                            <input
                              type="text"
                              value={cue}
                              onChange={e => {
                                const newCues = [...exercise.form_cues]
                                newCues[ci] = e.target.value
                                updateExercise(idx, 'form_cues', newCues)
                              }}
                              className="flex-1 px-3 py-2 rounded-lg bg-surface-overlay border border-border-medium text-white text-sm outline-none focus:border-brand transition-colors"
                            />
                            <button
                              onClick={() => {
                                const newCues = exercise.form_cues.filter((_, i) => i !== ci)
                                updateExercise(idx, 'form_cues', newCues)
                              }}
                              className="p-2 rounded-lg text-zinc-600 active:scale-90 transition-transform"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => updateExercise(idx, 'form_cues', [...exercise.form_cues, ''])}
                          className="flex items-center gap-1 text-xs text-brand font-semibold mt-1 active:scale-95 transition-transform"
                        >
                          <Plus size={12} /> Add cue
                        </button>
                      </Field>

                      {/* Notes */}
                      <Field label="Notes">
                        <input
                          type="text"
                          value={exercise.notes ?? ''}
                          onChange={e => updateExercise(idx, 'notes', e.target.value || undefined)}
                          placeholder="Optional notes..."
                          className="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-border-medium text-white text-sm outline-none focus:border-brand transition-colors"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              )
            })}

            {/* No exercises found */}
            {editingExercises.length === 0 && (
              <div className="text-center py-12 bg-surface-raised rounded-2xl border border-border-subtle">
                <AlertCircle size={32} className="text-zinc-600 mx-auto mb-3" />
                <div className="text-sm font-bold text-zinc-400">No exercises found</div>
                <div className="text-xs text-zinc-500 mt-1">Try a different URL or clearer screenshots</div>
              </div>
            )}

            {/* Save actions */}
            {editingExercises.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs text-zinc-500 text-center">
                  {selectedExercises.size} of {editingExercises.length} selected
                </div>

                <button
                  onClick={handleSaveToLibrary}
                  disabled={selectedExercises.size === 0}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm bg-brand text-white active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Add to Library
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Done ─────────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-success-soft border border-success/20 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-success" />
            </div>
            <div className="text-lg font-bold text-success mb-1">Saved!</div>
            <div className="text-sm text-zinc-400">{savedMessage}</div>
            <button
              onClick={handleReset}
              className="mt-6 px-6 py-3 rounded-xl font-bold text-sm bg-brand text-white active:scale-[0.98] transition-transform"
            >
              Add More Exercises
            </button>
            <button
              onClick={onBack}
              className="block mx-auto mt-3 text-sm text-zinc-500 font-semibold active:scale-95 transition-transform"
            >
              Back to Workouts
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Utility Components ──────────────────────────────────────────────────────

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

// ─── Utility Functions ───────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix to get raw base64
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
