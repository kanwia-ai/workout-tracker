---
id: ramp-method
type: principle
domain: warmup-recovery
title: "RAMP warmup structure (Raise / Activate / Mobilize / Potentiate)"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, get_strong, lean_and_strong, fat_loss, general, athletic, mobility]
  training_age: any
  sex: any
  injuries: []
tags: [warmup, ramp, structure, general-to-specific, dynamic-prep]
citations:
  - "Jeffreys I. Warm-up revisited: The RAMP method of optimizing warm-ups. Professional Strength and Conditioning 2007; 6:12-18."
  - "Jeffreys I. The Warm-Up: Maximize Performance and Improve Long-Term Athletic Development. Human Kinetics 2019. ISBN 978-1-4925-7127-8."
  - "McGowan CJ, Pyne DB, Thompson KG, Rattray B. Warm-up strategies for sport and exercise: mechanisms and applications. Sports Med 2015; 45(11):1523-1546. DOI 10.1007/s40279-015-0376-x"
  - "Fradkin AJ, Zazryn TR, Smoliga JM. Effects of warming-up on physical performance: a systematic review with meta-analysis. JSCR 2010; 24(1):140-148. DOI 10.1519/JSC.0b013e3181c643a0"
  - "Haff GG, Triplett NT (eds). NSCA Essentials of Strength Training and Conditioning, 4th ed. Human Kinetics 2016 — warm-up chapter."
related: [warmup-set-purpose, warmup-set-count, static-vs-dynamic-stretching, warmup-cardio-integration]
contradicts: []
---

# RAMP warmup structure (Raise / Activate / Mobilize / Potentiate)

## Claim
A complete pre-lift warmup follows the RAMP sequence — **R**aise → **A**ctivate → **M**obilize → **P**otentiate — moving from general physiological prep to lift-specific patterning. This is the standard structure in modern strength & conditioning curricula (Jeffreys 2007; 2019; NSCA Essentials 4e).

The four phases:

1. **Raise (2-4 min).** Easy continuous movement to raise core temperature, heart rate, blood flow, and muscle elasticity. Examples: easy cycle, jumping jacks, brisk walk, low-pace row. Not intense enough to fatigue the lift to follow.
2. **Activate (2-3 min).** Engage the muscles that will work in the session — for upper days that's scap retractors, rotator cuff, serratus; for lower days that's glutes, deep core, hip abductors. Bird dog, banded clamshell, pull-apart, scap push-up live here.
3. **Mobilize (2-3 min).** Dynamic range-of-motion work on the joints that need to express full ROM in the session. Squat day: ankle DF mob, 90/90 transitions, deep-squat pry. Bench day: T-spine open book, band dislocates. Note: this is **dynamic** ROM work, not held static stretches (see `static-vs-dynamic-stretching`).
4. **Potentiate (3-8 min, lift-specific).** Ramp sets on the main compound — progressive jumps from empty bar / light load up to working weight, never to failure, always with 2+ reps in reserve. Working load <60kg → ~2 ramp sets; 60-100kg → ~3; >100kg → 4-5. This rehearses the motor pattern and tunes the nervous system to the working load.

Total budget: 6-10 minutes for most lifters, longer for heavy main lifts or cold-environment / early-morning sessions.

## Nuance
- **The general-to-specific progression is the load-bearing concept**, not the four-letter mnemonic. McGowan et al. 2015 frame the same idea as a general phase (raise temp/HR) followed by a specific phase (movement-pattern rehearsal at increasing intensity). RAMP just adds the activation + mobilization granularity in the middle.
- **Phases blend.** A bodyweight goblet-squat sequence can simultaneously raise core temp, mobilize the hips/ankles, and activate the glutes. Don't pad time by treating them as four discrete blocks; one drill can serve two phases.
- **Activate and Mobilize are not standalone "performance boosters."** EMG data confirms they engage the target muscles, but the transfer to subsequent lift performance is modest and inconsistent (R3 P12). Frame them as "patterning" / "priming the lift," not as a performance-enhancer in their own right.
- **Skip Potentiate on accessory and isolation work.** Ramp sets belong on the main compound. Accessory compounds get one lighter set (~50-60% working load × 6-8); isolations get an optional 1 set at 50% × 10. (See `warmup-set-count`.)
- **Warmup volume scales with working load and exercise complexity, not with a fixed rep count per session.** A 40kg goblet-squat day and a 140kg back-squat day get very different Potentiate volumes.
- **Cold-environment / early-morning sessions add 1 extra ramp set** (R3 master synthesis).

## What this contradicts (optional)
- Static-stretch-only warmups (the "touch your toes, swing your arms, hit the bar" pattern from generic gym lore). Static stretches >30s pre-lift acutely depress force; see `static-vs-dynamic-stretching`.
- "Just do 5 minutes of cardio" as a complete warmup — Raise without Activate / Mobilize / Potentiate skips the motor-pattern rehearsal that actually transfers to the lift.
- The notion that warmup is purely about "increasing blood flow." That's only the Raise phase; the trainer-emphasized purpose is also mind-muscle connection and pattern rehearsal (see `warmup-set-purpose`).

## Application in this app
- `generateWarmup.ts` already orders structured warmup elements through `CATEGORY_ORDER = ['cv_prep', 'mobility', 'activation', 'specific']`. That ordering operationalizes RAMP: `cv_prep` = Raise, `mobility` = Mobilize, `activation` = Activate, `specific` = Potentiate. Note the catalog runs Mobilize before Activate; either order is defensible and Jeffreys' own writing groups them as "the prep block." The current order works fine — don't reorder without a coaching reason.
- When the LLM nuance layer narrates a warmup, it may name the phase ("here's the activation work for your right trap pattern") but should not invent extra exercises. The structured warmup is authoritative.
- The Potentiate phase is rendered in the workout view as ramp sets on the main compound, NOT as part of the structured warmup object — those two systems run side-by-side. The structured warmup ends at Activate/Mobilize; ramp sets are surfaced when the user starts the first working exercise.
- The LLM may suggest substituting a Mobilize drill if the user reports an injury flag, but ONLY from the existing rehab-protocol pool — do not let it free-form invent mobility drills.
