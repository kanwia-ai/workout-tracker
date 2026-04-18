// supabase/functions/generate/index.ts
// Dispatcher for LLM-generated content. Each `op` maps to a structured JSON
// response. Runs as a Deno edge function; do not import Node-only modules.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { GoogleGenAI } from 'npm:@google/genai@^1'
import { pingSchema } from './schemas.ts'

const JSON_HEADERS = { 'content-type': 'application/json' }

// Ops that require the Gemini SDK. Keep in sync as new LLM-backed ops land.
const GEMINI_OPS = new Set(['ping'])

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
// Lazy init — if the key is absent we still want the echo op to work and to
// return a structured error from Gemini-backed ops instead of crashing at boot.
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null

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
        // client can validate it with the matching Zod schema.
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
