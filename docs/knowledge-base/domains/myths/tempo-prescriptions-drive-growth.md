---
id: tempo-prescriptions-drive-growth
type: myth
domain: myths
title: "Myth: Slow tempo / time-under-tension drives more growth"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong]
  training_age: any
  sex: any
  injuries: []
tags: [tempo, time-under-tension, eccentric, hypertrophy]
citations:
  - "Schoenfeld BJ, Ogborn DI, Krieger JW. Effect of repetition duration during resistance training on muscle hypertrophy: a systematic review and meta-analysis. Sports Med 2015; 45(4):577-585."
  - "Wilk M, Zajac A, Tufano JJ. The influence of movement tempo during resistance training on muscular strength and hypertrophy responses: a review. Sports Med 2021; 51(8):1629-1650."
related: [activation-exercises-recruit-muscles, train-to-failure-every-set]
contradicts: []
---

# Myth: Slow tempo / time-under-tension drives more growth

## The myth (verbatim)
"Slow negatives drive more growth — more time under tension means more stimulus." "The eccentric is half the exercise — go really slow on the way down." "TUT (time under tension) is the key to hypertrophy."

## Why the myth persists
- Slow-tempo training FEELS harder — you fatigue earlier per set and the burn is more intense. The intuition is "harder = more growth."
- Bodybuilding lore from the 1970s-90s heavily emphasized eccentric emphasis and TUT.
- Coaches and fitness writers still prescribe specific tempo schemes (e.g., 3-1-1-0) as if they were finely-tuned to growth.

## What the research actually says
1. **Schoenfeld 2015** (Sports Med systematic review + meta-analysis): rep durations within the **range of 0.5-8 seconds per rep** produce similar hypertrophy outcomes. There is no meaningful tempo-driven advantage within this typical training range.
2. **Wilk et al. 2021** (Sports Med review): tempo can affect time-under-tension and total work performed, but the hypertrophy outcome depends primarily on volume, load, and proximity to failure — not on tempo per se.
3. **Master synthesis** flags this (line 317): *"Time-under-tension as a primary programming variable. Evidence null within 0.5–8s/rep range."*
4. **Tempo extremes** (very slow, e.g., 10+ seconds eccentric) can be useful for technique acquisition or tendon-loading rehab — but they cost work-set volume and don't drive more growth than normal-tempo work.

## The corrected understanding
- For hypertrophy: rep duration in the 0.5-8 second window doesn't meaningfully matter. Pick what's controlled and safe.
- Default cue: **"controlled eccentric, intentional concentric."** Don't add specific tempo prescriptions unless there's a reason (technique correction, tendon-loading rehab).
- "More TUT" is not a primary driver of growth. Volume, load, and proximity to failure are.
- The eccentric phase contributes to growth, but it's not "the most important part" — both phases matter.

## Application in this app
- Engine: do NOT prescribe specific tempo (3-1-1-0 etc.) as default. Default cue is "controlled eccentric, intentional concentric" or similar (master synthesis line 301).
- Tempo prescriptions are reserved for: technique correction, tendon rehab, specific user feedback ("I'm not feeling it on the chest" → try slower descent).
- LLM nuance layer: never prescribe "go really slow for more growth." If user reports going slow, validate as a control cue, not a stimulus multiplier.

## App surfaces where this myth used to appear
- `src/data/exercises.ts:186` — `ex-cable-hip-abduction` cue "Slow negatives for more burn" (flagged for revision to "Slow negatives — 2-3s eccentric, lift with intent").
- `src/data/exercises.ts:871` — bench press cue "Go slow for more chest activation" (flagged; tempo doesn't drive selective recruitment).
- `src/data/exercises.ts:1117` — dumbbell curl cue "Lower slowly — the negative is half the exercise" (flagged for revision; eccentric is equal weight, not half-the-exercise).
