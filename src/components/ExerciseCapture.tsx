import { useState, useRef, useCallback } from 'react'
import {
  ArrowLeft, Link2, Camera, Loader2, X, Plus,
  ChevronDown, Sparkles, AlertCircle, Check, ImagePlus, Trash2,
} from 'lucide-react'
import { Lumo } from './Lumo'
import {
  extractFromUrl,
  extractFromScreenshots,
  analyzeYouTubeShort,
  isYouTubeUrl,
  type ExtractedExercise,
  type ExtractionResult,
  type AnalyzedExercise,
} from '../lib/gemini'
import { enrichExercise, type EnrichedExercise } from '../lib/enrichExercise'

// ─── Types ───────────────────────────────────────────────────────────────────

type CaptureMode = 'choose' | 'url' | 'screenshot'
type FlowStep = 'input' | 'loading' | 'review' | 'done'

interface ExerciseCaptureProps {
  onBack: () => void
  onSaveToLibrary: (exercises: ExtractedExercise[]) => void
}

// ─── Shared styles ───────────────────────────────────────────────────────────

const KICKER_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--lumo-text-ter)',
  marginBottom: 6,
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 14,
  background: 'var(--lumo-overlay)',
  border: '1px solid var(--lumo-border)',
  color: 'var(--lumo-text)',
  fontSize: 14,
  outline: 'none',
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
  // YouTube-only side channels: the Gemini analysis (with confidence +
  // injury_flags) and the optional Claude enrichment. Both are display-only
  // — the canonical data the user edits still lives in editingExercises.
  const [ytAnalysis, setYtAnalysis] = useState<AnalyzedExercise | null>(null)
  const [enrichment, setEnrichment] = useState<EnrichedExercise | null>(null)
  const [enrichLoading, setEnrichLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── URL submission ────────────────────────────────────────────────────────

  const handleUrlSubmit = useCallback(async () => {
    const trimmed = url.trim()
    if (!trimmed) return
    setStep('loading')
    setYtAnalysis(null)
    setEnrichment(null)

    // YouTube URLs take the rich Gemini-analysis path so we can capture
    // injury_flags + confidence for the preview panel. Non-YouTube URLs fall
    // through to the legacy `extractFromUrl` shim (which routes to the
    // screenshot flow via SCREENSHOT_NEEDED).
    if (isYouTubeUrl(trimmed)) {
      try {
        const analyzed = await analyzeYouTubeShort(trimmed)
        setYtAnalysis(analyzed)
        const extracted: ExtractedExercise = {
          name: analyzed.name,
          muscle_groups: [...analyzed.primary_muscles, ...analyzed.secondary_muscles],
          equipment: analyzed.equipment,
          form_cues: analyzed.form_cues,
          notes: undefined,
        }
        setResult({ exercises: [extracted], source_url: trimmed })
        setEditingExercises([extracted])
        setSelectedExercises(new Set([0]))
        setStep('review')

        // Fire-and-forget Claude enrichment. Failures (e.g. op not deployed
        // yet) degrade silently — the import still works without enrichment.
        setEnrichLoading(true)
        enrichExercise(analyzed)
          .then(result => setEnrichment(result))
          .catch(() => setEnrichment(null))
          .finally(() => setEnrichLoading(false))
      } catch (err) {
        setResult({
          exercises: [],
          source_url: trimmed,
          error: err instanceof Error ? err.message : String(err),
        })
        setStep('input')
      }
      return
    }

    const res = await extractFromUrl(trimmed)

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
    setYtAnalysis(null)
    setEnrichment(null)
    setEnrichLoading(false)
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--lumo-bg)',
        color: 'var(--lumo-text)',
      }}
      className="font-[system-ui,-apple-system,'Segoe_UI',sans-serif]"
    >
      <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">

        {/* Header */}
        <div className="flex items-center gap-3 pt-3 pb-4">
          <button
            onClick={step === 'done' ? handleReset : mode === 'choose' ? onBack : () => { setMode('choose'); setStep('input'); setResult(null) }}
            aria-label="Back"
            className="p-2 -ml-2 rounded-xl active:scale-95 transition-transform"
            style={{ color: 'var(--lumo-text-sec)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: '-0.01em',
                color: 'var(--lumo-text)',
              }}
            >
              {step === 'done' ? 'saved' : step === 'review' ? 'Review Exercises' : 'Add Exercise'}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--lumo-text-ter)', marginTop: 2 }}>
              {step === 'done' ? savedMessage : step === 'review' ? 'edit fields, then save' : 'from social media or screenshots'}
            </p>
          </div>
        </div>

        {/* Lumo greeting on the input screens — mirrors the onboarding pattern. */}
        {step === 'input' && (
          <div className="flex items-end gap-2.5 mb-3">
            <Lumo state="curious" size={64} />
            <div
              style={{
                position: 'relative',
                flex: 1,
                background: 'var(--lumo-raised)',
                border: '1px solid var(--lumo-border)',
                padding: '12px 14px',
                borderRadius: 18,
                borderBottomLeftRadius: 4,
                fontSize: 14,
                lineHeight: 1.4,
                color: 'var(--lumo-text)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                marginBottom: 2,
              }}
            >
              {mode === 'url'
                ? "paste a link — I'll read what's in the video."
                : mode === 'screenshot'
                  ? "point your camera at the board. I'll read it."
                  : "show me what you want to try. I'll do the rest."}
            </div>
          </div>
        )}

        {/* ─── Mode Chooser ─────────────────────────────────────────────── */}
        {mode === 'choose' && step === 'input' && (
          <div className="space-y-3 mt-2">
            <button
              onClick={() => setMode('url')}
              className="w-full flex items-center gap-4 active:scale-[0.98] transition-transform"
              style={{
                background: 'var(--lumo-raised)',
                border: '1px solid var(--lumo-border)',
                borderRadius: 22,
                padding: '18px 16px',
                cursor: 'pointer',
              }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'color-mix(in srgb, var(--brand) 14%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)',
                }}
              >
                <Link2 size={22} style={{ color: 'var(--brand)' }} />
              </div>
              <div className="text-left">
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--lumo-text)' }}>
                  From YouTube URL
                </div>
                <div style={{ fontSize: 12, color: 'var(--lumo-text-ter)', marginTop: 2 }}>
                  Paste a YouTube link or Short — Gemini watches the lift
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('screenshot')}
              className="w-full flex items-center gap-4 active:scale-[0.98] transition-transform"
              style={{
                background: 'var(--lumo-raised)',
                border: '1px solid var(--lumo-border)',
                borderRadius: 22,
                padding: '18px 16px',
                cursor: 'pointer',
              }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'color-mix(in srgb, var(--accent-plum) 14%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent-plum) 30%, transparent)',
                }}
              >
                <Camera size={22} style={{ color: 'var(--accent-plum)' }} />
              </div>
              <div className="text-left">
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--lumo-text)' }}>
                  From Screenshots
                </div>
                <div style={{ fontSize: 12, color: 'var(--lumo-text-ter)', marginTop: 2 }}>
                  Upload 1-3 screenshots from TikTok, IG, or any source
                </div>
              </div>
            </button>

            <div
              className="mt-4"
              style={{
                background: 'var(--lumo-raised)',
                border: '1px solid var(--lumo-border)',
                borderRadius: 22,
                padding: '12px 16px',
              }}
            >
              <div className="flex items-start gap-2.5">
                <Sparkles size={16} style={{ color: 'var(--brand)', marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: 'var(--lumo-text-sec)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--lumo-text)' }}>How it works:</strong> AI analyzes the video or images to identify exercises,
                  muscle groups, equipment, sets/reps, and form cues. You review and edit before saving.
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'var(--lumo-raised)',
                border: '1px solid var(--lumo-border)',
                borderRadius: 22,
                padding: '12px 16px',
              }}
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle size={16} style={{ color: 'var(--lumo-text-ter)', marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: 'var(--lumo-text-ter)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--lumo-text-sec)' }}>TikTok & Instagram:</strong> These platforms block direct video access.
                  Use the screenshot option instead — just screenshot the exercises from the video.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── URL Input ────────────────────────────────────────────────── */}
        {mode === 'url' && step === 'input' && (
          <div className="space-y-3 mt-2">
            <div
              style={{
                background: 'var(--lumo-raised)',
                border: '1px solid var(--lumo-border)',
                borderRadius: 22,
                padding: 16,
              }}
            >
              <label className="block" style={{ ...KICKER_STYLE, display: 'block' }}>
                YouTube URL
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                autoFocus
                style={INPUT_STYLE}
              />
              {result?.error && result.error !== 'SCREENSHOT_NEEDED' && (
                <div
                  className="flex items-start gap-2 mt-3"
                  style={{ fontSize: 12, color: '#ef4444' }}
                >
                  <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>{result.error}</span>
                </div>
              )}
              <button
                onClick={handleUrlSubmit}
                disabled={!url.trim()}
                className="w-full active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2 mt-4"
                style={{
                  padding: '14px',
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 800,
                  background: 'var(--brand)',
                  color: 'var(--lumo-bg)',
                  border: 'none',
                  cursor: url.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                <Sparkles size={16} />
                Extract Exercises
              </button>
            </div>

            <div
              className="text-center px-4"
              style={{
                fontSize: 12,
                color: 'var(--lumo-text-ter)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
              }}
            >
              works with YouTube videos and shorts. for TikTok or Instagram, use the screenshot option.
            </div>
          </div>
        )}

        {/* ─── Screenshot Input ─────────────────────────────────────────── */}
        {mode === 'screenshot' && step === 'input' && (
          <div className="space-y-3 mt-2">
            {/* Info banner if redirected from URL */}
            {result?.error && result.error !== 'SCREENSHOT_NEEDED' && (
              <div
                className="flex items-start gap-2.5"
                style={{
                  background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--brand) 28%, transparent)',
                  borderRadius: 22,
                  padding: '12px 16px',
                }}
              >
                <AlertCircle size={16} style={{ color: 'var(--brand)', marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: 'var(--lumo-text)' }}>{result.error}</div>
              </div>
            )}
            {result?.error === 'SCREENSHOT_NEEDED' && (
              <div
                className="flex items-start gap-2.5"
                style={{
                  background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--brand) 28%, transparent)',
                  borderRadius: 22,
                  padding: '12px 16px',
                }}
              >
                <AlertCircle size={16} style={{ color: 'var(--brand)', marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: 'var(--lumo-text)' }}>
                  This platform requires screenshots. Take 1-3 screenshots of the exercise from the video, then upload them below.
                </div>
              </div>
            )}

            <div
              style={{
                background: 'var(--lumo-raised)',
                border: '1px solid var(--lumo-border)',
                borderRadius: 22,
                padding: 16,
              }}
            >
              <label className="block" style={{ ...KICKER_STYLE, display: 'block', marginBottom: 10 }}>
                Upload screenshots ({images.length}/3)
              </label>

              {/* Image previews */}
              {images.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {images.map((img, i) => (
                    <div
                      key={i}
                      className="relative overflow-hidden"
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 14,
                        border: '1px solid var(--lumo-border-strong)',
                      }}
                    >
                      <img src={img.preview} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        aria-label="Remove screenshot"
                        className="absolute top-1 right-1 flex items-center justify-center active:scale-90 transition-transform"
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.7)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={12} style={{ color: '#fff' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              {images.length < 3 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 active:scale-[0.98] transition-transform"
                  style={{
                    padding: '28px 0',
                    borderRadius: 14,
                    border: '2px dashed var(--lumo-border-strong)',
                    background: 'transparent',
                    color: 'var(--lumo-text-ter)',
                    cursor: 'pointer',
                  }}
                >
                  <ImagePlus size={24} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Tap to add screenshot</span>
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
                className="w-full mt-4 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
                style={{
                  padding: '14px',
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 800,
                  background: 'var(--brand)',
                  color: 'var(--lumo-bg)',
                  border: 'none',
                  cursor: images.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <Sparkles size={16} />
                Extract Exercises
              </button>
            </div>

            <div
              className="text-center px-4"
              style={{
                fontSize: 12,
                color: 'var(--lumo-text-ter)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
              }}
            >
              tip: screenshot the exercise being performed, plus any text showing sets/reps.
            </div>
          </div>
        )}

        {/* ─── Loading ──────────────────────────────────────────────────── */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="flex items-center justify-center mb-4"
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: 'color-mix(in srgb, var(--brand) 14%, transparent)',
                border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)',
              }}
            >
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--lumo-text)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
              }}
            >
              analyzing with AI...
            </div>
            <div style={{ fontSize: 12, color: 'var(--lumo-text-ter)', marginTop: 4 }}>
              this may take 10–30 seconds
            </div>
          </div>
        )}

        {/* ─── Review & Edit ────────────────────────────────────────────── */}
        {step === 'review' && (
          <div className="space-y-3 mt-1">
            {/* Lumo celebrating the extraction */}
            {editingExercises.length > 0 && (
              <div className="flex items-center gap-3 mb-1">
                <Lumo state="celebrate" size={64} />
                <div
                  style={{
                    fontSize: 15,
                    color: 'var(--lumo-text)',
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontStyle: 'italic',
                    lineHeight: 1.35,
                    flex: 1,
                  }}
                >
                  found {editingExercises.length} exercise{editingExercises.length > 1 ? 's' : ''} — pick the keepers.
                </div>
              </div>
            )}

            {/* Source info */}
            {result?.source_url && (
              <div
                className="truncate px-1"
                style={{ fontSize: 11, color: 'var(--lumo-text-ter)' }}
              >
                source: {result.source_url}
              </div>
            )}

            {/* YouTube analysis panel — only shown on the YouTube flow. */}
            {ytAnalysis && (
              <YouTubeAnalysisPanel
                analysis={ytAnalysis}
                enrichment={enrichment}
                enrichLoading={enrichLoading}
              />
            )}

            {/* Exercise cards */}
            {editingExercises.map((exercise, idx) => {
              const isExpanded = editingIdx === idx
              const isSelected = selectedExercises.has(idx)

              return (
                <div
                  key={idx}
                  className="overflow-hidden transition-colors"
                  style={{
                    background: 'var(--lumo-raised)',
                    border: isSelected
                      ? '1px solid var(--brand)'
                      : '1px solid var(--lumo-border)',
                    borderRadius: 22,
                    boxShadow: isSelected
                      ? '0 0 0 3px color-mix(in srgb, var(--brand) 12%, transparent)'
                      : 'none',
                  }}
                >
                  {/* Card header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => toggleExerciseSelected(idx)}
                      aria-label={isSelected ? 'Deselect' : 'Select'}
                      className="flex items-center justify-center shrink-0 transition-colors active:scale-90"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 8,
                        border: isSelected
                          ? '2px solid var(--brand)'
                          : '2px solid var(--lumo-border-strong)',
                        background: isSelected ? 'var(--brand)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {isSelected && <Check size={14} style={{ color: 'var(--lumo-bg)' }} />}
                    </button>

                    <button
                      onClick={() => setEditingIdx(isExpanded ? null : idx)}
                      className="flex-1 text-left"
                      style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--lumo-text)' }}>
                        {exercise.name}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {exercise.muscle_groups.map(mg => (
                          <span
                            key={mg}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 8,
                              fontSize: 10,
                              fontWeight: 700,
                              background: 'color-mix(in srgb, var(--brand) 14%, transparent)',
                              color: 'var(--brand)',
                              border: '1px solid color-mix(in srgb, var(--brand) 28%, transparent)',
                            }}
                          >
                            {mg}
                          </span>
                        ))}
                        {exercise.sets && exercise.reps && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 8,
                              fontSize: 10,
                              fontWeight: 700,
                              background: 'color-mix(in srgb, var(--accent-plum) 14%, transparent)',
                              color: 'var(--accent-plum)',
                              border: '1px solid color-mix(in srgb, var(--accent-plum) 28%, transparent)',
                            }}
                          >
                            {exercise.sets}x{exercise.reps}
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => removeExercise(idx)}
                        aria-label="Remove"
                        className="active:scale-90 transition-transform"
                        style={{
                          padding: 6,
                          borderRadius: 10,
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--lumo-text-ter)',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => setEditingIdx(isExpanded ? null : idx)}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        className="active:scale-90 transition-transform"
                        style={{
                          padding: 6,
                          borderRadius: 10,
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--lumo-text-sec)',
                          cursor: 'pointer',
                        }}
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expanded edit form */}
                  {isExpanded && (
                    <div
                      className="px-4 pb-4 pt-3 space-y-3"
                      style={{ borderTop: '1px solid var(--lumo-border)' }}
                    >
                      {/* Name */}
                      <Field label="Exercise Name">
                        <input
                          type="text"
                          value={exercise.name}
                          onChange={e => updateExercise(idx, 'name', e.target.value)}
                          style={INPUT_STYLE}
                        />
                      </Field>

                      {/* Muscle groups */}
                      <Field label="Muscle Groups (comma-separated)">
                        <input
                          type="text"
                          value={exercise.muscle_groups.join(', ')}
                          onChange={e => updateExercise(idx, 'muscle_groups', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          style={INPUT_STYLE}
                        />
                      </Field>

                      {/* Equipment */}
                      <Field label="Equipment (comma-separated)">
                        <input
                          type="text"
                          value={exercise.equipment.join(', ')}
                          onChange={e => updateExercise(idx, 'equipment', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          style={INPUT_STYLE}
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
                            style={INPUT_STYLE}
                          />
                        </Field>
                        <Field label="Reps" className="flex-1">
                          <input
                            type="text"
                            value={exercise.reps ?? ''}
                            onChange={e => updateExercise(idx, 'reps', e.target.value || undefined)}
                            placeholder="12"
                            style={INPUT_STYLE}
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
                              style={{ ...INPUT_STYLE, flex: 1 }}
                            />
                            <button
                              onClick={() => {
                                const newCues = exercise.form_cues.filter((_, i) => i !== ci)
                                updateExercise(idx, 'form_cues', newCues)
                              }}
                              aria-label="Remove cue"
                              className="active:scale-90 transition-transform"
                              style={{
                                padding: 8,
                                borderRadius: 10,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--lumo-text-ter)',
                                cursor: 'pointer',
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => updateExercise(idx, 'form_cues', [...exercise.form_cues, ''])}
                          className="flex items-center gap-1 active:scale-95 transition-transform"
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--brand)',
                            marginTop: 4,
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                          }}
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
                          style={INPUT_STYLE}
                        />
                      </Field>
                    </div>
                  )}
                </div>
              )
            })}

            {/* No exercises found */}
            {editingExercises.length === 0 && (
              <div
                className="text-center"
                style={{
                  background: 'var(--lumo-raised)',
                  border: '1px solid var(--lumo-border)',
                  borderRadius: 22,
                  padding: '32px 20px',
                }}
              >
                <div className="flex justify-center mb-2">
                  <Lumo state="sad" size={72} />
                </div>
                <div
                  style={{
                    fontSize: 16,
                    color: 'var(--lumo-text)',
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontStyle: 'italic',
                  }}
                >
                  no exercises found — try a different URL or clearer screenshots.
                </div>
              </div>
            )}

            {/* Save actions */}
            {editingExercises.length > 0 && (
              <div className="space-y-2 pt-2">
                <div
                  className="text-center"
                  style={{ fontSize: 12, color: 'var(--lumo-text-ter)' }}
                >
                  {selectedExercises.size} of {editingExercises.length} selected
                </div>

                <button
                  onClick={handleSaveToLibrary}
                  disabled={selectedExercises.size === 0}
                  className="w-full active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
                  style={{
                    padding: 14,
                    borderRadius: 22,
                    fontSize: 15,
                    fontWeight: 800,
                    background: 'var(--brand)',
                    color: 'var(--lumo-bg)',
                    border: 'none',
                    cursor: selectedExercises.size === 0 ? 'not-allowed' : 'pointer',
                  }}
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
          <div className="text-center py-12">
            <div className="flex justify-center mb-3">
              <Lumo state="celebrate" size={96} />
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--lumo-text)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                marginBottom: 6,
              }}
            >
              saved!
            </div>
            <div style={{ fontSize: 14, color: 'var(--lumo-text-sec)' }}>
              {savedMessage}
            </div>
            <button
              onClick={handleReset}
              className="mt-6 active:scale-[0.98] transition-transform"
              style={{
                padding: '12px 22px',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 800,
                background: 'var(--brand)',
                color: 'var(--lumo-bg)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Add More Exercises
            </button>
            <button
              onClick={onBack}
              className="block mx-auto mt-3 active:scale-95 transition-transform"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--lumo-text-ter)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Back to workouts
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
      <label
        className="block"
        style={{ ...KICKER_STYLE, display: 'block' }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

// ─── YouTube analysis preview ────────────────────────────────────────────────
// Surfaces Gemini's confidence + biomechanical flags + (when available)
// Claude's enrichment. All data here is read-only — users edit the exercise
// itself in the card below this panel.

function YouTubeAnalysisPanel({
  analysis,
  enrichment,
  enrichLoading,
}: {
  analysis: AnalyzedExercise
  enrichment: EnrichedExercise | null
  enrichLoading: boolean
}) {
  const confidenceColor =
    analysis.confidence === 'high' ? 'var(--brand)'
    : analysis.confidence === 'medium' ? 'var(--accent-plum)'
    : '#ef4444'

  return (
    <div
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        borderRadius: 22,
        padding: '14px 16px',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} style={{ color: confidenceColor }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--lumo-text-ter)' }}>
          Gemini analysis
        </span>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 8,
            fontSize: 10,
            fontWeight: 700,
            background: `color-mix(in srgb, ${confidenceColor} 14%, transparent)`,
            color: confidenceColor,
            border: `1px solid color-mix(in srgb, ${confidenceColor} 30%, transparent)`,
          }}
        >
          {analysis.confidence}
        </span>
        <span style={{ fontSize: 11, color: 'var(--lumo-text-ter)', marginLeft: 'auto' }}>
          pattern: {analysis.movement_pattern}
        </span>
      </div>

      {analysis.injury_flags.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--lumo-text-ter)', marginBottom: 4 }}>
            biomechanical flags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.injury_flags.map(flag => (
              <span
                key={flag}
                style={{
                  padding: '2px 8px',
                  borderRadius: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  background: 'color-mix(in srgb, var(--accent-plum) 14%, transparent)',
                  color: 'var(--accent-plum)',
                  border: '1px solid color-mix(in srgb, var(--accent-plum) 28%, transparent)',
                }}
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Claude enrichment — appears after it completes; silent if the op
          isn't deployed yet (see src/lib/enrichExercise.ts). */}
      {enrichLoading && !enrichment && (
        <div
          className="flex items-center gap-2 mt-3"
          style={{ fontSize: 11, color: 'var(--lumo-text-ter)' }}
        >
          <Loader2 size={12} className="animate-spin" />
          <span>checking protocol compatibility…</span>
        </div>
      )}
      {enrichment && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--lumo-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--lumo-text-ter)' }}>
              Coach notes
            </span>
          </div>

          {enrichment.rationale && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--lumo-text)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                lineHeight: 1.45,
                marginBottom: 8,
              }}
            >
              {enrichment.rationale}
            </div>
          )}

          {enrichment.compatible_protocols.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--lumo-text-ter)', marginBottom: 4 }}>
                compatible with
              </div>
              <div className="flex flex-wrap gap-1.5">
                {enrichment.compatible_protocols.map(p => (
                  <span
                    key={p}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 8,
                      fontSize: 10,
                      fontWeight: 700,
                      background: 'color-mix(in srgb, var(--brand) 14%, transparent)',
                      color: 'var(--brand)',
                      border: '1px solid color-mix(in srgb, var(--brand) 28%, transparent)',
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {enrichment.contraindicated_protocols.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--lumo-text-ter)', marginBottom: 4 }}>
                aggravates
              </div>
              <div className="flex flex-wrap gap-1.5">
                {enrichment.contraindicated_protocols.map(p => (
                  <span
                    key={p}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 8,
                      fontSize: 10,
                      fontWeight: 700,
                      background: 'color-mix(in srgb, #ef4444 14%, transparent)',
                      color: '#ef4444',
                      border: '1px solid color-mix(in srgb, #ef4444 28%, transparent)',
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--lumo-text-sec)' }}>
            <div>
              <strong style={{ color: 'var(--lumo-text)' }}>Easier:</strong> {enrichment.regression.name}
              <span style={{ color: 'var(--lumo-text-ter)' }}> — {enrichment.regression.why}</span>
            </div>
            <div style={{ marginTop: 4 }}>
              <strong style={{ color: 'var(--lumo-text)' }}>Harder:</strong> {enrichment.progression.name}
              <span style={{ color: 'var(--lumo-text-ter)' }}> — {enrichment.progression.why}</span>
            </div>
          </div>
        </div>
      )}
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
