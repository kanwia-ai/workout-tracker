---
id: cardio-timing-relative-to-lifting
type: principle
domain: body-composition
title: "Cardio AFTER lifting; never heavy cardio before"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [fat_loss, lean_and_strong, build_muscle, get_stronger, general_fitness, athletic]
  training_age: any
  sex: any
  injuries: []
tags: [concurrent-training, cardio, lifting, interference-effect, session-order]
citations:
  - "Wilson JM, Marin PJ, Rhea MR, Wilson SMC, Loenneke JP, Anderson JC. Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises. J Strength Cond Res 2012; 26(8):2293-2307. DOI 10.1519/JSC.0b013e31823a3e2d"
  - "Eklund D, Schumann M, Kraemer WJ, Izquierdo M, Taipale RS, Häkkinen K. Acute endocrine and force responses and long-term adaptations to same-session combined strength and endurance training in women. J Strength Cond Res 2016; 30(1):164-175."
  - "Schumann M, Feuerbacher JF, Sünkeler M, Freitag N, Rønnestad BR, Doma K, Lundberg TR. Compatibility of concurrent aerobic and strength training for skeletal muscle size and function: an updated systematic review and meta-analysis. Sports Med 2022; 52(3):601-612. DOI 10.1007/s40279-021-01587-7"
  - "Trainer interview, docs/research/02-coaching-philosophy.md sections 4 ('Don't confuse the body') and 'PHILOSOPHY' rule on cardio placement"
related: [cardio-for-fat-loss, fat-loss-fundamentals, deadline-aware-programming]
contradicts: []
---

# Cardio AFTER lifting; never heavy cardio before

## Claim
Same-day session order matters for the concurrent-training interference effect:
- **Heavy or intense cardio performed BEFORE lifting** measurably reduces force output, total reps completed, and load lifted in the subsequent resistance session. Over training blocks, this attenuates strength and hypertrophy gains (Wilson 2012 meta; Schumann 2022 updated review).
- **Cardio performed AFTER lifting**, or on a separate session at least ~6 hours later, shows much smaller interference. Strength and hypertrophy gains are largely preserved.
- **Easy-pace, short aerobic work (5-10 min) as a warmup-style raise** before lifting (cycling, rowing for upper days, easy treadmill) is fine — it serves as the RAMP "raise" phase and does not produce systemic fatigue that suppresses strength output.

The trainer puts it bluntly: "If you do cardio and then start strength training, your body's like — wait, I thought we were doing cardio. That confusion should not happen." (`02-coaching-philosophy.md` §4). Same person says: "If I'm cutting, I do cardio AFTER the workout."

Modality also matters (Wilson 2012): running produces more interference than cycling for lower-body strength/hypertrophy, plausibly due to overlapping eccentric load on the quads.

## Nuance
- Frequency caps the effect: ≤3 endurance sessions/wk shows minimal interference; ≥4-5 sessions/wk meaningfully reduces strength and hypertrophy gains.
- "Easy" is user-specific. A Zone-2 bike ride that's easy for a fit user can be glycogen-depleting for a deconditioned one. The trainer's exact words: "whether something counts as 'easy' depends on the user — the app has to ask, not assume."
- For a strength-day (heavy compound), even a moderately hard pre-lift cardio session compromises top-set output. For a high-rep accessory day, the effect is smaller but still present.
- HIIT before lifting is the worst combination: maximal fatigue, depleted glycogen, suppressed power output for the subsequent compounds.
- For cardio-focused goals (e.g., running a race), reverse the priority and lift after running or on different days; this is outside the body-composition use case but worth flagging.
- Cardio in a fully separate session, ≥6 hours away from the lift, restores most of the lost strength quality.

## What this contradicts
- "Cardio first to warm up properly" — true ONLY for a brief raise phase (≤5-10 min, RPE ≤4). Longer or harder pre-lift cardio is interference, not warmup.
- "Concurrent training is always bad" — Wilson 2012 shows the effect depends on dose, modality, and order; with the right protocol, gains are preserved.
- "Order doesn't matter for hypertrophy" — Schumann 2022 review: order is a smaller effect than frequency/volume but still measurable; AFTER is the safer default.

## Application in this app
- The scheduler MUST place any prescribed cardio AFTER the lifting block on combined-session days.
- The scheduler MUST NOT prescribe HIIT or moderate-vigorous cardio (RPE >6) before a session that contains heavy compound lifting.
- A short Raise phase (≤5 min easy bike or row, RPE 3-4) before the lifting block is the standard warmup pattern from R3/master-synthesis — this is NOT considered cardio for the interference rule.
- Cardio on standalone days (no lifting) has no interference risk and is the preferred option for high-dose cardio (>30 min/session).
- If the user reports "I want to do cardio on lifting days but in the morning before work, then lift after work" — that's the same-day separated case; treat as low-interference and allow it.
- For `primary_goal = build_muscle` AND user requests cardio sessions: cap at 2 sessions/wk, cycling/rowing/incline-walk preferred over running, ≤30 min, post-lift or separate.
- For `primary_goal = fat_loss`: cardio post-lift is the default; standalone-day cardio is acceptable; pre-lift hard cardio is blocked at the scheduler level.
