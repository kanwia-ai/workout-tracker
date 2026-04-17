import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callEdge } from './generate'
import { z } from 'zod'

describe('callEdge', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
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

  it('rejects when the response fails schema validation', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({ message: 123 }) })
    const schema = z.object({ message: z.string() })
    await expect(callEdge('ping', {}, schema)).rejects.toThrow()
  })
})
