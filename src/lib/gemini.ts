// ─── Gemini 2.5 Flash — Exercise Extraction from Video/Image ────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Prompts ─────────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are an expert personal trainer analyzing exercise content.

Extract ALL exercises shown or described. For each exercise, return a JSON object with:
- name: string (common gym name, e.g. "Bulgarian Split Squat")
- muscle_groups: string[] (primary muscles worked, e.g. ["quads", "glutes"])
- equipment: string[] (equipment needed, e.g. ["dumbbells", "bench"]. Use "bodyweight" if none)
- sets: number | null (if mentioned)
- reps: string | null (if mentioned, e.g. "12" or "8-10" or "30 sec")
- duration_seconds: number | null (if it's a timed hold/exercise)
- form_cues: string[] (2-4 key form tips for this exercise)
- difficulty: "beginner" | "intermediate" | "advanced" | null
- notes: string | null (any additional context like tempo, rest periods, variations shown)

Return ONLY a JSON array of exercise objects. No markdown, no code fences, no explanation.
Example: [{"name": "Goblet Squat", "muscle_groups": ["quads", "glutes"], "equipment": ["kettlebell"], "sets": 3, "reps": "12", "duration_seconds": null, "form_cues": ["Keep chest up", "Push knees out over toes", "Sit back into heels"], "difficulty": "beginner", "notes": null}]`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url)
}

function parseExerciseJson(text: string): ExtractedExercise[] {
  // Strip markdown code fences if present
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object' && 'exercises' in parsed) {
      return parsed.exercises
    }
    return [parsed]
  } catch {
    // Try to find JSON array in the response
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0])
      } catch {
        // Fall through
      }
    }
    throw new Error('Could not parse exercise data from AI response')
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Extract exercises from a YouTube URL using Gemini's native video understanding.
 * Gemini can process YouTube URLs directly — no download needed.
 */
export async function extractFromYouTubeUrl(url: string): Promise<ExtractionResult> {
  if (!GEMINI_API_KEY) {
    return { exercises: [], source_url: url, error: 'Gemini API key not configured. Add VITE_GEMINI_API_KEY to your environment.' }
  }

  const videoId = extractYouTubeVideoId(url)
  if (!videoId) {
    return { exercises: [], source_url: url, error: 'Could not parse YouTube video ID from URL.' }
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                fileData: {
                  mimeType: 'video/*',
                  fileUri: `https://www.youtube.com/watch?v=${videoId}`,
                },
              },
              { text: EXTRACTION_PROMPT },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return { exercises: [], source_url: url, error: `Gemini API error: ${response.status}. ${err}` }
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return { exercises: [], source_url: url, error: 'No response from Gemini. The video may be too long or unavailable.' }
    }

    const exercises = parseExerciseJson(text)
    return { exercises, source_url: url }
  } catch (err) {
    return { exercises: [], source_url: url, error: `Failed to analyze video: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * Extract exercises from screenshot images using Gemini Vision.
 * Accepts an array of base64-encoded image data with MIME types.
 */
export async function extractFromScreenshots(
  images: Array<{ base64: string; mimeType: string }>,
): Promise<ExtractionResult> {
  if (!GEMINI_API_KEY) {
    return { exercises: [], error: 'Gemini API key not configured. Add VITE_GEMINI_API_KEY to your environment.' }
  }

  if (images.length === 0) {
    return { exercises: [], error: 'No images provided.' }
  }

  try {
    const imageParts = images.map(img => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      },
    }))

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              ...imageParts,
              { text: EXTRACTION_PROMPT },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return { exercises: [], error: `Gemini API error: ${response.status}. ${err}` }
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return { exercises: [], error: 'No response from Gemini. Try clearer screenshots.' }
    }

    const exercises = parseExerciseJson(text)
    return { exercises }
  } catch (err) {
    return { exercises: [], error: `Failed to analyze images: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * Main entry point: takes a URL and routes to the right extraction method.
 * Returns an ExtractionResult with guidance for non-YouTube URLs.
 */
export async function extractFromUrl(url: string): Promise<ExtractionResult> {
  if (isYouTubeUrl(url)) {
    return extractFromYouTubeUrl(url)
  }

  // TikTok / Instagram / other — can't process directly in browser
  return {
    exercises: [],
    source_url: url,
    error: 'SCREENSHOT_NEEDED',
  }
}
