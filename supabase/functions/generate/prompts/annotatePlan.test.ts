// Prompt-string contract tests for the annotate_plan nuance-layer prompt.
//
// The system prompt is load-bearing: the whole point of the nuance layer is
// that the LLM cites KB entries (not its training-data priors). These tests
// guard the guardrails — if someone edits the prompt and breaks the "you
// may only assert KB-backed claims" rule, CI catches it.

import { describe, it, expect } from 'vitest'
import {
  ANNOTATE_SYSTEM_PROMPT,
  buildAnnotatePrompt,
  type AnnotationKBExcerpt,
} from './annotatePlan'

// ─── System prompt: guardrails ─────────────────────────────────────────────

describe('ANNOTATE_SYSTEM_PROMPT', () => {
  it('declares that the KB is the source of truth', () => {
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/KNOWLEDGE BASE/i)
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/source of truth/i)
  })

  it('explicitly bans paraphrasing from training-data priors when no KB entry supports a claim', () => {
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/do not paraphrase from your training/i)
  })

  it('instructs the model to omit substantive claims when no KB entry supports them', () => {
    // We accept either "if you cannot find" or "DO NOT make the claim" as
    // proof the prompt teaches the model to skip rather than hallucinate.
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/cannot find a KB entry/i)
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/do not make the claim/i)
  })

  it('describes the cited_entries citation pattern', () => {
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/cited_entries/)
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/MUST be non-empty/i)
  })

  it('describes the output structure (block / sessions / exercises)', () => {
    expect(ANNOTATE_SYSTEM_PROMPT).toContain('block')
    expect(ANNOTATE_SYSTEM_PROMPT).toContain('sessions')
    expect(ANNOTATE_SYSTEM_PROMPT).toContain('exercises')
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/emit_annotation/)
  })

  it('describes the compound exercise key format (session_id::library_id)', () => {
    // Format may be quoted with angle brackets ("<session_id>::<library_id>")
    // — match both shapes so prompt-style edits don't break the test.
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/session_id>?::<?library_id/)
  })

  it('forbids creative changes (sets/reps/exercise selection)', () => {
    // The nuance layer is purely additive — it must not touch the
    // deterministic engine's outputs.
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/do not change/i)
  })

  it('forbids em dashes (Kyra preference) + the gym-bro hype words', () => {
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/no em dashes/i)
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/crush it/i)
  })

  it('warns against promising body-composition outcomes from training alone', () => {
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/body comp/i)
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/diet-driven/i)
  })

  it('declares length caps on each rationale type', () => {
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/800/)
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/280/)
    expect(ANNOTATE_SYSTEM_PROMPT).toMatch(/240/)
  })
})

// ─── User prompt: rendered payload ─────────────────────────────────────────

function buildExcerpt(overrides: Partial<AnnotationKBExcerpt> = {}): AnnotationKBExcerpt {
  return {
    id: 'progressive-overload',
    title: 'Progressive overload — something must increase over time',
    type: 'principle',
    confidence: 'high',
    claim: 'For continued adaptation, some training variable must progress over time.',
    nuance: 'Progression is noticed, not always calculated.',
    application: 'autoProgress reads per-set ratings + reps cleared, then bumps / holds / drops.',
    citations: ['Zatsiorsky 2020', 'Plotkin 2022'],
    ...overrides,
  }
}

describe('buildAnnotatePrompt', () => {
  const payload = {
    plan: {
      id: 'meso-1',
      sessions: [
        { id: 'session-wk1-s1', exercises: [{ library_id: 'fedb:barbell-squat', name: 'Barbell Squat' }] },
      ],
    },
    profile: { primary_goals: ['build_muscle'], training_age_months: 18 },
    recentCheckins: [],
    kbExcerpts: [buildExcerpt()],
    session_ids: ['session-wk1-s1'],
    exercise_keys: ['session-wk1-s1::fedb:barbell-squat'],
  }

  it('includes the KB block with each entry id + title + claim verbatim', () => {
    const out = buildAnnotatePrompt(payload)
    expect(out).toContain('id: progressive-overload')
    expect(out).toContain('title: Progressive overload')
    expect(out).toMatch(/CLAIM: For continued adaptation/)
    expect(out).toMatch(/NUANCE: Progression is noticed/)
    expect(out).toMatch(/APP: autoProgress reads/)
  })

  it('includes the user profile JSON', () => {
    const out = buildAnnotatePrompt(payload)
    expect(out).toContain('build_muscle')
    expect(out).toContain('training_age_months')
  })

  it('includes the SESSION_IDS and EXERCISE_KEYS lists verbatim', () => {
    const out = buildAnnotatePrompt(payload)
    expect(out).toContain('"session-wk1-s1"')
    expect(out).toContain('"session-wk1-s1::fedb:barbell-squat"')
    expect(out).toMatch(/SESSION_IDS/)
    expect(out).toMatch(/EXERCISE_KEYS/)
  })

  it('handles empty recentCheckins with a clear first-block placeholder', () => {
    const out = buildAnnotatePrompt(payload)
    expect(out).toMatch(/no recent check-ins/i)
  })

  it('serializes a non-empty recentCheckins array', () => {
    const out = buildAnnotatePrompt({
      ...payload,
      recentCheckins: [
        {
          session_id: 'session-wk1-s1',
          overall_feel: 4,
        },
      ],
    })
    expect(out).toMatch(/overall_feel/)
  })

  it('handles an empty KB excerpt array with a clear placeholder', () => {
    const out = buildAnnotatePrompt({ ...payload, kbExcerpts: [] })
    expect(out).toMatch(/no KB entries retrieved/i)
  })

  it('caps included citations per entry so the prompt stays readable', () => {
    const out = buildAnnotatePrompt({
      ...payload,
      kbExcerpts: [
        buildExcerpt({
          citations: ['Cite 1', 'Cite 2', 'Cite 3', 'Cite 4', 'Cite 5'],
        }),
      ],
    })
    // First two citations land; the rest are dropped to keep the prompt
    // body lean. The full citation list still lives in the KB on disk.
    expect(out).toContain('Cite 1')
    expect(out).toContain('Cite 2')
    expect(out).not.toContain('Cite 5')
  })
})
