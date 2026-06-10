// Nuance layer — takes a deterministic engine plan and annotates it with
// coaching-voice rationale grounded in the workout-tracker knowledge base.
//
// Contract:
//   - Input: a Mesocycle the engine produced (already schema-valid), the
//     UserProgramProfile, and recent SessionCheckins (for replan-aware
//     framing).
//   - Output: the SAME Mesocycle with rationale fields populated. Graceful
//     degradation: any error (Supabase down, edge function 5xx, schema
//     mismatch) returns the plan UNCHANGED and logs the error.
//
// The LLM is ONLY allowed to assert claims supported by KB entries. The
// retrieval layer (`src/lib/knowledgeBase/retrieval.ts`) selects up to ~30
// entries; the prompt builder ships them verbatim and instructs the LLM to
// cite the entry ids it draws from.
//
// This module deliberately does NOT touch the deterministic engine. The
// nuance layer is purely additive — when the LLM is unavailable, the plan
// flows through unchanged.

import { z } from 'zod'
import type { Mesocycle } from '../../types/plan'
import { MesocycleSchema } from '../../types/plan'
import type { UserProgramProfile } from '../../types/profile'
import type { SessionCheckin } from '../../types/checkin'
import { callEdge } from '../generate'
import { isSupabaseConfigured } from '../supabase'
import {
  retrieveRelevantEntries,
  type RetrievalResult,
} from '../knowledgeBase/retrieval'
import { extractEntrySections } from '../knowledgeBase/loader'
import type { KBEntry } from '../knowledgeBase/types'

// ─── Edge response schema ──────────────────────────────────────────────────
// What the `annotate_plan` op returns. Block-level rationale + a record of
// per-session rationales keyed by session.id + per-exercise rationales keyed
// by `${session.id}::${exercise.library_id}`. Optional everywhere so the
// LLM can omit any field it can't ground in a KB citation.
//
// The compound exercise key is necessary because the same library_id can
// appear in multiple sessions (e.g., barbell squat on both lower-A and
// lower-B days) and the rationale may be different in each context.
/**
 * Truncate an over-long LLM string to `max` chars at the last sentence
 * boundary (falling back to word boundary, then hard cut). LLMs can't count
 * characters — a rationale a few chars over the cap must NOT void the whole
 * annotation (that bug silently disabled this layer: the model's output
 * validated 200 on the edge, then died here on a Zod max()).
 */
export function clampRationale(s: string, max: number): string {
  if (s.length <= max) return s
  const slice = s.slice(0, max)
  const sentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
  )
  if (sentenceEnd > max * 0.5) return slice.slice(0, sentenceEnd + 1).trimEnd()
  const wordEnd = slice.lastIndexOf(' ')
  if (wordEnd > max * 0.5) return slice.slice(0, wordEnd).trimEnd()
  return slice.trimEnd()
}

const clampedString = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? clampRationale(v, max) : v),
    z.string().max(max),
  )

export const AnnotationResponseSchema = z.object({
  block: z
    .object({
      rationale: clampedString(800).optional(),
      cited_entries: z.array(z.string()).default([]),
    })
    .optional(),
  sessions: z
    .record(
      z.string(),
      z.object({
        rationale: clampedString(280).optional(),
        cited_entries: z.array(z.string()).default([]),
      }),
    )
    .default({}),
  exercises: z
    .record(
      z.string(),
      z.object({
        rationale: clampedString(240).optional(),
        cited_entries: z.array(z.string()).default([]),
      }),
    )
    .default({}),
})

export type AnnotationResponse = z.infer<typeof AnnotationResponseSchema>

// ─── Prompt builder helpers ────────────────────────────────────────────────
// We expose `buildAnnotationContext` so the edge function (which builds the
// actual Anthropic prompt server-side) can reuse the same retrieval cut +
// KB excerpt formatting. The client wraps everything into a single payload;
// the edge function does the final string assembly.

export interface AnnotationContext {
  plan: Mesocycle
  profile: UserProgramProfile
  recentCheckins: SessionCheckin[]
  // Compact KB excerpts the LLM will be told it MAY cite from.
  kbExcerpts: Array<{
    id: string
    title: string
    type: KBEntry['frontmatter']['type']
    confidence: KBEntry['frontmatter']['confidence']
    claim: string | null
    nuance: string | null
    application: string | null
    citations: string[]
  }>
  // Compound exercise keys the LLM should populate (session_id::library_id).
  // Surfacing the canonical key list inline prevents the LLM from inventing
  // keys that the client can't graft back onto the plan.
  exercise_keys: string[]
  // Plain session-id list, same reasoning as above.
  session_ids: string[]
}

/**
 * Build a fully-prepared context the edge function can hand to Claude. Keeps
 * retrieval + KB excerpt extraction on the client so we don't ship the
 * entire 107-entry KB to the edge function unnecessarily.
 */
export function buildAnnotationContext(
  plan: Mesocycle,
  profile: UserProgramProfile,
  recentCheckins: SessionCheckin[],
  retrieval: RetrievalResult,
): AnnotationContext {
  const kbExcerpts = retrieval.entries.map((entry) => {
    const sections = extractEntrySections(entry.body)
    return {
      id: entry.frontmatter.id,
      title: entry.frontmatter.title,
      type: entry.frontmatter.type,
      confidence: entry.frontmatter.confidence,
      claim: sections.claim,
      nuance: sections.nuance,
      application: sections.application,
      // Pass citations through so the LLM can mention "Schoenfeld 2017"
      // when an entry's nuance leans on a specific paper.
      citations: entry.frontmatter.citations,
    }
  })

  const session_ids = plan.sessions.map((s) => s.id)
  const exercise_keys: string[] = []
  for (const sess of plan.sessions) {
    for (const ex of sess.exercises) {
      exercise_keys.push(`${sess.id}::${ex.library_id}`)
    }
  }

  return {
    plan,
    profile,
    recentCheckins,
    kbExcerpts,
    exercise_keys,
    session_ids,
  }
}

// ─── Grafter ───────────────────────────────────────────────────────────────
// Apply an AnnotationResponse to a Mesocycle. Pure; returns a new Mesocycle
// with rationale fields populated. Unknown session/exercise keys are
// IGNORED (defensive — the LLM might emit a typo'd key; we'd rather silently
// drop than throw mid-render).
export function graftAnnotations(
  plan: Mesocycle,
  annotation: AnnotationResponse,
): Mesocycle {
  const next: Mesocycle = {
    ...plan,
    sessions: plan.sessions.map((sess) => {
      const sessAnnot = annotation.sessions[sess.id]
      const updatedExercises = sess.exercises.map((ex) => {
        const key = `${sess.id}::${ex.library_id}`
        const exAnnot = annotation.exercises[key]
        if (!exAnnot) return ex
        return {
          ...ex,
          rationale: exAnnot.rationale ?? ex.rationale,
          cited_entries:
            exAnnot.cited_entries && exAnnot.cited_entries.length > 0
              ? exAnnot.cited_entries
              : ex.cited_entries,
        }
      })
      if (!sessAnnot) {
        return { ...sess, exercises: updatedExercises }
      }
      return {
        ...sess,
        exercises: updatedExercises,
        rationale: sessAnnot.rationale ?? sess.rationale,
        cited_entries:
          sessAnnot.cited_entries && sessAnnot.cited_entries.length > 0
            ? sessAnnot.cited_entries
            : sess.cited_entries,
      }
    }),
  }
  if (annotation.block) {
    next.rationale = annotation.block.rationale ?? next.rationale
    if (annotation.block.cited_entries && annotation.block.cited_entries.length > 0) {
      next.cited_entries = annotation.block.cited_entries
    }
  }
  return next
}

// ─── Public entry point ────────────────────────────────────────────────────
export interface AnnotateOptions {
  signal?: AbortSignal
  /**
   * Cap on KB entries fetched into the prompt. Default 30 — enough to
   * cover goal + injury + warmup + a handful of myths without blowing the
   * context budget.
   */
  kbCap?: number
  /**
   * Test hook — inject a pre-built RetrievalResult to bypass the glob. Used
   * by the nuance-layer tests so they don't depend on the live KB.
   */
  retrievalOverride?: RetrievalResult
}

/**
 * Annotate a deterministic plan with KB-grounded coaching rationale.
 *
 * Failure modes (all → return plan unchanged, log to console):
 *   - Supabase not configured (offline-only build).
 *   - Edge function unreachable / 5xx.
 *   - Edge function returns a shape that fails AnnotationResponseSchema.
 *   - Annotation produces a Mesocycle that fails MesocycleSchema (paranoid
 *     re-validation — the grafter could theoretically produce something
 *     invalid if the LLM stuffs a rationale longer than the schema cap).
 */
export async function annotateWithNuance(
  plan: Mesocycle,
  profile: UserProgramProfile,
  history: SessionCheckin[],
  options: AnnotateOptions = {},
): Promise<Mesocycle> {
  // ── Feature flag ──
  // The LLM nuance layer is opt-out via env so a local dev or CI run with
  // no Supabase key doesn't try to reach the edge. Default ON when the
  // flag is unset.
  const flag = (import.meta.env as Record<string, string | undefined>)
    .VITE_ENABLE_NUANCE_LAYER
  if (flag === 'false') {
    return plan
  }

  if (!isSupabaseConfigured) {
    // Quiet bail — the offline-mode warning already fires from supabase.ts.
    return plan
  }

  try {
    const retrieval =
      options.retrievalOverride ??
      retrieveRelevantEntries(profile, plan, { cap: options.kbCap ?? 30 })

    if (retrieval.entries.length === 0) {
      // Nothing to cite — skip the LLM call entirely. The plan flows through
      // unchanged so the UI uses the engine's rationale.
      return plan
    }

    const context = buildAnnotationContext(plan, profile, history, retrieval)

    const response = await callEdge(
      'annotate_plan',
      {
        // Trim recent checkins to the most-recent 12; older history isn't
        // useful for replan-aware rationale, and the prompt budget matters.
        ...context,
        recentCheckins: history.slice(-12),
      },
      AnnotationResponseSchema,
    )

    const annotated = graftAnnotations(plan, response)

    // Belt-and-suspenders: re-validate the result. If grafting produced
    // anything invalid (LLM stuffed a too-long rationale, schema drift), we
    // log and return the ORIGINAL plan so the UI never renders something
    // that won't round-trip through Dexie.
    const recheck = MesocycleSchema.safeParse(annotated)
    if (!recheck.success) {
      console.warn(
        'nuanceLayer: grafted plan failed re-validation, returning unannotated plan',
        { errors: recheck.error.message },
      )
      return plan
    }
    return recheck.data
  } catch (err) {
    // Wide catch on purpose — the nuance layer must NEVER take down the
    // engine path. The console message is enough to debug from devtools.
    console.warn('nuanceLayer: annotation failed, returning unannotated plan', {
      error: err instanceof Error ? err.message : String(err),
    })
    return plan
  }
}
