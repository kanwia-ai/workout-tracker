---
id: mobility-vs-stretching
type: principle
domain: warmup-recovery
title: "Mobility vs stretching (they are not the same)"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, get_strong, lean_and_strong, fat_loss, general, athletic, mobility]
  training_age: any
  sex: any
  injuries: []
tags: [mobility, stretching, terminology, active-rom, passive, placement]
citations:
  - "Behm DG, Chaouachi A. A review of the acute effects of static and dynamic stretching on performance. Eur J Appl Physiol 2011; 111(11):2633-2651. DOI 10.1007/s00421-011-1879-2"
  - "Behm DG, Blazevich AJ, Kay AD, McHugh M. Acute effects of muscle stretching on physical performance, range of motion, and injury incidence in healthy active individuals. Appl Physiol Nutr Metab 2016; 41(1):1-11. PMID 26642915."
  - "Page P. Current concepts in muscle stretching for exercise and rehabilitation. Int J Sports Phys Ther 2012; 7(1):109-119. PMC3273886."
  - "Kay AD, Blazevich AJ. Effect of acute static stretch on maximal muscle performance: a systematic review. Med Sci Sports Exerc 2012; 44(1):154-164. DOI 10.1249/MSS.0b013e318225cb27"
related: [static-vs-dynamic-stretching, ramp-method, mobility-tab-placement-tags, cooldown-purpose-honest]
contradicts: []
---

# Mobility vs stretching (they are not the same)

## Claim
"Mobility" and "stretching" are widely used interchangeably in popular fitness content, but they describe meaningfully different practices that belong in different slots:

- **Mobility = active control through a range.** The lifter is the actor — moving their joint(s) through end-range under their own muscular control. Examples: 90/90 transitions, hip airplanes, deep-squat pry, controlled articular rotations (CARs), Cossack squat flows, kneeling thoracic windmills, scap push-ups. These build *usable* end range — ROM the nervous system can actively access and stabilize.

- **Stretching = passive lengthening of muscle, typically held.** The lifter is letting gravity or position lengthen the muscle while they relax. Examples: pigeon hold, couch stretch hold, supine hamstring stretch with strap, doorway pec stretch, butterfly. These chronically improve passive ROM and stretch tolerance over weeks but don't directly build active control of that range.

Both have a place, but their **placement differs**:
- **Mobility can be pre-lift (warmup Mobilize phase) OR off-day.** Active-control work doesn't depress force; it primes movement patterns. (See `ramp-method`.)
- **Static stretching is cooldown OR off-day only.** Held stretches >30s pre-lift acutely drop force ~3-5% (see `static-vs-dynamic-stretching`).

They are **not interchangeable** because:
1. Their acute effects on performance differ (mobility: neutral / slightly positive; static stretching: small acute deficit).
2. Their training adaptations differ (mobility builds active ROM + motor control; stretching builds passive ROM + stretch tolerance).
3. Their UI placement in this app must follow these acute-effect rules to avoid degrading the lift the user is about to do.

## Nuance
- **A held position with active engagement is hybrid.** A deep-squat hold where the lifter is *actively pressing knees out and bracing the core* is closer to mobility than static stretching — the muscle isn't fully relaxed. The relevant question for placement is "is the lifter actively producing force" vs "is the lifter passively letting the position lengthen them."
- **PNF stretching (contract-relax)** is its own category — uses brief isometric contractions inside a static stretch. Behm 2016 found PNF caused the largest acute strength deficit (-4.4%), so PNF is firmly cooldown / off-day.
- **Dynamic stretching is mobility-adjacent.** Walking knee hugs, leg swings, arm circles — they live in the warmup Mobilize phase. Calling them "stretching" is technically loose; they are short-duration active ROM drills.
- **Passive stretching for chronic flexibility goals (gymnasts, dancers) works**, but the dose is high (multiple sessions/week, long holds totaling 5+ minutes/muscle/week) and the gains are slow. Don't pretend a 30s pre-lift hold is "fixing tightness."
- **"Tight" is often a perception, not a structural shortening.** Hip flexors and upper traps in desk workers are usually *overactive / lengthened-weak*, not literally short (see master synthesis "what not to codify" + R5/R6 entries). Stretching them passively gives short-term subjective relief without addressing the root pattern; activation + eccentric strengthening is the actual fix. The app's hip-flexor and right-trap protocols already encode this.
- **Mobility done passively isn't mobility — it's stretching.** If a user "does mobility" by sitting in a pigeon for 60s without engaging, they're stretching. The framing in the UI should distinguish "hold and breathe" (passive / static) from "control through the range" (active / mobility).

## What this contradicts (optional)
- The conflation in generic content that "mobility" and "stretching" are synonyms.
- The framing that any held position equals "passive stretching" (active-engagement holds are not).
- The framing that "more flexibility = better performance" without specifying active vs passive ROM. Active ROM is what shows up under load; passive ROM that isn't actively controlled doesn't transfer.

## Application in this app
- **`src/data/mobility-routines.ts` already distinguishes by placement tag** (`'pre_lift'` for mobility-flavored / active routines, `'cooldown'` for stretch-heavy / passive routines, `'any'` for hybrid flows). Keep this taxonomy honest — when adding new routines, classify by whether the majority of the work is active engagement (mobility, tag `'any'` or `'pre_lift'`) vs passive holds (stretching, tag `'cooldown'`).
- **`generateWarmup.ts` `STATIC_STRETCH_SUBSTITUTIONS`** is the engine-level enforcement: protocol-emitted static stretches are swapped for dynamic / mobility equivalents before they reach the warmup. The substitution targets are mobility moves (`hip_airplane`, `ankle_dorsiflexion_mobility`, `90_90_hip`) — confirming the design: pre-lift = mobility, not stretching.
- **The UI copy for routines should reflect this:**
  - A `'pre_lift'` routine card can say "active control work — primes the lift."
  - A `'cooldown'` routine card should say "static holds — best after lifting or on off days."
  - An `'any'` routine can say something neutral.
- **The LLM nuance layer may explain the distinction to a confused user** ("the engine moved your hip-flexor stretch to cooldown — held stretches like that briefly drop force output, so they belong after lifting, not before. Pre-lift you're getting hip airplanes instead — same region, but you're actively controlling the range"). The numbers cited must come from this entry (or `static-vs-dynamic-stretching`).
- **Don't auto-prescribe "stretching" for a "tight" complaint** without first checking whether the muscle pattern is the activation / strengthening territory (hip flexors, upper traps — see master synthesis "what not to codify"). Default protocol = activate + eccentric strengthen; stretching is adjunct.
