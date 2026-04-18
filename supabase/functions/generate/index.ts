// supabase/functions/generate/index.ts
// Dispatcher for LLM-generated content. Each `op` maps to a structured JSON
// response. Runs as a Deno edge function; do not import Node-only modules.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { GoogleGenAI } from 'npm:@google/genai@^1'
import { pingSchema } from './schemas.ts'

const JSON_HEADERS = { 'content-type': 'application/json' }

// Ops that require the Gemini SDK. Keep in sync as new LLM-backed ops land.
const GEMINI_OPS = new Set(['ping'])

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
  }

  return new Response(JSON.stringify({ error: `unknown op: ${body.op}` }), {
    status: 400,
    headers: JSON_HEADERS,
  })
})
