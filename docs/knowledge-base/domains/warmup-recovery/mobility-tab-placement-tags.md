---
id: mobility-tab-placement-tags
type: pattern
domain: warmup-recovery
title: "Mobility-tab routine placement (pre_lift / cooldown / any)"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, get_strong, lean_and_strong, fat_loss, general, athletic, mobility]
  training_age: any
  sex: any
  injuries: []
tags: [mobility, placement, ui, taxonomy, routines, cooldown, pre-lift]
citations:
  - "Behm DG, Chaouachi A. A review of the acute effects of static and dynamic stretching on performance. Eur J Appl Physiol 2011; 111(11):2633-2651. (Basis for pre_lift = dynamic only rule.)"
  - "Behm DG, Blazevich AJ, Kay AD, McHugh M. Acute effects of muscle stretching on physical performance, range of motion, and injury incidence. Appl Physiol Nutr Metab 2016; 41(1):1-11. PMID 26642915."
  - "Van Hooren B, Peake JM. Do we need a cool-down after exercise? Sports Med 2018; 48(7):1575-1595. DOI 10.1007/s40279-018-0916-2 (cooldown framing.)"
related: [static-vs-dynamic-stretching, mobility-vs-stretching, cooldown-purpose-honest, ramp-method]
contradicts: []
---

# Mobility-tab routine placement (pre_lift / cooldown / any)

## Claim
Mobility routines surface in the app's Mobility tab, but **a routine's content determines where in a training day it should be used**. The `RoutinePlacement` taxonomy in `src/data/mobility-routines.ts` encodes this with three values:

- **`pre_lift`** — Routine is mostly dynamic / active ROM / activation work. Safe to use immediately before lifting; will not depress force output. Examples: a deep-squat pry sequence (active engagement), 90/90 transitions, a banded glute activation flow, scap push-up + thoracic windmill block.

- **`cooldown`** — Routine is mostly static holds, passive lengthening, or PNF stretching. Do NOT use immediately before lifting (acute ~3-5% force decrement per `static-vs-dynamic-stretching`). Use post-lift, on off days, or as a standalone session. Examples: pigeon hold + butterfly + couch stretch sequences, hip-flexor reset.

- **`any`** — Routine is hybrid (mix of dynamic and short static holds, or holds with active engagement). Can fit either slot. Holds should be ≤15s on a pre-lift slot.

The placement tag is **load-bearing on the UI** — it determines:
1. Whether the routine appears in the "before your lift" UI surface.
2. Whether the routine appears in the "cooldown / standalone" UI surface.
3. What warning copy displays if a user manually drops a `cooldown`-tagged routine onto a pre-lift slot.

## Nuance
- **The tag is a default, not an absolute lock.** A `cooldown` routine that the user really wants to do pre-lift should be possible — but with a clear warning ("this routine is mostly static holds — doing them pre-lift may dial down your force output. Consider doing this after your session instead").
- **Tag the routine by majority content.** A routine with one 30s static hold buried in 8 dynamic drills is `pre_lift`. A routine with 8 static holds and one transition is `cooldown`.
- **"Standalone session" use case** (the user opens the Mobility tab on a non-training day to do a routine for its own sake) is not bound by placement — any routine is fine on an off day. Placement matters only when adjacent to a strength session.
- **Routines for rehab purposes** (e.g., the hip-flexor reset for a desk-worker with chronic hip-flexor tightness) often end up tagged `cooldown` because they're stretch-heavy. That's the right call — they belong post-lift or off-day. The rehab protocol's pre-lift slot gets a different (dynamic) drill from `STATIC_STRETCH_SUBSTITUTIONS`.
- **The opposite mistake is mis-tagging an activation routine as `cooldown`** — banded glute activations, scap retraction work, bird dogs are pre-lift / any, never cooldown. They're not "winding down"; they're priming.

## What this contradicts (optional)
- The pattern in many mobility apps where any "mobility routine" is presented as universally appropriate at any time. Placement matters.
- The framing that all mobility = stretching = belongs after lifting. Active mobility belongs *before* the lift; passive stretching belongs after.

## Application in this app
- **`src/data/mobility-routines.ts`** defines the type:
  ```ts
  export type RoutinePlacement = 'cooldown' | 'pre_lift' | 'any'
  ```
  Defaults to `'any'` if omitted. **Every new routine should be explicitly tagged** — the omission default is too permissive.

- **Audit rule:** when adding or editing a routine, count the exercises:
  - >70% dynamic / active engagement → `'pre_lift'`
  - >70% static held positions (each ≥20s) → `'cooldown'`
  - mixed → `'any'`, AND ensure any static holds in the routine are ≤15s if rendered pre-lift

- **UI surfaces should respect the tag:**
  - The "warmup add-on" or "before your lift" surface lists only `'pre_lift'` and `'any'` routines.
  - The "cooldown" / "wind down" / "stretch" surface lists `'cooldown'` and `'any'` routines.
  - The full Mobility tab (browsing) lists all, with the placement tag visible as a badge so the user understands what they're picking.

- **If a user manually overrides** (tries to use a `cooldown` routine before lifting), surface the warning **once** with the option to silence it for this routine in the future. Don't nag.

- **The substitution map in `generateWarmup.ts`** (`STATIC_STRETCH_SUBSTITUTIONS`) is the engine-level enforcement: protocol-emitted static stretches that would have entered the warmup are replaced with their dynamic equivalents. The `placement` tag on user-facing routines is the UI-level enforcement of the same principle. Both layers must agree — if the protocol's pre-lift warmup_focus contains a static stretch id, it gets substituted; if a user-facing routine contains mostly static holds, it gets tagged `cooldown`. Same rule, two surfaces.

- **The LLM nuance layer must not recommend a `cooldown`-tagged routine in pre-lift context**. The retrieval layer should filter mobility routines by placement when constructing the LLM's context for "what to do before today's session" vs "what to do after today's session." Without that filter, the LLM has no way to honor the rule.
