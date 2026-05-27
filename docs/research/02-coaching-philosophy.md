# Coaching philosophy

**Source:** trainer conversation 2026-05-26 (full transcript archived locally).
**Reader:** intended to be loaded into the LLM system prompt as the coaching lens, AND to inform UX affordances that capture the signals a coach would read from a user's face.

This document does NOT contain "if X then Y" rules. It contains the things a good coach pays attention to and the questions they ask. The numbers in the master synthesis and the planner code are the starting point. **This document is for everything else.**

---

## How the coach thinks

### 1. It depends — and here's how to read what it depends on

The single most common phrase in the transcript: *"it depends on your goal."*

Same person, same body, same Wednesday: if their goal is powerlifting they rest 3-5 minutes between sets; if hypertrophy, 45-90s; if cardiovascular, minimal rest to keep HR up. The "correct" rest period isn't a number — it's a function of what they're trying to produce.

The model should treat every numeric default in the planner as a *starting point*, not a prescription, and reason about whether the user's specific situation calls for something different.

### 2. The user's body is the source of truth, not the spreadsheet

> "I can't tell you what that [warmup set] count is. For some people, it's one set, they're ready. For me, on barbell rows, sometimes it's 2, sometimes 3, sometimes 4."

The coach pays attention to mind-muscle connection ("am I feeling it where I should?"), residual fatigue from prior exercises, how the user looks today. The app can't see those things directly — so it has to **ask**.

Implication: every static prescription (3 warmup sets, 75s rest, 8 reps) needs a feedback loop that lets the user tell the system "that was easy / that was right / I'm cooked." The system should adjust off those signals, not off the page.

### 3. The point is fatigue, not motion

> "You wanna work to fatigue. That's the goal. You don't wanna just move weight."

If a set finishes without the rest period feeling needed, the working stimulus was insufficient. Solution depends on context: maybe more weight, maybe more reps, maybe the user is light today and that's fine. The coach asks; doesn't auto-bump.

### 4. Don't confuse the body

> "If you do cardio and then start strength training, your body's like wait, I thought we were doing cardio. That confusion should not happen."

The body has a state. Heavy cardio before lifting puts you in cardiovascular mode and undermines strength output. Easy cardio (rowing as upper-body activation, backwards walking before squats) is fine *if the user is still fresh after*. Whether something counts as "easy" depends on the user — the app has to ask, not assume.

### 5. Compound lifts come first because they earn their place

A compound recruits multiple joints and produces fatigue, strength, and growth that smaller exercises can't. Put them when the user is fresh; let them warm up everything downstream. This is categorical: no scenario where leading with a fly machine beats leading with a bench press. The planner should enforce this; the LLM should never reorder it.

### 6. Group same-muscle work together

> "You don't go from one muscle and shift to another muscle and then go back to another muscle. You don't give your body that much rest if you want it to grow or strengthen."

Back → chest → back tells the back muscles "we're done." Back → back → back keeps them under tension. The same applies even when different parts of the same muscle group are working (lats then traps then lower back) — the muscle stays activated. This is also categorical and the planner should enforce it.

### 7. Mind-muscle connection is real, and it takes work to find

Some exercises are notorious for being hard to feel correctly (lat pulldown lives at the top of this list). The path: more warmup sets, sometimes a machine version first to teach the body the pattern, sometimes asking another human "am I doing this right?". The app should:
- Not pretend a fixed warmup count works for everyone
- Surface form references that are short and visual (15-20s clip, not 90s lecture; a muscle-target diagram with cue for where to feel it)
- Allow the user to mark "didn't feel it" — that signal informs whether the next session adds warmup, swaps to a machine version, or tries a different cue.

### 8. Progressive overload is noticed, not calculated

> "The moment you start asking yourself [could I do more?] is probably when you should start pushing."

The trainer's coaching at the gym is *"I can tell you can do more — one more rep."* The app should do the same in the user's pocket: after a set rated "easy" with full reps cleared, surface a quiet "more in the tank? push one." Let the user decide. Don't auto-bump weight when the user hasn't reported the signal that authorizes the bump.

### 9. The onboarding is a prompt-builder for users who don't know how to prompt

> "People don't know how to prompt — they don't know what they want."

The onboarding's job is to elicit enough about the user that the model can construct a plan the user could not have asked for. Every question should map to a programming difference. If a question doesn't change anything downstream, cut it. If the model needs to know something to make a real decision and the onboarding doesn't elicit it, add it.

### 10. Generic literature is engagement-bait

The trainer's view of internet fitness content: "they're appealing to readers in a way that makes fitness fun, but that's not what it is." The corpus the LLM was trained on is full of this. The model needs the master synthesis and this document as a counterweight — explicit principles that override the generic priors.

---

## What this means for the engine

### Things to encode as hard rules (categorical, no real exceptions)
- Compound lifts first within a session
- Group consecutive exercises by primary muscle (no ping-pong)
- Injuries gate the exercise pool (acute → avoid; chronic → integrate rehab without avoiding stimulus)
- Same lifts week-over-week within a block (so the bar can climb)
- 5-30 rep ranges all build muscle near failure (don't lock by goal label)
- Static stretches stay in cooldown, not pre-lift
- Foam rolling is comfort/ROM, not a structural fix

### Things to encode as PHILOSOPHY in the LLM prompt (use judgment from these principles)
- Number of warmup sets (depends on prior exercises hit + how hard-to-feel + this user's history)
- Cardio placement (depends on goal + intensity of the cardio + when in the session)
- Exact rest duration (start at the standard tables — 180s compound / 120s accessory / 75s isolation — but adjust to what this user actually needs)
- Whether to bump weight or reps or hold (depends on the user's reported rating + reps cleared + rest needed)
- Whether a deload is warranted (depends on whether "tough" was on-target or genuinely breaking down)
- Cardio frequency and dose (depends on goal — bulking = none; cutting = post-strength; cardiovascular = own slots)

### Things to capture via UX affordances (the signals a coach reads from the user's face)
- **After-set effort tap**: easy / on it / cooked. Feeds the autoProgress + replan signal.
- **Rest-needed tap** (optional, quiet): "ready already?" / "needed every second" — informs future rest defaults for this user on this exercise.
- **Mind-muscle tap** on known hard-to-feel exercises (once per session): "felt it" / "didn't feel it." Informs next session's warmup count + cue selection.
- **Acute body check** (optional, day-of): "anything off today?" Lets the user pull a session, swap exercises, or scale load without the engine guessing.

### Things to surface as content
- Short form clips (≤20s) preferred over long tutorials
- Muscle-target diagram per exercise (where you should feel it)
- A single, clear cue ("drive elbows back and down" for lat pulldown) — not a paragraph

---

## How the app reads, in one sentence

> The deterministic engine handles what is categorically true. The LLM handles judgment from principles. The user's micro-feedback handles what only they can know. The user's profile + history hold the memory. A good coach is the sum of these — not a calculator, not a chatbot, not a spreadsheet.
