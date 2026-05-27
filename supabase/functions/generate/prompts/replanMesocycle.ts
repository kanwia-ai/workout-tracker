// Replan-mesocycle prompt builder — feeds the completed 6-week block, the
// user's per-session check-ins, and the previous directives to Claude Opus
// and asks it to emit adjusted ProgrammingDirectives for the NEXT block.
//
// This is the ONE place in the app where Opus-tier reasoning actually earns
// its cost (~$0.37 per re-plan, run once per 6 weeks). The prompt is
// deliberately opinionated: preserve clinical constraints, adjust only what
// the data says to adjust, don't reinvent the wheel.
//
// Design notes:
//   - System prompt carries the invariant rules (cacheable).
//   - User prompt carries the per-request payload (check-ins + directives).
//   - Output shape is forced via tool_use (replanMesocycleSchema).

export interface ReplanPayload {
  profile: unknown
  completedMesocycle: unknown
  checkins: unknown
  previousDirectives: unknown
}

export const REPLAN_SYSTEM_PROMPT = `You are a clinical strength-and-conditioning coach reviewing the last 6-week training block for a user and adjusting the PROGRAMMING DIRECTIVES that drive the NEXT 6-week block.

You do NOT build the full plan — a downstream rule-based planner reads your directives and assembles the actual sessions. Your ONLY job is to emit adjusted ProgrammingDirectives via the emit_replan tool.

CORE PHILOSOPHY (per docs/research/02-coaching-philosophy.md):

Progression, deload, and volume adjustments respond to the user's REPORTED EFFORT — not the calendar. Every numeric default elsewhere in this prompt (MEV/MAV/MRV ranges, set-count bumps, minute caps) is a STARTING POINT; the actual adjustment is the function the user's check-in data implies. Read the data first; reach for the numeric table only after you've decided what the user's body is telling you.

Critical distinction: "tough" with reps cleared is the TARGET (RIR 1-3 is supposed to feel tough). "failed" with reps NOT completed is the OVERREACH signal. Mistaking tough for failed produces unnecessary deloads and stalls progression.

VOLUME LANDMARKS (MEV / MAV / MRV) — anchor every set-count adjustment to this framework, per muscle group:

- MEV (minimum effective volume): the lowest weekly set count that produces growth. ~8-10 sets/week for most muscle groups in trained lifters.
- MAV (maximum adaptive volume): the sweet spot. ~12-18 sets/week.
- MRV (maximum recoverable volume): the ceiling. ~20-25 sets/week. Past this, recovery breaks down.

Decision rules (read the per-muscle-group rollup in the user payload BEFORE deciding):

- A muscle group with MOSTLY EASY ratings (dominant rating = 'easy', no 'failed', tough+ % is low): the user is at or below MEV → ADD 1-2 sets/week to that muscle group, capping at MAV mid (~14 sets/week).
- A muscle group with BALANCED ratings (dominant = 'solid'): the user is in MAV → MAINTAIN, or +1 set/week if the muscle group is on the user's priority list.
- A muscle group dominated by 'tough' ratings with reps cleared (no 'failed', user is hitting their rep targets): the user is exactly where they should be at RIR 1-3 — MAINTAIN or +1 set/week if it's a priority muscle. Do NOT cut volume. WHY: RIR 1-3 (the prescription) feels tough by design. Treating "tough" as an MRV breach over-deloads users who are training correctly.
- A muscle group dominated by 'failed' ratings (reps not completed, or failed+ % >= 40%): the user is over MRV or under-recovered → CUT 2 sets/week on that muscle group. WHY: only "failed" (reps not completed) signals true overreach. "Tough" with reps cleared = on-target stimulus.
- Coming back from a deload week (last block ended on deload): rebuild from a slightly-lower volume baseline and let the next block climb +1 set/week.

PER-MUSCLE-GROUP REASONING. Aggregate per muscle group, not per exercise. A user can rate "tough" on a single isolation exercise yet be fine for the muscle group overall — don't punish a whole muscle group on the basis of one exercise. The rollup table in the user payload makes this explicit; trust it for set-count direction.

HARD RULES (these fail the review if broken):

1. PRESERVE CLINICAL CONSTRAINTS. Every existing injury_directive stays in place unless the user's check-in notes explicitly reported recovery (e.g. "knee feels great now", "back no longer sore"). If in doubt, KEEP the constraint. Injuries don't vanish because a user stopped mentioning them.

2. ADJUST WHAT THE DATA SAYS TO ADJUST — never adjust on the calendar alone. Ratings + reps cleared are the signal (per docs/research/02-coaching-philosophy.md §"Progressive overload is noticed, not calculated"):
   - 'easy' + reps cleared at top of range → bump intensity (shrink the rep range 1-2 reps at the low end, or raise RIR floor) or add a harder variant to the priority list. Do NOT swap the exercise out.
   - 'solid' + reps cleared across the block → leave it alone. This is the target. (RIR 1-3 is supposed to feel tough; "solid" / "tough" with reps cleared = on-target stimulus.)
   - 'tough' 2+ weeks in a row on the SAME exercise WITH reps CLEARED → HOLD. This is on-target, not a fatigue signal. Don't cut sets. Don't widen rep range. The user is doing the work.
   - 'tough' 2+ weeks in a row with reps_done STAYING FLAT and rating GETTING TOUGHER (the trend is worsening, not on-target) → that IS a fatigue signal — cut one set or widen rep range.
   - 'failed' 2+ weeks in a row on the SAME exercise → propose a substitution via injury_directives.per_session_type.priority_work or via adjusting the session_spacing. Be specific in adjustments_summary about what you swapped and why.
   - If no rating data exists for an exercise (skipped sessions), DON'T change the prescription. Let the next block generate the signal.

3. OVERALL-FEEL SIGNAL. If overall_feel averaged <=2.5 across the block, reduce target_lifting_minutes by 5-10 minutes and widen the finisher rep range. If it averaged >=4.0, you can keep volume flat — don't add more, the user is already adapting well.

4. DON'T SWAP PROVEN-GOOD EXERCISES. If an exercise was rated 'solid' or better consistently, leave it alone. Only change what didn't work.

5. NEVER remove a root_causes entry. Those are structural observations (posture, desk job, weak glute med). They don't expire.

6. RESPECT THE PROGRESSION ARC. If an injury_directive has a progression_arc, advance stage_weeks by 6 (the block length) unless check-in notes explicitly flagged a flare. If flared, REWIND stage_weeks by 1-2 and capture the reason in adjustments_summary.

OUTPUT SHAPE:

Emit exactly ONE call to emit_replan with:
- directives: the full adjusted ProgrammingDirectives object. It must match the schema exactly. Fields you're not changing, copy verbatim from previousDirectives.
- rationale_for_user: 2-4 sentences written FOR the user, in plain conversational English. No em dashes, no jargon, no fitness-bro phrases. Explain what you noticed in their block and the ONE headline change you made. Example: "You handled the hinge days well — that's a real adaptation. I kept the same RDL progression but bumped up the accessory volume a touch. Watch the knee on Bulgarian split squats; you flagged it twice so I dropped to single-leg hip thrusts for now."
- adjustments_summary: 3-6 short bullet strings, each one concrete and scannable. Each bullet describes ONE change. Example: "Dropped Bulgarian split squats — you flagged knee tightness in weeks 3 and 5." Avoid meta bullets like "reviewed your check-ins".

VOICE FOR rationale_for_user:
- Warm, direct, low-key. Close friend who also lifts.
- No "you got this", "crush it", "beast mode", "absolutely crushed it".
- Lowercase fine. Fragments fine. Em dashes forbidden (Kyra hates them).
- Never use bullet points inside rationale_for_user — that's what adjustments_summary is for.

WHEN DATA IS SPARSE:
If fewer than 12 check-ins are provided, be CONSERVATIVE. Small adjustments only. State in rationale_for_user that you had limited data and kept changes minimal.`

export function buildReplanPrompt(payload: ReplanPayload): string {
  const checkinsArr = Array.isArray(payload.checkins) ? payload.checkins : []
  const checkinCount = checkinsArr.length

  // Build a library_id → muscle group map from the completed mesocycle's
  // session.focus arrays. The completedMesocycle is the only place server-side
  // where we can attribute an exercise to a muscle group without re-importing
  // the client-side variant pool. For each library_id, we tally how often it
  // appeared in a session of each focus muscle and pick the dominant one.
  // Unknown ids fall through to "other" in the rollup.
  const libraryMuscleMap = buildLibraryMuscleMap(payload.completedMesocycle)

  // Per-exercise rating histogram (granular detail, model still wants this).
  const exerciseRatingsAgg = summarizeCheckins(checkinsArr)

  // Per-muscle-group rollup (denser signal — the model anchors the volume
  // landmark decision on this table, not on the granular per-exercise list).
  const muscleRollup = summarizeByMuscleGroup(checkinsArr, libraryMuscleMap)
  const muscleRollupTable = renderMuscleRollupTable(muscleRollup)

  return [
    `# Completed block + check-in data

Check-ins collected: ${checkinCount} sessions.

## Muscle group rollup (this block)
${muscleRollupTable}

## Per-exercise rating aggregate (last block)
${JSON.stringify(exerciseRatingsAgg, null, 2)}

## Raw check-ins (full detail for notes + reps_done)
${JSON.stringify(checkinsArr, null, 2)}

## Completed mesocycle (sessions + exercises as planned)
${JSON.stringify(payload.completedMesocycle, null, 2)}

## User profile
${JSON.stringify(payload.profile, null, 2)}

## Previous ProgrammingDirectives (what we USED last block)
${JSON.stringify(payload.previousDirectives, null, 2)}

---

Read the muscle group rollup FIRST to set per-muscle volume direction (MEV/MAV/MRV), then check the per-exercise aggregate + notes for individual swaps. Compare against previousDirectives, and emit adjusted directives for the NEXT 6-week block via emit_replan. Preserve clinical constraints. Adjust only what the data flags. Keep rationale_for_user under 4 sentences.`,
  ].join('')
}

// Aggregate ratings per (library_id, name) to make the signal visible at a
// glance. The model still sees raw check-ins, but aggregation is cheap and
// makes the prompt easier to reason about.
function summarizeCheckins(
  checkins: unknown[],
): Array<{
  library_id: string
  name: string
  count: number
  ratings: Record<string, number>
  notes: string[]
}> {
  const byKey = new Map<
    string,
    {
      library_id: string
      name: string
      count: number
      ratings: Record<string, number>
      notes: string[]
    }
  >()

  for (const raw of checkins) {
    if (!raw || typeof raw !== 'object') continue
    const c = raw as { exercises?: unknown[] }
    if (!Array.isArray(c.exercises)) continue
    for (const e of c.exercises) {
      if (!e || typeof e !== 'object') continue
      const ex = e as {
        library_id?: string
        name?: string
        rating?: string
        notes?: string
      }
      const id = ex.library_id ?? ex.name ?? 'unknown'
      const key = `${id}::${ex.name ?? ''}`
      let entry = byKey.get(key)
      if (!entry) {
        entry = {
          library_id: ex.library_id ?? 'unknown',
          name: ex.name ?? 'unknown',
          count: 0,
          ratings: {},
          notes: [],
        }
        byKey.set(key, entry)
      }
      entry.count += 1
      if (ex.rating) {
        entry.ratings[ex.rating] = (entry.ratings[ex.rating] ?? 0) + 1
      }
      if (ex.notes && typeof ex.notes === 'string' && ex.notes.trim().length > 0) {
        entry.notes.push(ex.notes.trim())
      }
    }
  }

  return Array.from(byKey.values()).sort((a, b) => b.count - a.count)
}

// ─── Muscle-group rollup ────────────────────────────────────────────────────
// Aggregating per-exercise ratings UP to the muscle group level gives the
// model a denser signal for the MEV/MAV/MRV decision: "biceps were mostly
// easy across the block" is more actionable than scanning each curl variant
// individually.

export interface MuscleGroupRollup {
  muscle: string
  exercise_count: number
  dominant_rating: string
  mean_session_feel: number | null
  tough_or_failed_pct: number
}

/**
 * Build a library_id → muscle-group map from the completed mesocycle. We use
 * each exercise's parent session.focus[0] as its muscle attribution. If an
 * exercise appears in multiple sessions with different focus, we pick the
 * most frequent one. Library ids we never see in the completedMesocycle fall
 * through to "other" downstream.
 */
export function buildLibraryMuscleMap(
  completedMesocycle: unknown,
): Map<string, string> {
  const map = new Map<string, Map<string, number>>()
  if (!completedMesocycle || typeof completedMesocycle !== 'object') {
    return new Map()
  }
  const meso = completedMesocycle as { sessions?: unknown[] }
  if (!Array.isArray(meso.sessions)) return new Map()

  for (const s of meso.sessions) {
    if (!s || typeof s !== 'object') continue
    const session = s as { focus?: unknown[]; exercises?: unknown[] }
    const focus = Array.isArray(session.focus) ? session.focus : []
    const muscleGuess = typeof focus[0] === 'string' ? (focus[0] as string) : null
    if (!muscleGuess) continue
    if (!Array.isArray(session.exercises)) continue
    for (const e of session.exercises) {
      if (!e || typeof e !== 'object') continue
      const ex = e as { library_id?: string }
      if (!ex.library_id) continue
      let counts = map.get(ex.library_id)
      if (!counts) {
        counts = new Map<string, number>()
        map.set(ex.library_id, counts)
      }
      counts.set(muscleGuess, (counts.get(muscleGuess) ?? 0) + 1)
    }
  }

  // Resolve to the dominant muscle per library_id.
  const resolved = new Map<string, string>()
  for (const [libraryId, counts] of map.entries()) {
    let bestMuscle: string | null = null
    let bestCount = 0
    for (const [muscle, count] of counts.entries()) {
      if (count > bestCount) {
        bestMuscle = muscle
        bestCount = count
      }
    }
    if (bestMuscle) resolved.set(libraryId, bestMuscle)
  }
  return resolved
}

/**
 * Per-muscle-group aggregate. For each muscle group across all checkins:
 *   - exercise_count: # of (exercise × session) pairs that hit this muscle
 *   - dominant_rating: mode of {easy, solid, tough, failed}
 *   - mean_session_feel: average overall_feel across sessions that touched it
 *   - tough_or_failed_pct: 0..1 share of exercises rated tough or failed
 *
 * Library ids absent from `libraryMuscleMap` are bucketed under "other".
 */
export function summarizeByMuscleGroup(
  checkins: unknown[],
  libraryMuscleMap: Map<string, string>,
): MuscleGroupRollup[] {
  interface Acc {
    muscle: string
    exercise_count: number
    ratings: Record<string, number>
    feel_sum: number
    feel_count: number
    feel_session_ids: Set<string>
    tough_or_failed: number
  }
  const byMuscle = new Map<string, Acc>()

  for (const raw of checkins) {
    if (!raw || typeof raw !== 'object') continue
    const c = raw as {
      session_id?: string
      overall_feel?: number
      exercises?: unknown[]
    }
    if (!Array.isArray(c.exercises)) continue
    const sessionId = typeof c.session_id === 'string' ? c.session_id : ''
    const feelRaw = typeof c.overall_feel === 'number' ? c.overall_feel : null

    // Track which muscle groups this session touched, so we can attribute its
    // overall_feel to each of them exactly once (not once per exercise).
    const touchedMuscles = new Set<string>()

    for (const e of c.exercises) {
      if (!e || typeof e !== 'object') continue
      const ex = e as { library_id?: string; rating?: string }
      const libraryId = ex.library_id ?? ''
      const muscle = libraryMuscleMap.get(libraryId) ?? 'other'
      let acc = byMuscle.get(muscle)
      if (!acc) {
        acc = {
          muscle,
          exercise_count: 0,
          ratings: {},
          feel_sum: 0,
          feel_count: 0,
          feel_session_ids: new Set<string>(),
          tough_or_failed: 0,
        }
        byMuscle.set(muscle, acc)
      }
      acc.exercise_count += 1
      if (ex.rating) {
        acc.ratings[ex.rating] = (acc.ratings[ex.rating] ?? 0) + 1
        if (ex.rating === 'tough' || ex.rating === 'failed') {
          acc.tough_or_failed += 1
        }
      }
      touchedMuscles.add(muscle)
    }

    if (feelRaw != null) {
      for (const muscle of touchedMuscles) {
        const acc = byMuscle.get(muscle)
        if (!acc) continue
        // Avoid double-counting if a session somehow appears twice for the
        // same muscle group via duplicate session_id+muscle combos.
        const dedupeKey = `${sessionId}`
        if (acc.feel_session_ids.has(dedupeKey)) continue
        acc.feel_session_ids.add(dedupeKey)
        acc.feel_sum += feelRaw
        acc.feel_count += 1
      }
    }
  }

  const result: MuscleGroupRollup[] = []
  for (const acc of byMuscle.values()) {
    let dominant = 'unknown'
    let bestCount = -1
    for (const [rating, count] of Object.entries(acc.ratings)) {
      if (count > bestCount) {
        dominant = rating
        bestCount = count
      }
    }
    result.push({
      muscle: acc.muscle,
      exercise_count: acc.exercise_count,
      dominant_rating: dominant,
      mean_session_feel:
        acc.feel_count > 0
          ? Math.round((acc.feel_sum / acc.feel_count) * 10) / 10
          : null,
      tough_or_failed_pct:
        acc.exercise_count > 0
          ? Math.round((acc.tough_or_failed / acc.exercise_count) * 100) / 100
          : 0,
    })
  }
  // Most-touched muscle first so the model sees the highest-volume groups
  // at the top of the table.
  result.sort((a, b) => b.exercise_count - a.exercise_count)
  return result
}

/**
 * Render the muscle-group rollup as a Markdown table for the prompt. Empty
 * input yields an explicit "no rollup available" line so the model doesn't
 * silently get a malformed table.
 */
export function renderMuscleRollupTable(rollup: MuscleGroupRollup[]): string {
  if (rollup.length === 0) {
    return '_(no muscle group rollup available — no check-ins or completedMesocycle data)_'
  }
  const header =
    '| Muscle | Exercises | Dominant rating | Mean session feel | Tough+ % |'
  const sep = '|---|---|---|---|---|'
  const rows = rollup.map((r) => {
    const feel = r.mean_session_feel == null ? '—' : r.mean_session_feel.toFixed(1)
    const pct = `${Math.round(r.tough_or_failed_pct * 100)}%`
    return `| ${r.muscle} | ${r.exercise_count} | ${r.dominant_rating} | ${feel} | ${pct} |`
  })
  return [header, sep, ...rows].join('\n')
}
