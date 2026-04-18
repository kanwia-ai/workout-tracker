import type { ZodType } from 'zod'
import { supabase } from './supabase'

export async function callEdge<T>(op: string, payload: unknown, schema: ZodType<T>): Promise<T> {
  const { data: session } = await supabase.auth.getSession()
  // Prefer the signed-in user's access token so RLS / request context is
  // attributed to them. When no session exists (dev bypass or fresh install
  // before auth), fall back to the project's public anon key — it's a valid
  // JWT that satisfies `verify_jwt: true` on the edge function gateway.
  const token =
    session?.session?.access_token ?? (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate`

  let r: Response
  try {
    r = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ op, payload }),
      // Gemini 2.5 Flash can take 60-90s on a full generate_plan call
      // (6-week block, ~24 sessions, large JSON schema). Leave generous headroom.
      signal: AbortSignal.timeout(180_000),
    })
  } catch (err) {
    throw new Error(`edge ${op} network error: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`edge ${op} failed: ${r.status} ${body}`.trim())
  }

  const json = await r.json()
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    throw new Error(`edge ${op} returned invalid shape: ${parsed.error.message}`)
  }
  return parsed.data
}
