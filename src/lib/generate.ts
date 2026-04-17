import type { ZodType } from 'zod'
import { supabase } from './supabase'

export async function callEdge<T>(op: string, payload: unknown, schema: ZodType<T>): Promise<T> {
  const { data: session } = await supabase.auth.getSession()
  const token = session?.session?.access_token
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
      signal: AbortSignal.timeout(60_000),
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
