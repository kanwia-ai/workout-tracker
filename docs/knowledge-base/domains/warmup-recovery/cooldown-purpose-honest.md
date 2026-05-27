---
id: cooldown-purpose-honest
type: principle
domain: warmup-recovery
title: "What cooldowns actually do (and don't)"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, get_strong, lean_and_strong, fat_loss, general, athletic, mobility]
  training_age: any
  sex: any
  injuries: []
tags: [cooldown, recovery, dogma, static-stretching, psychological-transition]
citations:
  - "Van Hooren B, Peake JM. Do we need a cool-down after exercise? A narrative review of the psychophysiological effects and the effects on performance, injuries and the long-term adaptive response. Sports Med 2018; 48(7):1575-1595. DOI 10.1007/s40279-018-0916-2"
  - "Behm DG, Blazevich AJ, Kay AD, McHugh M. Acute effects of muscle stretching on physical performance, range of motion, and injury incidence in healthy active individuals: a systematic review. Appl Physiol Nutr Metab 2016; 41(1):1-11. (Re: static stretching's appropriate placement is cooldown / off-day, not pre-lift.) PMID 26642915."
  - "Dupuy O, Douzi W, Theurot D, Bosquet L, Dugué B. An evidence-based approach for choosing post-exercise recovery techniques. Front Physiol 2018; 9:403. DOI 10.3389/fphys.2018.00403"
related: [static-vs-dynamic-stretching, mobility-vs-stretching, mobility-tab-placement-tags, warmup-cardio-integration]
contradicts: []
---

# What cooldowns actually do (and don't)

## Claim
Van Hooren & Peake's 2018 narrative review in *Sports Medicine* is the authoritative reference on this question, and its conclusion is more deflationary than gym lore admits:

**An active cool-down does NOT meaningfully accelerate physical recovery.** Specifically, the review found cool-downs are "largely ineffective with respect to enhancing same-day and next-day(s) sports performance," do not reliably reduce DOMS, do not appear to reduce injury risk, and do not appear to enhance long-term adaptation.

**Cooldowns DO serve three legitimate purposes**, none of which is "speeds up recovery":

1. **Psychological transition / calm-down ritual.** Slowing breathing, lowering arousal, marking the session as done. This has subjective value and is reflected in the review's "psychophysiological" effects — users feel better. That counts; it's just not a physiological recovery claim.

2. **A home for the static stretching that doesn't belong pre-lift.** If the user wants to work on hamstring or hip-flexor length, post-lift is the right slot (static-stretch force decrement doesn't matter when there's no lift after). Static stretching during cooldown does produce acute ROM gains that may chronically improve flexibility over weeks of consistent practice.

3. **A low-intensity cardio segment for fat-loss / general-fitness users.** Post-strength easy cardio is the productive cardio slot (doesn't interfere with the lifting that already happened) — and naturally lives in the cooldown block. For users whose goal is fat loss or general cardiovascular health, this is the highest-value cooldown component, not stretching.

The intellectual honesty rule: **don't oversell cooldown.** It is not a recovery accelerator. It is a ritual, a stretching opportunity, and a productive cardio slot.

## Nuance
- **Van Hooren & Peake do find a small / inconsistent benefit on perceived recovery and subjective well-being**, which is not nothing. Users who feel better post-cooldown may train more consistently. That is a legitimate downstream benefit — frame it that way, don't dress it up as physiology.
- **For some specific populations the picture shifts**: athletes with high training frequency (2+ sessions/day) may benefit slightly more from active recovery between sessions; the review focuses on once-daily training contexts.
- **Soft-tissue work post-lift (foam rolling, light massage) has similar status** — short-term ROM and perceived-recovery effects, no demonstrated acceleration of structural recovery. See `foam-rolling-honest`.
- **The opposite extreme is also wrong.** Some "evidence-based" gym influencers have flipped to "cooldowns are useless, skip them." Van Hooren's actual conclusion is "cooldowns don't accelerate physical recovery — but here are the contexts where they're still valuable." Honor the actual nuance.
- **Cooldown duration ≠ session quality.** A 5-min cooldown is fine. 20-min cooldowns are oversold and eat into time-budget that could be spent on training or sleep.

## What this contradicts (optional)
- "Cooldowns prevent DOMS" — Van Hooren found no consistent effect.
- "Cooldowns flush lactate / speed recovery" — the lactate-clearance story is technically true for very intense work, but doesn't translate into faster perceived or measured recovery for typical strength training.
- "Cooldowns prevent injury" — no evidence supports this; the review explicitly addresses and rejects the claim.
- "You need a 15-minute cooldown after every session for adaptation" — no, the long-term adaptive response is not measurably enhanced.

## Application in this app
- **Frame cooldown copy honestly.** When the app surfaces a cooldown routine, the rationale should NOT say "to speed your recovery." Acceptable framings:
  - "A few minutes to wind down and work on the static stretches we skipped pre-lift."
  - "Easy 5 minutes of cardio to extend today's aerobic dose without eating into your next session."
  - "A ritual to mark the session done — slows the breath, drops the arousal."
- **The cooldown UI should default to 5-8 minutes**, not 15+. Longer cooldowns are user-opt-in for stretching/mobility goals, not the default.
- **`src/data/mobility-routines.ts` placement tag `'cooldown'`** is the engine's signal that a routine belongs here. The substitution map in `generateWarmup.ts` `STATIC_STRETCH_SUBSTITUTIONS` enforces this from the other direction: static stretches removed from pre-lift surfacing are supposed to reappear as cooldown options. (This is the *invariant* — if a static stretch was prescribed in protocol warmup_focus and got substituted/dropped pre-lift, the cooldown system needs to pick it up. Verify this loop is closed; if not, that's a gap.)
- **Fat-loss users get a different default cooldown** — 5-10 minutes of easy cardio is the highest-value component for them, not static stretching. Surface that ordering.
- **The LLM nuance layer must not claim cooldowns "speed recovery" or "flush lactate" or "prevent injury."** It may use any of the three honest framings above. If the user explicitly asks "does this speed recovery?" the LLM should say: "It doesn't accelerate physical recovery — Van Hooren & Peake's 2018 review found that's largely a myth. It does help the static-stretch goals we couldn't do before lifting, marks the session done, and gives you a low-impact cardio slot. That's what it's actually for."
