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
const plannedExerciseSchema = {
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
  },
  required: ['library_id', 'name', 'sets', 'reps', 'rir', 'rest_seconds', 'role'],
  propertyOrdering: ['library_id', 'name', 'sets', 'reps', 'rir', 'rest_seconds', 'role', 'notes'],
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
    estimated_minutes: { type: 'integer', minimum: 10, maximum: 180 },
    exercises: {
      type: 'array',
      items: plannedExerciseSchema,
      minItems: 1,
    },
    status: { type: 'string', enum: SESSION_STATUS_ENUM },
    intended_date: { type: 'string' },
  },
  required: ['id', 'week_number', 'ordinal', 'focus', 'title', 'estimated_minutes', 'exercises', 'status'],
  propertyOrdering: ['id', 'week_number', 'ordinal', 'focus', 'title', 'estimated_minutes', 'exercises', 'status', 'intended_date'],
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
