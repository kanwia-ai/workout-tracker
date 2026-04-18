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

Required secret: `GEMINI_API_KEY` (set in Supabase Dashboard -> Project Settings -> Functions).

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
transport. Expect ~5-10s latency for Gemini 2.5 Flash.

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
- `502` if Gemini returns an empty/blocked response or the call throws.
