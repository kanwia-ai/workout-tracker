---
id: the-workout-app-domain-boundary
type: principle
domain: body-composition
title: "The app's domain is the workout plan, not the kitchen"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [fat_loss, lean_and_strong, build_muscle, get_stronger, general_fitness, mobility, athletic]
  training_age: any
  sex: any
  injuries: []
tags: [scope, design-philosophy, domain-boundary, fat-loss, cardio-default]
citations:
  - "Synthesis claim. Derived from: Lichtman 1992 NEJM (calorie-tracking-realism), Hall NIH dynamic energy balance (fat-loss-fundamentals), trainer interview (02-coaching-philosophy.md), and the app's design constraint that it does not collect dietary intake."
  - "Trainer position, docs/research/02-coaching-philosophy.md — 'cardio post-strength on a cut' is the workout-side answer when intake is the user's responsibility."
related: [fat-loss-fundamentals, calorie-tracking-realism, cardio-for-fat-loss, deadline-aware-programming, protein-requirements-for-muscle-preservation]
contradicts: []
---

# The app's domain is the workout plan, not the kitchen

## Claim
This workout tracker explicitly does NOT own the user's nutrition. It does not collect intake, does not prescribe macros, and does not condition its prescription on dietary compliance. This is a deliberate design decision, grounded in two facts:

1. **Fat loss requires a calorie deficit** (`fat-loss-fundamentals`). Without one, no training method produces fat loss.
2. **User-reported intake is systematically inaccurate** (`calorie-tracking-realism`, Lichtman 1992). Building a fat-loss program that depends on the user accurately tracking food is building a program that will fail for most users.

The consequence: for `primary_goal = fat_loss` users, the app's job is to maximize the workout-side contribution to a deficit the user is presumably trying to create (or to body-comp change generally). That means **cardio is the default**, prescribed alongside the lifting program, because:
- Cardio is a workout-side variable the app can prescribe and the user can perform inside the app.
- A reasonable cardio dose (150 min/wk moderate, post-lift) widens the deficit without disrupting lifting adaptations (see `cardio-timing-relative-to-lifting`, `cardio-for-fat-loss`).
- Strength training alone, without a deficit AND without cardio, produces muscle gain and minimal fat loss — which is not what the fat_loss user is asking for.

The trainer's framing (`docs/research/02-coaching-philosophy.md`): "if I'm cutting, I do cardio after the workout." This is the position the app encodes for fat-loss users by default.

## Nuance
- The user can OPT OUT of cardio in settings. Some users prefer to run the entire deficit via intake and treat lifting as muscle-preservation only. When they do, the LLM rationale must explain the tradeoff honestly: "you've turned cardio off; the workout side will preserve muscle but won't move the deficit. Fat loss now lives fully on intake."
- The app DOES provide protein/nutrition GUIDANCE in plan rationale (via `protein-requirements-for-muscle-preservation`) — it just doesn't enforce or track it. Guidance is fine; surveillance and macro-tracking are out of scope.
- For obese users or users with very high NEAT deficits possible from walking, the app can prescribe step targets as a softer cardio alternative (8-12k steps/day is a meaningful expenditure lever).
- The app is also NOT responsible for sleep, stress, alcohol, or other lifestyle variables that affect body comp. It can note them in rationale; it doesn't own them.

## What this contradicts
- The pattern of fat-loss apps that bundle calorie tracking, macro tracking, and meal plans alongside workouts. That is a different product. This app's value proposition is the training side done well.
- The implicit assumption (common in lifter culture) that "if you train hard enough, the diet works itself out." Training doesn't substitute for a deficit; Hall et al. dynamic-energy-balance work is unambiguous on this.

## Application in this app
- **Default for `primary_goal = fat_loss`**: prescribe 2-3 cardio sessions/wk, post-strength, 20-40 min moderate-intensity. Communicated as "the workout-side lever we control on your cut."
- **Settings toggle**: `prescribe_cardio: bool` (default true for fat_loss; default false for build_muscle, get_stronger). User can override.
- **Rationale language**: the LLM nuance layer is authorized — when goal is fat_loss — to say (citing this entry):
  > "Fat loss requires a calorie deficit, which lives in the kitchen, not the gym. This app doesn't track your food because the research shows self-tracked intake is off by 20-40% on average — so we don't want to be the system that depends on it being right. What we CAN do is the workout-side lever: cardio, scheduled after lifting so it widens the deficit without compromising your lifts."
- **No macro tracking, ever.** The app does not collect dietary data. Future features that touch nutrition (e.g., protein REMINDERS) are guidance-only — they do not log or verify.
- **Honesty in promises**: the LLM rationale must not promise fat loss; it can promise the workout-side contribution and explain what the user still owns.
- **Cross-references**: this entry is the umbrella; specific levers are in `cardio-for-fat-loss`, `cardio-timing-relative-to-lifting`, `protein-requirements-for-muscle-preservation`, and `deadline-aware-programming`.
