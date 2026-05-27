---
id: upper-back-pain
type: pattern
domain: injuries
title: "Upper back pain / thoracic kyphosis / mid-trap weakness"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, get_stronger, lean_and_strong, fat_loss, mobility, athletic, general_fitness, glutes, aesthetics, strength, longevity, rehab]
  training_age: any
  sex: any
  injuries: [upper_back]
tags: [upper-back, thoracic-extension, mid-trap, lower-trap, rhomboids, desk-worker, scap-control, face-pull, posture]
citations:
  - "Cools AM, Dewitte V, Lanszweert F, et al. Rehabilitation of scapular muscle balance: which exercises to prescribe? Am J Sports Med 2007; 35(10):1744-1751. (Prone Y/T/W and lower-trap-biased EMG-selected exercises.)"
  - "Cools AM, Witvrouw EE, Declercq GA, Danneels LA, Cambier DC. Scapular muscle recruitment patterns: trapezius muscle latency with and without impingement symptoms. Am J Sports Med 2003; 31(4):542-549."
  - "Ludewig PM, Reynolds JF. The association of scapular kinematics and glenohumeral joint pathologies. J Orthop Sports Phys Ther 2009; 39(2):90-104. (Scapular kinematics + posterior chain weakness in shoulder pathology.)"
  - "Ekstrom RA, Donatelli RA, Soderberg GL. Surface electromyographic analysis of exercises for the trapezius and serratus anterior muscles. JOSPT 2003; 33(5):247-258. (EMG ranking of mid-trap / lower-trap / serratus exercises — prone Y, prone T, wall slide.)"
  - "Reinold MM, Escamilla RF, Wilk KE. Current concepts in the scientific and clinical rationale behind exercises for glenohumeral and scapulothoracic musculature. JOSPT 2009; 39(2):105-117."
  - "Page P, Frank CC, Lardner R. Assessment and Treatment of Muscle Imbalance: The Janda Approach. Human Kinetics 2010. (Historical reference for the desk-worker pattern; the syndrome framing is contested — see myths/postural-syndrome-diagnoses.md.)"
  - "Rosa DP, Borstad JD, Ferreira JK, Camargo PR. The influence of stretching the pectoralis minor and serratus anterior strengthening on shoulder kinematics. J Shoulder Elbow Surg (cited via R6 master synthesis)."
  - "Mintken PE, McDevitt AW, Cleland JA, et al. Cervicothoracic manual therapy plus exercise therapy versus exercise therapy alone in the management of individuals with shoulder pain. JOSPT 2016; 46(8):617-628."
related: [neck-tension, trap-tension, shoulder-impingement-pattern, desk-worker-pattern]
contradicts: [postural-syndrome-diagnoses, static-stretching-prevents-injury]
---

# Upper back pain / thoracic kyphosis / mid-trap weakness

## Claim

Upper-back pain in the active-adult / desk-worker population is rarely a structural injury. It is most commonly a **capacity-and-pattern problem**: relative weakness of the mid-trap, lower-trap, rhomboids, and deep neck flexors paired with relative shortness/overactivity of pec minor and upper trap from prolonged sitting and pressing-biased training. The result is increased thoracic kyphosis, anterior shoulder position, and the user's subjective sense of "tight upper back" or interscapular ache.

**The pattern reshapes with strengthening, not stretching alone.** The evidence-based protocol:

- **Rowing volume:** band pull-apart, face pull, scap row, chest-supported row (mid-trap and rhomboid bias; minimizes upper-trap compensation).
- **Lower-trap isolation:** prone Y, wall slide, serratus push-up. Ekstrom 2003 EMG ranks prone Y high for lower trap.
- **Thoracic mobility:** dynamic thoracic extension over a foam roller, open-book, T-spine cat-camel.
- **Chin tucks** paired with scapular work (NOT in isolation — chin tucks alone have weak evidence; see master synthesis R6 P5).
- **Pec minor stretching** at the appropriate position (30° flexion + scap retraction per Rosa et al.).

The driver: **balance pressing volume with pulling volume.** Many desk-worker / bench-focused trainees have a 3:1 pressing:pulling ratio that perpetuates the pattern. The corrective is at minimum 1:1, often biasing 1:1.5 pulling-to-pressing for an active correction phase.

## Nuance

- **"Postural correction" is the wrong frame; "strength balance" is the right frame.** Hartvigsen 2018 Lancet + multiple cohort studies show static posture has weak correlation with pain. The interventions that work — strengthen the underactive, mobilize the overactive — work regardless of whether you label the user with a syndrome. Frame as "desk-day pattern" / "pressing-heavy program needs more pulling," not as "you have Upper Crossed Syndrome." See `myth-postural-syndrome-diagnoses`.
- **Mid-trap and rhomboids cannot be precisely isolated by row variation alone.** The cue and the elbow path can bias them (elbows out, scap-pinch focus → more rhomboid recruitment vs. elbows-in row → more lat). Surface the cue; don't oversell the isolation.
- **Forward head posture is correlated with upper-back / neck pain but not categorically causal.** Treating "forward head" without addressing strength and movement variability doesn't reliably resolve pain. The pattern is real; the diagnostic label "Upper Crossed Syndrome" is the part to drop.
- **Stretching alone is insufficient.** Doorway pec stretch is fine as adjunct; static stretching the upper trap as primary treatment doesn't reshape the pattern. Active strengthening of the inhibited groups is the load-bearing intervention.
- **Compound lifts stay in.** Pull-ups, rows, OHP all train the upper back. Avoidance because of "tight upper back" deconditions the system that should be strong.

## What this contradicts

- **"Upper Crossed Syndrome" as a diagnostic category.** Janda's framework is observational; the reciprocal-inhibition mechanism lacks EMG support. Program the constituent interventions; don't apply the label. See `myth-postural-syndrome-diagnoses`.
- **"Stretching your upper traps will fix the tension."** Upper-trap "tightness" is usually overactivation from compensating for a weak lower trap / mid trap. Strengthen the lower partners; the upper trap's tone normalizes.
- **"Fix your posture by standing straighter."** Postural cueing has small, short-lived effects without strength work. The cue plus strengthening is the package.
- **"You need to stop benching."** Pressing isn't the problem — pressing without matching pulling volume is.

## Application in this app

**Protocol file:** `src/data/rehab-protocols/upper_back.ts` — `chronic` block (only severity defined; protocol is appropriate).

**Engine behavior when `injuries: [{ part: 'upper_back', severity: 'chronic' | 'modify' }]`:**

1. **Mandatory weekly inclusions:**
   - Face pull high volume (2–3 sets, 12–20 reps, ≥2×/week).
   - Prone Y/T/W or band pull-apart — at least one per upper-body session.
   - Thoracic extension foam roll / open-book in warmup on upper-body days.
   - Wall slide or serratus push-up — at least once weekly.
2. **Volume balance:** ensure weekly pulling sets ≥ pressing sets. The engine should refuse to ship an upper-back-flagged plan with pressing > pulling.
3. **Substitutions (modify, don't omit):**
   - Bent-over barbell row → chest-supported row if bent-over aggravates.
   - Wide-grip lat pulldown → neutral-grip pulldown or rope face-pull (lower-trap-biased).
   - Behind-the-neck lat pulldown → banned (see `shoulder-impingement-pattern`).
4. **NO hard ban on compound lifts** for chronic upper back. Pull-ups, rows, OHP, deadlift all stay in. The protocol's `do_not_ban` field is explicit: pull-up, row, overhead press, deadlift.
5. **Body-part-to-muscle resolver** maps `upper_back` to `[back, shoulders, biceps, triceps]` — correct (upper-back tension is loaded by all pulling, overhead, and indirect upper-body work).
6. **LLM nuance layer must NOT** say: "you have Upper Crossed Syndrome," "your posture is causing your pain," "stop pressing." It SHOULD say: "we're matching every pressing set with a pulling set and adding face-pulls as a staple," "thoracic mobility opens up the rack/overhead positions so the bar moves cleanly," "prone Y is the lower-trap isolation that the desk-day pattern leaves underactive."
7. **Onboarding text** (`StepPostureNotes.tsx`) already uses "desk-day vibes" framing — preserve this language convention across new copy.
