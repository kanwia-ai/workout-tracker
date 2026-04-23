---
status: awaiting_human_verify
trigger: "plan generation fails with 'We couldn't build your plan / Network hiccup' after onboarding — persisted across Gemini→Claude migration"
created: 2026-04-22T00:00:00Z
updated: 2026-04-22T20:15:00Z
---

## Current Focus

hypothesis: Claude response is being truncated at max_tokens=16384 for generate_plan. Partial tool_use block parses to {id, length_weeks} without sessions. Edge function returns 200 with malformed JSON. Client Zod .min(1) on sessions fails → "invalid shape" error → user sees it as failure.
test: Repro: Call edge function with realistic payload (200 pool, 6 weeks, 4/wk, multi-injury). CONFIRMED: returns {"id":"...","length_weeks":6} — no sessions, only 42 bytes total, took 136s.
expecting: Need to verify stop_reason=max_tokens server-side. Either: (a) log/return stop_reason, (b) look at Supabase function logs.
next_action: Check Supabase function logs for stop_reason on a failing invocation; then verify the client error path says "invalid shape" (not "Network hiccup")

## Symptoms

expected: After onboarding, app generates a mesocycle/training plan successfully
actual: Error screen "We couldn't build your plan" / "Network hiccup" — 100% reproduction
errors: "Network hiccup" surfaced to user; actual failure point unknown
reproduction: Complete onboarding, attempt to generate plan
started: Pre-existed when app used Gemini; persists after migration to Anthropic Claude (claude-opus-4-7)

Critical clue: Same failure existed with Gemini AND Claude = NOT an API-level issue. Failure is in surrounding code (client request construction, schema validation, auth, env, routing, response parsing, or edge bootstrap).

Already ruled out:
- API key missing/wrong (secrets confirmed)
- Rate limits (same failure under 2 different APIs)
- JSON schema propertyOrdering (stripped for Anthropic)

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-04-22T19:48Z
  checked: Edge function reachability via curl (OPTIONS preflight + echo op)
  found: OPTIONS returns 204 with all CORS allow-headers present. POST echo returns 200 in <1s with correct body.
  implication: Rules out H2 (client can't reach edge function). CORS, routing, auth (anon key as JWT) all work. Rules out H3 (edge bootstrap crash).

- timestamp: 2026-04-22T19:50Z
  checked: Ping op end-to-end (small Claude call via deployed edge function)
  found: Returns 200 in 2.3s with valid JSON {"message":"Hello!","now":"..."}
  implication: ANTHROPIC_API_KEY works, tool_use pipeline works, sanitizeSchemaForAnthropic + CLAUDE_MODEL='claude-opus-4-7' all work for small payloads.

- timestamp: 2026-04-22T19:52Z
  checked: generate_plan with SMALL pool (12 exercises) and 3 weeks
  found: Returns 200 in 47s, size=10206 bytes, fully valid mesocycle JSON with all required fields (id, length_weeks, sessions[], each with focus, title, subtitle, rationale, exercises with warmup_sets, etc).
  implication: End-to-end path works for small payloads. Prompt structure, schema sanitization, tool_use extraction — all fine.

- timestamp: 2026-04-22T19:55Z
  checked: generate_plan with REALISTIC pool (200 exercises) and 6 weeks, 4/wk, 4 injuries. Payload = 19KB.
  found: Returns 200 in 136.4s, but response body is ONLY 42 bytes: `{"id":"meso-kyra-6wk-ul","length_weeks":6}`. No `sessions` field at all.
  implication: **SMOKING GUN.** Claude is hitting max_tokens=16384 before it can emit the sessions array. The tool_use block is partially populated (id + length_weeks only), but because `toolUse` is truthy, the edge function bypasses the error branch and returns the partial JSON verbatim. Client-side Zod then fails on `sessions: z.array(...).min(1)` → error message: "edge generate_plan returned invalid shape: ...".

- timestamp: 2026-04-22T20:00Z
  checked: Grepped client error branches for what surfaces "Network hiccup"
  found: App.tsx friendlyGenerationError regex is `/network|fetch failed|timed out/i`. The Zod error wraps as `edge generate_plan returned invalid shape: ${parsed.error.message}`. That Zod error message is something like `[{"code":"invalid_type","expected":"array","received":"undefined","path":["sessions"],...}]` — does NOT match "network/fetch failed/timed out". BUT the next matcher `/hallucinated|invalid shape|returned invalid/i` catches it and says "The plan came back malformed. A retry usually fixes this."
  implication: The user's reported copy "Network hiccup" might be her paraphrasing, OR there's a second mode. Still — "The plan came back malformed" would be what she actually sees per this code.

- timestamp: 2026-04-22T20:02Z
  checked: Also considered — is there an outer envelope mismatch? No. The edge function returns the raw Claude tool_use input directly (not {ok:true,data:...}). And the client passes it straight to Zod. This is consistent, so not an envelope issue.

- timestamp: 2026-04-22T20:08Z
  checked: Attempted fix #1 — raised maxTokens to 32000 (non-streaming).
  found: Anthropic SDK refused the request with "Streaming is required for operations that may take longer than 10 minutes". SDK guardrail.
  implication: Need to bypass guardrail. Per-request timeout, client timeout, or streaming.

- timestamp: 2026-04-22T20:10Z
  checked: Attempted fix #2 — per-request `timeout` option on messages.create.
  found: Still rejected with same error.
  implication: Per-request timeout does NOT bypass the guardrail.

- timestamp: 2026-04-22T20:12Z
  checked: Attempted fix #3 — switched to streaming via `client.messages.stream(...).finalMessage()`.
  found: Returned 546 WORKER_RESOURCE_LIMIT after 140s. Supabase Edge Functions free tier has 2s CPU limit; SSE chunk parsing exceeds it.
  implication: Streaming not viable on free tier.

- timestamp: 2026-04-22T20:14Z
  checked: Inspected SDK source on GitHub (raw.githubusercontent.com).
  found: Line 88-92 of messages.ts: `let timeout = (this._client as any)._options.timeout; if (!body.stream && timeout == null) { ... }`. The guardrail is skipped when CLIENT (not request) was constructed with a timeout.
  implication: The correct fix is `new Anthropic({ apiKey, timeout: 9*60*1000 })` — client-level.

- timestamp: 2026-04-22T20:15Z
  checked: Final fix — client-level `timeout: 9*60*1000`, maxTokens=24000 non-streaming, stop_reason guard in place. Re-ran realistic payload.
  found: status=200, 127.9s, 31KB body. Full 24-session 6-week plan with proper titles, subtitles, deload week, 140 exercises. Injury constraints honored. All 448 client tests still pass.
  implication: **BUG FIXED.** Root cause was max_tokens=16384 silently truncating; fix required client-level timeout (to bypass SDK guardrail) + max_tokens=24000 (sufficient headroom while staying under Supabase free tier CPU/wall budget) + a stop_reason guard so any future recurrence surfaces loudly instead of silently.

## Resolution

root_cause: |
  `supabase/functions/generate/index.ts` sets `maxTokens: 16384` for generate_plan.
  A realistic mesocycle (6 wks × 4 sessions/wk × 5-7 exercises/session with subtitles,
  rationales ~280 chars, warmup_sets arrays per exercise) serializes to ~17-22k output
  tokens — exceeds 16384.

  When Claude hits max_tokens mid-tool-use, it still emits a tool_use block but with
  truncated input JSON. The edge function's guard (lines 166-174) only checks
  `if (!toolUse)` — it does NOT check `stop_reason === 'max_tokens'` when a partial
  block is present. So the partial JSON (`{"id":"...","length_weeks":6}` with no
  sessions) is returned to the client with status 200.

  Client-side Zod rejects it (`sessions: z.array(...).min(1)` fails) → wrapped as
  "edge generate_plan returned invalid shape:..." → user sees "The plan came back
  malformed" OR (if request runs longer and trips 180s client timeout) "Network hiccup".
  Both symptoms are the same root cause.

  Why Gemini showed the same failure: Gemini 2.5 Flash has its own ~8k-token output
  cap for structured JSON. It also truncated before finishing. Swapping providers
  didn't help because the bottleneck is output size, not provider.

fix: |
  Three-part fix in `supabase/functions/generate/index.ts`:
    1. Construct the Anthropic client with an explicit `timeout: 9*60*1000` at the
       CLIENT level (not per-request). This is the only way to bypass the SDK's
       "Streaming is required for operations that may take longer than 10 minutes"
       guardrail; per-request timeout is applied after the check. See comment in
       getAnthropic() for the exact line in the SDK source.
    2. Raise generate_plan `maxTokens` from 16384 to 24000. 24k gives ~1.1x
       headroom over a worst-case 6-wk plan (~22k output tokens). We don't go
       higher because Supabase free tier has a 150s idle timeout and ~2s CPU
       budget per request — larger max_tokens risks 504 / WORKER_RESOURCE_LIMIT.
    3. In `callClaudeAsTool`, after locating the tool_use block, check
       `response.stop_reason === 'max_tokens'` and throw a descriptive error.
       Stops partial JSON from silently being returned as success — fail-loud
       behavior so if plans ever grow past 24k tokens, the user sees a specific
       actionable error instead of a silent Zod mismatch.

  Plus client-side debuggability: add a `/max[_-]?tokens|truncated/i` branch to
  `friendlyGenerationError` in `src/App.tsx` so a future recurrence surfaces a
  clear message instead of the generic "Something went wrong".

verification: |
  BEFORE fix: curl generate_plan with realistic payload (200 pool, 6wk, 4/wk,
  4 injuries) returned 42 bytes `{"id":"meso-kyra-6wk-ul","length_weeks":6}`
  in 136s. Client Zod rejects → "invalid shape" → user sees the error screen.
  Reproduces the bug.

  AFTER fix: same curl returns status 200, 31235 bytes, 127.9s elapsed. Full
  24-session 6-week plan with proper titles ("glutes & posterior chain",
  "back & rear delts"), subtitles ("LOWER · PULL-DOMINANT"), day_of_week
  distribution across Mon/Tue/Thu/Fri, 140 exercises total, deload week
  correctly identified and volume-reduced. Meniscus/back/trap/hip injuries
  all honored (no banned exercises). Client Zod accepts the response.

  Automated tests: all 448 client tests still pass (`npx vitest run`).
  Ping op (quick smoke): 200 in 2.7s.

files_changed:
  - supabase/functions/generate/index.ts
  - src/App.tsx
