import type { ZodSchema } from 'zod'
import { supabase } from './supabase'

export async function callEdge<T>(op: string, payload: unknown, schema: ZodSchema<T>): Promise<T> {
  const { data: session } = await supabase.auth.getSession()
  const token = session?.session?.access_token
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ op, payload }),
  })
  if (!r.ok) throw new Error(`edge ${op} failed: ${r.status}`)
  return schema.parse(await r.json())
}
