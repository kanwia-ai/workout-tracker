# User Journey Contract

The source of truth for what persists, what resets, and what each screen does.
If you find yourself about to add another piecemeal fix — come here first.

## Persistence zones

| Zone | What | Survives reload? | Survives nav? | Synced to cloud? |
|------|------|------------------|---------------|------------------|
| Dexie | plan, session logs, set logs, PRs, profile, routines, day overrides | yes | yes | yes (Supabase) |
| localStorage | theme, cheek, selected day, app view, per-session scratch weights | yes | yes | no |
| React state | modals, timers, burst animations, in-flight generation | no | no | n/a |

Rule: **if a user would be frustrated to lose it on reload, it goes to Dexie
or localStorage. Never useState alone.**

## Screens

### HomeScreen (the dashboard)
Shown when `view === 'workout' && !sessionStarted`.

- Greeting + Lumo bubble
- 7-day DayStrip — tap a day to preview its planned session
- Today/selected card — shows planned session OR override OR rest-day state
- Stats row (sessions this week / volume / PRs)

**Expected state survival:**
- `selectedDow` persists across bottom-nav and reload (`SELECTED_DOW_KEY`).
- Stats re-load from Dexie on mount (fine, cheap).

### WorkoutView (in-session)
Shown when `view === 'workout' && sessionStarted`.

- Top bar: back arrow + "IN SESSION" + title + kebab
- Lumo preamble
- Progress strip
- Warmup accordion
- Working sets w/ rest banner
- Cool-down accordion

**Expected state survival:**
- Per-set checkmarks, weights, warmup checks persist to localStorage keyed by
  session ID. Survive reload.
- Back to Home does NOT end the session — it just lets the user peek at Home.
  The session stays live. (Today this unmounts the view; revisit.)

### Other views
- ExerciseBrowser, ProgressView, CardioPage, ExerciseCapture, MobilityRoutines,
  SettingsScreen — all reachable via bottom nav or settings icon. On close,
  they should restore HomeScreen with its prior `selectedDow`.

## Day override model

A **day override** is a decision by the user to do a real workout on a day
the plan marked as rest (or to swap today's workout for another one).

**Shape** (Dexie `dayOverrides` table):
```
{
  id: `${user_id}:${dateISO}`       // e.g. "abc:2026-04-20"
  user_id: string
  date: string                      // YYYY-MM-DD, local
  session_id: string                // refs a session in the plan
  created_at: string
  synced: boolean
}
```

**Semantics:**
- `getSessionForDate(plan, overrides, date)` = override(date) ?? scheduled(date).
- Overrides are per-date, not per-day-of-week, so they don't recur.
- Deleting an override (via UI) restores the scheduled session for that date.
- Overrides older than 14 days can be pruned.

**User flow (rest day → build a workout):**
1. User lands on Home. Today's card is the RestCard.
2. User taps "feeling it? build me one anyway".
3. We pick the next upcoming session (status=upcoming, lowest week/ordinal)
   and write a `dayOverride` row for today → that session's id.
4. We navigate to WorkoutView.
5. WorkoutView reads `getSessionForDate(plan, overrides, today)` and shows
   that session. User lifts.
6. User navigates away. Comes back. Override is still on today → still shows
   the workout.

## View + session persistence

- `view` (which tab) → localStorage key `workout-tracker:view`.
- `sessionStarted` (home vs. in-session) → localStorage key
  `workout-tracker:session-started`. Cleared when `onWorkoutComplete` fires.
- Reloading the page restores both. A user mid-workout who drops their phone
  and reopens resumes exactly where they were.

## What must NEVER be state-only
- `view`
- `sessionStarted`
- `selectedDow`
- any "I just made this" user input (sets, weights, overrides, custom exercises)

## Non-goals (explicitly deferred)
- Generating a brand-new session via Gemini on demand for rest-day overrides
  (we reuse the next scheduled session for now — simpler, no API cost).
- Cross-device realtime sync (overrides sync up via existing Supabase
  pattern but are single-source on the active device).
- Past-date edits ("I did a workout yesterday, log it retroactively"). Today
  only for MVP.
