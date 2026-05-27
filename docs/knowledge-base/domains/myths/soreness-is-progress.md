---
id: soreness-is-progress
type: myth
domain: myths
title: "Myth: If I'm not sore the next day, the workout wasn't effective"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, fat_loss, get_strong, general_fitness]
  training_age: any
  sex: any
  injuries: []
tags: [doms, soreness, recovery, hypertrophy, training-feedback]
citations:
  - "Flann KL, LaStayo PC, McClain DA, et al. Muscle damage and muscle remodeling: no pain, no gain? J Exp Biol 2011; 214(Pt 4):674-679."
  - "Schoenfeld BJ, Contreras B. Is postexercise muscle soreness a valid indicator of muscular adaptations? Strength Cond J 2013; 35(5):16-21."
  - "Damas F, Phillips SM, Libardi CA, et al. Resistance training-induced changes in integrated myofibrillar protein synthesis are related to hypertrophy only after attenuation of muscle damage. J Physiol 2016; 594(18):5209-5222."
related: [lactic-acid-causes-soreness, train-to-failure-every-set]
contradicts: []
---

# Myth: If I'm not sore, the workout wasn't effective

## The myth (verbatim)
"No pain, no gain." "If I'm not sore the next day, my session didn't do anything." "Sore = grew." "Wrecked legs means the leg day was good."

## Why the myth persists
DOMS (delayed-onset muscle soreness) is a salient, body-felt signal. After a hard novel session, you feel sore; after a hard repeated session, you don't (the repeated-bout effect). Newcomers experience the correlation "novel session → soreness → I trained hard" and generalize: "soreness = training hard = growing."

The myth also self-reinforces: trainers who push clients to soreness get visible "proof" that their session was effective, and clients learn to expect/demand it.

## What the research actually says
1. **Flann et al. 2011** (J Exp Biol — "Muscle damage and muscle remodeling: no pain, no gain?"): two groups did identical 8-week eccentric training programs. One group was pre-conditioned with 3 weeks of gradually increased intensity before the experimental block (so they did not get sore during the main block). Both groups gained the same muscle cross-sectional area and strength. **Hypertrophy occurred independent of DOMS / muscle-damage markers.**
2. **Schoenfeld & Contreras 2013** review: DOMS is a marker of unaccustomed mechanical stress, not of growth signaling. The two correlate in novices because everything is unaccustomed; they decouple in trained individuals.
3. **Damas et al. 2016:** in the first weeks of training, MPS responses partly reflect damage repair rather than hypertrophy. As damage attenuates with repeated bouts, MPS becomes more growth-specific. **Muscle damage is, if anything, partially redundant for hypertrophy** — it's a side-effect, not the driver.
4. **The actual drivers** of hypertrophy: mechanical tension (load × proximity to failure × volume), maintained across the 5-30 rep window.

## The corrected understanding
- DOMS = your body responding to *novel* mechanical stress. It's an indicator of *unfamiliarity*, not effectiveness.
- A trained individual following a well-designed program will rarely be very sore; they're still growing.
- Excessive soreness can actually *interfere* with the next training session — you can't generate as much force when sore, which limits the stimulus that produces growth.
- The signals to track: are you progressing on the bar (load × reps over time)? Are you recovering in time for next session? Is RIR honest? Those matter. Soreness doesn't.

## Application in this app
- Engine: SessionCheckin / CheckinSummary uses `easy / solid / tough / failed` rating that maps to RIR proximity-to-failure (per R1 P4, P6). Soreness is NOT in the rating vocabulary, and "wrecked" appears only as a pre-session readiness state, not a quality marker for past sessions.
- LLM nuance layer: never suggest the user should be sore. Never validate "I wasn't sore so I'm worried it didn't work."
- AutoProgress: progression triggers on rep clearance / RIR / stalls — NOT on user-reported soreness.

## App surfaces where this myth used to appear
- Audited clean: `SessionCheckinSheet.tsx:25` feel labels `['wrecked', 'rough', 'ok', 'strong', 'on fire']` are pre-session readiness states, not post-session quality labels. Acceptable.
- `src/lib/copy.ts` voice rules explicitly ban "you got this", "crush it", "beast mode", "no pain no gain" phrases; `copy.test.ts:166-168` enforces with regex test.
- Future risk: any DOMS-as-virtue copy ("you'll feel that tomorrow", "your legs hate you tomorrow") should be flagged and removed.
