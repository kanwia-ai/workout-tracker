---
id: shoulder-impingement-pattern
type: pattern
domain: injuries
title: "Shoulder impingement / rotator cuff tendinopathy"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, get_stronger, lean_and_strong, fat_loss, mobility, athletic, general_fitness, glutes, aesthetics, strength, longevity, rehab]
  training_age: any
  sex: any
  injuries: [left_shoulder, right_shoulder]
tags: [shoulder, impingement, rotator-cuff, scap-control, face-pull, landmine-press, neutral-grip, painful-arc]
citations:
  - "Beard DJ, Rees JL, Cook JA, et al. Arthroscopic subacromial decompression for subacromial shoulder pain (CSAW): a multicentre, pragmatic, parallel group, placebo-controlled, three-group, randomised surgical trial. Lancet 2018; 391(10118):329-338. (Subacromial decompression NO BETTER than placebo surgery; exercise comparably effective.)"
  - "Paavola M, Malmivaara A, Taimela S, et al. Subacromial decompression versus diagnostic arthroscopy for shoulder impingement: randomised, placebo surgery controlled clinical trial (FIMPACT) — 5-year follow-up. BMJ 2020; 370:m2823."
  - "Kibler WB, Ludewig PM, McClure PW, Michener LA, Bak K, Sciascia AD. Clinical implications of scapular dyskinesis in shoulder injury: the 2013 consensus statement from the 'Scapular Summit.' Br J Sports Med 2013; 47(14):877-885."
  - "Naunton J, Harrison C, Britt H, Haines T, Malliaras P. General practice management of rotator cuff related shoulder pain: a reliance on ultrasound and injection guided care. PLoS One 2020. (Also: APTA Naunton 2024 FITT meta — exercise dose-response for RC shoulder pain.)"
  - "Cools AM, Dewitte V, Lanszweert F, et al. Rehabilitation of scapular muscle balance: which exercises to prescribe? Am J Sports Med 2007; 35(10):1744-1751."
  - "Cools AM, Cambier D, Witvrouw EE. Screening the athlete's shoulder for impingement symptoms: a clinical reasoning algorithm for early detection of shoulder pathology. JOSPT 2008; 38(11)."
  - "Reinold MM, Wilk KE, Fleisig GS, et al. Electromyographic analysis of the rotator cuff and deltoid musculature during common shoulder external rotation exercises. JOSPT 2004; 34(7):385-394. (Side-lying ER, prone full-can EMG ranking.)"
  - "Hanratty CE, McVeigh JG, Kerr DP, et al. The effectiveness of physiotherapy exercises in subacromial impingement syndrome: a systematic review and meta-analysis. Semin Arthritis Rheum 2012; 42(3):297-316."
  - "Lewis JS. Subacromial impingement syndrome: a musculoskeletal condition or a clinical illusion? Phys Ther Rev 2011; 16(5):388-398. (Critique of 'impingement' as a diagnostic label; preserves the loading-pattern frame.)"
  - "JOSPT 2022 Clinical Practice Guideline: Management of rotator cuff disorders."
  - "Bern Consensus Statement: overhead athlete / return to sport — return-to-overhead-pressing criteria. JOSPT 2022."
related: [upper-back-pain, trap-tension, neck-tension]
contradicts: [postural-syndrome-diagnoses]
---

# Shoulder impingement / rotator cuff tendinopathy

## Claim

"Shoulder impingement" — pain on overhead reach, painful arc 60–120° abduction, sometimes night pain, often with weakness in external rotation — is the most common shoulder complaint in active adults. Modern evidence (CSAW 2018 Lancet; FIMPACT 5-year 2020) showed **subacromial decompression surgery is no better than placebo surgery**, and exercise therapy produces comparable outcomes. The condition is better thought of as a **rotator-cuff-related shoulder pain + scapular control deficit** than a structural impingement.

**Drivers of the pattern:**

- **Weak rotator cuff** (especially infraspinatus / teres minor — external rotators) → reduced humeral head depression during arm elevation → narrowed subacromial space.
- **Weak scapular stabilizers** (lower trap, serratus anterior, rhomboids) → poor scapular upward rotation and posterior tilt during overhead reach → reduced subacromial clearance.
- **Tight / overactive pec minor + upper trap** from desk posture and pressing-heavy training → anterior tilt of the scapula → further narrows subacromial space.
- **Thoracic kyphosis** restricts overhead reach (the bar/dumbbell needs T-spine extension to go truly overhead).

**The rehab integration:**

- **Cuff work:** banded external rotation neutral, side-lying ER, prone full-can (avoid empty-can — provocative).
- **Scap work:** face pull (high volume, central to the protocol), prone Y (lower trap), wall slide / serratus push-up (serratus anterior), band pull-apart.
- **Thoracic mobility:** foam-roller extensions, open book, T-spine cat-camel — opens the overhead position.
- **Modified pressing during rehab:** landmine press (45° plane — generally pain-free), neutral-grip DB press, then DB OHP, then barbell OHP last (criterion-gated).

**What to avoid until criterion-cleared:** behind-the-neck press, upright row (peak impingement position), empty-can raise (peak impingement angle), deep dips (anterior shoulder load at end range), wide-grip barbell bench at full ROM if painful.

**Return-to-overhead-pressing criteria** (Bern Consensus 2022 + master synthesis R6 P9):
- Full pain-free passive AND active overhead elevation.
- Pain-free horizontal abduction / adduction.
- ER/IR strength ratio ≥66%.
- Scapular dyskinesis resolved on observational assessment.
- Stored as profile flag `overhead_press_cleared: bool`.

## Nuance

- **"Impingement" is a contested label.** Lewis 2011 argued it's a clinical illusion — the painful arc and weakness pattern are real, but the mechanism (subacromial tissue compression) doesn't reliably explain symptoms. The modern frame is "rotator cuff related shoulder pain" — the rehab response is the same.
- **CSAW + FIMPACT change the surgical conversation.** Decompression is no better than placebo surgery, and exercise is comparably effective. The user who comes in with "they want to do impingement surgery" should be informed (carefully, not as medical advice) that exercise therapy is first-line per current evidence.
- **Scapular dyskinesis Kibler typing (I/II/III) is unreliable** (inter-rater κ 0.31–0.42 per Kibler 2013) — master synthesis explicitly says use binary yes/no, not Kibler types.
- **Painful arc orientation matters.** Pain at 60–120° abduction is classic impingement-pattern; pain at end-range overhead is more likely capsular; pain at 90° with maximum ER is more likely anterior instability. Different patterns = different programming biases.
- **Acute (post-op, recent labrum/cuff tear) vs chronic stable** — different protocols. Acute = follow surgical restrictions; this entry covers chronic / managed-tendinopathy / mild irritation.
- **Heavy bench is NOT categorically banned in chronic.** Wide-grip flat barbell bench at full ROM stresses the anterior capsule + cuff at end range — modify when symptomatic. As pain resolves, the lift comes back in.

## What this contradicts

- **"You need decompression surgery."** Contradicted by CSAW + FIMPACT. Exercise therapy is first-line per modern evidence.
- **"Upper Crossed Syndrome causes your shoulder pain."** Janda framing isn't EMG-supported as a causal mechanism; treat the constituent weaknesses without applying the syndrome label. See `myth-postural-syndrome-diagnoses`.
- **"Avoid all overhead work permanently."** Avoidance entrenches the dysfunction; the strengthening sequence returns the user to overhead work. The protocol's `do_not_ban` for chronic shoulder includes overhead press, bench press, pull-up.
- **"Stretching your tight shoulder fixes it."** Doorway pec stretch is fine as adjunct; the load-bearing intervention is strengthening cuff + scap.

## Application in this app

**Protocol file:** `src/data/rehab-protocols/shoulder.ts` — handles `avoid` (acute), `rehab` (phased return), `chronic` (managed), `ok` (watchful).

**Engine behavior when `injuries: [{ part: 'left_shoulder' | 'right_shoulder', severity: 'modify' | 'chronic' }]`:**

1. **Mandatory weekly inclusions (master synthesis R6):**
   - Face pull high volume (15–20 reps × 2–3 sets, ≥2×/week).
   - Banded external rotation in warmup on any upper-body day.
   - Prone Y or wall slide ≥1×/week.
   - Thoracic mobility (foam roller extension or open book) in warmup on upper-body days.
2. **Substitutions (modify, don't omit):**
   - Barbell OHP → half-kneel landmine press → neutral-grip DB OHP → seated DB OHP → standing DB OHP → barbell OHP (criterion-gated progression).
   - Wide-grip bench → close-grip / neutral-grip DB bench / paused close-grip barbell bench.
   - Wide-grip lat pulldown / behind-neck pulldown → neutral-grip pulldown.
3. **Hard ban (`modify` / acute):** behind-neck press, upright row, empty-can raise, behind-neck pulldown, dips to full depth.
4. **Chronic-specific hard bans:** upright row, empty-can raise, behind-neck press, wide-grip paused bench at painful intensities. Standing barbell OHP only when `overhead_press_cleared = true`.
5. **No hard ban on the compound lifts themselves** — overhead press, bench press, pull-up all stay in (in modified form during rehab; full form when criteria clear).
6. **Body-part-to-muscle resolver** maps `left_shoulder | right_shoulder` to `[chest, shoulders, back, triceps, biceps]` — correct (any upper-body work loads the shoulder).
7. **LLM nuance layer must NOT** say: "you need surgery," "stop pressing overhead forever," "your rotator cuff is torn (without imaging)," "Upper Crossed Syndrome is causing this." It SHOULD say: "we're switching pressing to landmine and neutral-grip DB while cuff + scap come online, with face pulls as the staple corrective. Barbell OHP returns once your overhead position is pain-free and your external rotation strength catches up."
8. **Return-to-OHP gate** — surface the criteria checklist (pain-free overhead, ER/IR ratio, scap dyskinesis resolved) in the UI when user requests to add barbell OHP back; do not let the LLM auto-clear it.
