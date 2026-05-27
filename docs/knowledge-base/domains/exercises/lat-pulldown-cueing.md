---
id: lat-pulldown-cueing
type: exercise
domain: exercises
title: "Lat pulldown — cueing, grip choice, machine-before-pull-up progression"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, aesthetics, general_fitness]
  training_age: any
  sex: any
  injuries: [shoulder]
tags: [lat-pulldown, vertical-pull, hard-to-feel, cueing, grip, neutral-grip, pull-up-progression, machine-before-free-weight]
citations:
  - "Snyder BJ, Leech JR. Voluntary increase in latissimus dorsi muscle activity during the lat pull-down following expert instruction. J Strength Cond Res. 2009;23(8):2204-2209. PMID: 19826299."
  - "Lusk SJ, Hale BD, Russell DM. Grip width and forearm orientation effects on muscle activity during the lat pull-down. J Strength Cond Res. 2010;24(7):1895-1900. PMID: 20543746."
  - "Lehman GJ, Buchan DD, Lundy A, Myers N, Nalborczyk A. Variations in muscle activation levels during traditional latissimus dorsi weight training exercises: An experimental study. Dyn Med. 2004;3(1):4. PMID: 15140256."
  - "Calatayud J, Vinstrup J, Jakobsen MD, et al. Importance of mind-muscle connection during progressive resistance training. Eur J Appl Physiol. 2016;116(3):527-533."
  - "Schoenfeld BJ, et al. Differential effects of attentional focus strategies during long-term resistance training. Eur J Sport Sci. 2018;18(5):705-712."
  - "Trainer conversation, docs/research/02-coaching-philosophy.md §7: 'Lat pulldown lives at the top of this list.'"
related: [hard-to-feel-exercises-catalog, mind-muscle-connection-research, bodyweight-progression-paths, warmup-set-count]
contradicts: []
---

# Lat pulldown — cueing, grip choice, machine-before-pull-up progression

## Claim

The lat pulldown is the single most-cited "hard-to-feel" exercise in coaching literature and in the trainer's experience (philosophy doc §7). The default failure mode is **biceps-driven pulling** — the lifter flexes the elbows to bring the bar down, the biceps and forearms feel the work, the lats are barely involved. The set looks correct on video.

### The single cue

> **"Drive your elbows DOWN and BACK. Lead with your back, not your arms — pretend your hands are hooks."**

This is the cue the engine renders on the exercise info sheet for every lat pulldown variant. Do not paraphrase, do not invent alternatives. Snyder & Leech 2009 demonstrated that a single expert-delivered cue ("think about pulling with your lats, not your arms") raised lat EMG measurably in one session. Cue persistence is what builds the kinesthetic map — not cue variety.

### Grip selection

The Lusk 2010 study compared grip orientation (pronated / supinated / neutral) and grip width (narrow / wide) on EMG during the lat pulldown. The findings, simplified:

- **Pronated wide grip** is the textbook lat pulldown; engages the lats well but the most common failure mode (bicep-dominant pulling) is also tied to this grip because the elbow path encourages flexion-first movement.
- **Pronated narrow grip** behaves similarly with slightly less lat activation and more biceps.
- **Supinated grip** (chin-up grip on a pulldown) actually produces *equivalent* lat EMG to pronated wide, AND meaningfully more biceps engagement. Good for combined back + biceps stimulus. Bad if isolating lats is the goal.
- **Neutral grip** (palms facing each other on a triangle attachment or parallel handles) — moderately lat-active, often easier for the lifter to "find" the lats because the elbow path is more naturally elbow-down-and-back. Recommended substitution for users who can't feel the pronated version.

**Practical rule for this app:** if the user is doing the standard pronated-grip pulldown and logs `mind_muscle_felt='missed'`, the engine should propose **switching to neutral grip** for the next session before doing anything else. The grip change is a low-cost intervention with research support.

## The machine-before-pull-up progression

The pull-up is the bodyweight version of the lat pulldown. The trainer's framing: *"Sometimes a machine version first to teach the body the pattern."* Translation: the lifter should achieve consistent lat connection on the pulldown machine **before** attempting the pull-up.

### Why machine first?

1. **Adjustable load.** The pulldown lets you start at 30-50% of bodyweight and progress. A pull-up demands full bodyweight from set 1.
2. **No suspension / momentum.** Hanging from a bar invites kipping and bodyweight-swing strategies that bypass lat engagement. Seated at the machine, the lifter is stable; the only variable is the contraction.
3. **Concentric and eccentric both controlled.** On a pull-up, the eccentric (lowering yourself) is a separate hard skill — many lifters drop, losing the eccentric stimulus. On the machine, the eccentric is built into the rep.
4. **Fatigue-resistant for skill acquisition.** You can run 3 sets of 12 on the machine while building the kinesthetic map. Three sets of 12 pull-ups is a strength feat unrelated to skill acquisition.

### Progression path (engine encodes this)

| Stage | Exercise | Trigger to advance |
|---|---|---|
| 1 | Lat pulldown machine, neutral or pronated grip | 3+ sessions of `mind_muscle_felt='felt'` AT working load + sets cleared |
| 2 | Banded / assisted neutral-grip pull-up | Same: 3+ sessions of `'felt'` + reps cleared |
| 3 | Full pull-up (neutral grip first, then pronated) | Maintaining 5+ clean reps in the assisted version |
| 4 | Weighted pull-up | Bodyweight pull-ups for 3 sets of 8+ |

This is encoded in `variants.ts` via:
- `cable_row_neutral`, `chest_supported_row`, `seated_cable_row` for the machine-stage pulling (`HARD_TO_FEEL_EXERCISE_IDS` membership).
- `neutral_grip_pullup_assisted` (`variant:neutral_grip_pullup_assisted`) for stage 2.
- `pullup_full` (`variant:pullup_full`) for stage 3.

The bodyweight rep-target progression in `autoProgress.ts` handles stage 3 → 4 advancement (rep ceiling met → +1 rep target). See [bodyweight-progression-paths](bodyweight-progression-paths.md).

## Warmup volume — 2-3 sets even for advanced lifters

The trainer specifically called out his own routine (philosophy doc §2): *"On barbell rows, sometimes it's 2, sometimes 3, sometimes 4."* Lat-driven pulling is one of the exercises where advanced lifters routinely use more warmup sets than the standard table prescribes, because the connection is variable session-to-session.

- **Default:** 2 warmup sets even at moderate load (vs the 1-2 the standard table would prescribe for a sub-100kg pull).
- **If user logged `'missed'` last session:** 3 warmup sets (the `+1` from `warmupCountDeltaFromHistory()` applied).
- **Cap at 4 warmup sets.** If the lifter still can't find the muscle after 4 ramp sets, the answer is not more warmups — it's a grip change or a machine-version regression (see above).

## Nuance

- **"Pull to upper chest, not behind the neck."** Behind-the-neck pulldown is a relic of 70s-80s training; it puts the shoulder in extreme external rotation under load and is a known shoulder-impingement risk. The engine does not emit behind-the-neck variants. Lehman 2004 specifically tested behind-the-neck vs front pulldown and found no hypertrophy advantage — only injury risk.
- **Grip width does not produce dramatically different lat recruitment.** Lusk 2010: differences were small. The bigger lever is the *cue + elbow path*, not the grip width.
- **Don't fight a lat pulldown to make it a pull-up.** If a lifter has a shoulder injury that contraindicates the overhead pull pattern, the row patterns can be used to maintain back stimulus. The pulldown / pull-up progression is the default path, not the only path.
- **The lat pulldown is not "easier" than a pull-up in stimulus quality.** A controlled set of 8 on the machine at 60kg with great lat connection produces more lat hypertrophy than 4 sloppy kipping pull-ups. Don't apologize for the machine.

## Application in this app

- **Exercise info sheet** for `ex-lat-pulldown`, `ex-lat-pulldown-wide`, and any `pulldown`-named variant renders:
  - The single cue from this entry (verbatim).
  - The grip-change suggestion as a secondary option when `mind_muscle_felt='missed'` is in the recent history.
  - The pull-up progression path as a "where this is heading" footnote for users at stages 1-2.
- **Warmup-set count** defaults to 2 for lat pulldown / pull-up variants regardless of working load. +1 from the hard-to-feel delta when applicable. Cap at 4.
- **Replan logic:** repeated `'missed'` (3 consecutive sessions) on a pronated-grip pulldown should trigger an engine suggestion: "switch to neutral grip" rather than swapping the exercise. The exercise stays; the variant changes.
- **LLM nuance copy** when prescribing a lat pulldown:
  - "Lat pulldowns are famously hard to feel — most people pull with the biceps. The cue this week: drive your elbows DOWN and BACK, hands are hooks."
  - "You're on the machine deliberately — we'll progress to assisted pull-up once you're feeling the lats consistently here."
  - Do NOT say: "do pull-ups instead, they're better" (false; quality > modality) or invent new cues each session.
- **Source field** on the `ex-lat-pulldown` library entry should reference this KB entry rather than "General strength training" — that's a maintenance follow-up for the data file.
