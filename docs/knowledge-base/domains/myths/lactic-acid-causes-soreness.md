---
id: lactic-acid-causes-soreness
type: myth
domain: myths
title: "Myth: Lactic acid causes muscle soreness"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [any]
  training_age: any
  sex: any
  injuries: []
tags: [doms, lactic-acid, lactate, soreness, physiology]
citations:
  - "Cheung K, Hume PA, Maxwell L. Delayed onset muscle soreness: treatment strategies and performance factors. Sports Med 2003; 33(2):145-164."
  - "Schwane JA, Watrous BG, Johnson SR, Armstrong RB. Is lactic acid related to delayed-onset muscle soreness? Phys Sportsmed 1983; 11(3):124-131."
  - "Brooks GA. The Science and Translation of Lactate Shuttle Theory. Cell Metab 2018; 27(4):757-785."
related: [soreness-is-progress]
contradicts: []
---

# Myth: Lactic acid causes muscle soreness

## The myth (verbatim)
"Lactic acid buildup is why my legs hurt the day after squats." "You need to flush out the lactic acid." "The burn during the set is lactic acid; the soreness the next day is lactic acid that didn't clear."

## Why the myth persists
This is a 40-year-old misconception that survived because:
- "Lactic acid" sounds plausibly chemical and the "burn" sensation during a hard set does correlate with lactate accumulation in working muscles.
- Pop physiology textbooks of the 1970s-80s explicitly taught it.
- The myth is repeated in mainstream fitness magazines, group fitness classes, and even some clinical settings.

## What the research actually says
1. **Lactate clears within ~30-60 minutes** of exercise cessation (Brooks 2018 lactate shuttle review). It is essentially gone from muscle and blood by the time DOMS peaks (24-72 hours post-exercise).
2. **Schwane et al. 1983**: directly tested the hypothesis. Subjects did downhill (eccentric) running, which produces minimal lactate, vs level running. Downhill produced massive DOMS; level produced none. Lactate response was inverse to the DOMS response.
3. **DOMS is caused by**: micro-trauma to muscle fibers from eccentric (lengthening) contractions, the associated inflammatory response, and sensitization of muscle nociceptors. Cheung, Hume & Maxwell 2003 covers the mechanism.
4. **Lactate is not even an acid** in the physiological sense — at body pH it exists as lactate anion + H+, and the H+ (acidity) is rapidly buffered. Lactate itself is a fuel substrate the body actively uses, not a waste product. The whole framing is wrong from the chemistry up.

## The corrected understanding
- The "burn" you feel during a hard set: combination of accumulating metabolites (H+, inorganic phosphate, ammonia) and altered nerve activity. Not "lactic acid causing damage."
- The soreness 24-72 hours later: muscle fiber micro-trauma + inflammation from unaccustomed mechanical stress (especially eccentric work).
- Lactate is gone long before DOMS appears.
- "Flushing out lactic acid" is meaningless because the lactate isn't there anymore by the time the user notices soreness.

## Application in this app
- Copy must NOT use "lactic acid" / "flush out lactate" / "lactic acid buildup" framing anywhere — including warmup, cooldown, rest-day, and recovery copy.
- LLM nuance layer: if user mentions lactic acid as a cause of soreness, correct briefly — "DOMS is muscle micro-trauma from unaccustomed work, not lactic acid. Lactate clears within an hour."
- Active recovery / "flush" sessions can be programmed (they promote blood flow which may help perceived recovery) but the framing should be "easy movement, blood flow" — not "flushing lactate."

## App surfaces where this myth used to appear
- Audited clean: no "lactic acid" / "flush lactate" language found in current copy pools or exercise descriptions.
- Future risk: any LLM-generated rationale or cooldown copy must be checked for this language. The replan rationale layer (`SettingsScreen.tsx:942-943`) renders raw Opus output — banned-phrase regex should include "lactic acid", "flush lactate", "lactate buildup" (per myth_sweep_settings.md RP1 recommendation).
