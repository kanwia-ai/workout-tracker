// JSON Schemas for Gemini structured output. Keys must match the client-side
// Zod types in src/types/*.ts exactly. When those types change, update here.
//
// DRIFT PROTECTION: Gemini's responseSchema format overlaps with JSON Schema
// but is not identical, so we cannot import the client-side Zod schemas
// directly (and Deno cannot resolve `npm:zod` + the `src/` path alias for
// build-free edge deploys anyway). Instead, the enum string literals are
// duplicated verbatim below. If you change values in:
//   - src/types/plan.ts      (MuscleGroup, SessionStatus)
//   - src/types/profile.ts   (Goal, Equipment, Severity, BodyPart, Sex)
// ...update the matching arrays below. Both files carry a "DO NOT rename"
// header to remind future editors.
export const pingSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    now: { type: 'string' },
  },
  required: ['message', 'now'],
  propertyOrdering: ['message', 'now'],
} as const

// --- enum mirrors (keep in lockstep with src/types/plan.ts) ------------------
const MUSCLE_GROUP_ENUM = [
  'quads', 'hamstrings', 'glutes', 'calves',
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'core', 'full_body', 'rehab', 'mobility',
] as const

const SESSION_STATUS_ENUM = ['upcoming', 'in_progress', 'completed', 'skipped'] as const

// --- plan sub-schemas --------------------------------------------------------
// Warmup ramp set: percent of working weight + rep target. Optional on
// plannedExerciseSchema (compound main lifts → 3, accessories → 1, rehab → 0).
const warmupSetSchema = {
  type: 'object',
  properties: {
    percent: { type: 'integer', minimum: 0, maximum: 100 },
    reps: { type: 'integer', minimum: 1, maximum: 30 },
  },
  required: ['percent', 'reps'],
  propertyOrdering: ['percent', 'reps'],
} as const

export const plannedExerciseSchema = {
  type: 'object',
  properties: {
    library_id: { type: 'string' },
    name: { type: 'string' },
    sets: { type: 'integer', minimum: 1, maximum: 10 },
    reps: { type: 'string' },
    rir: { type: 'integer', minimum: 0, maximum: 5 },
    rest_seconds: { type: 'integer', minimum: 0, maximum: 600 },
    role: { type: 'string' },
    notes: { type: 'string' },
    warmup_sets: {
      type: 'array',
      items: warmupSetSchema,
      maxItems: 6,
    },
  },
  required: ['library_id', 'name', 'sets', 'reps', 'rir', 'rest_seconds', 'role', 'warmup_sets'],
  propertyOrdering: ['library_id', 'name', 'sets', 'reps', 'rir', 'rest_seconds', 'role', 'notes', 'warmup_sets'],
} as const

const plannedSessionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    week_number: { type: 'integer', minimum: 1 },
    ordinal: { type: 'integer', minimum: 1 },
    focus: {
      type: 'array',
      items: { type: 'string', enum: MUSCLE_GROUP_ENUM },
      minItems: 1,
    },
    title: { type: 'string' },
    subtitle: { type: 'string', maxLength: 60 },
    estimated_minutes: { type: 'integer', minimum: 10, maximum: 180 },
    exercises: {
      type: 'array',
      items: plannedExerciseSchema,
      minItems: 1,
    },
    day_of_week: { type: 'integer', minimum: 0, maximum: 6 },
    rationale: { type: 'string', maxLength: 280 },
    status: { type: 'string', enum: SESSION_STATUS_ENUM },
    intended_date: { type: 'string' },
  },
  required: ['id', 'week_number', 'ordinal', 'focus', 'title', 'subtitle', 'estimated_minutes', 'exercises', 'day_of_week', 'rationale', 'status'],
  propertyOrdering: ['id', 'week_number', 'ordinal', 'focus', 'subtitle', 'title', 'estimated_minutes', 'exercises', 'day_of_week', 'rationale', 'status', 'intended_date'],
} as const

// Mesocycle — the server fills in user_id, generated_at, and profile_snapshot
// after the model returns, so those fields are intentionally omitted from the
// schema we hand to Gemini.
export const mesocycleSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    length_weeks: { type: 'integer', minimum: 3, maximum: 12 },
    sessions: {
      type: 'array',
      items: plannedSessionSchema,
      minItems: 1,
    },
  },
  required: ['id', 'length_weeks', 'sessions'],
  propertyOrdering: ['id', 'length_weeks', 'sessions'],
} as const

// Swap response — one replacement exercise plus a short reason string so the
// UI can surface "why this sub works" to the user. Reuses plannedExerciseSchema
// so the replacement is shape-identical to any exercise the planner produced.
export const swapExerciseSchema = {
  type: 'object',
  properties: {
    replacement: plannedExerciseSchema,
    reason: { type: 'string' },
  },
  required: ['replacement', 'reason'],
  propertyOrdering: ['replacement', 'reason'],
} as const

// Extract-exercises response — structured output from Claude vision, parsing a
// photo of a workout board / planner / written list into a list of exercises.
// Client-side Zod (ExtractedExercisesSchema in src/lib/extract.ts) mirrors this
// shape exactly; update both when adding/removing fields.
//
// Notes:
// - `reps` is a string because gym notation is messy ("10", "8-10", "AMRAP",
//   "30 sec"). We keep the raw string and let the UI display it as-is.
// - `rest_seconds` is an integer count of seconds; the prompt converts "90s"
//   or "1:30" into a number before emitting.
// - All fields except `name` are optional — the prompt explicitly tells the
//   model not to invent values it can't see in the image.
export const extractExercisesSchema = {
  type: 'object',
  properties: {
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          sets: { type: 'integer', minimum: 1, maximum: 20 },
          reps: { type: 'string' },
          weight: { type: 'number', minimum: 0 },
          rest_seconds: { type: 'integer', minimum: 0, maximum: 1800 },
          notes: { type: 'string' },
        },
        required: ['name'],
        propertyOrdering: ['name', 'sets', 'reps', 'weight', 'rest_seconds', 'notes'],
      },
    },
  },
  required: ['exercises'],
  propertyOrdering: ['exercises'],
} as const

// Routine response — warmup / cooldown / cardio content attached to a main
// session. Each exercise carries EITHER duration_seconds (holds, cardio
// intervals) OR reps (movement drills, activation) — enforced by the prompt,
// not the schema (Gemini's JSON Schema subset doesn't support `anyOf` on
// mutually-exclusive fields). Client-side Zod can tighten this further.
export const routineSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    exercises: {
      type: 'array',
      minItems: 2,
      maxItems: 12,
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          duration_seconds: { type: 'integer', minimum: 10, maximum: 900 },
          reps: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['name'],
        propertyOrdering: ['name', 'duration_seconds', 'reps', 'notes'],
      },
    },
  },
  required: ['title', 'exercises'],
  propertyOrdering: ['title', 'exercises'],
} as const
