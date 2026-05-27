---
id: anabolic-window
type: myth
domain: myths
title: "Myth: You must eat protein within 30 minutes post-workout or you lose gains"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, fat_loss, get_strong, general_fitness]
  training_age: any
  sex: any
  injuries: []
tags: [protein-timing, anabolic-window, nutrition, recovery, post-workout]
citations:
  - "Aragon AA, Schoenfeld BJ. Nutrient timing revisited: is there a post-exercise anabolic window? J Int Soc Sports Nutr 2013; 10:5. PMID 23360586."
  - "Schoenfeld BJ, Aragon AA, Krieger JW. The effect of protein timing on muscle strength and hypertrophy: a meta-analysis. J Int Soc Sports Nutr 2013; 10:53."
  - "Schoenfeld BJ, Aragon AA. How much protein can the body use in a single meal for muscle-building? Implications for daily protein distribution. J Int Soc Sports Nutr 2018; 15:10."
related: [breakfast-is-the-most-important-meal, eat-clean-not-calories]
contradicts: []
---

# Myth: You must eat protein within 30 minutes post-workout or you lose gains

## The myth (verbatim)
"You have to slam a protein shake within 30 minutes after your workout or the anabolic window closes." "Post-workout is the most important meal of the day." "If I miss the window, the session was wasted."

## Why the myth persists
The "anabolic window" was a real scientific hypothesis in the 1990s based on glycogen-resynthesis studies and acute muscle-protein-synthesis (MPS) measurements after fasted training. Supplement marketers seized on it because "you need this shake RIGHT NOW or lose gains" is a perfect compliance + sales hook. The hypothesis got popularized faster than the corrections did.

## What the research actually says
1. **Aragon & Schoenfeld 2013** (the foundational paper that retired the strict window): MPS remains elevated for ~24 hours post-training in trained individuals. The "window" is more like 4-6 hours of high responsiveness, not 30 minutes.
2. **Schoenfeld, Aragon & Krieger 2013 meta-analysis** of protein timing across 23 studies and 525 subjects: once total daily protein intake was controlled for, timing effects largely disappeared. The "timing effect" in pooled analyses was an artifact of higher-protein groups also tending to time their intake — total intake was the actual driver.
3. **Schoenfeld & Aragon 2018:** modest evidence that protein doses should be distributed across the day (~0.4 g/kg per meal, 4-5 meals/day for an active person aiming at the high end of intake) — but the timing window relative to *training* is wide.
4. **Practical implication:** if your pre-workout meal contained ~20-40 g of protein within 1-3 hours before training, the protein is still being digested/absorbed during and after the session. You don't need a separate post-workout shake — the meal counts.

## The corrected understanding
- Total daily protein intake matters most (~1.6-2.2 g/kg for resistance-trained individuals aiming at hypertrophy; Morton 2018 meta).
- Distribution across the day matters secondarily — aim for ~4-5 protein-containing meals spaced 3-5 hours apart.
- The post-workout meal should happen within roughly 2 hours after training (or 4-6 hours from the pre-workout meal, whichever is shorter) — but slamming a shake in the locker room confers no special advantage.
- For users training fasted in the morning, post-workout protein is more time-sensitive (within ~1 hour) because the pre-workout fasting period extends the "no protein in the system" gap.

## Application in this app
- Engine: do NOT prescribe / require post-workout shake timing in rest screens or session-complete flows.
- LLM nuance layer: if user asks about post-workout nutrition, the honest answer is "eat a protein-containing meal in the next couple of hours. The 30-minute window myth has been retired."
- Rest screen / TimerOverlay: must NOT show "drink your shake!" type prompts.
- Copy: no "fuel the gains" / "feed the window" language.

## App surfaces where this myth used to appear
- Audited clean: `RestBanner` copy in `src/lib/copy.ts:restStart` does NOT use anabolic-window framing (per /tmp/myth_sweep_workout_ui.md). No protein-shake-in-30-min nudge anywhere in workout UI.
- Future risk: any nutrition feature added later must avoid this myth. KB entry exists to gate future LLM outputs.
