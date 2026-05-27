---
id: concurrent-training-blunts-gains
type: myth
domain: myths
title: "Myth: Any cardio + strength training in the same session blunts gains (concurrent training interference)"
confidence: medium
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, fat_loss, general_fitness]
  training_age: any
  sex: any
  injuries: []
tags: [concurrent-training, cardio, interference, hypertrophy, recovery]
citations:
  - "Wilson JM, Marin PJ, Rhea MR, et al. Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises. JSCR 2012; 26(8):2293-2307."
  - "Schumann M, Rønnestad BR (eds.). Concurrent Aerobic and Strength Training: Scientific Basics and Practical Applications. Springer 2019."
  - "Methenitis S. A brief review on concurrent training: from laboratory to the field. Sports 2018; 6(4):127."
  - "Petré H, Hemmingsson E, Rosdahl H, Psilander N. The effects of concurrent aerobic and strength training on muscle fiber hypertrophy: a systematic review and meta-analysis. Sports Med 2021; 51(8):1701-1717."
related: [cardio-burns-fat-directly, the-fat-burning-zone]
contradicts: []
---

# Myth: Concurrent training (cardio + strength in the same session) blunts gains

## The myth (verbatim)
"Don't do cardio if you want to grow muscle." "Cardio kills gains." "Cap cardio at 10 minutes after lifting or you'll undo the workout."

## Why the myth persists
- Wilson et al. 2012 meta-analysis quantified the "interference effect" — concurrent training showed smaller hypertrophy/strength gains than strength-only training. The finding was real, but the magnitude was modest and the conditions specific.
- The Wilson finding was over-extended into "any cardio at all blunts gains" — particularly the made-up "~10 min cap" rule that has no source.
- Bro-science forums and physique-coaching content amplify the interference framing because it justifies skipping cardio.

## What the research actually says
1. **Wilson 2012** found interference effects on hypertrophy AND strength, with running modality producing more interference than cycling. BUT: the effects were observed mainly with high-volume / high-frequency / high-intensity endurance training, not with moderate doses.
2. **Schumann & Rønnestad 2019** (book / multiple chapters): interference is small, modality-dependent (running > cycling for impairment), and largely avoidable when:
   - Cardio is moderate-dose, not high-volume endurance training
   - Strength and cardio sessions are separated by ≥6 hours when possible
   - Strength precedes cardio when same-session
3. **Methenitis 2018**: practical review concludes interference is modest in healthy populations doing recreational training; serious endurance volume needed to materially blunt hypertrophy.
4. **Petré 2021** meta-analysis: concurrent training did not significantly affect muscle fiber hypertrophy in most contexts. Most users worrying about interference are nowhere near the volumes that produce it.
5. **The "10 min after strength" cap** with citation to Wilson 2012: this is NOT in Wilson 2012. It's a fabricated rule that's been treated as research-backed.

## The corrected understanding
- Light-to-moderate cardio + strength training in the same week (or even same session) coexist fine for most users.
- Interference is real but small and mostly seen at high endurance volumes (e.g., distance runners trying to build muscle).
- For a typical lifter: 2-4 cardio sessions/week of 20-40 min each is safe. The hypertrophy literature shows essentially no blunting at these doses.
- If interference IS a concern: separate cardio and strength by ≥6 hours; favor cycling/rowing over running; do strength first if same-session; keep total cardio volume reasonable relative to strength volume.

## Application in this app
- Engine: do NOT prescribe a hard "~10 min" cap on post-strength cardio. That number isn't in the research.
- LLM nuance layer: if user asks about cardio + lifting, explain it accurately — moderate cardio doses are fine for most users; only worry about interference at high endurance volumes.
- CardioPage / CardioGoals can suggest scheduling cardio on non-strength days OR separated by hours, but this is a preference / optimization, not a hard cap.

## App surfaces where this myth used to appear
- `supabase/functions/generate/prompts/generateRoutine.ts:28` — "cap total post-strength cardio around ~10 min to avoid the concurrent-training interference effect (Wilson 2012 meta-analysis)" (flagged for revision per myth_sweep_planner.md H2; the 10 min cap is not in Wilson 2012).
