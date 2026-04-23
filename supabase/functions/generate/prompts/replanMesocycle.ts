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

HARD RULES (these fail the review if broken):

1. PRESERVE CLINICAL CONSTRAINTS. Every existing injury_directive stays in place unless the user's check-in notes explicitly reported recovery (e.g. "knee feels great now", "back no longer sore"). If in doubt, KEEP the constraint. Injuries don't vanish because a user stopped mentioning them.

2. ADJUST WHAT THE DATA SAYS TO ADJUST. Ratings are the signal:
   - 'easy' across weeks 2-6 on an exercise → bump intensity (shrink the rep range 1-2 reps at the low end, or raise RIR floor) or add a harder variant to the priority list. Do NOT swap the exercise out.
   - 'solid' across the block → leave it alone. This is the target.
   - 'tough' 2+ weeks in a row on the SAME exercise → check if the user progressed. If reps_done stayed flat while rating got tougher, that's a fatigue signal — cut one set or widen rep range.
   - 'failed' 2+ weeks in a row on the SAME exercise → propose a substitution via injury_directives.per_session_type.priority_work or via adjusting the session_spacing. Be specific in adjustments_summary about what you swapped and why.

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

  // Summarize ratings per exercise to make the signal cheap to spot. The raw
  // JSON is included too so the model can read notes + reps_done when it
  // matters, but most of the decisions come from this aggregate.
  const exerciseRatingsAgg = summarizeCheckins(checkinsArr)

  return [
    `# Completed block + check-in data

Check-ins collected: ${checkinCount} sessions.

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

Read the check-in aggregate + notes, compare against previousDirectives, and emit adjusted directives for the NEXT 6-week block via emit_replan. Preserve clinical constraints. Adjust only what the data flags. Keep rationale_for_user under 4 sentences.`,
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
