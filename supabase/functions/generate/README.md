# generate edge function

Routes LLM calls through a server-side proxy. Dispatches by `op` field in the request body.

## Dev
```
supabase functions serve generate --env-file supabase/functions/.env --no-verify-jwt
```

## Deploy
```
supabase functions deploy generate
```

Required secret: `ANTHROPIC_API_KEY` (set in Supabase Dashboard -> Project Settings -> Functions). The function calls Claude Opus 4.7 via the Messages API with tool_use-forced structured output. Image-based ops (`extract_exercises`) use the same key — Claude vision accepts base64 images inline on the Messages API. `VITE_GEMINI_API_KEY` is no longer consumed by any client path.

## Smoke test after deploy

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/generate \
  -H 'content-type: application/json' \
  -H "authorization: Bearer <anon-key>" \
  -d '{"op":"ping"}'
```
Expected: JSON object with `message` and `now` fields.

## Smoke test `generate_plan`

Minimal body — the `exercisePool` must be a real array of library entries for
the plan to be useful; this 3-entry example is only enough to exercise the
transport. Expect 30-90s latency for Claude Opus 4.7 on a full 6-week plan.

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/generate \
  -H 'content-type: application/json' \
  -H "authorization: Bearer <anon-key>" \
  -d '{
    "op": "generate_plan",
    "payload": {
      "weeks": 6,
      "profile": {
        "goal": "glutes",
        "sessions_per_week": 4,
        "training_age_months": 18,
        "equipment": ["full_gym"],
        "injuries": [{ "part": "left_meniscus", "severity": "modify" }],
        "time_budget_min": 60,
        "sex": "female",
        "posture_notes": "desk worker, tight hip flexors"
      },
      "exercisePool": [
        { "id": "fedb:hip-thrust",   "name": "Barbell Hip Thrust",  "primaryMuscles": ["glutes"],     "equipment": "barbell" },
        { "id": "fedb:rdl",          "name": "Romanian Deadlift",   "primaryMuscles": ["hamstrings"], "equipment": "barbell" },
        { "id": "fedb:step-up",      "name": "Dumbbell Step-Up",    "primaryMuscles": ["quads"],      "equipment": "dumbbell" }
      ]
    }
  }'
```

Expected: JSON matching the `MesocycleSchema` (minus `user_id`, `generated_at`,
and `profile_snapshot`, which the client fills in).

Error responses:
- `400` if `profile` / `exercisePool` are missing or malformed, or if the pool
  JSON exceeds the server-side size cap.
- `502` if Claude returns no tool_use block (e.g., max_tokens hit) or the call throws (including 429/529 rate-limits, surfaced with a friendly "Claude is busy" message).

## Smoke test `swap_exercise`

Mid-workout substitution. Server validates that the replacement's `library_id`
exists in the pool and is not in `completedExercisesInSession`.

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/generate \
  -H 'content-type: application/json' \
  -H "authorization: Bearer <anon-key>" \
  -d '{
    "op": "swap_exercise",
    "payload": {
      "reason": "machine_busy",
      "profile": {
        "goal": "glutes",
        "sessions_per_week": 4,
        "training_age_months": 18,
        "equipment": ["full_gym"],
        "injuries": [{ "part": "left_meniscus", "severity": "modify" }],
        "time_budget_min": 60,
        "sex": "female",
        "posture_notes": "desk worker, tight hip flexors"
      },
      "currentExercise": {
        "library_id": "fedb:hip-thrust",
        "name": "Barbell Hip Thrust",
        "sets": 4,
        "reps": "8-12",
        "rir": 2,
        "rest_seconds": 120,
        "role": "main lift"
      },
      "sessionFocus": ["glutes", "hamstrings"],
      "completedExercisesInSession": ["Romanian Deadlift"],
      "exercisePool": [
        { "id": "fedb:hip-thrust",    "name": "Barbell Hip Thrust",    "primaryMuscles": ["glutes"],     "equipment": "barbell" },
        { "id": "fedb:rdl",           "name": "Romanian Deadlift",     "primaryMuscles": ["hamstrings"], "equipment": "barbell" },
        { "id": "fedb:glute-bridge",  "name": "Dumbbell Glute Bridge", "primaryMuscles": ["glutes"],     "equipment": "dumbbell" },
        { "id": "fedb:step-up",       "name": "Dumbbell Step-Up",      "primaryMuscles": ["quads"],      "equipment": "dumbbell" },
        { "id": "fedb:kas-glute-bridge", "name": "Kas Glute Bridge",   "primaryMuscles": ["glutes"],     "equipment": "barbell" }
      ]
    }
  }'
```

Expected: JSON with `replacement` (a full PlannedExercise) and `reason` (one
sentence). The `library_id` is guaranteed to be in the pool and not in
`completedExercisesInSession`.

Error responses:
- `400` if any of `profile`, `currentExercise`, `sessionFocus`,
  `completedExercisesInSession`, `exercisePool`, or `reason` are missing /
  wrong shape, or if the pool JSON exceeds the server-side size cap.
- `502` if Claude returns no tool_use block, hallucinates a `library_id` not in the pool,
  or returns an exercise already completed in this session.

## Smoke test `generate_routine`

Default-generates warmup / cooldown / cardio content for a single session. The
`kind` field selects the rule set (warmup = dynamic mobility + activation,
cooldown = light cardio + static stretching, cardio = zone-2 or short
intervals). `minutes` must be 3-60. `sessionFocus` is the same MuscleGroup
string array used in the main plan. `focusTag` is optional (e.g., "mobility",
"activation", "zone-2").

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/generate \
  -H 'content-type: application/json' \
  -H "authorization: Bearer <anon-key>" \
  -d '{
    "op": "generate_routine",
    "payload": {
      "kind": "warmup",
      "minutes": 10,
      "sessionFocus": ["glutes", "hamstrings"],
      "focusTag": "activation",
      "profile": {
        "goal": "glutes",
        "sessions_per_week": 4,
        "training_age_months": 18,
        "equipment": ["full_gym"],
        "injuries": [{ "part": "left_meniscus", "severity": "modify" }],
        "time_budget_min": 60,
        "sex": "female",
        "posture_notes": "desk worker, tight hip flexors"
      }
    }
  }'
```

Expected: JSON with `title` (4-6 words) and `exercises` (2-12 entries, each
with `name` plus either `duration_seconds` or `reps`, and optional `notes`).

Error responses:
- `400` if `profile`, `sessionFocus`, `kind`, or `minutes` are missing / wrong
  shape, if `kind` is not one of `warmup|cooldown|cardio`, or if `minutes` is
  outside `[3, 60]`.
- `502` if Claude returns no tool_use block or the call throws.

## Smoke test `extract_exercises`

Image → structured exercise list via Claude vision. Payload is a single
base64-encoded image (strip the `data:image/...;base64,` prefix on the client)
plus its MIME type; optional `hint` is a free-text nudge for ambiguous photos.

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/generate \
  -H 'content-type: application/json' \
  -H "authorization: Bearer <anon-key>" \
  -d '{
    "op": "extract_exercises",
    "payload": {
      "mime_type": "image/jpeg",
      "image_b64": "<base64 of a workout-board photo>",
      "hint": "hand-written glute day"
    }
  }'
```

Expected: JSON of shape `{ "exercises": [{ "name": "...", "sets"?, "reps"?, "weight"?, "rest_seconds"?, "notes"? }, ...] }`. Only `name` is required per exercise — the prompt tells Claude to omit any field it cannot see in the image.

Error responses:
- `400` if `image_b64` is missing, empty, or longer than 14,000,000 chars
  (≈ 10 MB raw); if `mime_type` is not one of `image/jpeg`, `image/png`,
  `image/webp`; or if `hint` is provided but is not a string.
- `502` if Claude returns no tool_use block or the call throws.
