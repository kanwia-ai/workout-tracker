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

// Enrich-exercise response — input/output shape for the `enrich_exercise` op
// (YouTube → Gemini → Claude handoff). Client-side Zod mirror lives at
// src/lib/enrichExercise.ts. Protocol-id enum mirrors src/types/directives.ts
// ProtocolIdSchema.
//
// NOT DEPLOYED YET (as of 2026-04-22): the op is code-only until Kyra ships
// a new edge-function version.
const PROTOCOL_ID_ENUM = [
  'lower_back',
  'meniscus',
  'shoulder',
  'knee_pfp',
  'hip_flexors',
  'upper_back',
  'trap',
  'elbow',
  'wrist',
  'ankle',
  'neck',
] as const

export const enrichExerciseSchema = {
  type: 'object',
  properties: {
    compatible_protocols: {
      type: 'array',
      items: { type: 'string', enum: PROTOCOL_ID_ENUM },
    },
    contraindicated_protocols: {
      type: 'array',
      items: { type: 'string', enum: PROTOCOL_ID_ENUM },
    },
    progression: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        why: { type: 'string', maxLength: 160 },
      },
      required: ['name', 'why'],
      propertyOrdering: ['name', 'why'],
    },
    regression: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        why: { type: 'string', maxLength: 160 },
      },
      required: ['name', 'why'],
      propertyOrdering: ['name', 'why'],
    },
    rationale: { type: 'string', maxLength: 240 },
  },
  required: ['compatible_protocols', 'contraindicated_protocols', 'progression', 'regression', 'rationale'],
  propertyOrdering: ['compatible_protocols', 'contraindicated_protocols', 'progression', 'regression', 'rationale'],
} as const

// ─── Replan-mesocycle response (end-of-block adaptive re-plan) ────────────
// The `replan_mesocycle` op produces an adjusted ProgrammingDirectives for
// the NEXT 6-week block given the completed block + per-session check-ins.
// Client-side Zod (ProgrammingDirectivesSchema in src/types/directives.ts)
// mirrors the directives half of this shape exactly — update both together.
//
// NOT DEPLOYED YET (as of 2026-04-22): the op is code-only until Kyra ships
// a new edge-function version. Local dev can preview via
// `supabase functions serve generate`.
const SESSION_TYPE_ENUM = [
  'lower_squat_focus',
  'lower_hinge_focus',
  'upper_push',
  'upper_pull',
  'full_body_a',
  'full_body_b',
  'conditioning',
  'rehab_mobility',
] as const

const SEVERITY_DIRECTIVE_ENUM = ['acute', 'rehab', 'chronic', 'modify', 'ok'] as const

const repRangeTupleSchema = {
  type: 'array',
  items: { type: 'integer', minimum: 1, maximum: 50 },
  minItems: 2,
  maxItems: 2,
} as const

const repSchemeBiasSchemaMirror = {
  type: 'object',
  properties: {
    main_compounds: repRangeTupleSchema,
    accessories: repRangeTupleSchema,
    finishers: repRangeTupleSchema,
  },
  required: ['main_compounds', 'accessories', 'finishers'],
  propertyOrdering: ['main_compounds', 'accessories', 'finishers'],
} as const

const goalDirectivesSchemaMirror = {
  type: 'object',
  properties: {
    aesthetic: { type: 'string', enum: ['athletic', 'hypertrophy', 'endurance', 'general'] },
    primary_adaptation: {
      type: 'string',
      enum: ['strength_power', 'size', 'work_capacity', 'mixed'],
    },
    rep_scheme_bias: repSchemeBiasSchemaMirror,
    intensity_bias: { type: 'string' },
    cardio_policy: {
      type: 'string',
      enum: ['minimal', 'separated', 'integrated', 'aggressive'],
    },
  },
  required: ['aesthetic', 'primary_adaptation', 'rep_scheme_bias', 'intensity_bias', 'cardio_policy'],
  propertyOrdering: ['aesthetic', 'primary_adaptation', 'rep_scheme_bias', 'intensity_bias', 'cardio_policy'],
} as const

const weekShapeSchemaMirror = {
  type: 'object',
  properties: {
    sessions_per_week: { type: 'integer', minimum: 1, maximum: 7 },
    template: {
      type: 'array',
      items: { type: 'string', enum: SESSION_TYPE_ENUM },
      minItems: 1,
    },
    session_spacing: { type: 'string', enum: ['alternating', 'ppl', 'upper_lower', 'custom'] },
    cardio_days: {
      type: 'array',
      items: { type: 'string', enum: ['standalone', 'post_upper', 'rest_day', 'none'] },
    },
  },
  required: ['sessions_per_week', 'template', 'session_spacing', 'cardio_days'],
  propertyOrdering: ['sessions_per_week', 'template', 'session_spacing', 'cardio_days'],
} as const

const sessionDirectiveSchemaMirror = {
  type: 'object',
  properties: {
    priority_work: { type: 'array', items: { type: 'string' } },
    modifications: { type: 'array', items: { type: 'string' } },
    warmup_focus: { type: 'array', items: { type: 'string' } },
    pair_with: { type: 'array', items: { type: 'string' } },
    avoid_on_this_session: { type: 'array', items: { type: 'string' } },
  },
  required: ['priority_work', 'modifications', 'warmup_focus', 'pair_with', 'avoid_on_this_session'],
  propertyOrdering: ['priority_work', 'modifications', 'warmup_focus', 'pair_with', 'avoid_on_this_session'],
} as const

const progressionStageSchemaMirror = {
  type: 'object',
  properties: {
    week_range: {
      type: 'array',
      items: { type: 'integer', minimum: 0, maximum: 52 },
      minItems: 2,
      maxItems: 2,
    },
    allowed_variants: { type: 'array', items: { type: 'string' } },
    target_at_end: { type: 'string' },
    rep_scheme_override: {
      type: ['array', 'null'],
      items: { type: 'integer', minimum: 1, maximum: 50 },
      minItems: 2,
      maxItems: 2,
    },
  },
  required: ['week_range', 'allowed_variants', 'target_at_end', 'rep_scheme_override'],
  propertyOrdering: ['week_range', 'allowed_variants', 'target_at_end', 'rep_scheme_override'],
} as const

const injuryDirectiveSchemaMirror = {
  type: 'object',
  properties: {
    source: { type: 'string' },
    matched_protocol: {
      type: ['string', 'null'],
      enum: [...PROTOCOL_ID_ENUM, null],
    },
    severity: { type: 'string', enum: SEVERITY_DIRECTIVE_ENUM },
    stage_weeks: { type: 'integer', minimum: 0 },
    unilateral_side: { type: ['string', 'null'], enum: ['left', 'right', null] },
    rationale: { type: 'string' },
    global_avoid: { type: 'array', items: { type: 'string' } },
    per_session_type: {
      type: 'object',
      // Partial record keyed by SessionType — each key optional, value is SessionDirective.
      properties: Object.fromEntries(
        SESSION_TYPE_ENUM.map((t) => [t, sessionDirectiveSchemaMirror]),
      ),
    },
    progression_arc: {
      type: 'array',
      items: progressionStageSchemaMirror,
    },
    recovery_target: { type: 'string' },
  },
  required: [
    'source',
    'matched_protocol',
    'severity',
    'stage_weeks',
    'unilateral_side',
    'rationale',
    'global_avoid',
    'per_session_type',
    'progression_arc',
    'recovery_target',
  ],
  propertyOrdering: [
    'source',
    'matched_protocol',
    'severity',
    'stage_weeks',
    'unilateral_side',
    'rationale',
    'global_avoid',
    'per_session_type',
    'progression_arc',
    'recovery_target',
  ],
} as const

const rootCauseFlagSchemaMirror = {
  type: 'object',
  properties: {
    observation: { type: 'string' },
    likely_cause: { type: 'string' },
    priority_work: { type: 'array', items: { type: 'string' } },
    avoid_under_load: { type: 'array', items: { type: 'string' } },
    do_not_ban: { type: 'array', items: { type: 'string' } },
    why_not_banned: { type: 'string' },
  },
  required: ['observation', 'likely_cause', 'priority_work', 'avoid_under_load', 'do_not_ban', 'why_not_banned'],
  propertyOrdering: ['observation', 'likely_cause', 'priority_work', 'avoid_under_load', 'do_not_ban', 'why_not_banned'],
} as const

const weeklyProgressionSchemaMirror = {
  type: 'object',
  properties: {
    wk1_2: { type: 'string' },
    wk3_4: { type: 'string' },
    wk5: { type: 'string' },
    wk6: { type: 'string' },
  },
  required: ['wk1_2', 'wk3_4', 'wk5', 'wk6'],
  propertyOrdering: ['wk1_2', 'wk3_4', 'wk5', 'wk6'],
} as const

const programmingDirectivesSchemaMirror = {
  type: 'object',
  properties: {
    goal: goalDirectivesSchemaMirror,
    week_shape: weekShapeSchemaMirror,
    injury_directives: { type: 'array', items: injuryDirectiveSchemaMirror },
    root_causes: { type: 'array', items: rootCauseFlagSchemaMirror },
    progression: weeklyProgressionSchemaMirror,
    target_lifting_minutes: { type: 'integer', minimum: 15, maximum: 180 },
    source: { type: 'string', enum: ['rules', 'llm', 'hybrid'] },
    unhandled_inputs: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'goal',
    'week_shape',
    'injury_directives',
    'root_causes',
    'progression',
    'target_lifting_minutes',
    'source',
    'unhandled_inputs',
  ],
  propertyOrdering: [
    'goal',
    'week_shape',
    'injury_directives',
    'root_causes',
    'progression',
    'target_lifting_minutes',
    'source',
    'unhandled_inputs',
  ],
} as const

export const replanMesocycleSchema = {
  type: 'object',
  properties: {
    directives: programmingDirectivesSchemaMirror,
    rationale_for_user: {
      type: 'string',
      maxLength: 600,
    },
    adjustments_summary: {
      type: 'array',
      items: { type: 'string', maxLength: 240 },
      minItems: 1,
      maxItems: 12,
    },
  },
  required: ['directives', 'rationale_for_user', 'adjustments_summary'],
  propertyOrdering: ['directives', 'rationale_for_user', 'adjustments_summary'],
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
