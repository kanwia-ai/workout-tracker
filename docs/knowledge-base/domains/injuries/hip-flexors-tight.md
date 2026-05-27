---
id: hip-flexors-tight
type: pattern
domain: injuries
title: "Tight hip flexors / psoas dominance pattern"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, get_stronger, lean_and_strong, fat_loss, mobility, athletic, general_fitness, glutes, aesthetics, strength, longevity, rehab]
  training_age: any
  sex: any
  injuries: [hip_flexors]
tags: [hip-flexors, psoas, desk-worker, glute-activation, reciprocal-inhibition, hip-hinge, anterior-pelvic-tilt, dead-bug]
citations:
  - "Sahrmann SA. Diagnosis and Treatment of Movement Impairment Syndromes. Mosby 2002. (Source framework for hip flexor / glute dominance assessment + corrective strategy.)"
  - "Mills M, Frank B, Goto S, et al. Effect of restricted hip flexor muscle length on hip extensor muscle activity and lower extremity biomechanics in college-aged female soccer players. Int J Sports Phys Ther 2015; 10(7):946-954. (Restricted hip flexor length → reduced glute max activation during functional tasks.)"
  - "Neumann DA. Kinesiology of the hip: a focus on muscular actions. JOSPT 2010; 40(2):82-94. (Biomechanical basis for hip flexor / extensor reciprocal action.)"
  - "Johanson M, Baer J, Hovermale H, Phouthavong P. Subtalar joint position during gluteus medius strengthening exercises (and supplementary work on hip flexor / extensor interaction). Phys Ther 2004. (Used via R5/R6 master synthesis citations; passive vs active hip flexor work.)"
  - "Nourbakhsh MR, Arab AM. Relationship between mechanical factors and incidence of low back pain. JOSPT 2002; 32(9):447-460. (Hip flexor tightness + LBP comorbidity.)"
  - "Konrad A, Reiner MM, Thaller S, Tilp M. The acute effects of a percussive massage treatment with a hypervolt device on plantar flexor muscles' range of motion and performance. (Used as one of several mobility-modality references for the 'static stretching alone doesn't fix the pattern' claim — see master synthesis.)"
  - "Tak I, Glasgow P, Langhout R, Weir A, Kerkhoffs G, Agricola R. Hip range of motion is lower in professional soccer players with hip and groin pain. Sports Health 2017."
  - "Janda V. Muscles and motor control in cervicogenic disorders: assessment and management. (1987.) (Historical reference for the desk-worker pattern — the descriptive observation is real even though the 'Lower Crossed Syndrome' diagnostic label is contested. See myths/postural-syndrome-diagnoses.md.)"
related: [lower-back-chronic, desk-worker-pattern]
contradicts: [postural-syndrome-diagnoses, static-stretching-prevents-injury]
---

# Tight hip flexors / psoas dominance pattern

## Claim

"Tight hip flexors" in active adults — especially desk workers and runners — is rarely a primary muscular problem. It is typically a **symptom of a broader pattern**: prolonged sitting → adaptive shortening + overactivation of psoas and iliacus + relative inhibition / weakness of glute max → anterior pelvic tilt → the user feels "tight in the front of the hips" and often has lumbar discomfort.

**The treatment hierarchy is:**

1. **Strengthen the antagonist (glute max).** Hip thrust, glute bridge, single-leg glute bridge, Romanian deadlift. Stronger glute max → better hip extension → less compensatory hip flexor tone. Mills 2015 showed restricted hip flexor length is associated with reduced glute max activation; the inverse — strengthen the glute — also normalizes the hip flexor's resting tone.
2. **Anti-anterior-pelvic-tilt core work.** Dead bug, posterior-pelvic-tilt drill, McGill curl-up. These train the user to dissociate hip flexion from lumbar extension (the psoas attaches to lumbar vertebrae; without core control, hip flexion pulls the lumbar spine forward).
3. **Hip flexor mobility — dynamic, in warmup or as accessory.** Banded supine march, eccentric split squat with 3s eccentric, RFE split squat with posterior-pelvic-tilt cue, 90/90 transitions, half-kneel hip flexor activation. The dynamic versions reset length AND strengthen through the lengthened range.
4. **Static stretches (couch stretch, kneeling hip flexor stretch) belong in cooldown** — they are an adjunct, not the primary intervention. Per master synthesis "what NOT to codify": "Static stretching tight muscles as primary treatment for 'tight' hip flexors or upper traps — these are usually lengthened-weak or overactive, not short."

## Nuance

- **The painful muscle is rarely the problem muscle.** A user who reports "my hip flexors are killing me" usually has weak glutes and an overactive lumbar erector pattern. Releasing the hip flexors gives short-lived relief; strengthening the glutes changes the pattern.
- **"Tight" can mean two different things.** (a) Truly shortened muscle (less common in healthy adults) vs. (b) overactive / high resting tone in a normal-length muscle (more common). Mode (b) doesn't respond to stretching the way mode (a) does; it responds to strengthening the antagonist and reducing the demand driving the overactivation.
- **Sitting itself isn't the enemy; sitting WITHOUT counter-loading is.** A user who sits 8h and lifts 3×/week is in a different category than one who sits 8h and does nothing.
- **Hip flexion under load (hanging leg raise, weighted situp) is fine for healthy users** — it's not the cause of the pattern. The issue is overactivation at rest + inhibited extensors. Don't ban hip flexion loading reflexively.
- **Lumbar compensation is the failure mode.** Tight hip flexors often produce LBP not directly but via anterior pelvic tilt + lumbar lordosis under load. The two patterns travel together — see `lower-back-chronic` for the comorbid case.

## What this contradicts

- **"Lower Crossed Syndrome" as a diagnosis.** The observational pattern is real; the named syndrome with its reciprocal-inhibition mechanism is not EMG-supported. Program the constituents; drop the label. See `myth-postural-syndrome-diagnoses`.
- **"Stretching your hip flexors fixes the tightness."** Short-lived only. Without glute strengthening + core control, the pattern returns. Master synthesis explicitly flags static stretching as primary treatment as "what NOT to codify."
- **"Tight hip flexors mean weak hip flexors are not a thing."** False on both counts. The desk-worker pattern is usually short-and-tight + weak-in-end-range. Eccentric strengthening into hip extension addresses both.
- **"Don't squat / lunge / deadlift if your hips are tight."** These ARE the corrective patterns when executed with neutral-spine + glute-dominant cueing.

## Application in this app

**Protocol file:** `src/data/rehab-protocols/hip_flexors.ts` — `chronic` block + `avoid` (rare) + `ok` watch-outs.

**Engine behavior when `injuries: [{ part: 'hip_flexors', severity: 'chronic' | 'modify' }]`:**

1. **Mandatory weekly inclusions (master synthesis R5 P12 + R6 P11):**
   - Glute max activation in warmup on every lower-body day (glute bridge, single-leg glute bridge, banded clamshell).
   - Glute work ≥2×/week (hip thrust, single-leg glute bridge, RDL).
   - Dead bug in core programming (anti-anterior-pelvic-tilt).
   - Dynamic hip flexor work in warmup: 90/90 hip rotation, half-kneel hip flexor with PPT cue, banded supine march.
2. **Static stretches stay in cooldown / mobility tab — not in warmup.** Couch stretch, kneeling hip flexor stretch tagged for post-session use only.
3. **NO hard ban on squats / lunges / deadlifts** — they ARE the corrective when patterned well. Protocol's `do_not_ban` is explicit.
4. **Avoidance only when symptomatic strain:**
   - Loaded hip flexion to failure (heavy hanging leg raise, weighted decline situps).
   - High-knee sprint drills untrained.
5. **Hip hinge dowel drill** in warmup if loaded hinge is in session (overlaps with lower-back overlay; either flag triggers it).
6. **Body-part-to-muscle resolver** maps `hip_flexors` to `[quads, glutes, core]` — correct.
7. **Cooldown / mobility tab placement** for the couch stretch and kneeling hip flexor stretch — surfaced post-session per warmup-recovery/`mobility-tab-placement-tags` convention.
8. **LLM nuance layer must NOT** say: "you have Lower Crossed Syndrome," "you need to stretch every day," "avoid squats." It SHOULD say: "we're attacking this from both sides — your glutes strengthen so they take over hip extension, your dead bug builds core control to keep the pelvis from tipping forward under load, the static hip flexor stretches sit in cooldown where they help you wind down without dampening force production before the lift."
