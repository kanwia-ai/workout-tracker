---
id: skip-recalibration-tiers
type: pattern
domain: progression
title: "Skip recalibration tiers — load multiplier ladder by gap and training age"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, fat_loss, glutes, aesthetics, general_fitness, longevity]
  training_age: any
  sex: any
  injuries: []
tags: [skip-recalibration, layoff, gap-days, tendon-ramp, load-multiplier, returning-lifter]
citations:
  - "Mujika I, Padilla S. Detraining: loss of training-induced physiological and performance adaptations. Part I. Sports Med. 2000;30(2):79-87. PMID: 10966148."
  - "Mujika I, Padilla S. Detraining: loss of training-induced physiological and performance adaptations. Part II. Sports Med. 2000;30(3):145-154. PMID: 10999420."
  - "Halonen EJ et al. Does taking a break matter — adaptations in muscle strength and size between continuous and periodic resistance training. Scand J Med Sci Sports. 2024. DOI: 10.1111/sms.14739. (DOI verified against audit citation.)"
  - "Encarnação IGA et al. Effects of detraining on muscle strength and hypertrophy: a systematic review. Muscles (MDPI). 2023. https://www.mdpi.com/2813-0413/1/1/1 (URL verified against audit). Confidence: HIGH on CLAIM and existence; MEDIUM on exact author/DOI metadata."
  - "Bosquet L, Berryman N, Dupuy O, Mekary S, Arvisais D, Bherer L, Mujika I. Effect of training cessation on muscular performance: a meta-analysis. Scand J Med Sci Sports. 2013;23(3):e140-e149. PMID: 23145482."
  - "Magnusson SP, Langberg H, Kjaer M. The pathogenesis of tendinopathy: balancing the response to loading. Nat Rev Rheumatol. 2010;6(5):262-268. PMID: 20308995."
related: [detraining-after-layoff, deload-mechanics, autoprogress-by-training-age]
contradicts: [myth-two-weeks-off-lose-everything, myth-aggressive-relayoff-cut]
---

# Skip recalibration tiers — load multiplier ladder by gap and training age

## Claim

When the user returns to training after a gap (missed sessions, vacation, illness, etc.), the upcoming session's planned load should be **softened** to ramp tendons, joints, and motor patterns back to working load — NOT because of measured strength loss, but to avoid tweaking connective tissue on session 1 back (Magnusson 2010 tendon mechanobiology; Mujika & Padilla 2000 detraining).

The recalibration ladder differs by training age — novices detrain faster (Mujika 2000) and have less ingrained movement patterns, so the ladder is steeper.

### TRAINED (≥12 months consistent training)

| Gap (days) | Action | Load multiplier | Week change | Rationale |
|---|---|---|---|---|
| 0–3 | `slide` | 1.00× | none | Back on schedule. No adjustment. |
| 4–7 | `deload_mild` | 0.95× | none | Trained strength is retained over a week; the small cut is a tendon/CNS ramp. |
| 8–14 | `deload_mild` | 0.92× | none | Mujika & Padilla: trained strength preserved through 2 weeks. The cut is tendon ramp, not strength comp. |
| 15–21 | `step_back_one_week` | 0.90× | week − 1 | Encarnação 2023: meaningful decrement only past ~4 weeks. Step-back a week to avoid tendon irritation. |
| 22–28 | `step_back_two_weeks` | 0.85× | week − 2 | Approaching the 4-week threshold where real decrement appears. Two-week step-back at 85%. |
| 29+ | `reset` | 0.75× | week 1 | Past the ~4 week mark detraining starts to show; reset is honest, strength comes back fast (Bruusgaard 2010 muscle memory). |

### NOVICE (<12 months consistent training)

| Gap (days) | Action | Load multiplier | Week change | Rationale |
|---|---|---|---|---|
| 0–3 | `slide` | 1.00× | none | Same as trained. |
| 4–7 | `deload_mild` | 0.90× | none | Newer lifters lose conditioning faster; tendon ramp slightly more conservative. |
| 8–14 | `deload_mild` | 0.85× | none | Movement patterns less ingrained; bigger ramp helps re-find groove without strain. |
| 15–21 | `step_back_one_week` | 0.85× | week − 1 | First real step-back. Same 0.85× as the 8–14 day cut but with a week change to give more progression headroom. |
| 22+ | `reset` | 0.70× | week 1, rep override [8, 12] | Full reset with moderate-rep override for safe rebuild. Less retention than trained; safer to rebuild from base loads. |

A `reset` action additionally swaps to a moderate-rep scheme (8–12 reps regardless of original prescription) — sub-maximal loads benefit from sub-maximal rep ranges during the return ramp, and 8–12 is a forgiving zone for re-grooving technique under load.

The framing in user-facing copy is **always** "tendon ramp" or "easing back to load," not "you got weaker." Both are honest for short gaps (≤4 weeks) and the framing avoids the demoralizing-and-wrong "you lost it" framing.

## Nuance

- **The ladder is intentionally per-tier, not continuous.** A continuous formula (load_multiplier = f(gap_days, training_age)) would be more "elegant" but harder to reason about, harder to test, and indistinguishable in practice. Discrete tiers map well to user-facing copy.
- **Training age boundary at 12 months is a soft cutoff.** An 11-month-trained user is not categorically different from a 13-month one — but the 12-month boundary captures "lifted for about a year" in user language, which is the practical inflection point.
- **The ladder assumes the layoff was vacation-equivalent.** Illness, injury, and post-surgical recovery all need different (typically more conservative) returns. The engine cannot reliably distinguish these from session-log data alone — the LLM nuance layer should ask in session notes for context.
- **Multipliers ≤ 1.0 only.** The engine never prescribes a multiplier above 1.0 on return — there's no detraining-to-supercompensation effect that warrants a load increase coming off a layoff. Schema-enforced at `RecalibrationResultSchema.load_multiplier.min(0).max(1)` (line 61 of `skipRecalibration.ts`).
- **Effective week number floor of 1.** Step-backs cap at week 1 — we never step before the start of the mesocycle. `Math.max(1, origWeek - n)` enforces this in code.
- **Bosquet 2013 meta-context.** The Bosquet meta showed about a 7.6% mean strength loss after a typical 4-week detraining period across mixed athlete populations. This is *useful for calibrating expectations* but not load: a 4-week-off lifter is NOT 7.6% weaker on day 1 back — measurement and prescription are different things. The tendon ramp logic dominates.
- **The audit (`docs/audits/2026-05-07-adaptive-logic-audit.md` §2) softened a previously-too-aggressive ladder.** The current values reflect post-audit recommendations.

## What this contradicts

- **"After 2 weeks off, drop 20%."** Over-conservative for trained lifters; the literature supports a 5–10% tendon-ramp cut, not a strength-loss compensation.
- **"Just resume where you left off — strength is retained."** Correct on strength (Mujika 2000), but ignores the tendon-ramp consideration. Going straight to max effort risks tweaking the supporting connective tissue even when muscle strength is intact.
- **"Novices and trained lifters should ramp the same way."** False — novices lose conditioning faster and have less movement-pattern retention. The two-tier ladder is evidence-aligned (Mujika 2000 Part I + II).

## Application in this app

- The engine implements this ladder in `src/lib/planner/skipRecalibration.ts` (`computeRecalibration` function, lines 123-251). Code structure matches the tier tables above exactly.
- Rationale strings (lines 143, 156, 169, 181, 192, 203, 217, 227, 237, 248) frame load cuts as tendon/CNS ramps. PRESERVE this framing.
- The engine uses `trainingAgeMonths` from the user profile to branch trained vs. novice paths (line 133: `trained = age >= TRAINING_AGE_NOVICE_MONTHS`). When training age is unavailable or < 0, the code clamps to 0 (line 132), which routes to the novice path — safer default.
- The `effective_week_number` is the week number the planner uses when resolving variant pools and load progressions for this session — it's the "as if we were at week N of the mesocycle" pointer. Implementations consuming the recalibration should treat this as authoritative for the affected session(s).
- The LLM nuance layer should narrate the recalibration as protective, not punitive: "13 days off — easing tendons back at 92% before pushing." NOT: "you missed 13 days, so your weight is reduced."
- For multi-week resets (`action: 'reset'`), the rep-scheme override [8,12] means the LLM should also explain the rep change: "starting back with moderate reps (8–12) so we re-find groove on the bar — load and reps will both climb back over the next few sessions."
- The 28+ day handling (trained: reset at 75%; novice: reset at 70%) is intentionally honest — past the 4-week mark, real detraining is documented, so the reset is real. But framing should emphasize muscle memory and rapid return: "fresh start, but strength comes back fast — most lifters are back at prior loads within 2–3 weeks."
