import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callEdge } from './generate'
import { supabase } from './supabase'
import { z } from 'zod'

describe('callEdge', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: null,
    } as any)
  })

  it('validates the response against the provided Zod schema', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'hi', now: '2026-04-17T00:00:00Z' }),
    })
    const schema = z.object({ message: z.string(), now: z.string() })
    const result = await callEdge('ping', {}, schema)
    expect(result).toEqual({ message: 'hi', now: '2026-04-17T00:00:00Z' })
  })

  it('rejects when the response fails schema validation (with op context)', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({ message: 123 }) })
    const schema = z.object({ message: z.string() })
    await expect(callEdge('ping', {}, schema)).rejects.toThrow(/edge ping returned invalid shape/)
  })

  it('includes response body in the error on non-2xx', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'gemini rate-limited',
    })
    await expect(callEdge('ping', {}, z.object({}))).rejects.toThrow(/500.*gemini rate-limited/)
  })

  it('wraps network errors with op context', async () => {
    ;(fetch as any).mockRejectedValue(new Error('fetch failed'))
    await expect(callEdge('ping', {}, z.object({}))).rejects.toThrow(/edge ping network error.*fetch failed/)
  })

  it('POSTs to the correct URL with JSON body containing op + payload', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    await callEdge('generate_plan', { weeks: 6 }, z.object({ ok: z.boolean() }))
    const [url, init] = (fetch as any).mock.calls[0]
    expect(url).toContain('/functions/v1/generate')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ op: 'generate_plan', payload: { weeks: 6 } })
    expect(init.headers['content-type']).toBe('application/json')
  })

  it('falls back to the anon key when no session exists', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) })
    await callEdge('ping', {}, z.object({}))
    const [, init] = (fetch as any).mock.calls[0]
    // Anon key is a JWT string prefixed by Bearer — verifies the fallback path
    // keeps auth attached so verify_jwt: true on the edge gateway stays happy.
    expect(init.headers.authorization).toMatch(/^Bearer eyJ/)
  })

  it('attaches Bearer token when session exists', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: { access_token: 'tok_abc' } },
      error: null,
    } as any)
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) })
    await callEdge('ping', {}, z.object({}))
    const [, init] = (fetch as any).mock.calls[0]
    expect(init.headers.authorization).toBe('Bearer tok_abc')
  })
})
