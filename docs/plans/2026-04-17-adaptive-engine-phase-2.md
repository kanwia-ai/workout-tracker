# Adaptive Engine Phase 2 — Days Strip + Warmup/Cardio Slots + UX Polish

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the generated plan feel like a real weekly calendar (not a menu), bring back warmup/cardio/cool-down as always-present slots with default-generated content, and fix the honesty + discoverability gaps Kyra surfaced during preview.

**Architecture:** Same React 19 + Vite + Dexie + Supabase + Gemini 2.5 Flash stack as Phase 1. Engine changes: Gemini now assigns each session to a `day_of_week` (0-6, Mon=0) and produces a short `rationale` per session. Client gets a 7-day strip UI driven off those fields and new warmup/cardio/cool-down slots that default-generate then lock until explicit regenerate.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind v4, Dexie 4, Supabase Edge Functions, Gemini 2.5 Flash, Zod.

**What this plan does NOT cover (deferred):**
- Gap-aware rebalance (reopen after 2 weeks → replan)
- "Can't make gym today" equipment override that regenerates today's session
- Multi-user cloud sync of mesocycles
- Exercise video / image drilldown beyond the Dexie library data we already have

---

## Phase 2.0 — Engine: day_of_week + rationale

### Task 2P.1: Add `day_of_week` + `rationale` to PlannedSession schema

**Files:**
- Modify: `src/types/plan.ts`
- Modify: `src/types/plan.test.ts`
- Modify: `supabase/functions/generate/schemas.ts`

**Step 1: Write failing test**

Add to `src/types/plan.test.ts`:
```ts
it('accepts day_of_week (0-6) and rationale', () => {
  const ok = PlannedSessionSchema.safeParse({
    ...baseSession,
    day_of_week: 0,
    rationale: 'Lower body Monday; 48h before Thursday Lower B.',
  })
  expect(ok.success).toBe(true)
})
it('rejects day_of_week outside 0-6', () => {
  expect(PlannedSessionSchema.safeParse({ ...baseSession, day_of_week: 7 }).success).toBe(false)
})
```

**Step 2: Run — verify fail**
```
npx vitest run src/types/plan.test.ts
```

**Step 3: Extend Zod schema**

In `src/types/plan.ts`, add to `PlannedSessionSchema`:
```ts
day_of_week: z.number().int().min(0).max(6),  // 0=Mon .. 6=Sun
rationale: z.string().max(280),
```

Also update the edge JSON Schema in `supabase/functions/generate/schemas.ts`:
```ts
// plannedSessionSchema.properties
day_of_week: { type: 'integer', minimum: 0, maximum: 6 },
rationale: { type: 'string', maxLength: 280 },
// required: add 'day_of_week', 'rationale'
// propertyOrdering: insert before 'status'
```

**Step 4: Run — verify pass**

**Step 5: Commit**
```
feat(types): PlannedSession gets day_of_week + rationale
```

### Task 2P.2: Update generate_plan prompt to emit day_of_week + rationale

**Files:**
- Modify: `supabase/functions/generate/prompts/generatePlan.ts`

**Step 1: Extend prompt hard rules**

Add a block explaining day assignment:
```
DAY-OF-WEEK ASSIGNMENT RULES:
- Every session MUST have a day_of_week field (0=Monday through 6=Sunday).
- Across a week, place sessions so the SAME major muscle group gets at least
  48h of recovery. 72h for big compounds (squat, deadlift patterns).
- With N sessions/week, pick N days from Mon-Sun that satisfy the above.
  Example distributions:
    3/wk: 0,2,4 (Mon/Wed/Fri) or 1,3,5 (Tue/Thu/Sat)
    4/wk: 0,1,3,4 (Mon/Tue/Thu/Fri) with Wed + weekend as rest
    5/wk: 0,1,2,4,5 (Mon/Tue/Wed/Fri/Sat)
    6/wk: 0,1,2,3,4,5
- The pattern should repeat across all weeks unless a deload week
  explicitly shifts it.
- Assignments must be unique within a week (no two sessions on same day).

RATIONALE RULES:
- Every session gets a rationale field: one short sentence (≤280 chars)
  explaining why the session is placed HERE on this day, what muscle group
  it targets, and how it relates to the prior/next session's recovery.
- Example: "Lower A on Monday. Fresh week, full quad/glute capacity. 48h
  separation from Thursday's Lower B lets the big compounds recover."
```

**Step 2: Deploy**
```
supabase functions deploy generate
```

**Step 3: Smoke test**
Run a curl with a minimal profile + 3 exercises + 3 weeks; confirm every session has `day_of_week` and `rationale`.

**Step 4: Commit**
```
feat(edge): generate_plan emits day_of_week + rationale per session
```

### Task 2P.3: Client validation + migration guard

**Files:**
- Modify: `src/lib/planGen.ts`

**Step 1:**

`loadMesocycle` / `loadLatestMesocycleForUser` already re-parse via `MesocycleSchema`. Existing plans in Dexie from Phase 1 WILL fail validation because they lack `day_of_week`/`rationale`. Add a migration path:

```ts
export async function loadMesocycle(id: string): Promise<Mesocycle | null> {
  const row = await db.mesocycles.get(id)
  if (!row) return null
  const candidate = { ...unmarshal(row) }
  // Back-fill day_of_week + rationale for pre-Phase-2 plans so the app
  // doesn't hard-fail on a stale row. Fallback distribution: sessions per
  // week evenly spread across Mon-Sun in ordinal order.
  const sessions = candidate.sessions as PlannedSession[]
  if (sessions.some(s => s.day_of_week === undefined || s.rationale === undefined)) {
    const perWeek = Math.max(1, Math.ceil(sessions.length / candidate.length_weeks))
    const pattern = pickRecoveryPattern(perWeek)   // [0,1,3,4] for 4/wk etc
    for (const s of sessions) {
      if (s.day_of_week === undefined) s.day_of_week = pattern[(s.ordinal - 1) % perWeek]
      if (s.rationale === undefined) s.rationale = 'Migrated from an earlier plan — regenerate for a fresher rationale.'
    }
  }
  return MesocycleSchema.parse(candidate)
}

function pickRecoveryPattern(perWeek: number): number[] {
  switch (perWeek) {
    case 1: return [0]
    case 2: return [0, 3]
    case 3: return [0, 2, 4]
    case 4: return [0, 1, 3, 4]
    case 5: return [0, 1, 2, 4, 5]
    case 6: return [0, 1, 2, 3, 4, 5]
    default: return Array.from({ length: 7 }, (_, i) => i)
  }
}
```

**Step 2: Tests** in `src/lib/planGen.test.ts` — add one: a stored row missing `day_of_week` loads without throwing and has back-filled days.

**Step 3: Run + commit**
```
feat(plan): back-fill day_of_week for Phase-1 plans
```

---

## Phase 2.1 — Days strip UI

### Task 2P.4: `DayStrip` component

**Files:**
- Create: `src/components/DayStrip.tsx`
- Create: `src/components/DayStrip.test.tsx`

**Step 1: Test first**
```ts
it('renders 7 day cards with the training session title on training days', () => {
  const plan = makePlan([
    makeSession(1, 1, { day_of_week: 0, title: 'Lower A' }),
    makeSession(1, 2, { day_of_week: 3, title: 'Upper A' }),
  ])
  render(<DayStrip plan={plan} weekNumber={1} todayDow={2} selectedDow={2} onSelect={vi.fn()} />)
  expect(screen.getByText(/Lower A/)).toBeInTheDocument()
  expect(screen.getByText(/Upper A/)).toBeInTheDocument()
  expect(screen.getAllByText(/REST/).length).toBe(5)  // 7 - 2 training = 5 rest
})
it('highlights today', () => { /* ... */ })
it('calls onSelect with day_of_week when a day is tapped', () => { /* ... */ })
```

**Step 2: Implement**
```tsx
// src/components/DayStrip.tsx
import type { Mesocycle } from '../types/plan'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  plan: Mesocycle
  weekNumber: number      // 1-indexed
  todayDow: number        // 0-6, Mon=0
  selectedDow: number     // 0-6
  onSelect: (dow: number) => void
  weekStartDate: Date     // Monday of the currently-viewed week; used to print the day number
}

export function DayStrip({ plan, weekNumber, todayDow, selectedDow, onSelect, weekStartDate }: Props) {
  const weekSessions = plan.sessions.filter(s => s.week_number === weekNumber)
  const byDow: Record<number, typeof weekSessions[number]> = {}
  for (const s of weekSessions) byDow[s.day_of_week] = s

  return (
    <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
      {DAYS.map((label, dow) => {
        const session = byDow[dow]
        const isRest = !session
        const isToday = dow === todayDow
        const isSelected = dow === selectedDow
        const dateNum = new Date(weekStartDate.getTime() + dow * 86400000).getDate()

        return (
          <button
            key={dow}
            onClick={() => onSelect(dow)}
            className={`flex-1 min-w-[44px] min-h-[68px] rounded-2xl px-2 py-2 text-center transition ${
              isSelected
                ? 'bg-brand text-black'
                : isToday
                  ? 'bg-surface-raised border-2 border-brand/40 text-zinc-200'
                  : 'bg-surface-raised text-zinc-500'
            }`}
          >
            <div className="text-[11px] font-bold">{label}</div>
            <div className="text-base font-extrabold tabular-nums">{dateNum}</div>
            <div className="text-[9px] uppercase tracking-wide mt-0.5 opacity-75">
              {isRest ? 'REST' : session.title.slice(0, 14)}
            </div>
          </button>
        )
      })}
    </div>
  )
}
```

**Step 3: Run + commit**
```
feat(ui): DayStrip renders 7-day calendar with session titles
```

### Task 2P.5: Wire `DayStrip` into `WorkoutView`, remove session chips

**Files:**
- Modify: `src/components/WorkoutView.tsx`

**Step 1: Replace the session chips** with `<DayStrip ... />`. The selector state becomes `selectedDow: number` (persisted to localStorage) instead of `selectedSessionId`. Derive the selected session:
```ts
const selectedSession = useMemo(() => {
  const week = plan?.sessions.filter(s => s.week_number === currentWeek) ?? []
  return week.find(s => s.day_of_week === selectedDow) ?? null
}, [plan, currentWeek, selectedDow])
```

`currentWeek` = the week_number of the "today" session, or 1 if no session (empty week).

**Step 2: `weekStartDate` calculation** — Monday of the week containing today. Pure function in the file.

**Step 3: Rest-day view** — if `selectedSession === null`, render a "Rest day — recovery + mobility" card with a TODO for generating recovery content.

**Step 4: Manual browser verify:**
- All 7 days visible.
- Training days show session title; rest days show REST.
- Today is highlighted.
- Tapping a training day swaps the session view.
- Tapping a rest day shows the rest card.

**Step 5: Commit**
```
feat(app): WorkoutView switches to 7-day DayStrip
```

---

## Phase 2.2 — Warmup / Cool-down / Cardio slots

### Task 2P.6: Edge function op `generate_routine`

**Files:**
- Modify: `supabase/functions/generate/index.ts`
- Create: `supabase/functions/generate/prompts/generateRoutine.ts`
- Modify: `supabase/functions/generate/schemas.ts`

**Step 1: Schema**

```ts
// schemas.ts
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
```

**Step 2: Prompt**

```ts
// generateRoutine.ts
type RoutineKind = 'warmup' | 'cooldown' | 'cardio'
export function buildRoutinePrompt(input: {
  profile: unknown
  sessionFocus: string[]
  kind: RoutineKind
  minutes: number
  focusTag?: string   // e.g., 'mobility', 'activation', 'steady-state'
}) {
  const rulesByKind = {
    warmup: `Dynamic mobility for ${input.minutes} min — NOT static stretching (research: Behm 2011 — static holds pre-strength reduce force 5%). Include hip/ankle/knee mobility, light cardio (brisk walk / bike / rower), and activation (banded glutes, scap work). End with 2-3 ramp-up sets if sessionFocus includes heavy compound.`,
    cooldown: `Down-regulate for ${input.minutes} min. Light walk / easy stationary bike 3-5 min + static stretching targeting whatever was worked (sessionFocus). Keep it short — cool-down has minimal hypertrophy value (Van Hooren & Peake 2018), this is for ritual and parasympathetic shift.`,
    cardio: `Zone-2 or interval cardio for ${input.minutes} min. NOT high-intensity if it'll interfere with lifting — cap ~10 min post-strength to avoid the interference effect (Wilson 2012 meta). Prefer treadmill incline walk, stair master slow, stationary bike.`,
  }
  return `You are a strength coach designing ${input.kind} content for the user's session.

RULES:
- Respect the user's injuries (see profile): meniscus/lower-back/shoulder modifications as in the main program.
- Tailor to sessionFocus muscle groups.
- Return 3-8 exercises for a ${input.minutes}-min block.
- Each exercise: name + either duration_seconds (for holds/cardio) OR reps (for movement drills) + optional notes.
- Title the routine in 4-6 words.

SPECIFIC TO THIS KIND:
${rulesByKind[input.kind]}

SESSION FOCUS: ${input.sessionFocus.join(', ')}
${input.focusTag ? `EXTRA FOCUS: ${input.focusTag}` : ''}

USER PROFILE:
${JSON.stringify(input.profile, null, 2)}

Return JSON matching the schema.`
}
```

**Step 3: Wire op in `index.ts`**
- Add `'generate_routine'` to `GEMINI_OPS`.
- Validate `kind ∈ {warmup, cooldown, cardio}`, `minutes ∈ [3, 60]`, `sessionFocus: string[]`.
- Call Gemini with `routineSchema`. Same try/catch + 502 handling.

**Step 4: Deploy + smoke test**
```
supabase functions deploy generate
# curl with kind=warmup minutes=10, verify valid response
```

**Step 5: Commit**
```
feat(edge): generate_routine op for warmup/cardio/cooldown
```

### Task 2P.7: Client routine persistence + `useRoutine` hook

**Files:**
- Modify: `src/lib/db.ts`
- Create: `src/lib/routines.ts`
- Create: `src/hooks/useRoutine.ts`

**Step 1: Dexie schema bump (v5)**

```ts
interface LocalRoutine {
  id: string                 // `${sessionId}:${kind}`
  session_id: string
  kind: 'warmup' | 'cooldown' | 'cardio'
  minutes: number
  focusTag?: string
  routine_json: string       // { title, exercises[] }
  generated_at: string
  synced: boolean
}
db.version(5).stores({
  /* ...v4 tables */
  routines: 'id, session_id, kind, generated_at, synced',
})
```

**Step 2: `routines.ts`** — `generateRoutine(kind, session, profile, minutes, focusTag?)` calls `callEdge('generate_routine', ...)`, validates via Zod (new `RoutineSchema`), stores under `id = sessionId:kind`. `loadRoutine(sessionId, kind)` reads Dexie.

**Step 3: `useRoutine(sessionId, kind)` hook** — reactive via `useLiveQuery`, returns `{ routine: Routine | null; loading: boolean }`.

**Step 4: Tests** in `src/lib/routines.test.ts` — mock `callEdge`, test round-trip.

**Step 5: Commit**
```
feat(routines): dexie table + client helpers + useRoutine hook
```

### Task 2P.8: `RoutineSlot` component with safe regenerate

**Files:**
- Create: `src/components/RoutineSlot.tsx`

**Step 1: Component spec**

Props: `{ session: PlannedSession; kind: 'warmup' | 'cooldown' | 'cardio'; profile: UserProgramProfile }`

States:
1. **empty** — no saved routine yet. On mount, auto-generate with default minutes (warmup=10, cooldown=5, cardio=15).
2. **generating** — spinner + "Building your warm-up…" + elapsed-time counter.
3. **ready** — show `routine.title` + exercise list. Small regenerate icon in corner.
4. **regenerate-picker** — bottom sheet with minute chips (5/10/15/20) + focus chips (Mobility / Activation / Movement prep for warmup; Stretching / Breath for cooldown; Zone 2 / Intervals for cardio). "Confirm replace" button at bottom.
5. **regenerating** — same as `generating`.

After a routine is generated, chips are NOT visible until the user explicitly taps regenerate.

**Step 2: Implementation sketch:**

```tsx
export function RoutineSlot({ session, kind, profile }: Props) {
  const { routine, loading } = useRoutine(session.id, kind)
  const [picking, setPicking] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Auto-generate default on first mount if no saved routine
  useEffect(() => {
    if (loading) return
    if (routine) return
    void doGenerate(defaultMinutes[kind])
  }, [loading, routine])

  async function doGenerate(minutes: number, focusTag?: string) {
    setGenerating(true)
    try {
      await generateRoutine({ session, kind, profile, minutes, focusTag })
    } finally {
      setGenerating(false)
      setPicking(false)
    }
  }

  if (generating || loading) return <SlotLoading kind={kind} />
  if (!routine) return <div>Failed to build {kind}. <button onClick={() => doGenerate(defaultMinutes[kind])}>Retry</button></div>

  return (
    <section>
      <header className="flex justify-between">
        <h3>{routine.title}</h3>
        <button onClick={() => setPicking(true)}><RefreshCw size={14}/></button>
      </header>
      <ul>{routine.exercises.map(e => <li key={e.name}>{e.name} · {e.duration_seconds ? `${e.duration_seconds}s` : e.reps}</li>)}</ul>
      {picking && <RegeneratePicker kind={kind} onConfirm={doGenerate} onCancel={() => setPicking(false)} />}
    </section>
  )
}
```

**Step 3: `RegeneratePicker` sub-component** — bottom sheet with time + focus chips. Confirm button shows: "This will replace your current warmup. Continue?".

**Step 4: Manual browser verify:**
- Open any session — warmup + cooldown + cardio slots all appear with default-generated content.
- Hitting the regenerate icon opens the picker.
- Selecting time + focus + confirming replaces the slot.
- Chips disappear after confirmation.
- Reload — persisted content survives.

**Step 5: Commit**
```
feat(ui): RoutineSlot with default-gen + safe regenerate picker
```

### Task 2P.9: Wire `RoutineSlot` into `WorkoutView`

**Files:**
- Modify: `src/components/WorkoutView.tsx`

**Step 1:** Above "Main Lifts," render `<RoutineSlot kind="warmup" ... />`. Below, render `<RoutineSlot kind="cardio" ... />` and `<RoutineSlot kind="cooldown" ... />`.

**Step 2:** Only show these when `selectedSession` is non-null (not on rest days).

**Step 3: Manual browser verify** + commit.
```
feat(app): warmup/cardio/cool-down slots in WorkoutView
```

---

## Phase 2.3 — UX polish

### Task 2P.10: Honest loading screen + progress bar

**Files:**
- Modify: `src/components/Onboarding/GeneratingPlan.tsx`

**Step 1:** Replace the 2.2s rotating ticker with:
- Elapsed-time counter that shows real seconds (`useEffect` with `setInterval`).
- A progress bar that paces 0-95% over 90 seconds, then sits at 95% until completion (never claims 100% until it's actually done).
- Honest copy: "Designing your training block — usually takes 60-120 seconds. We're matching 24 sessions to your profile, injuries, and recovery windows."
- If elapsed > 180s, show: "This is taking longer than usual. Hang tight or refresh to retry."

**Step 2: Test** — render the component, advance fake timers, verify progress bar doesn't hit 100% before complete.

**Step 3: Commit**
```
fix(ui): honest loading copy + real elapsed-time progress
```

### Task 2P.11: Session preamble

**Files:**
- Modify: `src/components/WorkoutView.tsx`

**Step 1:** Render `selectedSession.rationale` above the Main Lifts card. Styled as a small, low-volume box ("📍 Today's focus: …").

**Step 2: Commit**
```
feat(ui): session rationale shown as preamble
```

### Task 2P.12: Per-set weight logging (optional expand)

**Files:**
- Modify: `src/components/WorkoutView.tsx`

**Step 1:** Each exercise row keeps the current single-weight input as the default. Next to it, a small chevron. Tap → expands to reveal per-set weight inputs (one per set count). Weights array stored alongside the single-weight value.

**Step 2:** localStorage key: `workout-tracker:per-set-weights:${sessionId}` with shape `Record<exerciseIndex, number[]>`.

**Step 3:** If any per-set weight is filled, the single-weight input is disabled and shows the MAX of the per-set weights (or empty). Toggle in one direction is safe (single → per-set). Going back collapses but keeps the per-set data (doesn't wipe).

**Step 4: Manual verify + commit**
```
feat(ui): optional per-set weight logging via expand
```

### Task 2P.13: Exercise `?` overlay

**Files:**
- Create: `src/components/ExerciseInfoSheet.tsx`
- Modify: `src/components/WorkoutView.tsx`

**Step 1:** Bottom sheet that takes a `library_id`, reads the matching row from `db.exerciseLibrary` via `useLiveQuery`, and renders: name, image(s), `primaryMuscles`/`secondaryMuscles`, `equipment`, `instructions` list. Close button.

**Step 2:** In WorkoutView, add a small `Info` icon next to each exercise name. Tap → open sheet with that exercise's `library_id`.

**Step 3:** If library has no match (rare — Gemini might return a pool id that's not in Dexie if the pool was extended mid-flight), show "No details for this exercise" instead of hard-failing.

**Step 4: Manual verify + commit**
```
feat(ui): exercise info overlay via ? tap
```

---

## Final verification

1. `npx tsc -b` → exit 0
2. `npm test` → all pass
3. `npm run build` → exit 0
4. Manual browser walkthrough:
   - Fresh user → onboarding → 60-120s honest generation screen → DaySelector-style 7-day strip with real training/rest days → today highlighted → tapping a rest day shows rest card → tapping a training day shows its session
   - Warmup / cardio / cool-down slots auto-populate with default-generated content
   - Regenerate any slot → picker → confirm → new content, chips gone
   - Session preamble visible above main lifts
   - Tap `?` on an exercise → info sheet with library data
   - Expand per-set logging → enter different weights per set → reload, persists
   - Swap still works (Phase 1 feature intact)

## Open questions for Kyra (resolve during execution)

1. Does the cardio slot belong on every training day or only some? (Current default: every session has cardio. Could hide if sessionFocus already includes heavy lower-body work.)
2. Should the DayStrip allow week navigation (arrows to jump to week 2, 3 of the mesocycle) or is "today's week only" enough?
3. Is a session's `rationale` worth regenerating individually, or only with the full plan?

---

**End of plan.** Implementation agent: read 2P.1 → 2P.5 first (schema + DayStrip are load-bearing). Then 2P.6 → 2P.9 (routines). Then 2P.10 → 2P.13 (polish).
