---
id: neck-tension
type: pattern
domain: injuries
title: "Postural neck pain / forward head pattern"
confidence: medium
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, get_stronger, lean_and_strong, fat_loss, mobility, athletic, general_fitness, glutes, aesthetics, strength, longevity, rehab]
  training_age: any
  sex: any
  injuries: [neck]
tags: [neck, deep-neck-flexor, chin-tuck, thoracic-extension, forward-head, desk-worker, root-cause]
citations:
  - "Falla D, Jull G, Hodges PW. Patients with neck pain demonstrate reduced electromyographic activity of the deep cervical flexor muscles during performance of the craniocervical flexion test. Spine 2004; 29(19):2108-2114. (Deep neck flexor activation deficit in chronic neck pain — basis for craniocervical flexion / chin tuck programming.)"
  - "Jull GA, O'Leary SP, Falla DL. Clinical assessment of the deep cervical flexor muscles: the craniocervical flexion test. J Manipulative Physiol Ther 2008; 31(7):525-533."
  - "Hanney WJ, Kolber MJ. Improving muscle performance of the deep neck flexors. Strength Cond J 2007; 29(3):78-83."
  - "Kim SY, Koo SJ. Effect of duration of smartphone use on muscle fatigue and pain caused by forward head posture in adults. J Phys Ther Sci 2016; 28(6):1669-1672."
  - "Mintken PE, McDevitt AW, Cleland JA, et al. Cervicothoracic manual therapy plus exercise therapy versus exercise therapy alone in the management of individuals with shoulder pain. JOSPT 2016; 46(8):617-628. (Neck + thoracic mobility paired with strengthening — pattern overlap with shoulder rehab.)"
  - "Mahmoud NF, Hassan KA, Abdelmajeed SF, Moustafa IM, Silva AG. The relationship between forward head posture and neck pain: a systematic review and meta-analysis. Curr Rev Musculoskelet Med 2019; 12(4):562-577. (Forward head posture is associated with neck pain — relationship is real but causal mechanism remains debated.)"
  - "Cools AM, Struyf F, De Mey K, et al. Rehabilitation of scapular dyskinesis. Br J Sports Med 2014. (Neck + trap + scap programming overlap.)"
related: [trap-tension, upper-back-pain, desk-worker-pattern]
contradicts: [postural-syndrome-diagnoses]
---

# Postural neck pain / forward head pattern

## Claim

Postural neck pain — diffuse aching at the back of the neck, often pairing with upper-trap tension and tension headaches — is most commonly driven by:

- **Weak deep neck flexors** (longus colli, longus capitis) — Falla 2004 showed reduced EMG activation of these muscles in chronic neck pain.
- **Overactive suboccipitals + upper traps + levator scapulae** — compensating for the underactive deep flexors AND holding the head up against gravity in a forward-head position.
- **Thoracic kyphosis** — restricts the head's ability to sit over the shoulders without compensation.
- **Prolonged screen / phone use** — Kim 2016 documented muscle fatigue + pain proportional to smartphone use duration.

**The rehab integration:**

- **Deep neck flexor activation:** supine craniocervical flexion ("chin tuck" — gently nod the chin without lifting the head), 5s isometric hold × 10 reps, 2×/day. Paired with cervical flexion endurance over time.
- **Thoracic extension mobility:** foam roller extensions, open book, T-spine cat-camel — opens the position the head needs to sit over.
- **Scap + trap rebalance:** band pull-apart, face pull, prone Y (the trap-tension and upper-back patterns overlap — strengthening lower trap and serratus reduces the upper-trap/levator compensation pulling on the neck).
- **Avoid:** loaded neck flexion / extension (heavy shrugs with head-tilt; bench press with head lifted off the pad chronically; ballistic Olympic-lift catch positions when in pain).

**Chin tucks alone have weak evidence.** Master synthesis R6 P5: "Chin-tuck drills prescribed in isolation as posture fix — modest evidence; must pair with scapular strengthening." The chin tuck is one piece of a multi-component intervention, not a standalone fix.

## Nuance

- **Forward head posture (FHP) and neck pain are correlated, not categorically causal.** Mahmoud 2019 meta confirms the association; the causal mechanism is debated. Some users have measurable FHP without pain; others have pain without measurable FHP.
- **"Text neck" is a real exposure pattern but an overused diagnostic label.** The exposure (sustained cervical flexion looking at devices) is the load; the response is strengthening the deep flexors + reducing exposure (phone-at-eye-level habits, posture breaks).
- **Compound lifts stay in.** OHP, deadlift, squat all require the head to brace and stabilize — they're not the cause of postural neck pain. The protocol's `do_not_ban` for chronic neck is explicit: overhead press, deadlift, squat.
- **Red-flag screening:** arm radiation, hand numbness, severe headaches linked to lifting, or sudden severe pain with rotation/flexion warrant cervical imaging (rule out radiculopathy, spondylosis with stenosis, ligamentous instability). These are not "postural" — they're medical.
- **Evidence base for the strengthening protocol is medium, not high.** Falla and Jull's work establishes the deep-flexor deficit; the intervention literature is smaller. The protocol is reasonable but acknowledge confidence limits.

## What this contradicts

- **"Upper Crossed Syndrome causes your neck pain."** The pattern (forward head + tight upper traps + weak deep flexors) is real; the syndrome label and its reciprocal-inhibition mechanism aren't EMG-supported. See `myth-postural-syndrome-diagnoses`.
- **"Just stretch your tight neck."** Static stretching the upper traps and suboccipitals gives short-lived relief; strengthening the deep flexors + thoracic mobility is the load-bearing intervention.
- **"You need a posture brace."** Bracing produces no durable change in posture or pain. Strengthening + exposure modification do.
- **"Stop lifting overhead because of your neck."** Avoidance deconditions the supporting system. Modify cues (chin in neutral, head against pad on bench), not omit.

## Application in this app

**Protocol file:** `src/data/rehab-protocols/neck.ts` — `chronic` block + `ok` watch-outs.

**Engine behavior when `injuries: [{ part: 'neck', severity: 'modify' | 'chronic' }]`:**

1. **Mandatory inclusions (master synthesis R6 P5 + R6 P14):**
   - Supine craniocervical flexion / chin tuck (5s × 10, 2×/day) — surfaced in warmup or daily-corrective bucket.
   - Strengthening 3×/wk ≥20min — band pull-apart, face pull, prone Y/T, neck isometrics (paired with the above; chin tucks alone are insufficient).
   - Thoracic extension foam roll (60s) in warmup on upper days.
2. **Substitutions (modify, don't omit):**
   - Bench press with head lifted off pad → keep head ON the pad (cue + modify).
   - Heavy shrugs while symptomatic → replaced entirely (overlaps with trap-tension protocol).
   - Behind-the-neck press → banned (overlaps with shoulder-impingement-pattern).
3. **No hard ban on OHP / deadlift / squat** — they stay in. Protocol's `do_not_ban` is explicit.
4. **Avoid:** loaded neck flexion (weighted neck extension/flexion strap work unless trained specifically), heavy shrugs with head tilt, ballistic Olympic-lift catch in pain.
5. **Body-part-to-muscle resolver** maps `neck` to `[shoulders, back]` — correct (heavy upper work braces the neck).
6. **Onboarding copy:** label as "desk-day pattern" / "forward head from screen time" — NOT "Upper Crossed Syndrome."
7. **LLM nuance layer must NOT** say: "you have Upper Crossed Syndrome," "stop pressing overhead," "you need a posture brace." It SHOULD say: "we're pairing chin tucks with face pulls and thoracic mobility — chin tucks alone don't carry the load, but as part of the package they teach your deep neck flexors to take over from the upper traps. Compound lifts stay in with your head in neutral."
8. **Red-flag escalation:** arm radiation, hand numbness, training-induced headaches → surface `when_to_see_professional` immediately. Cervical neurologic symptoms route out of the app.
