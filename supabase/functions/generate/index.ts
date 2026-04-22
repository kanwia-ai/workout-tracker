// supabase/functions/generate/index.ts
// Dispatcher for LLM-generated content. Each `op` maps to a structured JSON
// response. Runs as a Deno edge function; do not import Node-only modules.
//
// Backend: Anthropic Claude (Messages API with tool_use-forced structured
// output). Migrated from Gemini 2.5 Flash on 2026-04-20 after recurring quota
// exhaustion on the Gemini free tier. The v3 prompt wording is preserved
// verbatim — only the provider swapped.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Anthropic from 'npm:@anthropic-ai/sdk@0.90.0'
import { extractExercisesSchema, mesocycleSchema, pingSchema, routineSchema, swapExerciseSchema } from './schemas.ts'
import { buildPlanPrompt, type ExercisePoolEntry } from './prompts/generatePlan.ts'
import { buildSwapPrompt, isSwapReason, SWAP_REASONS } from './prompts/swapExercise.ts'
import { buildRoutinePrompt, type RoutineKind } from './prompts/generateRoutine.ts'

const ROUTINE_KINDS: readonly RoutineKind[] = ['warmup', 'cooldown', 'cardio']
function isRoutineKind(v: unknown): v is RoutineKind {
  return typeof v === 'string' && (ROUTINE_KINDS as readonly string[]).includes(v)
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info',
  'access-control-max-age': '86400',
}
const JSON_HEADERS = { 'content-type': 'application/json', ...CORS_HEADERS }

// Ops that require the LLM backend. Keep in sync as new LLM-backed ops land.
const LLM_OPS = new Set(['ping', 'generate_plan', 'swap_exercise', 'generate_routine', 'extract_exercises'])

// Claude model ID. Opus 4.7 is the current highest-quality model. If cost
// becomes a concern, swap to `claude-sonnet-4-7` (same API surface).
const CLAUDE_MODEL = 'claude-opus-4-7'

// Hard cap on serialized exercise-pool size. Claude's 200k-token context is
// plenty, but the pool is untrusted client input and we don't want a runaway
// prompt to rack up token costs. ~500KB of JSON is already ~5x our typical
// 200-entry pool.
const MAX_POOL_JSON_BYTES = 500_000

// Image extraction caps. Base64 inflates raw bytes by ~1.37x, so 14M chars of
// base64 ≈ 10MB of image data. Claude's vision endpoint accepts up to ~5MB per
// image practically, but rejecting obvious runaways before the API call saves
// us the round-trip cost.
const MAX_IMAGE_B64_CHARS = 14_000_000
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])

// Vision prompt — concise, anti-hallucination framing. The model sees a photo
// of a workout (gym board, planner, handwritten list, phone screen, etc.) and
// returns whatever structured fields it can read. Omitting a field is much
// better than inventing one; the prompt hammers that point.
const EXTRACT_PROMPT = `Extract every exercise you can see in this image.

The image is a photo of a workout board, planner, phone screen, or handwritten
list. For each exercise, emit its name exactly as written, and if visible:
sets, reps, weight (in lb or kg as written — just the number), rest time (as
total seconds), notes.

Rules:
- If a value is not visible in the image, OMIT that field. Do not guess.
- Do not invent exercises that aren't in the image.
- Preserve exercise names verbatim (typos and all).
- Return an array even if there's only one exercise.
- If the image contains no exercises, return an empty array.`

// Read the key and construct the SDK on demand so a key added AFTER boot
// takes effect on the next request (instead of waiting for the isolate to
// recycle). The client cached under `cachedClient` is reused while the key is
// stable.
let cachedClient: Anthropic | null = null
let cachedKey: string | undefined
function getAnthropic(): Anthropic | null {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) return null
  if (cachedClient && cachedKey === key) return cachedClient
  cachedClient = new Anthropic({ apiKey: key })
  cachedKey = key
  return cachedClient
}

// Strip Gemini-specific JSON Schema extensions that Anthropic's `input_schema`
// validator doesn't recognize. `propertyOrdering` is the only known offender
// today; the rest of our schemas are plain JSON Schema.
//
// We also normalize `type: 'integer'` → `type: 'number'` (Anthropic accepts
// both, but being explicit avoids edge-case rejection) — ACTUALLY Anthropic
// supports integer fine per their tool-use docs, so we leave it alone.
//
// Recursive walk; returns a deep-cloned sanitized object so we don't mutate
// the module-level schema constants (which are re-used across requests).
function sanitizeSchemaForAnthropic(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(sanitizeSchemaForAnthropic)
  if (schema && typeof schema === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
      if (k === 'propertyOrdering') continue
      out[k] = sanitizeSchemaForAnthropic(v)
    }
    return out
  }
  return schema
}

// Common Claude invocation. Wraps the Messages API with a forced tool-use
// call, extracts the tool_use block, and returns its `input` as a JSON
// string (ready to be returned to the client for Zod validation).
//
// `cacheSystem` enables prompt caching on the system prompt — saves cost
// when the same long v3 system prompt is used across retries / multiple
// users in the 5-minute cache window.
async function callClaudeAsTool(params: {
  client: Anthropic
  systemPrompt: string
  userPrompt: string
  toolName: string
  toolDescription: string
  inputSchema: unknown
  cacheSystem?: boolean
  maxTokens?: number
}): Promise<string> {
  const {
    client,
    systemPrompt,
    userPrompt,
    toolName,
    toolDescription,
    inputSchema,
    cacheSystem = true,
    maxTokens = 8192,
  } = params

  const sanitized = sanitizeSchemaForAnthropic(inputSchema) as Record<string, unknown>

  // Build the system array. With prompt caching on, the SDK expects an array
  // of TextBlock objects, each optionally carrying cache_control. One block
  // per cache breakpoint; we use a single ephemeral breakpoint to cache the
  // whole system prompt.
  const systemBlocks: Anthropic.TextBlockParam[] = [
    cacheSystem
      ? { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }
      : { type: 'text', text: systemPrompt },
  ]

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: systemBlocks,
    messages: [{ role: 'user', content: userPrompt }],
    tools: [
      {
        name: toolName,
        description: toolDescription,
        // deno-lint-ignore no-explicit-any — Anthropic's type is narrower than
        // "any JSON Schema object"; our sanitized schemas are valid at runtime
        // but TS doesn't know the shape.
        input_schema: sanitized as any,
      },
    ],
    tool_choice: { type: 'tool', name: toolName },
  })

  // Locate the tool_use block. With tool_choice=tool, Claude is required to
  // emit exactly one — but belt-and-suspenders check since the API could
  // return stop_reason=max_tokens if the JSON exceeds max_tokens.
  const toolUse = response.content.find(
    (c): c is Anthropic.ToolUseBlock => c.type === 'tool_use',
  )
  if (!toolUse) {
    const stop = response.stop_reason ?? 'unknown'
    throw new Error(
      `Claude returned no tool_use block (stop_reason=${stop}). ` +
        'This usually means max_tokens was too low for the requested JSON.',
    )
  }
  // `input` is already parsed JSON. Re-stringify so the downstream code path
  // (which passes `r.text` as a raw body) stays uniform with the Gemini flow.
  return JSON.stringify(toolUse.input)
}

// Convert an Anthropic SDK error into a user-friendly message. The client
// surfaces these via `friendlyGenerationError()` in App.tsx — keep the
// substrings stable or update the matcher there.
function friendlyAnthropicError(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    const status = err.status
    if (status === 429 || status === 529) {
      return 'Claude is busy — try again in a moment.'
    }
    if (status === 401 || status === 403) {
      return 'Claude rejected the API key. Check ANTHROPIC_API_KEY on the server.'
    }
    return `Claude API error ${status}: ${err.message}`
  }
  return err instanceof Error ? err.message : String(err)
}

Deno.serve(async (req) => {
  // CORS preflight — browsers send this before any cross-origin POST with
  // auth + JSON headers. Must return 204 with allow-* headers or the real
  // request is blocked client-side with "Failed to fetch".
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { ...JSON_HEADERS, allow: 'POST' },
    })
  }
  const body = await req.json().catch(() => null) as { op?: string; payload?: unknown } | null
  if (!body || typeof body.op !== 'string') {
    return new Response(JSON.stringify({ error: 'missing op' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  // Echo dispatcher — useful for smoke-testing the transport without burning
  // Claude quota.
  if (body.op === 'echo') {
    return new Response(JSON.stringify({ echo: body.payload ?? null }), {
      headers: JSON_HEADERS,
    })
  }

  if (LLM_OPS.has(body.op)) {
    const client = getAnthropic()
    if (!client) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY missing' }), {
        status: 500,
        headers: JSON_HEADERS,
      })
    }

    if (body.op === 'ping') {
      try {
        const text = await callClaudeAsTool({
          client,
          systemPrompt:
            'You are a health-check responder. Reply via the emit_ping tool only.',
          userPrompt:
            'Say hello. Also return the current ISO timestamp you believe it is.',
          toolName: 'emit_ping',
          toolDescription: 'Return the hello message and the current ISO timestamp.',
          inputSchema: pingSchema,
          cacheSystem: false, // tiny prompt; caching overhead > savings
          maxTokens: 256,
        })
        return new Response(text, { headers: JSON_HEADERS })
      } catch (err) {
        return new Response(JSON.stringify({ error: friendlyAnthropicError(err) }), {
          status: 502,
          headers: JSON_HEADERS,
        })
      }
    }

    if (body.op === 'generate_plan') {
      // Validate payload shape at the entry. The client sends trusted-ish data,
      // but we still guard to fail fast with a useful error instead of a
      // Claude "invalid input" deep in the pipeline.
      const payload = (body.payload ?? {}) as {
        profile?: unknown
        exercisePool?: unknown
        weeks?: unknown
      }
      if (!payload.profile || typeof payload.profile !== 'object') {
        return new Response(
          JSON.stringify({ error: 'payload.profile is required and must be an object' }),
          { status: 400, headers: JSON_HEADERS },
        )
      }
      if (!Array.isArray(payload.exercisePool)) {
        return new Response(
          JSON.stringify({ error: 'payload.exercisePool is required and must be an array' }),
          { status: 400, headers: JSON_HEADERS },
        )
      }
      const weeks = typeof payload.weeks === 'number' && Number.isFinite(payload.weeks)
        ? Math.round(payload.weeks)
        : 6
      if (weeks < 3 || weeks > 12) {
        return new Response(
          JSON.stringify({ error: 'payload.weeks must be between 3 and 12' }),
          { status: 400, headers: JSON_HEADERS },
        )
      }

      // Untrusted pool size guard — reject before we serialize into the prompt.
      const poolJson = JSON.stringify(payload.exercisePool)
      if (poolJson.length > MAX_POOL_JSON_BYTES) {
        return new Response(
          JSON.stringify({
            error: `payload.exercisePool exceeds ${MAX_POOL_JSON_BYTES} bytes (got ${poolJson.length}); slim the pool client-side`,
          }),
          { status: 400, headers: JSON_HEADERS },
        )
      }

      try {
        // The v3 prompt builder emits a single string that bundles "system
        // rules" + "user profile + pool" together. Claude works best when the
        // invariant rules live in the system prompt (cacheable) and the
        // per-request data lives in the user turn (not cached). We keep the
        // existing builder output intact and pass it as the USER message —
        // this preserves wording verbatim. The tiny `systemPrompt` below is
        // a terse framing string that doesn't alter the v3 semantics.
        const prompt = buildPlanPrompt({
          profile: payload.profile,
          exercisePool: payload.exercisePool as ExercisePoolEntry[],
          weeks,
        })
        const text = await callClaudeAsTool({
          client,
          systemPrompt:
            'You generate training mesocycles by emitting exactly one call to the emit_mesocycle tool. All programming rules are in the user message. Follow them as hard constraints.',
          userPrompt: prompt,
          toolName: 'emit_mesocycle',
          toolDescription:
            'Emit the generated training block in the required mesocycle structure.',
          inputSchema: mesocycleSchema,
          cacheSystem: true,
          maxTokens: 16384,
        })

        // Server-side id-pool check — the model occasionally hallucinates
        // exercise ids that don't exist in the provided pool. Catching this
        // here saves the client from burning time on a bad plan they can't
        // render.
        try {
          const parsed = JSON.parse(text) as {
            sessions?: { exercises?: { library_id?: string }[] }[]
          }
          const poolIds = new Set(
            (payload.exercisePool as { id: string }[]).map(e => e.id),
          )
          const bogus: string[] = []
          for (const sess of parsed.sessions ?? []) {
            for (const ex of sess.exercises ?? []) {
              if (ex.library_id && !poolIds.has(ex.library_id)) {
                bogus.push(ex.library_id)
              }
            }
          }
          if (bogus.length > 0) {
            return new Response(
              JSON.stringify({
                error: `Claude hallucinated ${bogus.length} exercise id(s) not in pool`,
                hallucinated: bogus.slice(0, 5),
              }),
              { status: 502, headers: JSON_HEADERS },
            )
          }
        } catch (parseErr) {
          // text was not valid JSON despite tool_use; let the client handle
          // via its own Zod validation.
          console.warn('post-validate JSON parse failed', parseErr)
        }
        return new Response(text, { headers: JSON_HEADERS })
      } catch (err) {
        return new Response(JSON.stringify({ error: friendlyAnthropicError(err) }), {
          status: 502,
          headers: JSON_HEADERS,
        })
      }
    }

    if (body.op === 'swap_exercise') {
      // Validate payload shape. Same defense-in-depth approach as generate_plan —
      // fail fast with a specific 400 instead of letting Claude choke on a
      // malformed prompt.
      const payload = (body.payload ?? {}) as {
        profile?: unknown
        currentExercise?: unknown
        sessionFocus?: unknown
        completedExercisesInSession?: unknown
        exercisePool?: unknown
        reason?: unknown
      }
      if (!payload.profile || typeof payload.profile !== 'object') {
        return new Response(
          JSON.stringify({ error: 'payload.profile is required and must be an object' }),
          { status: 400, headers: JSON_HEADERS },
        )
      }
      if (!payload.currentExercise || typeof payload.currentExercise !== 'object') {
        return new Response(
          JSON.stringify({ error: 'payload.currentExercise is required and must be an object' }),
          { status: 400, headers: JSON_HEADERS },
        )
      }
      if (
        !Array.isArray(payload.sessionFocus) ||
        !payload.sessionFocus.every((v) => typeof v === 'string')
      ) {
        return new Response(
          JSON.stringify({ error: 'payload.sessionFocus is required and must be a string[]' }),
          { status: 400, headers: JSON_HEADERS },
        )
      }
      if (
        !Array.isArray(payload.completedExercisesInSession) ||
        !payload.completedExercisesInSession.every((v) => typeof v === 'string')
      ) {
        return new Response(
          JSON.stringify({
            error: 'payload.completedExercisesInSession is required and must be a string[]',
          }),
          { status: 400, headers: JSON_HEADERS },
        )
      }
      if (!Array.isArray(payload.exercisePool)) {
        return new Response(
          JSON.stringify({ error: 'payload.exercisePool is required and must be an array' }),
          { status: 400, headers: JSON_HEADERS },
        )
      }
      if (!isSwapReason(payload.reason)) {
        return new Response(
          JSON.stringify({
            error: `payload.reason must be one of: ${SWAP_REASONS.join(', ')}`,
          }),
          { status: 400, headers: JSON_HEADERS },
        )
      }

      // Untrusted pool size guard — same 500KB cap as generate_plan.
      const poolJson = JSON.stringify(payload.exercisePool)
      if (poolJson.length > MAX_POOL_JSON_BYTES) {
        return new Response(
          JSON.stringify({
            error: `payload.exercisePool exceeds ${MAX_POOL_JSON_BYTES} bytes (got ${poolJson.length}); slim the pool client-side`,
          }),
          { status: 400, headers: JSON_HEADERS },
        )
      }

      try {
        const prompt = buildSwapPrompt({
          profile: payload.profile,
          currentExercise: payload.currentExercise,
          sessionFocus: payload.sessionFocus as string[],
          completedExercisesInSession: payload.completedExercisesInSession as string[],
          exercisePool: payload.exercisePool as ExercisePoolEntry[],
          reason: payload.reason,
        })
        const text = await callClaudeAsTool({
          client,
          systemPrompt:
            'You swap a single exercise mid-workout by emitting exactly one call to the emit_swap tool. All behavioral rules are in the user message.',
          userPrompt: prompt,
          toolName: 'emit_swap',
          toolDescription:
            'Emit the replacement exercise and a one-sentence reason.',
          inputSchema: swapExerciseSchema,
          cacheSystem: true,
          maxTokens: 4096,
        })

        // Server-side safety checks — the model occasionally hallucinates ids
        // that aren't in the pool, or picks an exercise the user already
        // completed. Catch both here so a single retry from the client has a
        // chance of getting a clean response instead of quietly rendering
        // something invalid.
        try {
          const parsed = JSON.parse(text) as {
            replacement?: { library_id?: string; name?: string }
            reason?: string
          }
          const libraryId = parsed.replacement?.library_id
          if (!libraryId || typeof libraryId !== 'string') {
            return new Response(
              JSON.stringify({ error: 'Claude response missing replacement.library_id' }),
              { status: 502, headers: JSON_HEADERS },
            )
          }
          const poolIds = new Set(
            (payload.exercisePool as { id: string }[]).map((e) => e.id),
          )
          if (!poolIds.has(libraryId)) {
            return new Response(
              JSON.stringify({
                error: `Claude hallucinated exercise id not in pool: ${libraryId}`,
                hallucinated: [libraryId],
              }),
              { status: 502, headers: JSON_HEADERS },
            )
          }
          // Dedup check: match on library_id (canonical) AND case-insensitive
          // name (defensive, since the client currently sends names in
          // completedExercisesInSession). Also bars returning the original
          // exercise — the model is told not to, but belt-and-suspenders.
          const completed = payload.completedExercisesInSession as string[]
          const completedIds = new Set(completed)
          const completedLower = new Set(completed.map((c) => c.toLowerCase()))
          const candidateName = parsed.replacement?.name ?? ''
          const currentExercise = payload.currentExercise as {
            library_id?: string
            name?: string
          } | null
          if (currentExercise?.library_id) {
            completedIds.add(currentExercise.library_id)
          }
          if (currentExercise?.name) {
            completedLower.add(currentExercise.name.toLowerCase())
          }
          if (
            completedIds.has(libraryId) ||
            completedLower.has(candidateName.toLowerCase())
          ) {
            return new Response(
              JSON.stringify({
                error: `Claude returned an exercise already completed or matching the original: ${candidateName || libraryId}`,
                duplicate: candidateName || libraryId,
              }),
              { status: 502, headers: JSON_HEADERS },
            )
          }
        } catch (parseErr) {
          // text was not valid JSON despite tool_use; let the client handle
          // via its own Zod validation.
          console.warn('post-validate JSON parse failed', parseErr)
        }
        return new Response(text, { headers: JSON_HEADERS })
      } catch (err) {
        return new Response(JSON.stringify({ error: friendlyAnthropicError(err) }), {
          status: 502,
          headers: JSON_HEADERS,
        })
      }
    }

    if (body.op === 'extract_exercises') {
      // Vision op — converts a photo of a workout list into structured
      // exercises. Uses an inline Claude call (not callClaudeAsTool) because
      // the shared helper takes a string userPrompt, and this op needs a
      // multi-block content array (image + text).
      const payload = (body.payload ?? {}) as {
        image_b64?: unknown
        mime_type?: unknown
        hint?: unknown
      }
      if (typeof payload.image_b64 !== 'string' || payload.image_b64.length === 0) {
        return new Response(
          JSON.stringify({ error: 'payload.image_b64 is required and must be a non-empty string' }),
          { status: 400, headers: JSON_HEADERS },
        )
      }
      if (payload.image_b64.length > MAX_IMAGE_B64_CHARS) {
        return new Response(
          JSON.stringify({
            error: `payload.image_b64 exceeds ${MAX_IMAGE_B64_CHARS} chars (got ${payload.image_b64.length}); resize the image client-side`,
          }),
          { status: 400, headers: JSON_HEADERS },
        )
      }
      if (typeof payload.mime_type !== 'string' || !ALLOWED_IMAGE_MIMES.has(payload.mime_type)) {
        return new Response(
          JSON.stringify({
            error: `payload.mime_type must be one of: ${[...ALLOWED_IMAGE_MIMES].join(', ')}`,
          }),
          { status: 400, headers: JSON_HEADERS },
        )
      }
      if (payload.hint !== undefined && typeof payload.hint !== 'string') {
        return new Response(
          JSON.stringify({ error: 'payload.hint must be a string when provided' }),
          { status: 400, headers: JSON_HEADERS },
        )
      }

      const imageB64 = payload.image_b64
      const mimeType = payload.mime_type as 'image/jpeg' | 'image/png' | 'image/webp'
      const hint = (payload.hint as string | undefined)?.trim()
      const userText = hint ? `${EXTRACT_PROMPT}\n\nAdditional context from the user: ${hint}` : EXTRACT_PROMPT

      try {
        const sanitized = sanitizeSchemaForAnthropic(extractExercisesSchema) as Record<string, unknown>
        const response = await client.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: mimeType, data: imageB64 },
                },
                { type: 'text', text: userText },
              ],
            },
          ],
          tools: [
            {
              name: 'emit_exercises',
              description: 'Emit the extracted exercise list parsed from the image.',
              // deno-lint-ignore no-explicit-any
              input_schema: sanitized as any,
            },
          ],
          tool_choice: { type: 'tool', name: 'emit_exercises' },
        })
        const toolUse = response.content.find(
          (c): c is Anthropic.ToolUseBlock => c.type === 'tool_use',
        )
        if (!toolUse) {
          const stop = response.stop_reason ?? 'unknown'
          return new Response(
            JSON.stringify({
              error: `Claude returned no tool_use block (stop_reason=${stop}).`,
            }),
            { status: 502, headers: JSON_HEADERS },
          )
        }
        return new Response(JSON.stringify(toolUse.input), { headers: JSON_HEADERS })
      } catch (err) {
        return new Response(JSON.stringify({ error: friendlyAnthropicError(err) }), {
          status: 502,
          headers: JSON_HEADERS,
        })
      }
    }

    if (body.op === 'generate_routine') {
      // Validate payload shape before handing off to Claude. Same
      // defense-in-depth pattern as generate_plan / swap_exercise.
      const payload = (body.payload ?? {}) as {
        profile?: unknown
        sessionFocus?: unknown
        kind?: unknown
        minutes?: unknown
        focusTag?: unknown
      }
      if (!payload.profile || typeof payload.profile !== 'object') {
        return new Response(
          JSON.stringify({ error: 'payload.profile is required and must be an object' }),
          { status: 400, headers: JSON_HEADERS },
        )
      }
      if (
        !Array.isArray(payload.sessionFocus) ||
        !payload.sessionFocus.every((v) => typeof v === 'string')
      ) {
        return new Response(
          JSON.stringify({ error: 'payload.sessionFocus is required and must be a string[]' }),
          { status: 400, headers: JSON_HEADERS },
        )
      }
      if (!isRoutineKind(payload.kind)) {
        return new Response(
          JSON.stringify({
            error: `payload.kind must be one of: ${ROUTINE_KINDS.join(', ')}`,
          }),
          { status: 400, headers: JSON_HEADERS },
        )
      }
      if (
        typeof payload.minutes !== 'number' ||
        !Number.isFinite(payload.minutes) ||
        payload.minutes < 3 ||
        payload.minutes > 60
      ) {
        return new Response(
          JSON.stringify({ error: 'payload.minutes must be a number between 3 and 60' }),
          { status: 400, headers: JSON_HEADERS },
        )
      }
      if (payload.focusTag !== undefined && typeof payload.focusTag !== 'string') {
        return new Response(
          JSON.stringify({ error: 'payload.focusTag must be a string when provided' }),
          { status: 400, headers: JSON_HEADERS },
        )
      }

      try {
        const prompt = buildRoutinePrompt({
          profile: payload.profile,
          sessionFocus: payload.sessionFocus as string[],
          kind: payload.kind,
          minutes: Math.round(payload.minutes),
          focusTag: payload.focusTag as string | undefined,
        })
        const text = await callClaudeAsTool({
          client,
          systemPrompt:
            'You emit a short warmup/cooldown/cardio routine by calling the emit_routine tool exactly once. All behavioral rules are in the user message.',
          userPrompt: prompt,
          toolName: 'emit_routine',
          toolDescription:
            'Emit the routine title and exercise list for the requested session.',
          inputSchema: routineSchema,
          cacheSystem: true,
          maxTokens: 4096,
        })

        // Server-side post-validation — the routineSchema requires `name` only
        // and leaves duration_seconds vs reps as prompt-enforced. The model
        // occasionally returns an exercise with neither (or reps=""), which
        // leaves the client with nothing to render. Reject here so a retry
        // has a chance of producing a clean routine.
        try {
          const parsed = JSON.parse(text) as {
            exercises?: { name?: string; duration_seconds?: number; reps?: string }[]
          }
          const invalid: { index: number; name: string }[] = []
          const exercises = parsed.exercises ?? []
          for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i]
            const hasDuration = typeof ex.duration_seconds === 'number'
            const hasReps = typeof ex.reps === 'string' && ex.reps.trim().length > 0
            if (!hasDuration && !hasReps) {
              invalid.push({ index: i, name: ex.name ?? '(unnamed)' })
            }
          }
          if (invalid.length > 0) {
            return new Response(
              JSON.stringify({
                error: `Claude returned ${invalid.length} routine exercise(s) missing both duration_seconds and reps`,
                invalid,
              }),
              { status: 502, headers: JSON_HEADERS },
            )
          }
        } catch (parseErr) {
          // text was not valid JSON despite tool_use; let the client handle
          // via its own Zod validation.
          console.warn('post-validate JSON parse failed', parseErr)
        }
        return new Response(text, { headers: JSON_HEADERS })
      } catch (err) {
        return new Response(JSON.stringify({ error: friendlyAnthropicError(err) }), {
          status: 502,
          headers: JSON_HEADERS,
        })
      }
    }
  }

  return new Response(JSON.stringify({ error: `unknown op: ${body.op}` }), {
    status: 400,
    headers: JSON_HEADERS,
  })
})
