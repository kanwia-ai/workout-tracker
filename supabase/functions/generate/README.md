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
