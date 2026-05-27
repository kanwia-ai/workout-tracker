---
id: lower-back-acute
type: pattern
domain: injuries
title: "Acute lower back flare"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, get_stronger, lean_and_strong, fat_loss, mobility, athletic, general_fitness, glutes, aesthetics, strength, longevity, rehab]
  training_age: any
  sex: any
  injuries: [lower_back]
tags: [lower-back, acute, flare, return-to-lift, mcgill, trap-bar, hip-thrust]
citations:
  - "McGill SM. Low Back Disorders: Evidence-Based Prevention and Rehabilitation, 3rd ed. Human Kinetics 2016. (Acute LBP management — early-phase Big 3 isometrics, walking, avoid axial load.)"
  - "Foster NE, Anema JR, Cherkin D, et al. Prevention and treatment of low back pain. Lancet 2018; 391(10137):2368-2383. PMID: 29573872. (Bed rest is NOT recommended; early activity within tolerance speeds recovery.)"
  - "Hartvigsen J, Hancock MJ, Kongsted A, et al. What low back pain is. Lancet 2018; 391(10137):2356-2367. PMID: 29573870. (Most acute LBP episodes resolve within 6 weeks; recurrence rate ~33% within 1 year.)"
  - "George SZ, Fritz JM, Silfies SP, et al. Interventions for the Management of Acute and Chronic Low Back Pain — APTA CPG. JOSPT 2021; 51(11):CPG1-CPG60."
  - "Swinton PA, Stewart A, Agouris I, Keogh JW, Lloyd R. A biomechanical analysis of straight and hexagonal barbell deadlifts using submaximal loads. JSCR 2011; 25(7):2000-2006. (Trap-bar deadlift reduces lumbar shear vs. straight-bar conventional.)"
  - "Long A, Donelson R, Fung T. Does it matter which exercise? A randomized control trial of exercise for low back pain. Spine 2004; 29(23):2593-2602. (Directional-preference matching improves outcomes vs. non-matched exercise.)"
  - "Callaghan JP, McGill SM. Intervertebral disc herniation: studies on a porcine model exposed to highly repetitive flexion/extension motion with compressive force. Clin Biomech 2001; 16(1):28-37."
related: [lower-back-chronic, desk-worker-pattern]
contradicts: []
---

# Acute lower back flare

## Claim

An **acute lower back flare** is recent-onset (typically <6 weeks), sharp/guarding pain — distinct from chronic stable LBP. Most acute episodes are non-specific and self-resolve within 6 weeks with **graded activity, not bed rest** (Foster 2018; Hartvigsen 2018). Programming response is fundamentally different from chronic:

- **Phase 0 (first 1–2 weeks):** avoid axial loading. Maintain low-load motor-control work (McGill Big 3 at low dose), walking 3 × 10 min/day, directional-preference drill (McKenzie press-up or knees-to-chest depending on which relieves).
- **Phase 1 (weeks 2–4, gating on pain ≤3/10 at rest):** reintroduce loaded hinge with **low-shear variants first**: hip thrust (very low spinal load) → trap-bar deadlift (reduced lumbar shear per Swinton 2011) → goblet squat. Stay 30–50% below pre-flare loads.
- **Phase 2 (weeks 4–6+, gating on pain ≤2/10 during loaded work, clean hinge pattern):** progress to RDL, front squat, then back squat and conventional deadlift if those were in the program pre-flare.

**Bed rest delays recovery.** Early activity within tolerance, even walking, beats inactivity (Foster 2018 Lancet).

## Nuance

- **Acute ≠ chronic.** Chronic LBP responds to progressive loading from session 1; acute LBP needs a brief de-load phase first. Conflating them under-trains the chronic case and over-loads the acute case.
- **Red flags need referral, not programming.** Bowel/bladder changes, saddle anesthesia, progressive neurological deficit, unremitting night pain, fever, history of cancer or recent significant trauma → refer to a physician. Cauda equina syndrome is a surgical emergency.
- **No imaging for routine acute LBP.** Per the APTA CPG and Lancet series, imaging is NOT first-line — most asymptomatic adults have disc abnormalities on MRI (Jensen 1994 NEJM; Brinjikji 2015 AJNR), and imaging often increases fear-avoidance without changing treatment.
- **Directional preference is real but individual.** Some users feel better with extension (press-up), others with flexion (knees-to-chest). Ask early; bias toward the relieving direction during the first 2 weeks. After symptoms settle, both directions are restored.
- **Recurrence is common (~33% within a year per Lancet).** The user who flares should expect to re-enter this phased return-to-lift more than once. The plan should make that path obvious, not catastrophic.
- **Hex-bar / trap-bar deadlift before barbell.** The trap-bar position keeps the load centered over the hips (less anterior moment on the spine) and significantly reduces lumbar shear forces vs. conventional (Swinton 2011). Same lift, lower spinal cost — ideal for returning from a flare.

## What this contradicts

- **"Bed rest will heal your back."** Contradicted by Foster 2018 Lancet — bed rest delays recovery.
- **"You need an MRI to know what's wrong."** Most asymptomatic adults have findings on MRI; imaging in the absence of red flags doesn't change treatment and can worsen fear-avoidance (APTA CPG 2021).
- **"Don't lift again until pain is zero."** Modern protocols return loading well before pain is gone — using graded exposure and pain ≤3/10 as the gate.

## Application in this app

**Protocol file:** `src/data/rehab-protocols/lower_back.ts` — `avoid` block (acute flare) + `rehab` block (week-by-week return).

**Engine behavior when `injuries: [{ part: 'lower_back', severity: 'avoid' }]`:**

1. **Hard ban during avoid phase:** all loaded deadlift, all loaded squat, loaded standing OHP, loaded spinal flexion, weighted sit-ups, running, jumping.
2. **Permitted work:** supine glute bridge (bodyweight), bird dog, side plank (modified), supported hip flexor stretch, walking. McGill Big 3 at low dose daily.
3. **See-professional gate:** if no improvement in ~10 days OR any neurological symptoms (numbness/tingling/weakness in a leg) appear → refer immediately. Surface this in `user_facing.when_to_see_professional`.
4. **Phased return** is handled by the `rehab` block stages in `lower_back.ts` — `wk1_2_reintroduction` (goblet, trap-bar, KB hinge, single-leg glute bridge), `wk3_4_loading` (trap-bar moderate, goblet moderate, RDL light, BSS BW), `wk5_6_return` (conventional DL moderate, back squat moderate, full progression).
5. **Hex-bar / trap-bar bias:** if user dislikes `hex_bar` in `exercise_dislikes` AND has lower_back: avoid|chronic, surface a soft warning that hex-bar is the lower-shear option and ask whether to override the dislike for the early return weeks.
6. **LLM nuance layer must NOT** say: "you'll need an MRI," "this could be a disc herniation," "be very careful," "your back is broken." It SHOULD say: "we're keeping spinal load off for ~2 weeks while symptoms settle, then bringing the hinge back through trap-bar and hip-thrust — those load the hips without loading the lumbar shear pattern as hard as a straight-bar deadlift."
7. **After the user reports pain ≤2/10 sustained for ≥7 days and the rehab stages complete**, severity transitions from `avoid` → `chronic` (the engine should prompt the user to update, not auto-flip).
