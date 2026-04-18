// supabase/functions/generate/index.ts
// Dispatcher for LLM-generated content. Each `op` maps to a structured JSON
// response. Runs as a Deno edge function; do not import Node-only modules.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { GoogleGenAI } from 'npm:@google/genai@^1'
import { mesocycleSchema, pingSchema } from './schemas.ts'
import { buildPlanPrompt, type ExercisePoolEntry } from './prompts/generatePlan.ts'

const JSON_HEADERS = { 'content-type': 'application/json' }

// Ops that require the Gemini SDK. Keep in sync as new LLM-backed ops land.
const GEMINI_OPS = new Set(['ping', 'generate_plan'])

// Hard cap on serialized exercise-pool size. Gemini 2.5 Flash tolerates large
// inputs, but the pool is untrusted client input and we don't want a runaway
// prompt to rack up token costs. ~500KB of JSON is already ~5x our typical
// 200-entry pool.
const MAX_POOL_JSON_BYTES = 500_000

// Read the key and construct the SDK on demand so a key added AFTER boot
// takes effect on the next request (instead of waiting for the isolate to
// recycle). The client cached under `cachedAi` is reused while the key is
// stable.
let cachedAi: GoogleGenAI | null = null
let cachedKey: string | undefined
function getAi(): GoogleGenAI | null {
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) return null
  if (cachedAi && cachedKey === key) return cachedAi
  cachedAi = new GoogleGenAI({ apiKey: key })
  cachedKey = key
  return cachedAi
}

Deno.serve(async (req) => {
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
  // Gemini quota.
  if (body.op === 'echo') {
    return new Response(JSON.stringify({ echo: body.payload ?? null }), {
      headers: JSON_HEADERS,
    })
  }

  if (GEMINI_OPS.has(body.op)) {
    const ai = getAi()
    if (!ai) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY missing' }), {
        status: 500,
        headers: JSON_HEADERS,
      })
    }

    if (body.op === 'ping') {
      try {
        const r = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: 'Say hello. Also return the current ISO timestamp you believe it is.',
          config: {
            responseMimeType: 'application/json',
            responseSchema: pingSchema,
          },
        })
        // r.text is the model's JSON string; pass through verbatim so the
        // client can validate it with the matching Zod schema. Guard against
        // an empty/blocked response which would turn into an empty Response
        // body and confuse the client's Zod parse.
        if (!r.text) {
          throw new Error('gemini returned empty response (blocked or no candidates)')
        }
        return new Response(r.text, { headers: JSON_HEADERS })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return new Response(JSON.stringify({ error: message }), {
          status: 502,
          headers: JSON_HEADERS,
        })
      }
    }

    if (body.op === 'generate_plan') {
      // Validate payload shape at the entry. The client sends trusted-ish data,
      // but we still guard to fail fast with a useful error instead of a
      // Gemini "invalid input" deep in the pipeline.
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
        const prompt = buildPlanPrompt({
          profile: payload.profile,
          exercisePool: payload.exercisePool as ExercisePoolEntry[],
          weeks,
        })
        const r = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: mesocycleSchema,
          },
        })
        if (!r.text) {
          return new Response(
            JSON.stringify({ error: 'gemini returned empty response (blocked or no candidates)' }),
            { status: 502, headers: JSON_HEADERS },
          )
        }
        // Server-side id-pool check — Gemini occasionally hallucinates exercise
        // ids that don't exist in the provided pool. Catching this here saves
        // the client from burning time on a bad plan they can't render.
        try {
          const parsed = JSON.parse(r.text) as {
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
                error: `gemini hallucinated ${bogus.length} exercise id(s) not in pool`,
                hallucinated: bogus.slice(0, 5),
              }),
              { status: 502, headers: JSON_HEADERS },
            )
          }
        } catch (parseErr) {
          // r.text was not valid JSON despite responseSchema; let the client
          // handle via its own Zod validation.
          console.warn('post-validate JSON parse failed', parseErr)
        }
        return new Response(r.text, { headers: JSON_HEADERS })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return new Response(JSON.stringify({ error: message }), {
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
