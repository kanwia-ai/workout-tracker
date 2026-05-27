---
id: hip-thrust-glute-priority
type: exercise
domain: exercises
title: "Hip thrust — the main compound for glute-priority programs"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, glutes, aesthetics]
  training_age: any
  sex: any
  injuries: []
tags: [hip-thrust, glutes, glute-max, glute-priority, EMG, hypertrophy, contreras, plotkin, hinge]
citations:
  - "Contreras B, Vigotsky AD, Schoenfeld BJ, Beardsley C, Cronin J. A comparison of gluteus maximus, biceps femoris, and vastus lateralis electromyographic activity in the back squat and barbell hip thrust exercises. J Appl Biomech. 2015;31(6):452-458. PMID: 26214739. DOI: 10.1123/jab.2014-0301."
  - "Contreras B, Vigotsky AD, Schoenfeld BJ, Beardsley C, McMaster DT, Reyneke JHT, Cronin JB. Effects of a six-week hip thrust vs. front squat resistance training program on performance in adolescent males: a randomized controlled trial. J Strength Cond Res. 2017;31(4):999-1008. PMID: 27253835."
  - "Plotkin DL, Rodas MA, Vigotsky AD, McIntosh MC, Breeze E, Ubrik R, Smith C, Godwin JS, Ruple BA, Mattingly ML, Brook MS, Wilkinson DJ, Smith K, Atherton PJ, Tinsley GM, Vann CG, Roberts MD. Hip thrust and back squat training elicit similar gluteus muscle hypertrophy and transfer similarly to the deadlift. medRxiv 2023 preprint; peer-reviewed publication: Med Sci Sports Exerc 2024."
  - "Neto WK, Soares EG, Vieira TL, Aguiar R, Chola TA, Sampaio VL, Gama EF. Gluteus maximus activation during common strength and hypertrophy exercises: a systematic review. J Sports Sci Med. 2020;19(1):195-203. PMID: 32132843."
  - "Williams MJ, Gibson NV, Sorbie GG, Ugbolue UC, Brouner J, Easton C. Activation of the gluteus maximus during performance of the back squat, split squat, and barbell hip thrust and the relationship with maximal sprinting. J Strength Cond Res. 2021;35(1):16-24. PMID: 29489727."
related: [compound-vs-isolation-taxonomy, squats-make-glutes-grow-most, squat-variants-knee-friendly, substitution-equivalence-table]
contradicts: [squats-make-glutes-grow-most]
---

# Hip thrust — the main compound for glute-priority programs

## Claim

For users whose `muscle_priority` includes `glutes` (or whose stated goal is glute-focused aesthetics), the **barbell hip thrust is the session's main compound** for the glute-focused day — not the back squat.

The evidence:

1. **Contreras 2015** (J Appl Biomech): in a within-subjects EMG study (n=13), the barbell hip thrust produced significantly higher **gluteus maximus EMG activity** than the back squat, both for mean activation (peak: ~70% MVIC for hip thrust vs ~52% for back squat) and peak contraction. Biceps femoris (hamstring) activation was also higher in the hip thrust. Vastus lateralis (quad) was higher in the squat. The hip thrust is more glute-specific; the squat is more quad-dominant.

2. **Contreras 2017** (JSCR): 6-week RCT in adolescent males, hip thrust vs front squat, both 3×/week. Hip thrust group improved horizontal-force-vector tasks (sprint, broad jump) more; front squat group improved vertical-force tasks (vertical jump). Both groups gained — but the *specific transfer* differed by exercise vector.

3. **Plotkin 2024** (Med Sci Sports Exerc, formerly bioRxiv 2023 preprint): 9-week volume-equated RCT in untrained adults comparing back squat vs hip thrust. **Glute hypertrophy was similar between groups.** Squat produced more quadriceps hypertrophy; hip thrust was more glute-specific (no quad growth). Deadlift 1RM transfer was similar. Importantly, this study **does not** show "squats grow glutes more than hip thrust" — it shows equivalent glute growth with squat being a fuller lower-body stimulus and hip thrust being more glute-isolated.

4. **Neto 2020** systematic review of glute max activation across common exercises: hip thrust, step-up, and lunges produced the highest gluteus maximus activation; squats were *moderate*. Single-leg hip thrust variants ranked at or near the top.

**Practical synthesis:** for *general lower-body development*, the back squat is excellent (quad + glute + posterior chain). For *glute-specific priority*, the hip thrust either matches or beats the back squat on glute hypertrophy outcomes while sparing the quads and lower back from additional load — meaning more weekly volume can be allocated to glute work without overloading recovery.

## Nuance

- **"Hip thrust is better than squat for glutes" oversimplifies the Plotkin 2024 finding.** What the data actually shows is *equivalent* glute hypertrophy with different secondary effects. The reason to lead with hip thrust on a glute-priority day is not that it's "better" — it's that it's *more glute-specific* and concentrates the stimulus where the priority is.
- **The single-leg hip thrust (`ex-single-leg-hip-thrust`)** is the highest-glute-activation variant in some studies (Williams 2021) but is more skill- and stability-dependent. Use it as an accessory or for users with asymmetry, not as the default main lift.
- **Range of motion matters.** Full hip extension at the top (squeeze + lockout for 1-2 seconds) is what produces the EMG peak. Half-rep / partial hip thrust is the most common form error and undercuts the stimulus.
- **Hip thrust is technically multi-joint** (hip + slight knee involvement) but the knee is largely static. We classify it as a compound for ordering / priority purposes because it satisfies the *function* of the criteria in [compound-vs-isolation-taxonomy](compound-vs-isolation-taxonomy.md): trains a huge muscle, scales to heavy absolute load, transfers to function (sprinting, jumping).
- **Glute medius is a separate problem.** Hip thrust trains glute max. For glute med (the "upper outer" glute that gives hip shape), specific abduction work is required — clamshells, hip abduction machine, lateral band walks. See [hard-to-feel-exercises-catalog](hard-to-feel-exercises-catalog.md). A well-rounded glute program includes both hip-extension (hip thrust, RDL) AND abduction work.
- **The "squats for booty" myth.** See `myth-squats-make-glutes-grow-most`. Common in fitness influencer content; not supported by head-to-head research. Squats are a *legitimate* glute exercise — just not the *most glute-specific* one.

## What this contradicts

- **"Squats are the best exercise for glute growth."** Not supported by the head-to-head EMG (Contreras 2015) or hypertrophy (Plotkin 2024) data. See myth `squats-make-glutes-grow-most`.
- **"Hip thrust is an isolation exercise / accessory."** Wrong category. The hip thrust trains a huge muscle to high EMG, scales to heavy absolute load (some lifters work hip thrusts in the 3-4× bodyweight range), and is a compound by every functional criterion. Treating it as "just an accessory" is a programming error for glute-priority users.

## Application in this app

- **Variant pool / engine logic:**
  - For sessions where `muscle_priority` includes `'glutes'`, the engine should select `glute_max_bridge_or_hip_thrust` (which resolves to the barbell hip thrust, `library_id: 'ex-hip-thrust'`) as a **main lift**, not as an accessory.
  - The variant pool currently has `glute_max_bridge_or_hip_thrust` tagged `role: 'accessory'`. **This is a flag for engineering** — for glute-priority users, the role tag should be `'main lift'` so the session-order sort places it first. Either: (a) add a separate `barbell_hip_thrust_moderate` variant tagged `main lift` for glute-priority pulls, or (b) make the role tag conditional on `muscle_priority`. Owner decision.
  - A glute-priority week should include: hip thrust (main lift, lower-day 1), RDL or single-leg RDL (compound accessory, lower-day 1 or lower-day 2), squat variant (lower-day 2, secondary glute stimulus + quad), abduction work (glute medius accessory, both lower days).
- **LLM nuance copy** for glute-priority users:
  - "Hip thrusts are the glute-specific compound — Contreras' EMG work shows they produce the highest glute max activation we have data on. Squats are great for the lower body broadly; hip thrusts are the lever for glute-focused growth."
  - "Glute max grows from heavy hip-extension work (hip thrust, RDL, deadlift). Glute medius — the shape on the side of the hip — needs abduction work (clamshells, hip abduction). A complete glute program has both."
  - Do NOT say: "squats are the best for glutes" (myth) or "hip thrust is just an isolation" (category error).
- **`ex-hip-thrust` library entry** in `src/data/exercises.ts:32` currently has the description: *"The most effective exercise for glute max development. Higher bench position allows greater ROM than glute bridges."* This is broadly accurate (peak EMG, range of motion) — but the language "most effective" should be softened to "most glute-specific" to match the Plotkin 2024 nuance. The squats-make-glutes-grow-most myth page already flagged this for softening. Maintenance follow-up.
- **Onboarding question** "What's your glute goal?" should produce a `muscle_priority: 'glutes'` flag. The downstream session structure then biases toward hip-thrust-led lower days as described above.
