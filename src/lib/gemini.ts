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
// EXCEPTION: YouTube videos. Claude vision cannot ingest video URLs, but
// Gemini 2.0 Flash CAN read YouTube URLs directly via its multimodal API.
// For that narrow path we keep a browser-side Gemini call (analyzeYouTubeShort
// below). The key is scoped to YouTube ingestion only — everything else still
// goes through the server-side Claude path.

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
 * Legacy entry point — retained for callers that still import it. Delegates to
 * the new YouTube analyzer when the URL is a YouTube link; otherwise returns
 * SCREENSHOT_NEEDED so the UI can route the user to the image flow.
 */
export async function extractFromYouTubeUrl(url: string): Promise<ExtractionResult> {
  if (!isYouTubeUrl(url)) {
    return { exercises: [], source_url: url, error: 'SCREENSHOT_NEEDED' }
  }
  try {
    const analyzed = await analyzeYouTubeShort(url)
    return { exercises: [analyzedToExtracted(analyzed)], source_url: url }
  } catch (err) {
    return {
      exercises: [],
      source_url: url,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Main URL entry point used by ExerciseCapture. Routes YouTube links through
 * the Gemini video-analysis path; other URLs still fall back to screenshots.
 */
export async function extractFromUrl(url: string): Promise<ExtractionResult> {
  if (!isYouTubeUrl(url)) {
    return { exercises: [], source_url: url, error: 'SCREENSHOT_NEEDED' }
  }
  try {
    const analyzed = await analyzeYouTubeShort(url)
    return { exercises: [analyzedToExtracted(analyzed)], source_url: url }
  } catch (err) {
    return {
      exercises: [],
      source_url: url,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── YouTube → Gemini Vision Analyzer ────────────────────────────────────────
// Sends a YouTube URL directly to Gemini 2.0 Flash, which can ingest public
// YouTube videos as a `fileData` part with mimeType `video/*`. Returns
// structured exercise data (name, muscles, equipment, movement pattern, form
// cues, injury-relevant biomechanical flags).
//
// SECURITY: This leaks VITE_GEMINI_API_KEY in the production bundle. That is
// an accepted tradeoff for the narrow YouTube path (the key has its own quota
// and Kyra owns it). Everything else routes through the server-side edge
// function. If/when YouTube ingestion is moved server-side, delete this
// function and wire ExerciseCapture to an edge-function op instead.

const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// Biomechanical-attribute vocabulary, curated from
// src/data/rehab-protocols/*.ts. Gemini is instructed to select attributes
// ONLY from this list so downstream injury filters (which key on these exact
// strings) can match reliably. New protocols that add novel patterns should
// update this list in one place.
export const BIOMECHANICAL_ATTRIBUTE_VOCAB = [
  // knee / meniscus / PFP
  'loaded_knee_flexion_under_90',
  'loaded_knee_flexion_deep',
  'deep_knee_flexion_under_load',
  'deep_knee_flexion_ballistic',
  'knee_over_toe_loaded',
  'back_squat_any_load',
  'walking_lunge_loaded',
  'jumping_landing',
  'pivoting_cutting',
  // lower back / spine
  'loaded_deadlift',
  'loaded_back_squat',
  'loaded_spinal_flexion',
  'loaded_spinal_rotation',
  'weighted_situps',
  'hip_hinge_pattern',
  // shoulder
  'overhead_press_any_load',
  'overhead_bar_path',
  'behind_neck_press',
  'upright_row',
  'empty_can_raise',
  'lat_pulldown_behind_neck',
  'bench_press_flat_wide_grip',
  // elbow / wrist
  'loaded_elbow_flexion_end_range',
  'loaded_wrist_extension',
  'loaded_wrist_flexion',
  // hip
  'hip_flexor_loaded_end_range',
  // core / general
  'standing_loaded_core',
  'unilateral_loaded',
  'bilateral_loaded',
  'bodyweight_only',
  'isometric_hold',
  'eccentric_emphasis',
] as const

export type BiomechanicalAttribute = typeof BIOMECHANICAL_ATTRIBUTE_VOCAB[number]

export interface AnalyzedExercise {
  name: string
  primary_muscles: string[]
  secondary_muscles: string[]
  equipment: string[]
  movement_pattern: 'squat' | 'hinge' | 'push' | 'pull' | 'carry' | 'rotate' | 'other'
  form_cues: string[]
  injury_flags: string[]       // strings from BIOMECHANICAL_ATTRIBUTE_VOCAB
  confidence: 'high' | 'medium' | 'low'
  source_url: string
}

/** True when the string looks like a public YouTube watch / shorts / youtu.be URL. */
export function isYouTubeUrl(raw: string): boolean {
  if (typeof raw !== 'string') return false
  const trimmed = raw.trim()
  if (trimmed.length === 0) return false
  try {
    const u = new URL(trimmed)
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    if (host === 'youtu.be') return u.pathname.length > 1
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname.startsWith('/watch') && u.searchParams.has('v')) return true
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2]?.length > 0
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2]?.length > 0
      return false
    }
    return false
  } catch {
    return false
  }
}

const YOUTUBE_ANALYSIS_PROMPT = `You are analyzing a short video of a resistance-training exercise so a workout
tracker can add it to a user's library. Extract a SINGLE exercise — the main
one being demonstrated.

Return your analysis by calling the emit_exercise tool with these fields:

- name: the exercise's canonical name (e.g. "Bulgarian Split Squat"). Use
  standard gym terminology, not marketing names.
- primary_muscles: the 1-3 muscles doing the most work, from this set:
  ["quads","hamstrings","glutes","calves","chest","back","lats","shoulders",
   "biceps","triceps","core","forearms"]. Lowercase.
- secondary_muscles: 0-3 supporting muscles from the same set.
- equipment: array of items visible in the video, e.g. ["dumbbell","bench"],
  ["barbell","rack"], ["cable"], ["bodyweight"], ["kettlebell"], ["band"].
- movement_pattern: one of "squat","hinge","push","pull","carry","rotate","other".
- form_cues: 3-5 SHORT imperative cues the demonstrator gives or that are
  obvious from the video ("drive through the front heel", "keep chest tall").
  Imperative voice, under 60 characters each. Do NOT invent cues that aren't
  demonstrated or said.
- injury_flags: 0-5 biomechanical-load attributes picked ONLY from this fixed
  vocabulary (strings must match exactly — do not invent new ones):
  ${JSON.stringify(BIOMECHANICAL_ATTRIBUTE_VOCAB)}.
  Pick flags that describe what this exercise LOADS, not what it avoids. A
  back squat loads "loaded_back_squat" and "deep_knee_flexion_under_load". A
  banded pull-apart loads none of these — return [].
- confidence: "high" if the video is clear, the lift is identifiable, and the
  cues were audible/visible; "medium" if partially obscured or inferred;
  "low" if you are guessing. Be honest — "low" is the right answer when the
  video is irrelevant, too short, or doesn't show a lift.

If the video is clearly NOT a resistance-training exercise (e.g. a vlog, a
cooking clip, a reaction, a commentary with no demonstration), emit
confidence="low" and put a one-sentence explanation in the single form_cue
"(not an exercise demonstration)". Still emit the other fields with
best-guess defaults so the tool call validates.`

const YOUTUBE_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    primary_muscles: { type: 'array', items: { type: 'string' } },
    secondary_muscles: { type: 'array', items: { type: 'string' } },
    equipment: { type: 'array', items: { type: 'string' } },
    movement_pattern: {
      type: 'string',
      enum: ['squat', 'hinge', 'push', 'pull', 'carry', 'rotate', 'other'],
    },
    form_cues: { type: 'array', items: { type: 'string' } },
    injury_flags: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: [
    'name',
    'primary_muscles',
    'secondary_muscles',
    'equipment',
    'movement_pattern',
    'form_cues',
    'injury_flags',
    'confidence',
  ],
} as const

interface GeminiFunctionCall {
  name: string
  args: Record<string, unknown>
}

interface GeminiPart {
  text?: string
  functionCall?: GeminiFunctionCall
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>
  promptFeedback?: { blockReason?: string }
  error?: { message?: string }
}

/**
 * Analyze a YouTube Shorts (or regular YouTube) URL and return structured
 * exercise data. Throws on any failure — caller is expected to catch and
 * surface to the user.
 */
export async function analyzeYouTubeShort(url: string): Promise<AnalyzedExercise> {
  if (!isYouTubeUrl(url)) {
    throw new Error('Not a YouTube URL. Paste a youtube.com/watch, /shorts, or youtu.be link.')
  }

  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim()
  if (!apiKey) {
    throw new Error('Gemini API key not configured (VITE_GEMINI_API_KEY).')
  }

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { fileData: { fileUri: url, mimeType: 'video/*' } },
          { text: YOUTUBE_ANALYSIS_PROMPT },
        ],
      },
    ],
    tools: [
      {
        functionDeclarations: [
          {
            name: 'emit_exercise',
            description: 'Emit the extracted exercise analysis.',
            parameters: YOUTUBE_TOOL_SCHEMA,
          },
        ],
      },
    ],
    toolConfig: {
      functionCallingConfig: { mode: 'ANY', allowedFunctionNames: ['emit_exercise'] },
    },
    generationConfig: { temperature: 0.2 },
  }

  let res: Response
  try {
    res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      // Short videos analyze in ~5-20s; a 60s cap guards against a hung request.
      signal: AbortSignal.timeout(60_000),
    })
  } catch (err) {
    throw new Error(
      `Gemini network error: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Gemini API error ${res.status}: ${text || res.statusText}`.trim())
  }

  const json = (await res.json()) as GeminiResponse
  if (json.error?.message) {
    throw new Error(`Gemini API error: ${json.error.message}`)
  }
  if (json.promptFeedback?.blockReason) {
    throw new Error(
      `Gemini blocked the request: ${json.promptFeedback.blockReason}. Try a different video.`,
    )
  }

  const parts = json.candidates?.[0]?.content?.parts ?? []
  const call = parts.find(p => p.functionCall?.name === 'emit_exercise')?.functionCall
  if (!call) {
    throw new Error("Gemini didn't return a structured exercise — try a different video.")
  }

  return normalizeAnalyzed(call.args, url)
}

// ─── Normalizer ──────────────────────────────────────────────────────────────
// Defense-in-depth: Gemini follows the schema ~95% of the time but still
// occasionally emits stray fields, wrong casing, or novel injury_flags. We
// sanitize into the AnalyzedExercise contract so downstream code (filters,
// custom-exercise save path) sees predictable shapes.

function normalizeAnalyzed(raw: unknown, url: string): AnalyzedExercise {
  const r = (raw ?? {}) as Record<string, unknown>

  const name = typeof r.name === 'string' && r.name.trim().length > 0
    ? r.name.trim()
    : 'Unknown Exercise'

  const primary = stringArray(r.primary_muscles).map(s => s.toLowerCase())
  const secondary = stringArray(r.secondary_muscles).map(s => s.toLowerCase())
  const equipment = stringArray(r.equipment).map(s => s.toLowerCase())
  const formCues = stringArray(r.form_cues)

  const allowedVocab = new Set<string>(BIOMECHANICAL_ATTRIBUTE_VOCAB)
  const injuryFlags = stringArray(r.injury_flags).filter(s => allowedVocab.has(s))

  const movementPattern = ([
    'squat', 'hinge', 'push', 'pull', 'carry', 'rotate', 'other',
  ] as const).includes(r.movement_pattern as never)
    ? (r.movement_pattern as AnalyzedExercise['movement_pattern'])
    : 'other'

  const confidence = (['high', 'medium', 'low'] as const).includes(
    r.confidence as never,
  )
    ? (r.confidence as AnalyzedExercise['confidence'])
    : 'low'

  return {
    name,
    primary_muscles: primary,
    secondary_muscles: secondary,
    equipment,
    movement_pattern: movementPattern,
    form_cues: formCues,
    injury_flags: injuryFlags,
    confidence,
    source_url: url,
  }
}

function stringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map(s => s.trim())
}

// Bridge AnalyzedExercise → ExtractedExercise (the shape ExerciseCapture's
// existing review UI renders). Primary + secondary muscles collapse into a
// single muscle_groups list; movement_pattern + confidence + injury_flags are
// stashed in notes so the user can still see them during review.
function analyzedToExtracted(a: AnalyzedExercise): ExtractedExercise {
  const noteParts: string[] = []
  if (a.confidence !== 'high') noteParts.push(`confidence: ${a.confidence}`)
  noteParts.push(`pattern: ${a.movement_pattern}`)
  if (a.injury_flags.length > 0) noteParts.push(`flags: ${a.injury_flags.join(', ')}`)
  return {
    name: a.name,
    muscle_groups: [...a.primary_muscles, ...a.secondary_muscles],
    equipment: a.equipment,
    form_cues: a.form_cues,
    notes: noteParts.join(' | '),
  }
}
