---
id: static-vs-dynamic-stretching
type: principle
domain: warmup-recovery
title: "Static vs dynamic stretching pre-lift"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, get_strong, lean_and_strong, fat_loss, general, athletic, mobility]
  training_age: any
  sex: any
  injuries: []
tags: [warmup, stretching, static, dynamic, force-depression, cooldown]
citations:
  - "Behm DG, Chaouachi A. A review of the acute effects of static and dynamic stretching on performance. Eur J Appl Physiol 2011; 111(11):2633-2651. DOI 10.1007/s00421-011-1879-2"
  - "Behm DG, Blazevich AJ, Kay AD, McHugh M. Acute effects of muscle stretching on physical performance, range of motion, and injury incidence in healthy active individuals: a systematic review. Appl Physiol Nutr Metab 2016; 41(1):1-11. DOI 10.1139/apnm-2015-0235. PMID 26642915."
  - "Chaabene H, Behm DG, Negra Y, Granacher U. Acute effects of static stretching on muscle strength and power: an attempt to clarify previous caveats. Front Physiol 2019; 10:1468."
related: [ramp-method, warmup-set-purpose, mobility-vs-stretching, mobility-tab-placement-tags, foam-rolling-honest]
contradicts: []
---

# Static vs dynamic stretching pre-lift

## Claim
**Static stretching held >30-45 seconds immediately before lifting acutely depresses peak force / strength / power output by roughly 3-5%** (Behm 2016 meta: static -3.7%, PNF -4.4%, dynamic +1.3%; Behm & Chaouachi 2011). The effect scales with hold duration: brief static holds (≤30s) per muscle have minimal performance cost, but the longer-format "hold for a minute and breathe into it" stretching belongs in cooldown or off-day mobility, not in a pre-lift warmup.

**Dynamic stretching** (active ROM work — leg swings, walking lunges, hip airplanes, 90/90 transitions, band pull-aparts, T-spine openers) does not depress and slightly improves subsequent performance (+1.3% in the Behm 2016 meta).

Operational rule: **pre-lift warmup = dynamic only. Static stretching → cooldown or standalone mobility block.**

## Nuance
- The performance decrement is acute (lasts ~5-30 min) and modest (~3-5%). It matters at the top of the working range (heavy compounds near 1RM, plyo / power work). For light isolation / accessory work it's basically noise.
- Hold duration is the dose. Behm 2016 found stretches **<30s per muscle were not associated with the strength deficit**. Brief static holds buried in a warmup flow (e.g., a 10s pigeon transition) are not the same as a 60s static hold.
- The mechanism is not fully settled — proposed mechanisms include reduced musculotendinous stiffness, altered neural drive, and stretch tolerance changes. The effect is real and reproducible regardless of mechanism.
- Dynamic stretching that achieves the same ROM the lift needs (e.g., a deep goblet-squat hold-and-pry as a "dynamic" mobility drill on squat day) is preferable to a static pigeon hold for the same purpose.
- Cooldown static stretching is fine — and is the natural home for the static holds the user couldn't do pre-lift. Cooldown also reclaims the "psychological transition" function (see `cooldown-purpose-honest`).
- Special case: stretching for chronic rehab / pain-relief contexts is sometimes appropriate immediately before lifting (e.g., a pec-minor stretch at 30° flex to free overhead pressing in a chronic shoulder user). These are protocol-driven; treat them as exceptions handled by the rehab system, not as defaults.

## What this contradicts (optional)
- The "stretch before you lift to prevent injury" pattern. No evidence pre-lift static stretching reduces injury incidence (Behm 2016).
- Generic gym-class warmups that lead with held static stretches of the prime mover.
- The mobility-app pattern of slotting the same routine pre-lift and post-lift interchangeably. Placement matters.

## Application in this app
- `src/lib/planner/generateWarmup.ts` already implements this rule via `STATIC_STRETCH_SUBSTITUTIONS`. Protocol-emitted static-stretch ids (`couch_stretch`, `hip_flexor_stretch`, `soleus_stretch`, etc.) are substituted with dynamic equivalents (`hip_airplane`, `ankle_dorsiflexion_mobility`) before they enter the warmup. The substitution map intentionally drops `duration_sec` and `reps` on the override because static-hold doses don't translate to dynamic-rep doses.
- `src/data/mobility-routines.ts` `RoutinePlacement` taxonomy enforces the same rule at the UI layer: routines that are mostly static holds are tagged `'cooldown'`; dynamic / active flows are tagged `'pre_lift'` or `'any'`. The UI must surface this tag — never let a user drop a cooldown routine onto a pre-lift slot without a warning.
- The LLM nuance layer may explain to the user *why* a static stretch they expected pre-lift was moved to cooldown ("static holds >30s acutely drop your force output by a few percent — we'll do this after the lift, not before"). The cited number range (3-5%) is allowed; do not fabricate larger or smaller numbers.
- When a rehab protocol prescribes a static stretch with explicit pre-lift placement (e.g., shoulder pec-minor stretch in chronic shoulder protocol), the substitution map should NOT apply — the protocol override wins. Verify protocol entries opting into pre-lift static work are intentional.
