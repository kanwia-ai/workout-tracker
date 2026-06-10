# Senior Audit & Revamp Plan — 2026-06-09

20-agent comprehensive audit (data flow, KB wiring, engine quality, failure modes, onboarding UX, backend blast radius). All headline findings adversarially verified against the working tree. Full raw output preserved at the time of audit; this doc is the distilled, actionable version.

## Why the app "will not work" — four root causes

1. **The Supabase project is deleted (NXDOMAIN).** `erloankcalivhfqdweyv.supabase.co` no longer resolves. Production builds are 100% unusable — auth is mandatory in prod (`useAuth.ts:21-23`) and every sign-in method hits the dead host. The deployed URL / phone PWA is a brick: "couldn't reach the server."
2. **Even in dev mode, workout data is being silently dropped.** `persistence.ts` writes session logs, set logs, PRs, last-weights, and cardio logs to Supabase ONLY — no Dexie fallback (`persistence.ts:35-38,65,78,92-105,170`). Every completed workout since the backend died went nowhere.
3. **End-of-block dead end.** A 6-week block expires and the app sits on "Week 6 of 6" forever (`HomeScreen.tsx:165-172` clamps). No auto-rollover exists; `runGeneration` only fires from onboarding, error-retry, Settings-Regenerate, and PlanMissingCard (`App.tsx:320,399,516,582`). The one adaptive path — Settings → "Re-plan next block" — calls the `replan_mesocycle` edge op on the dead project with no local fallback (`replan.ts:147`), and is additionally gated behind 18 check-ins.
4. **The "1-second template plan" feeling is real: the intelligence layer never ran.** `annotateWithNuance` → `callEdge('annotate_plan')` → dead host → wide catch swallows it (`nuanceLayer.ts:283-290`). Worse: `supabase/functions/generate/index.ts:51-56` marks `annotate_plan` as "NOT LIVE YET" — **the op was never deployed, so the KB/LLM layer has plausibly never produced user-visible output, ever.**

Additional confirmed data-loss bug: profiles saved Apr 18–May 24 with the "High-rep cardio" dislike fail Zod parse today (`high_rep_cardio` renamed to `cardio_machines` in 51ff614 with no data migration; `migrateLegacyProfile` only remaps `aesthetic_preference`). Symptom: silently dumped back into onboarding as if a new user.

## Onboarding answers: what's actually used (verified)

| Field | Verdict | Evidence |
|---|---|---|
| sessions_per_week | ✅ fully used | drives split template (`interpretProfile.ts:184-228`) |
| preferred_days | ✅ fully used | sessions genuinely anchored to chosen weekdays (`buildMesocycle.ts:794-847`) |
| active_minutes | ✅ fully used | caps accessory volume via time budget (`buildMesocycle.ts:687-719`) |
| injuries (+severity, +note) | ✅ fully used | protocol bans, rehab stages, priority accessories |
| weight | ✅ used | starting-weight suggestions |
| primary goal (first pick) | ✅ used | rep ranges, cardio policy, block length |
| **secondary goal (2nd pick)** | ❌ dead | never read by `interpretProfile`/`buildMesocycle` — UI promise false |
| **muscle_priority** | ❌ dead | zero consumers in live planner — Glutes+Hams = byte-identical plan to Balanced |
| **exercise_dislikes** | ❌ dead | "Avoid" promise not honored; overhead press still appears for overhead-press-haters |
| **equipment** | ⚠️ broken promise | ignored by initial generation (bands-only user gets barbell plan); only swaps respect it |
| **age, sex** | ❌ dead | required inputs, zero live consumers |
| height | ❌ dead | |
| posture_notes | ⚠️ mostly dead | 3 regexes fire but their priority_work IDs don't resolve in the variant pool |
| training_age_months | ⚠️ partial | loads/progression yes; exercise selection no |

Also: the "Balanced" display seen in testing is the always-visible "skip for now" button silently wiping picks (`OnboardingFlow.tsx:232` + `StepChrome.tsx:81-95`) — not a state bug on the Next path.

## The research "bones" verdict

- **KB: fully wired, 0% live.** All 106 entries bundle into the app via `import.meta.glob` (loader works, all parse), retrieval + prompt + grafting + Zod validation + the UI card all exist and are tested — but the sole output channel is the never-deployed dead edge op. ~976KB of markdown ships in the bundle for zero user benefit.
- **Retrieval is myth-flooded.** Flat +2 myth bonus (`retrieval.ts:255`) + global top-30 cut = ~20 myths, 7 injuries, 3-4 exercises, and ZERO programming-fundamentals/progression/warmup/special-population entries for Kyra's profile. ~60% of the KB can never reach the prompt.
- **Injury-token drift:** `squat-variants-knee-friendly.md` (the single most Kyra-relevant entry) uses tokens `knee/meniscus/patellofemoral` which never match the `left_meniscus`-style enum — permanently unreachable.
- **The deterministic engine hard-codes good research** (rest times per Pelland 2025, deload 50% per Bell 2023, compound-first, no-ping-pong, double progression, staged meniscus protocol) — but bypasses the KB entirely, and **MEV/MAV/MRV volume landmarks are implemented nowhere** (fixed 4/3/3 sets + time filler).
- `cited_entries` is plumbed end-to-end but rendered nowhere.

## Engine quality — the one plan a coach would never write

The architecture (pure-TS deterministic planner, offline, tested) is genuinely good. But executing the real planner against **Kyra's exact profile** produces:

- **CRITICAL: rehab squat variants leak into every session type.** `allowed_main_variants` injected as `preferred_variants` for all 4 days → Heel-Elevated Goblet Squat as the main lift Mon AND Tue AND Thu AND Fri. 16+ weekly sets of squat pattern on a healing knee, back-to-back squat days, **zero chest work all block**, zero hinge work for a chronic-LBP desk worker.
- **CRITICAL: rehab never advances between blocks** — block 2 restarts meniscus rehab at stage 1 forever (replan is dead; regenerate is stateless).
- Broken dedupe: Barbell Hip Thrust programmed twice in one session (corrupts autoProgress history).
- Local swap is injury-blind: offers Back Squat to a week-1 meniscus user.
- Chronic-LBP priority work (McGill big 3, glute-med isolation) is a silent no-op — IDs don't resolve to any variant.
- Survived 1068 passing tests because the 577-line integration simulation soft-asserts (`expect(true).toBe(true)`) and upper-day tests only use injury-free profiles.
- What works: autoProgress double-progression (offline, sound), deloads, day spacing for uninjured profiles, fuzz-verified robustness (5,880 profile combos, zero generation crashes — see `src/lib/planner/__generationFuzz.test.ts`).

## Onboarding UX verdict

Not dumb — "a coherent, accessible, personality-forward wizard… but fundamentally an extraction form wearing a mascot costume." Top 5 improvements (ranked):
1. Confirm screen: dead read-back table → plan-sell ("here's your split and why") + tappable rows to edit + fix raw enum leak (`left_meniscus`).
2. Live "this answer changes your plan" feedback (tapping 4 days → "Upper/Lower split" preview — the mapping is already deterministic); merge Sessions+Days.
3. Make Lumo react to answers; wire the two shipped-but-dead delight features (`onboardingFootprintTap`, `onboardingSkipOk`).
4. Fix injuries pre-filled-row submit trap (Next submits "Left meniscus / Modify" even for healthy users).
5. Fix on-screen copy contradictions ("pick one" vs pick-2 UI; confirm bubble references removed back button).

## Revamp plan

### Phase 0 — Triage (stop the bleeding)
- Root ErrorBoundary (no more latent white-screen; `?reset=1` shouldn't be the only escape).
- `migrateLegacyProfile`: remap `high_rep_cardio→cardio_machines`, drop unknown dislikes pre-parse; April-era profile fixture regression test.
- Un-gate generation-error UI from `!hasProfile` (existing users currently never see generation errors).
- End-of-block CTA: "Start your next block" card when block is finished.
- Fix stale `generatePlan.test.ts:164` (specific_target) + commit the in-flight removal.

### Phase 1 — Honor every answer (the trust fix)
- Wire `muscle_priority` (volume bias), `exercise_dislikes` (hard filter), `equipment` (pool filter), secondary goal (emphasis), into the live planner.
- Fix rehab-variant leak (gate `preferred_variants` by session focus) + dedupe key.
- Per-muscle weekly set accounting (MEV/MAV/MRV) — implement the engine's own research mandate.
- Injury-aware swaps; resolve chronic-injury priority_work IDs; rehab stage progression across blocks (local).
- Local replan fallback (check-in-driven directive adjustment without the edge).

### Phase 2 — Backend (per decision)
Either path MUST include: local-first persistence for sessions/PRs/weights (fixes silent data loss), health-gated edge calls (dead backend degrades, never breaks), honest status banner.
- If reinstating Supabase: new project, `supabase/schema.sql` + `migrations/20260527000000_sync_layer.sql`, deploy `generate` fn WITH `annotate_plan`/`replan_mesocycle` actually enabled, `ANTHROPIC_API_KEY` secret, Google OAuth reconfig, new env in .env + Replit; data re-association for old-UUID Dexie rows.
- If local-first: rip auth gate, port persistence to Dexie, port the 4 LLM ops to direct client→Gemini (prompts already exist; `gemini.ts:348+` pattern).

### Phase 3 — The dream experience
- Generation that feels real: checkpoint-based progress with Lumo narration (per `feedback_loading_ux`), nuance layer visible and retryable, never silently skipped.
- "Because you said X → Y" education on the confirm screen and per-exercise (render `cited_entries` as "why this?" chips — the plumbing exists).
- KB retrieval fixes: domain-stratified cap, injury-token normalizer, drop flat myth bonus.
- Onboarding UX top-5 (above) + user-education layer (KB-powered explainers).
- Reactive Lumo + wire dead delight features.

### Phase 4 — Verification & ship
- Fix soft-asserting integration test; injury-profile test matrix; stored-data compat fixtures (April-era profile + mesocycle JSON).
- Keep `__generationFuzz.test.ts` as a permanent regression suite.
- Deploy to Replit, install on iPhone, full UAT.
