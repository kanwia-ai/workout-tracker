// ─── Exercise Extraction (Claude Vision via edge function) ──────────────────
//
// Previously called Gemini 2.5 Flash directly from the browser, which leaked
// VITE_GEMINI_API_KEY in the production bundle. Now routed through the
// `extract_exercises` op on the Supabase `generate` edge function, which
// invokes Claude Opus 4.7 server-side with ANTHROPIC_API_KEY.
//
// The file name is kept as `gemini.ts` to avoid cascading import churn in
// ExerciseCapture.tsx; semantically this module is "image → exercises"
// regardless of provider.
//
// NOTE: Claude vision does NOT accept YouTube URLs the way Gemini did. The
// `extractFromYouTubeUrl` / `extractFromUrl` entry points are preserved as
// guidance stubs that route users to the screenshot flow.

import { callEdge } from './generate'
import { ExtractedExercisesSchema } from './extract'

// ─── Types ───────────────────────────────────────────────────────────────────
// Shape is stable for ExerciseCapture.tsx. Fields Claude vision cannot infer
// from a photo (muscle_groups, equipment, form_cues, difficulty) are filled
// with sensible empty defaults so the existing review UI renders without
// crashes — the user can edit them before saving.

export interface ExtractedExercise {
  name: string
  muscle_groups: string[]
  equipment: string[]
  sets?: number
  reps?: string
  duration_seconds?: number
  form_cues: string[]
  difficulty?: string
  notes?: string
}

export interface ExtractionResult {
  exercises: ExtractedExercise[]
  source_url?: string
  error?: string
}

// ─── Internals ───────────────────────────────────────────────────────────────

// Map the edge-function response (strict: name + optional primitives) into the
// UI-facing ExtractedExercise shape with array defaults.
function hydrateExercise(raw: {
  name: string
  sets?: number
  reps?: string
  weight?: number
  rest_seconds?: number
  notes?: string
}): ExtractedExercise {
  // Stash weight + rest_seconds into notes (free-text) if present, since the
  // UI schema doesn't have first-class fields for them. Users can move the
  // info wherever they like during review.
  const noteParts: string[] = []
  if (raw.notes) noteParts.push(raw.notes)
  if (typeof raw.weight === 'number') noteParts.push(`weight: ${raw.weight}`)
  if (typeof raw.rest_seconds === 'number') noteParts.push(`rest: ${raw.rest_seconds}s`)
  const notes = noteParts.length > 0 ? noteParts.join(' | ') : undefined

  return {
    name: raw.name,
    muscle_groups: [],
    equipment: [],
    form_cues: [],
    sets: raw.sets,
    reps: raw.reps,
    notes,
  }
}

async function extractFromSingleImage(
  base64: string,
  mimeType: string,
): Promise<ExtractedExercise[]> {
  // Edge function only accepts the three common web formats. Anything else
  // would 400 server-side; catch it here with a friendlier message.
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
  if (!allowed.has(mimeType)) {
    throw new Error(
      `Unsupported image type: ${mimeType}. Use JPEG, PNG, or WebP.`,
    )
  }
  const parsed = await callEdge(
    'extract_exercises',
    { image_b64: base64, mime_type: mimeType },
    ExtractedExercisesSchema,
  )
  return parsed.exercises.map(hydrateExercise)
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Extract exercises from screenshot images using Claude vision via the
 * `extract_exercises` edge-function op. Accepts 1–3 base64-encoded images with
 * their MIME types; runs one edge call per image and concatenates results (the
 * server op is single-image by design so we can cap per-image size cleanly).
 */
export async function extractFromScreenshots(
  images: Array<{ base64: string; mimeType: string }>,
): Promise<ExtractionResult> {
  if (images.length === 0) {
    return { exercises: [], error: 'No images provided.' }
  }

  try {
    const all: ExtractedExercise[] = []
    for (const img of images) {
      const exs = await extractFromSingleImage(img.base64, img.mimeType)
      all.push(...exs)
    }
    return { exercises: all }
  } catch (err) {
    return {
      exercises: [],
      error: `Failed to analyze images: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/**
 * Legacy entry point — Claude vision cannot ingest YouTube URLs directly (that
 * was a Gemini-specific capability). Returns a SCREENSHOT_NEEDED signal so
 * callers can route users to the screenshot flow, matching the existing
 * TikTok/Instagram fallback.
 */
export async function extractFromYouTubeUrl(url: string): Promise<ExtractionResult> {
  return {
    exercises: [],
    source_url: url,
    error: 'SCREENSHOT_NEEDED',
  }
}

/**
 * Main entry point. All URL inputs now route to the screenshot flow because
 * the Claude-backed extractor only handles images.
 */
export async function extractFromUrl(url: string): Promise<ExtractionResult> {
  return {
    exercises: [],
    source_url: url,
    error: 'SCREENSHOT_NEEDED',
  }
}
