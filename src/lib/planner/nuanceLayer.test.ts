import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  AnnotationResponseSchema,
  annotateWithNuance,
  buildAnnotationContext,
  clampRationale,
  graftAnnotations,
} from './nuanceLayer'
import * as generateModule from '../generate'
import * as supabaseModule from '../supabase'
import type { Mesocycle, PlannedSession } from '../../types/plan'
import type { UserProgramProfile } from '../../types/profile'
import type { KBEntry } from '../knowledgeBase/types'
import type { RetrievalResult } from '../knowledgeBase/retrieval'

// ─── Fixtures ──────────────────────────────────────────────────────────────
function buildExercise(libraryId: string, name: string) {
  return {
    library_id: libraryId,
    name,
    sets: 3,
    reps: '8-12',
    rir: 2,
    rest_seconds: 120,
    role: 'accessory',
    warmup_sets: [],
  }
}

function buildSession(overrides: Partial<PlannedSession> = {}): PlannedSession {
  return {
    id: 'session-wk1-s1',
    week_number: 1,
    ordinal: 1,
    focus: ['quads', 'glutes'],
    title: 'lower body strength',
    subtitle: 'LOWER · PUSH',
    estimated_minutes: 60,
    exercises: [
      buildExercise('fedb:barbell-squat', 'Barbell Squat'),
      buildExercise('fedb:rdl', 'Romanian Deadlift'),
    ],
    day_of_week: 0,
    rationale: 'engine-generated structural rationale',
    status: 'upcoming',
    ...overrides,
  }
}

function buildMesocycle(overrides: Partial<Mesocycle> = {}): Mesocycle {
  return {
    id: 'meso-test',
    user_id: 'user-1',
    generated_at: '2026-05-27T12:00:00.000Z',
    length_weeks: 6,
    sessions: [buildSession()],
    profile_snapshot: {},
    ...overrides,
  }
}

function buildProfile(overrides: Partial<UserProgramProfile> = {}): UserProgramProfile {
  return {
    goal: 'aesthetics',
    sessions_per_week: 4,
    training_age_months: 18,
    equipment: ['full_gym'],
    injuries: [],
    time_budget_min: 60,
    sex: 'female',
    posture_notes: '',
    primary_goals: ['build_muscle'],
    ...overrides,
  } as UserProgramProfile
}

function buildKBEntry(id: string, title = `Entry ${id}`): KBEntry {
  return {
    filePath: `test://${id}.md`,
    body: `# ${title}\n\n## Claim\nClaim of ${id}.\n\n## Nuance\nNuance of ${id}.\n\n## Application in this app\nApplication of ${id}.`,
    frontmatter: {
      id,
      type: 'principle',
      domain: 'programming-fundamentals',
      title,
      confidence: 'high',
      applicability: {
        goals: ['build_muscle'],
        training_age: 'any',
        sex: 'any',
        injuries: [],
      },
      tags: [],
      citations: ['Test 2026 — fixture citation'],
      related: [],
      contradicts: [],
    },
  }
}

function buildRetrievalResult(entries: KBEntry[]): RetrievalResult {
  return {
    entries,
    scores: Object.fromEntries(entries.map((e, i) => [e.frontmatter.id, 100 - i])),
  }
}

// ─── buildAnnotationContext ────────────────────────────────────────────────
describe('buildAnnotationContext', () => {
  it('returns kbExcerpts with claim / nuance / application extracted', () => {
    const retrieval = buildRetrievalResult([buildKBEntry('test-1', 'Test One')])
    const context = buildAnnotationContext(
      buildMesocycle(),
      buildProfile(),
      [],
      retrieval,
    )
    expect(context.kbExcerpts).toHaveLength(1)
    const ex = context.kbExcerpts[0]
    expect(ex.id).toBe('test-1')
    expect(ex.title).toBe('Test One')
    expect(ex.claim).toContain('Claim of test-1')
    expect(ex.nuance).toContain('Nuance of test-1')
    expect(ex.application).toContain('Application of test-1')
  })

  it('emits compound exercise keys joining session_id and library_id', () => {
    const context = buildAnnotationContext(
      buildMesocycle(),
      buildProfile(),
      [],
      buildRetrievalResult([]),
    )
    expect(context.exercise_keys).toEqual([
      'session-wk1-s1::fedb:barbell-squat',
      'session-wk1-s1::fedb:rdl',
    ])
    expect(context.session_ids).toEqual(['session-wk1-s1'])
  })
})

// ─── graftAnnotations ──────────────────────────────────────────────────────
describe('graftAnnotations', () => {
  it('overwrites session.rationale + populates exercise.rationale by key', () => {
    const plan = buildMesocycle()
    const annotation = AnnotationResponseSchema.parse({
      block: {
        rationale: 'Block-level coaching paragraph.',
        cited_entries: ['deadline-aware-programming'],
      },
      sessions: {
        'session-wk1-s1': {
          rationale: 'why lower body today',
          cited_entries: ['progressive-overload'],
        },
      },
      exercises: {
        'session-wk1-s1::fedb:barbell-squat': {
          rationale: 'Squat first — fresh muscle, fresh CNS.',
          cited_entries: ['compound-vs-isolation-taxonomy'],
        },
      },
    })
    const out = graftAnnotations(plan, annotation)
    expect(out.rationale).toBe('Block-level coaching paragraph.')
    expect(out.cited_entries).toEqual(['deadline-aware-programming'])
    expect(out.sessions[0].rationale).toBe('why lower body today')
    expect(out.sessions[0].cited_entries).toEqual(['progressive-overload'])
    expect(out.sessions[0].exercises[0].rationale).toBe('Squat first — fresh muscle, fresh CNS.')
    expect(out.sessions[0].exercises[0].cited_entries).toEqual(['compound-vs-isolation-taxonomy'])
    // The non-annotated exercise (RDL) keeps its default (undefined) rationale.
    expect(out.sessions[0].exercises[1].rationale).toBeUndefined()
  })

  it('drops unknown session/exercise keys without throwing', () => {
    const plan = buildMesocycle()
    const annotation = AnnotationResponseSchema.parse({
      sessions: {
        'session-nonexistent': {
          rationale: 'should be ignored',
          cited_entries: ['x'],
        },
      },
      exercises: {
        'session-wk1-s1::fedb:unknown-lift': {
          rationale: 'should be ignored',
          cited_entries: ['y'],
        },
      },
    })
    const out = graftAnnotations(plan, annotation)
    // Original session rationale is preserved since no matching annotation
    // overrode it.
    expect(out.sessions[0].rationale).toBe('engine-generated structural rationale')
    // No exercise was annotated.
    expect(out.sessions[0].exercises.every((e) => e.rationale === undefined)).toBe(true)
  })

  it('preserves engine rationale when annotation provides no rationale field', () => {
    const plan = buildMesocycle()
    const annotation = AnnotationResponseSchema.parse({
      sessions: {
        'session-wk1-s1': { cited_entries: [] },
      },
    })
    const out = graftAnnotations(plan, annotation)
    expect(out.sessions[0].rationale).toBe('engine-generated structural rationale')
  })
})

// ─── annotateWithNuance (integration) ──────────────────────────────────────
describe('annotateWithNuance', () => {
  beforeEach(() => {
    // Default: pretend Supabase is configured so the function reaches the
    // edge-call path. Tests that need offline behavior override below.
    vi.spyOn(supabaseModule, 'isSupabaseConfigured', 'get').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the plan UNCHANGED when Supabase is not configured', async () => {
    vi.spyOn(supabaseModule, 'isSupabaseConfigured', 'get').mockReturnValue(false)
    const callSpy = vi.spyOn(generateModule, 'callEdge')
    const plan = buildMesocycle()
    const result = await annotateWithNuance(plan, buildProfile(), [])
    expect(result).toBe(plan)
    expect(callSpy).not.toHaveBeenCalled()
  })

  it('returns the plan UNCHANGED when callEdge throws (graceful degradation)', async () => {
    const callSpy = vi
      .spyOn(generateModule, 'callEdge')
      .mockRejectedValue(new Error('edge annotate_plan failed: 502 boom'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const plan = buildMesocycle()
    const result = await annotateWithNuance(plan, buildProfile(), [], {
      retrievalOverride: buildRetrievalResult([buildKBEntry('test-1')]),
    })
    expect(result).toBe(plan)
    expect(callSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith(
      'nuanceLayer: annotation failed, returning unannotated plan',
      expect.objectContaining({ error: expect.stringContaining('502 boom') }),
    )
  })

  it('returns the plan UNCHANGED when callEdge returns a malformed shape', async () => {
    // callEdge itself validates against the schema and throws if invalid — we
    // simulate that here with a schema-mismatch error.
    vi.spyOn(generateModule, 'callEdge').mockRejectedValue(
      new Error('edge annotate_plan returned invalid shape: ...'),
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const plan = buildMesocycle()
    const result = await annotateWithNuance(plan, buildProfile(), [], {
      retrievalOverride: buildRetrievalResult([buildKBEntry('test-1')]),
    })
    expect(result).toBe(plan)
  })

  it('skips the edge call when retrieval returns no entries', async () => {
    const callSpy = vi.spyOn(generateModule, 'callEdge')
    const plan = buildMesocycle()
    const result = await annotateWithNuance(plan, buildProfile(), [], {
      retrievalOverride: buildRetrievalResult([]),
    })
    expect(result).toBe(plan)
    expect(callSpy).not.toHaveBeenCalled()
  })

  it('grafts the annotation onto the plan on success', async () => {
    const annotation = {
      block: {
        rationale: 'block paragraph',
        cited_entries: ['e1'],
      },
      sessions: {
        'session-wk1-s1': {
          rationale: 'session line',
          cited_entries: ['e1'],
        },
      },
      exercises: {
        'session-wk1-s1::fedb:barbell-squat': {
          rationale: 'why squat for you',
          cited_entries: ['e2'],
        },
      },
    }
    vi.spyOn(generateModule, 'callEdge').mockResolvedValue(annotation as any)

    const plan = buildMesocycle()
    const result = await annotateWithNuance(plan, buildProfile(), [], {
      retrievalOverride: buildRetrievalResult([
        buildKBEntry('e1'),
        buildKBEntry('e2'),
      ]),
    })
    expect(result.rationale).toBe('block paragraph')
    expect(result.sessions[0].rationale).toBe('session line')
    expect(result.sessions[0].exercises[0].rationale).toBe('why squat for you')
  })

  it('invokes retrieval when no override is given (smoke test against real KB)', async () => {
    // Mock callEdge to confirm we got there with non-empty kbExcerpts.
    let receivedPayload: any = null
    vi.spyOn(generateModule, 'callEdge').mockImplementation(async (_op, payload) => {
      receivedPayload = payload
      return {
        sessions: {},
        exercises: {},
      } as any
    })
    const plan = buildMesocycle()
    await annotateWithNuance(plan, buildProfile(), [])
    expect(receivedPayload).not.toBeNull()
    expect(receivedPayload.kbExcerpts).toBeInstanceOf(Array)
    expect(receivedPayload.kbExcerpts.length).toBeGreaterThan(0)
    expect(receivedPayload.session_ids).toEqual(['session-wk1-s1'])
  })

  it('honors the VITE_ENABLE_NUANCE_LAYER=false feature flag', async () => {
    vi.stubEnv('VITE_ENABLE_NUANCE_LAYER', 'false')
    const callSpy = vi.spyOn(generateModule, 'callEdge')
    const plan = buildMesocycle()
    try {
      const result = await annotateWithNuance(plan, buildProfile(), [], {
        retrievalOverride: buildRetrievalResult([buildKBEntry('test-1')]),
      })
      expect(result).toBe(plan)
      expect(callSpy).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('trims recentCheckins to the most recent 12 entries', async () => {
    let receivedPayload: any = null
    vi.spyOn(generateModule, 'callEdge').mockImplementation(async (_op, payload) => {
      receivedPayload = payload
      return { sessions: {}, exercises: {} } as any
    })
    const checkins = Array.from({ length: 20 }, (_, i) => ({
      session_id: `s-${i}`,
      user_id: 'u',
      completed_at: new Date(2026, 0, i + 1).toISOString(),
      week_number: 1,
      overall_feel: 3 as const,
      exercises: [],
      synced: false,
    }))
    await annotateWithNuance(buildMesocycle(), buildProfile(), checkins, {
      retrievalOverride: buildRetrievalResult([buildKBEntry('e1')]),
    })
    expect(receivedPayload.recentCheckins).toHaveLength(12)
    expect(receivedPayload.recentCheckins[0].session_id).toBe('s-8')
    expect(receivedPayload.recentCheckins[11].session_id).toBe('s-19')
  })
})

describe('clampRationale + over-length tolerance', () => {
  // Regression: 2026-06-10 — the live edge returned a valid annotation whose
  // session rationales ran a few chars past the 280 cap. Zod max() rejected
  // the ENTIRE response and the catch silently shipped the unannotated plan.
  // The LLM layer had never produced user-visible output because of this.
  it('passes short strings through untouched', () => {
    expect(clampRationale('short and sweet.', 280)).toBe('short and sweet.')
  })

  it('truncates at a sentence boundary when one exists past the midpoint', () => {
    const s = 'a sentence that is pretty long here. tail words continue past the cap'
    const out = clampRationale(s, 40)
    expect(out).toBe('a sentence that is pretty long here.')
    expect(out.length).toBeLessThanOrEqual(40)
  })

  it('prefers a word boundary over a too-early sentence boundary', () => {
    const s = 'short. but the second sentence is the bulk of the content and runs long'
    const out = clampRationale(s, 60)
    // The only sentence boundary sits before the midpoint — cutting there
    // would discard most of the text, so the clamp keeps whole words instead.
    expect(out.length).toBeLessThanOrEqual(60)
    expect(out.length).toBeGreaterThan(30)
    expect(s.startsWith(out)).toBe(true)
  })

  it('falls back to a word boundary when no sentence boundary fits', () => {
    const s = 'one enormous unbroken clause that just keeps going and going without any period at all in range'
    const out = clampRationale(s, 50)
    expect(out.length).toBeLessThanOrEqual(50)
    expect(out.endsWith(' ')).toBe(false)
    expect(s.startsWith(out)).toBe(true)
  })

  it('AnnotationResponseSchema clamps over-long rationales instead of rejecting', () => {
    const long = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ')
    const result = AnnotationResponseSchema.safeParse({
      block: { rationale: long(200), cited_entries: ['e1'] },
      sessions: {
        'session-wk1-s1': { rationale: long(80), cited_entries: [] },
      },
      exercises: {
        'session-wk1-s1::fedb:rdl': { rationale: long(70), cited_entries: [] },
      },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.block!.rationale!.length).toBeLessThanOrEqual(800)
      expect(
        result.data.sessions['session-wk1-s1']!.rationale!.length,
      ).toBeLessThanOrEqual(280)
      expect(
        result.data.exercises['session-wk1-s1::fedb:rdl']!.rationale!.length,
      ).toBeLessThanOrEqual(240)
    }
  })
})
