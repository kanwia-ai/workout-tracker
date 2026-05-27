// Types for the workout-tracker knowledge base. Mirrors the YAML frontmatter
// shape documented in `docs/knowledge-base/README.md` — every KB entry has a
// frontmatter block followed by a markdown body, and the nuance layer reads
// both at runtime to ground LLM rationale generation.
//
// IMPORTANT: keep these in sync with the README's entry schema. The loader
// validates parsed frontmatter against KBEntryFrontmatterSchema, so a typo or
// drift in field names surfaces as a parse failure rather than silent data
// loss.
import { z } from 'zod'

// ─── Confidence rating ──────────────────────────────────────────────────────
export const ConfidenceRating = z.enum(['high', 'medium', 'low'])
export type ConfidenceRating = z.infer<typeof ConfidenceRating>

// ─── Entry type ─────────────────────────────────────────────────────────────
// One of the six entry archetypes defined in the README:
//   principle | heuristic | citation | myth | pattern | exercise
export const KBEntryType = z.enum([
  'principle',
  'heuristic',
  'citation',
  'myth',
  'pattern',
  'exercise',
])
export type KBEntryType = z.infer<typeof KBEntryType>

// ─── Domain (must match a subfolder under docs/knowledge-base/domains/) ────
export const KBDomain = z.enum([
  'programming-fundamentals',
  'body-composition',
  'warmup-recovery',
  'progression',
  'injuries',
  'exercises',
  'myths',
  'special-populations',
])
export type KBDomain = z.infer<typeof KBDomain>

// ─── Training-age bucket ───────────────────────────────────────────────────
// 'any' is the wildcard; the others map to month ranges defined in the README
// (beginner ≤6mo / early 6-12mo / intermediate 12-36mo / advanced 36+mo).
// The KB currently uses these tokens; new ones must be added here AND in the
// retrieval matcher.
export const TrainingAgeBucket = z.enum([
  'any',
  'beginner',
  'early',
  'intermediate',
  'advanced',
])
export type TrainingAgeBucket = z.infer<typeof TrainingAgeBucket>

// ─── Applicability filter ──────────────────────────────────────────────────
// A loose match — every field is "scope" rather than "exact match", and
// retrieval treats empty/missing arrays as "applies to everyone."
//
// `goals`         — free-form strings; we match against PrimaryGoal values
//                   from src/types/profile.ts ('build_muscle', 'get_stronger',
//                   ...) AND a few legacy tokens that exist in the current KB
//                   ('get_strong', 'aesthetics', 'strength', 'glutes', etc.)
//                   so the loader doesn't blow up on real entries today.
// `training_age`  — either the single string 'any', a single bucket, or an
//                   array of buckets (the KB uses all three forms).
// `sex`           — single token, 'any' | 'female' | 'male'.
// `injuries`      — body-part strings; we match against profile.injuries[].part
//                   ('left_meniscus', 'lower_back', etc.).
export const ApplicabilityFilterSchema = z.object({
  goals: z.array(z.string()).default([]),
  training_age: z
    .union([z.string(), z.array(z.string())])
    .default('any'),
  sex: z.string().default('any'),
  injuries: z.array(z.string()).default([]),
})
export type ApplicabilityFilter = z.infer<typeof ApplicabilityFilterSchema>

// ─── Frontmatter ───────────────────────────────────────────────────────────
// Validated shape of the YAML block between `---` markers at the top of each
// KB markdown file. Optional fields default to empty arrays so retrieval
// always has a stable shape to read from.
export const KBEntryFrontmatterSchema = z.object({
  id: z.string().min(1),
  type: KBEntryType,
  domain: KBDomain,
  title: z.string().min(1),
  confidence: ConfidenceRating,
  // last_reviewed is a date string in the KB but we don't constrain format —
  // some entries use full ISO, some YYYY-MM-DD.
  last_reviewed: z.string().optional(),
  applicability: ApplicabilityFilterSchema,
  tags: z.array(z.string()).default([]),
  citations: z.array(z.string()).default([]),
  related: z.array(z.string()).default([]),
  contradicts: z.array(z.string()).default([]),
})
export type KBEntryFrontmatter = z.infer<typeof KBEntryFrontmatterSchema>

// ─── Loaded entry ──────────────────────────────────────────────────────────
// What the loader returns per file. `body` is the markdown content after the
// closing frontmatter `---`; the nuance layer uses targeted excerpts (Claim
// + Nuance sections) rather than dumping the whole body into the prompt.
//
// `filePath` is included for debugging only — when retrieval flags an entry
// as malformed, the path tells you where to look.
export interface KBEntry {
  frontmatter: KBEntryFrontmatter
  body: string
  filePath: string
}

// ─── Body section extractor result ─────────────────────────────────────────
// The nuance prompt includes the short "Claim" + "Nuance" sections of each
// retrieved entry verbatim. This helper structure is what the loader exposes
// per entry; full body stays available in `KBEntry.body` for callers that
// need it.
export interface KBEntrySections {
  claim: string | null
  nuance: string | null
  application: string | null
}
