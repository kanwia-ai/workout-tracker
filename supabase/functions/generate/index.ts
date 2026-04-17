// supabase/functions/generate/index.ts
// Dispatcher for LLM-generated content. Each `op` maps to a structured JSON
// response. Runs as a Deno edge function; do not import Node-only modules.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  const body = await req.json().catch(() => null) as { op?: string; payload?: unknown } | null
  if (!body || typeof body.op !== 'string') {
    return new Response(JSON.stringify({ error: 'missing op' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }
  // Echo dispatcher — real ops (generate_plan, swap_exercise) land in later tasks.
  if (body.op === 'echo') {
    return new Response(JSON.stringify({ echo: body.payload ?? null }), {
      headers: { 'content-type': 'application/json' },
    })
  }
  return new Response(JSON.stringify({ error: `unknown op: ${body.op}` }), {
    status: 400,
    headers: { 'content-type': 'application/json' },
  })
})
