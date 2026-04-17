# Adaptive Engine MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hardcoded weekly schedule and templated protocols with an AI-generated 6-week training block driven by a user-entered body profile, plus in-workout exercise swaps — so the app adapts to each user and to skipped days.

**Architecture:** React PWA (existing) + Dexie/Supabase for persistence + a Supabase Edge Function that proxies Gemini 2.5 Flash with strict JSON Schema output. Profile and plan live in Dexie (offline-first) and sync to Supabase. The engine never generates on the browser client directly — all LLM calls go through the edge function to keep the API key server-side and to run server-side safety validation before returning.

**Tech Stack:**
- React 19 + Vite + TypeScript + Tailwind v4 (existing)
- Dexie 4 (IndexedDB) + Supabase (Postgres + Auth) (existing)
- Gemini 2.5 Flash via `@google/genai` SDK
- Supabase Edge Functions (Deno + TypeScript)
- Zod for runtime validation
- Vitest for tests

**Pre-work by Kyra (out-of-band, before Task 1):**
1. In Supabase Dashboard → Project Settings → Functions → add a secret named `GEMINI_API_KEY` with her existing Gemini key.
2. Install Supabase CLI locally (`brew install supabase/tap/supabase`) and run `supabase login`.
3. `supabase link --project-ref <ref>` in the workout-tracker repo.

**What this plan does NOT cover (follow-up plans):**
- Per-set weight/rep logging (weight per set, not just checked/unchecked)
- Gap-aware rebalance (user returns after 2 weeks → replan)
- "Can't make it to the gym today" equipment override that regenerates today's session
- Warmup/cooldown generate-on-tap (replacing persistent chips)
- Cycle tracking (explicitly dropped)

---

## Phase 0: Supabase Edge Function + Gemini proxy

### Task 0.1: Scaffold the edge function

**Files:**
- Create: `supabase/functions/generate/index.ts`
- Create: `supabase/functions/generate/deno.json`
- Modify: `supabase/config.toml` (add function registration)

**Step 1: Init the function**

Run: `supabase functions new generate`
Expected: creates `supabase/functions/generate/index.ts` stub.

**Step 2: Replace stub with a minimal handler that echoes a JSON body**

```ts
// supabase/functions/generate/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const body = await req.json()
  return new Response(JSON.stringify({ echo: body }), {
    headers: { 'content-type': 'application/json' },
  })
})
```

**Step 3: Test locally**

Run: `supabase functions serve generate --no-verify-jwt`
In another shell: `curl -X POST http://localhost:54321/functions/v1/generate -H 'content-type: application/json' -d '{"hello":"world"}'`
Expected: `{"echo":{"hello":"world"}}`

**Step 4: Commit**

```bash
git add supabase/functions/generate supabase/config.toml
git commit -m "feat(edge): scaffold generate edge function"
```

### Task 0.2: Wire Gemini 2.5 Flash with structured JSON output

**Files:**
- Modify: `supabase/functions/generate/index.ts`
- Create: `supabase/functions/generate/schemas.ts` (shared JSON schemas)

**Step 1: Define a trivial JSON schema and a unit-test-via-curl spec**

Write `supabase/functions/generate/schemas.ts`:
```ts
export const pingSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    now: { type: 'string' },
  },
  required: ['message', 'now'],
  propertyOrdering: ['message', 'now'],
}
```

**Step 2: Add Gemini call path gated by an `op` discriminator**

```ts
// index.ts
import { GoogleGenAI } from 'npm:@google/genai@^1'
import { pingSchema } from './schemas.ts'

const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY')! })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const body = await req.json() as { op: string; payload?: unknown }

  if (body.op === 'ping') {
    const r = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Say hello. Also return the current ISO timestamp you believe it is.',
      config: { responseMimeType: 'application/json', responseSchema: pingSchema },
    })
    return new Response(r.text, { headers: { 'content-type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'unknown op' }), { status: 400 })
})
```

**Step 3: Test**

Set the secret for local dev: `echo "GEMINI_API_KEY=..." > supabase/functions/.env`
Run: `supabase functions serve generate --env-file supabase/functions/.env --no-verify-jwt`
Curl: `curl -X POST http://localhost:54321/functions/v1/generate -H 'content-type: application/json' -d '{"op":"ping"}'`
Expected: JSON with `message` and `now` keys.

**Step 4: Deploy**

Run: `supabase functions deploy generate`
Expected: "Deployed Function generate" message.
Curl the deployed URL with your anon key in Authorization to repeat the ping test.

**Step 5: Commit**

```bash
git commit -am "feat(edge): call gemini 2.5 flash with structured output"
```

### Task 0.3: Client helper with Zod validation

**Files:**
- Create: `src/lib/generate.ts`
- Create: `src/lib/generate.test.ts`
- Modify: `package.json` (add `zod`)

**Step 1: Install zod**

Run: `npm install zod`

**Step 2: Write the failing test**

```ts
// src/lib/generate.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callEdge } from './generate'
import { z } from 'zod'

describe('callEdge', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('validates the response against the provided Zod schema', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'hi', now: '2026-04-17T00:00:00Z' }),
    })
    const schema = z.object({ message: z.string(), now: z.string() })
    const result = await callEdge('ping', {}, schema)
    expect(result).toEqual({ message: 'hi', now: '2026-04-17T00:00:00Z' })
  })

  it('rejects when the response fails schema validation', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({ message: 123 }) })
    const schema = z.object({ message: z.string() })
    await expect(callEdge('ping', {}, schema)).rejects.toThrow()
  })
})
```

**Step 3: Run test — verify it fails**

Run: `npx vitest run src/lib/generate.test.ts`
Expected: FAIL (module './generate' not found)

**Step 4: Implement**

```ts
// src/lib/generate.ts
import type { ZodSchema } from 'zod'
import { supabase } from './supabase'

export async function callEdge<T>(op: string, payload: unknown, schema: ZodSchema<T>): Promise<T> {
  const { data: session } = await supabase.auth.getSession()
  const token = session?.session?.access_token
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ op, payload }),
  })
  if (!r.ok) throw new Error(`edge ${op} failed: ${r.status}`)
  return schema.parse(await r.json())
}
```

**Step 5: Run — passing**

Run: `npx vitest run src/lib/generate.test.ts`
Expected: 2 pass.

**Step 6: Commit**

```bash
git add src/lib/generate.ts src/lib/generate.test.ts package.json package-lock.json
git commit -m "feat(client): generate edge helper with zod validation"
```

---

## Phase 1: Profile schema + onboarding

### Task 1.1: Types + Zod schema for the profile

**Files:**
- Create: `src/types/profile.ts`
- Create: `src/types/profile.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { UserProgramProfileSchema } from './profile'

describe('UserProgramProfileSchema', () => {
  it('accepts a well-formed profile', () => {
    const ok = UserProgramProfileSchema.safeParse({
      goal: 'glutes',
      sessions_per_week: 4,
      training_age_months: 18,
      equipment: ['full_gym'],
      injuries: [{ part: 'left_meniscus', severity: 'modify' }],
      time_budget_min: 60,
      sex: 'female',
      posture_notes: 'desk worker, tight hip flexors',
    })
    expect(ok.success).toBe(true)
  })
  it('rejects sessions_per_week outside 1-7', () => {
    const bad = UserProgramProfileSchema.safeParse({
      goal: 'glutes', sessions_per_week: 9, training_age_months: 0,
      equipment: [], injuries: [], time_budget_min: 45, sex: 'female', posture_notes: '',
    })
    expect(bad.success).toBe(false)
  })
})
```

**Step 2: Run — fail**

`npx vitest run src/types/profile.test.ts` → FAIL (no such module).

**Step 3: Implement**

```ts
// src/types/profile.ts
import { z } from 'zod'

export const Goal = z.enum(['glutes', 'strength', 'longevity', 'aesthetics', 'rehab', 'general_fitness'])
export const Equipment = z.enum(['full_gym', 'home_weights', 'bands_only', 'bodyweight_only', 'cable_machine', 'barbell'])
export const Severity = z.enum(['avoid', 'modify', 'ok'])
export const BodyPart = z.enum([
  'left_meniscus', 'right_meniscus', 'lower_back', 'hip_flexors',
  'left_shoulder', 'right_shoulder', 'left_trap', 'right_trap',
  'wrist', 'ankle', 'neck', 'elbow', 'other',
])
export const Sex = z.enum(['female', 'male', 'prefer_not_to_say'])

export const InjurySchema = z.object({
  part: BodyPart,
  severity: Severity,
  note: z.string().max(200).optional(),
})

export const UserProgramProfileSchema = z.object({
  goal: Goal,
  sessions_per_week: z.number().int().min(1).max(7),
  training_age_months: z.number().int().min(0).max(600),
  equipment: z.array(Equipment).min(1),
  injuries: z.array(InjurySchema),
  time_budget_min: z.number().int().min(15).max(180),
  sex: Sex,
  posture_notes: z.string().max(500),
})

export type UserProgramProfile = z.infer<typeof UserProgramProfileSchema>
```

**Step 4: Run — passing**

`npx vitest run src/types/profile.test.ts` → 2 pass.

**Step 5: Commit**

```bash
git commit -am "feat(types): UserProgramProfile schema"
```

### Task 1.2: Dexie table + Supabase migration for `user_program_profiles`

**Files:**
- Modify: `src/lib/db.ts`
- Create: `supabase/migrations/20260417_user_program_profiles.sql`

**Step 1: Dexie schema bump**

Add interface and store in `src/lib/db.ts`:
```ts
export interface LocalProfile {
  user_id: string   // PK
  profile_json: string  // JSON-stringified UserProgramProfile
  updated_at: string
  synced: boolean
}
// extend type
// ... exerciseLibrary, + userProgramProfiles: EntityTable<LocalProfile, 'user_id'>
db.version(3).stores({
  sessionLogs: 'id, user_id, workout_id, date, synced',
  setLogs: 'id, session_log_id, exercise_id, synced',
  cardioLogs: 'id, user_id, date, synced',
  personalRecords: 'id, user_id, exercise_id, synced',
  userWeights: 'id, user_id, exercise_id, date, synced',
  exerciseLibrary: 'id, name, category, equipment, level, *primaryMuscles, *secondaryMuscles',
  userProgramProfiles: 'user_id, updated_at, synced',
})
```

**Step 2: Supabase migration**

```sql
-- supabase/migrations/20260417_user_program_profiles.sql
create table if not exists user_program_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null,
  updated_at timestamptz not null default now()
);
alter table user_program_profiles enable row level security;
create policy "own profile select" on user_program_profiles for select using (auth.uid() = user_id);
create policy "own profile upsert" on user_program_profiles for insert with check (auth.uid() = user_id);
create policy "own profile update" on user_program_profiles for update using (auth.uid() = user_id);
```

**Step 3: Apply the migration**

Run: `supabase db push`
Expected: "Applied migration 20260417_user_program_profiles"

**Step 4: Typecheck and verify**

Run: `npx tsc -b && npx vitest run`
Expected: exit 0, all tests pass.

**Step 5: Commit**

```bash
git commit -am "feat(db): add userProgramProfiles table to dexie + supabase"
```

### Task 1.3: Profile persistence helper

**Files:**
- Create: `src/lib/profileRepo.ts`
- Create: `src/lib/profileRepo.test.ts`

**Step 1: Write failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { saveProfileLocal, loadProfileLocal } from './profileRepo'
import { db } from './db'

describe('profileRepo', () => {
  beforeEach(async () => { await db.userProgramProfiles.clear() })

  it('round-trips a profile via Dexie', async () => {
    const profile = {
      goal: 'glutes', sessions_per_week: 4, training_age_months: 18,
      equipment: ['full_gym'], injuries: [], time_budget_min: 60,
      sex: 'female', posture_notes: 'desk',
    } as const
    await saveProfileLocal('user-1', profile as any)
    const loaded = await loadProfileLocal('user-1')
    expect(loaded?.goal).toBe('glutes')
    expect(loaded?.sessions_per_week).toBe(4)
  })
})
```

**Step 2: Run — fail**

**Step 3: Implement**

```ts
// src/lib/profileRepo.ts
import { db } from './db'
import { UserProgramProfileSchema, type UserProgramProfile } from '../types/profile'
import { supabase } from './supabase'

export async function saveProfileLocal(userId: string, profile: UserProgramProfile) {
  UserProgramProfileSchema.parse(profile) // validate
  await db.userProgramProfiles.put({
    user_id: userId,
    profile_json: JSON.stringify(profile),
    updated_at: new Date().toISOString(),
    synced: false,
  })
}

export async function loadProfileLocal(userId: string): Promise<UserProgramProfile | null> {
  const row = await db.userProgramProfiles.get(userId)
  if (!row) return null
  return UserProgramProfileSchema.parse(JSON.parse(row.profile_json))
}

export async function syncProfileUp(userId: string): Promise<void> {
  const row = await db.userProgramProfiles.get(userId)
  if (!row || row.synced) return
  const { error } = await supabase.from('user_program_profiles').upsert({
    user_id: userId,
    profile: JSON.parse(row.profile_json),
    updated_at: row.updated_at,
  })
  if (error) throw error
  await db.userProgramProfiles.update(userId, { synced: true })
}

export async function pullProfileFromCloud(userId: string): Promise<UserProgramProfile | null> {
  const { data } = await supabase.from('user_program_profiles').select('profile').eq('user_id', userId).single()
  if (!data) return null
  const profile = UserProgramProfileSchema.parse(data.profile)
  await saveProfileLocal(userId, profile)
  await db.userProgramProfiles.update(userId, { synced: true })
  return profile
}
```

**Step 4: Run — pass**

**Step 5: Commit**

```bash
git commit -am "feat(profile): local save/load + supabase sync helpers"
```

### Task 1.4: Onboarding wizard — scaffold and first screen

**Files:**
- Create: `src/components/Onboarding/OnboardingFlow.tsx`
- Create: `src/components/Onboarding/StepGoal.tsx`
- Create: `src/components/Onboarding/index.ts`

**Step 1: Scaffold the flow state**

```tsx
// src/components/Onboarding/OnboardingFlow.tsx
import { useState } from 'react'
import type { UserProgramProfile } from '../../types/profile'
import { StepGoal } from './StepGoal'

type PartialProfile = Partial<UserProgramProfile>
interface Props { onComplete: (p: UserProgramProfile) => void }

const STEPS = ['goal', 'frequency', 'experience', 'equipment', 'injuries', 'time_sex', 'posture', 'confirm'] as const
type StepName = typeof STEPS[number]

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState<StepName>('goal')
  const [draft, setDraft] = useState<PartialProfile>({ injuries: [], equipment: [] })
  const idx = STEPS.indexOf(step)
  const progress = Math.round(((idx + 1) / STEPS.length) * 100)

  const next = (patch: PartialProfile) => {
    setDraft(prev => ({ ...prev, ...patch }))
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
    else onComplete({ ...draft, ...patch } as UserProgramProfile)
  }

  return (
    <div className="min-h-screen bg-surface p-4 max-w-lg mx-auto">
      <div className="h-1 bg-surface-raised rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
      </div>
      {step === 'goal' && <StepGoal value={draft.goal} onNext={(goal) => next({ goal })} />}
      {/* other steps implemented in subsequent tasks */}
    </div>
  )
}
```

**Step 2: First step UI**

```tsx
// src/components/Onboarding/StepGoal.tsx
import type { UserProgramProfile } from '../../types/profile'

const OPTIONS: { id: UserProgramProfile['goal']; title: string; blurb: string }[] = [
  { id: 'glutes', title: 'Glute focus', blurb: 'Grow and strengthen glutes' },
  { id: 'strength', title: 'Strength', blurb: 'Get stronger across the board' },
  { id: 'longevity', title: 'Longevity', blurb: 'Train for long-term health' },
  { id: 'aesthetics', title: 'Aesthetics', blurb: 'Muscle tone and definition' },
  { id: 'rehab', title: 'Rehab', blurb: 'Recover from injuries safely' },
  { id: 'general_fitness', title: 'General fitness', blurb: 'A well-rounded plan' },
]

export function StepGoal({ value, onNext }: { value?: UserProgramProfile['goal']; onNext: (g: UserProgramProfile['goal']) => void }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">What's your main goal?</h1>
      <p className="text-zinc-500 mb-6">Pick the one that feels closest — we can tune later.</p>
      <div className="grid gap-3">
        {OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => onNext(opt.id)}
            className={`p-4 rounded-2xl text-left border transition ${value === opt.id ? 'border-brand bg-brand/10' : 'border-border-subtle bg-surface-raised'}`}
          >
            <div className="font-bold">{opt.title}</div>
            <div className="text-sm text-zinc-500">{opt.blurb}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 3: Browser test**

Start dev server (`npm run dev`); manually wire into `App.tsx` temporarily to render `<OnboardingFlow onComplete={console.log} />` in place of `WorkoutView` to click through.

**Step 4: Commit (no functional wiring yet)**

```bash
git add src/components/Onboarding
git commit -m "feat(onboarding): scaffold flow + goal step"
```

### Task 1.5: Remaining onboarding steps (frequency, experience, equipment, injuries, time+sex, posture, confirm)

**Files:**
- Create: `src/components/Onboarding/StepFrequency.tsx`
- Create: `src/components/Onboarding/StepExperience.tsx`
- Create: `src/components/Onboarding/StepEquipment.tsx`
- Create: `src/components/Onboarding/StepInjuries.tsx`
- Create: `src/components/Onboarding/StepTimeAndSex.tsx`
- Create: `src/components/Onboarding/StepPosture.tsx`
- Create: `src/components/Onboarding/StepConfirm.tsx`
- Modify: `src/components/Onboarding/OnboardingFlow.tsx` (render each step)

Implement each as a small presentational component. Follow the same shape as `StepGoal`:
- `StepFrequency`: buttons for 3/4/5/6 sessions per week.
- `StepExperience`: three presets (<6mo = beginner, 6-24mo = intermediate, 24mo+ = experienced), maps to `training_age_months`.
- `StepEquipment`: checkbox list of Equipment enum values; require ≥1.
- `StepInjuries`: repeating row of BodyPart + Severity + optional note. "+ Add another" and a "None" toggle to fast-path empty list.
- `StepTimeAndSex`: two stacked controls — a slider 15–120 min and a three-way sex selector.
- `StepPosture`: free-text area with placeholder "Desk worker? Tight hips? Anything else."
- `StepConfirm`: recap all fields in a card, "Save and generate my plan" button calling `onComplete`.

Each step commits after being built + manually clicked through. Commit message template:
```bash
git commit -m "feat(onboarding): <step name> step"
```

### Task 1.6: Route first-time users to onboarding

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/hooks/useAuth.ts` (expose `profile_loaded` flag)

**Step 1: Pull profile on login**

In `useAuth.ts`, after auth resolves, call `pullProfileFromCloud(user.id)`. Expose a `hasProfile` boolean alongside `user` and `profile`.

**Step 2: App-level route**

```tsx
// src/App.tsx (in the authed branch)
if (!hasProfile) {
  return <OnboardingFlow onComplete={async (p) => {
    await saveProfileLocal(user.id, p)
    await syncProfileUp(user.id)
    // future: kick off plan generation
    setHasProfile(true)
  }} />
}
```

**Step 3: Manual browser verification**

1. Wipe IndexedDB + sign-out in dev mode.
2. Sign in (dev bypass).
3. Should see onboarding. Click through all 8 steps.
4. Confirm. Should land back on WorkoutView.
5. Reload. Should go straight to WorkoutView (profile persisted).
6. Wipe IndexedDB only (leave Supabase). Reload. Should fetch profile from Supabase and skip onboarding again.

**Step 4: Commit**

```bash
git commit -am "feat(app): route first-time users to onboarding"
```

---

## Phase 2: Plan generation

### Task 2.1: Plan types + schema

**Files:**
- Create: `src/types/plan.ts`
- Create: `src/types/plan.test.ts`

**Step 1: Zod schema**

```ts
// src/types/plan.ts
import { z } from 'zod'

export const MuscleGroup = z.enum([
  'quads', 'hamstrings', 'glutes', 'calves',
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'core', 'full_body', 'rehab', 'mobility',
])
export const SessionStatus = z.enum(['upcoming', 'in_progress', 'completed', 'skipped'])

export const PlannedExerciseSchema = z.object({
  library_id: z.string(),       // "fedb:..." or curated id
  name: z.string(),             // denormalized for offline display
  sets: z.number().int().min(1).max(10),
  reps: z.string(),             // "8-12" or "10"
  rir: z.number().int().min(0).max(5),
  rest_seconds: z.number().int().min(0).max(600),
  role: z.string(),             // "main lift" | "accessory" | "core" | "rehab"
  notes: z.string().optional(),
})

export const PlannedSessionSchema = z.object({
  id: z.string(),                // stable ID the app generates
  week_number: z.number().int().min(1),
  ordinal: z.number().int().min(1),   // position within the week (1..N)
  focus: z.array(MuscleGroup).min(1),
  title: z.string(),
  estimated_minutes: z.number().int(),
  exercises: z.array(PlannedExerciseSchema),
  status: SessionStatus,
  intended_date: z.string().optional(),   // hint only
})

export const MesocycleSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  generated_at: z.string(),
  length_weeks: z.number().int().min(3).max(12),
  sessions: z.array(PlannedSessionSchema),
  profile_snapshot: z.unknown(),   // copy of UserProgramProfile at gen time
})

export type Mesocycle = z.infer<typeof MesocycleSchema>
export type PlannedSession = z.infer<typeof PlannedSessionSchema>
export type PlannedExercise = z.infer<typeof PlannedExerciseSchema>
```

**Step 2: Test — validate a plausible 6-week plan shape**

Simple round-trip test through the schema.

**Step 3: Run + commit**

```bash
git commit -am "feat(types): plan/mesocycle schema"
```

### Task 2.2: Edge function op: `generate_plan`

**Files:**
- Modify: `supabase/functions/generate/index.ts`
- Create: `supabase/functions/generate/prompts/generatePlan.ts`
- Modify: `supabase/functions/generate/schemas.ts`

**Step 1: Server-side plan schema**

Define a Gemini-ready JSON Schema mirroring `MesocycleSchema` (without `user_id`, `generated_at`, `profile_snapshot` — the server fills those in). Keep enums identical.

**Step 2: Prompt builder**

```ts
// supabase/functions/generate/prompts/generatePlan.ts
export function buildPlanPrompt(input: {
  profile: unknown,
  exercisePool: { id: string, name: string, primaryMuscles: string[], equipment: string | null }[],
  weeks: number,
}) {
  return `You are a strength coach. Build a ${input.weeks}-week training block for the user below.

HARD RULES:
- Only use exercises from the provided pool. Reference them by their id.
- Never program the same major muscle group on consecutive days. Minimum 48h between hard sessions for the same group.
- If the user has a meniscus injury (severity "modify" or "avoid"), do NOT include deep squats, deep lunges, or plyometric jumps. Prefer TKEs, step-ups, leg extension (partial ROM), Spanish squats, hip thrusts, glute bridges.
- If lower back is listed, avoid loaded spinal flexion; prefer hip hinge with moderate load, dead bugs, bird dogs.
- Respect equipment list. If bands_only, no barbell exercises. Etc.
- Sessions/week matches the profile.
- Each session stays within the user's time_budget_min.
- Use RIR 2-3 for beginners (<6 months), RIR 1-3 for intermediates, RIR 0-2 in later weeks of the block.
- Week 1 = moderate volume. Progressive overload by adding reps then load across weeks. Last week of the block is a deload (~60% volume, same intensity).

USER PROFILE:
${JSON.stringify(input.profile, null, 2)}

EXERCISE POOL (${input.exercisePool.length} entries):
${JSON.stringify(input.exercisePool)}

Return the plan as JSON matching the provided schema. Populate focus as the primary muscle groups hit in each session. Titles should be concrete, not generic.`
}
```

**Step 3: Wire the op**

```ts
// index.ts (inside the handler)
if (body.op === 'generate_plan') {
  const { profile, exercisePool, weeks = 6 } = body.payload as any
  const prompt = buildPlanPrompt({ profile, exercisePool, weeks })
  const r = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json', responseSchema: mesocycleSchema },
  })
  return new Response(r.text, { headers: { 'content-type': 'application/json' } })
}
```

**Step 4: Deploy and smoke-test**

Run: `supabase functions deploy generate`
Curl the deployed endpoint with a minimal profile + a slimmed-down pool (say 20 exercises). Expect a valid JSON plan.

**Step 5: Commit**

```bash
git add supabase/functions/generate
git commit -m "feat(edge): generate_plan op with strict schema"
```

### Task 2.3: Client: generatePlan + exercise pool builder + persistence

**Files:**
- Create: `src/lib/planGen.ts`
- Create: `src/lib/planGen.test.ts`
- Modify: `src/lib/db.ts` (add `mesocycles` table)

**Step 1: Dexie table**

Add `mesocycles: 'id, user_id, generated_at'` to the version 3/4 stores.

**Step 2: Pool builder**

```ts
// src/lib/planGen.ts
import { db } from './db'
import { callEdge } from './generate'
import { MesocycleSchema, type Mesocycle } from '../types/plan'
import { z } from 'zod'
import type { UserProgramProfile } from '../types/profile'

export async function buildExercisePool(profile: UserProgramProfile) {
  // Restrict pool by equipment + drop obviously unsafe entries.
  const rows = await db.exerciseLibrary.toArray()
  return rows
    .filter(r => equipmentAllowed(r.equipment, profile.equipment))
    .slice(0, 200)   // cap prompt size
    .map(r => ({ id: r.id, name: r.name, primaryMuscles: r.primaryMuscles, equipment: r.equipment }))
}

function equipmentAllowed(entry: string | null, chosen: string[]): boolean {
  // mapping: free-exercise-db equipment strings → our Equipment enum
  // e.g., "body only" → bodyweight_only, "barbell" → full_gym|barbell, etc.
  // Permissive: include if any chosen equipment matches.
  // (Detailed mapping table defined in the file.)
  return true // placeholder — fill in the mapping during implementation
}

export async function generatePlan(profile: UserProgramProfile, userId: string, weeks = 6): Promise<Mesocycle> {
  const pool = await buildExercisePool(profile)
  const partialSchema = MesocycleSchema.omit({ user_id: true, generated_at: true, profile_snapshot: true })
  const raw = await callEdge('generate_plan', { profile, exercisePool: pool, weeks }, partialSchema)
  const meso: Mesocycle = {
    ...raw,
    user_id: userId,
    generated_at: new Date().toISOString(),
    profile_snapshot: profile,
  }
  await db.mesocycles.put({ ...meso, id: meso.id })
  return meso
}
```

**Step 3: Test the pool builder and schema validation (mock fetch)**

Write a focused test that mocks `callEdge`, provides a plausible Gemini JSON, checks we persist to Dexie.

**Step 4: Run + commit**

```bash
git commit -am "feat(plan): generate+persist mesocycle"
```

### Task 2.4: Hook onboarding completion to plan generation

**Files:**
- Modify: `src/components/Onboarding/OnboardingFlow.tsx`
- Modify: `src/App.tsx`

**Step 1: After `syncProfileUp`, call `generatePlan`**

Show a loading screen with an encouraging message ("Designing your block — 10 seconds…"). On success, land on WorkoutView.

**Step 2: Error handling**

If Gemini errors, offer a "Try again" button. Do NOT fall back to a template; show an error state and wait.

**Step 3: Manual browser verification**

Walk through onboarding with a fresh account; confirm plan persists and shows up in Dexie devtools.

**Step 4: Commit**

---

## Phase 3: Progress-based today + render generated plan

### Task 3.1: `getToday()` and `getPlanView()` selectors

**Files:**
- Create: `src/lib/planSelectors.ts`
- Create: `src/lib/planSelectors.test.ts`

**Step 1: Failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { getToday, getWeekView } from './planSelectors'
import type { Mesocycle } from '../types/plan'

const fixture: Mesocycle = /* 6-week plan fixture with 24 sessions; first 3 completed, rest upcoming */

describe('getToday', () => {
  it('returns the next upcoming session', () => {
    const s = getToday(fixture)
    expect(s?.ordinal).toBe(4)
  })
  it('returns null when plan is complete', () => {
    expect(getToday({ ...fixture, sessions: fixture.sessions.map(s => ({...s, status: 'completed'})) })).toBeNull()
  })
})
```

**Step 2: Implement**

```ts
// src/lib/planSelectors.ts
import type { Mesocycle, PlannedSession } from '../types/plan'

export function getToday(meso: Mesocycle | null): PlannedSession | null {
  if (!meso) return null
  return meso.sessions.find(s => s.status === 'upcoming') ?? null
}

export function getWeekView(meso: Mesocycle | null, weekNumber: number): PlannedSession[] {
  if (!meso) return []
  return meso.sessions.filter(s => s.week_number === weekNumber).sort((a,b) => a.ordinal - b.ordinal)
}
```

**Step 3: Run + commit**

```bash
git commit -am "feat(plan): progress-based selectors"
```

### Task 3.2: Replace DEFAULT_SCHEDULE-driven WorkoutView with plan-driven

**Files:**
- Modify: `src/components/WorkoutView.tsx`
- Modify: `src/hooks/usePlan.ts` (new) — loads current mesocycle from Dexie

**Step 1: Create `usePlan` hook**

```ts
// src/hooks/usePlan.ts
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import type { Mesocycle } from '../types/plan'

export function usePlan(userId: string): Mesocycle | null {
  const row = useLiveQuery(
    () => db.mesocycles.where('user_id').equals(userId).reverse().first(),
    [userId]
  )
  return (row as Mesocycle) ?? null
}
```

**Step 2: Rewire `WorkoutView` to pull the session from plan selectors**

- Remove: `DEFAULT_SCHEDULE` references, `dayInfo`, `workoutId` from schedule.
- Replace `selectedDay` with `selectedSessionId` (persisted in localStorage similarly).
- Default displayed session = `getToday(plan)` unless user picked a different one from the week view.
- Render the sessions for `week_number === currentWeek` as a horizontal scroll of chips; selecting a chip sets `selectedSessionId`.
- `dynamicWorkout` becomes `planSession` (a `PlannedSession`). The rest of the render (main lifts, core, etc.) reads from `planSession.exercises`.

Keep Wave 1 persistence (checkedSets, weights) scoped to `session.id` instead of `workoutId`.

**Step 3: Delete now-dead code**

Remove imports of `buildWorkoutForDay`, `getPeriodConfig`, `PROGRAM`, `PROTOCOL_WEEK`, etc. Those come out in Phase 5.

**Step 4: Manual browser test**

Onboard fresh user → plan generates → WorkoutView shows the first generated session with its real exercises. Click a future session; it displays. Reload; correct session persists.

**Step 5: Commit**

```bash
git commit -am "feat(app): drive WorkoutView from generated plan"
```

---

## Phase 4: In-workout swap

### Task 4.1: Edge function op: `swap_exercise`

**Files:**
- Modify: `supabase/functions/generate/index.ts`
- Create: `supabase/functions/generate/prompts/swapExercise.ts`
- Modify: `supabase/functions/generate/schemas.ts`

**Step 1: Swap schema**

Schema: `{ replacement: PlannedExerciseSchema, reason: string }`

**Step 2: Prompt**

```ts
// prompts/swapExercise.ts
export function buildSwapPrompt(input: {
  profile: unknown,
  currentExercise: unknown,
  sessionFocus: string[],
  completedExercisesInSession: string[],
  exercisePool: unknown[],
  reason: 'machine_busy' | 'too_hard' | 'too_easy' | 'injury_flare' | 'generic',
}) {
  return `You are a strength coach substituting one exercise mid-workout.

RULES:
- Replacement must target the same primary muscle group(s) as the original.
- Replacement must not duplicate any exercise already completed in this session.
- Honor the user's injuries from the profile.
- Honor the user's equipment list.
- Choose from the provided pool only. Return exactly one replacement.

Reason for swap: ${input.reason}
Original exercise: ${JSON.stringify(input.currentExercise)}
Session focus: ${input.sessionFocus.join(', ')}
Already completed this session (do not suggest these): ${input.completedExercisesInSession.join(', ')}
User profile: ${JSON.stringify(input.profile)}

Exercise pool: ${JSON.stringify(input.exercisePool)}

Return JSON: { replacement: { library_id, name, sets, reps, rir, rest_seconds, role, notes }, reason: "<one-sentence why this sub works>" }.`
}
```

**Step 3: Wire + deploy**

**Step 4: Smoke test via curl**

**Step 5: Commit**

### Task 4.2: Client + UI wiring for swap

**Files:**
- Create: `src/lib/swap.ts`
- Modify: `src/components/WorkoutView.tsx` (swap button calls `requestSwap`)

**Step 1: `requestSwap` client**

```ts
// src/lib/swap.ts
import { callEdge } from './generate'
import { z } from 'zod'
import { PlannedExerciseSchema } from '../types/plan'
import { db } from './db'
import type { PlannedSession, PlannedExercise } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'

const SwapResponse = z.object({ replacement: PlannedExerciseSchema, reason: z.string() })

export async function requestSwap(opts: {
  profile: UserProgramProfile,
  session: PlannedSession,
  exerciseIndex: number,
  reason: 'machine_busy' | 'too_hard' | 'too_easy' | 'injury_flare' | 'generic',
}): Promise<{ replacement: PlannedExercise, reason: string }> {
  const pool = /* re-use planGen.buildExercisePool */
  const completed = opts.session.exercises.slice(0, opts.exerciseIndex).map(e => e.name)
  return callEdge('swap_exercise', {
    profile: opts.profile,
    currentExercise: opts.session.exercises[opts.exerciseIndex],
    sessionFocus: opts.session.focus,
    completedExercisesInSession: completed,
    exercisePool: pool,
    reason: opts.reason,
  }, SwapResponse)
}

export async function applySwap(mesoId: string, sessionId: string, exerciseIndex: number, replacement: PlannedExercise) {
  const meso = await db.mesocycles.get(mesoId)
  if (!meso) throw new Error('plan missing')
  const sessions = meso.sessions.map((s: any) => {
    if (s.id !== sessionId) return s
    const exercises = s.exercises.map((e: any, i: number) => i === exerciseIndex ? replacement : e)
    return { ...s, exercises }
  })
  await db.mesocycles.update(mesoId, { sessions })
}
```

**Step 2: UI — swap menu**

In the exercise row of `WorkoutView`, the existing `RefreshCw` icon becomes a trigger. On click: open a bottom sheet with options — "machine busy / too hard / too easy / injury flare / swap for any reason". Tapping one calls `requestSwap`, shows the proposed replacement + the reason, and offers "Accept" / "Decline / another option".

**Step 3: Manual verification**

Start a session. Tap swap on Lat Pulldowns. Choose "machine busy." See a valid alternative from the pool, with a reason. Accept. The exercise row updates; reload persists the swap.

**Step 4: Commit**

---

## Phase 5: Cleanup

### Task 5.1: Delete obsolete templated content

**Files to delete:**
- `src/data/program.ts`
- `src/data/schedule.ts`
- `src/data/warmups.ts`
- `src/data/cooldowns.ts`
- `src/data/protocols.ts`
- `src/data/workout-focus.ts`
- `src/hooks/useProtocol.ts`
- `src/components/AdaptiveRoutine.tsx`
- `src/components/ProtocolSection.tsx`
- `src/components/PainCheckIn.tsx`
- `src/components/DaySelector.tsx`

**Files to modify to remove dead imports:**
- `src/App.tsx`
- `src/components/WorkoutView.tsx`

**Step 1: Delete**

Run: `git rm <files above>`

**Step 2: Fix compile errors**

Run: `npx tsc -b` and address each import-missing error in components by removing the dead references.

**Step 3: Tests + build**

Run: `npm test && npm run build`
Expected: all green, no references to the deleted modules.

**Step 4: Commit**

```bash
git commit -am "chore: remove templated schedule/programs/protocols — AI-driven now"
```

---

## Final verification (before marking the plan complete)

1. Run: `npx tsc -b` → exit 0
2. Run: `npm test` → all pass
3. Run: `npm run build` → exit 0
4. Manual browser walkthrough:
   - Fresh user → onboarding → plan generates → today's session shows real exercises from the library
   - Start workout, check sets, navigate away and back — state persists (Wave 1 still good)
   - Phase-skip during warmup → warning appears (Wave 1 still good)
   - Tap swap → bottom sheet → pick reason → alternative appears → accept → exercise updates
   - Reload → plan, profile, and any swaps persist
   - Clear localStorage (but keep IndexedDB) → plan still loads
   - Clear IndexedDB (but keep Supabase row) → reload → pulls profile from cloud, plan regenerates (or separate flow to re-pull plan — document the decision in-code)

## Questions left for Kyra (resolve before Phase 2)

1. **Block length default** — plan assumes 6 weeks. Change?
2. **First-gen latency** — Gemini 2.5 Flash takes ~5-10s for a 6-week plan. Acceptable UX behind a loading screen with an encouraging message, or do we need a shorter first-gen (e.g., generate week 1 now, rest async)?
3. **Plan regen triggers** — if the user changes their profile later (e.g., adds an injury), do we regenerate the remaining weeks silently, prompt them, or leave it alone?
4. **Exercise pool cap** — the edge function caps at 200 entries to stay under token limits. If the user has niche equipment, the cap might exclude useful items. OK as a starting default?

---

**End of plan.** Implementation agent: read Phase 0 fully before writing code. Don't skip the manual browser test steps — they're the only check that UI wiring is right.
