---
id: progressive-overload-variables
type: principle
domain: progression
title: "Progressive overload is multi-variable — not just 'add weight'"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, fat_loss, glutes, aesthetics, general_fitness, longevity]
  training_age: any
  sex: any
  injuries: []
tags: [progressive-overload, progression-variables, load, reps, sets, rom, tempo, density]
citations:
  - "Plotkin D et al. Progressive overload without progressing load? The effects of load or repetition progression on muscular adaptations. PeerJ. 2022. (Referenced in user brief as 'Plotkin et al. 2022 (Stronger By Science writeups reference this)'. Confidence: MEDIUM on exact DOI/PMID metadata; the CLAIM — load-progression vs. rep-progression produce equivalent hypertrophy in resistance-trained populations — is the paper's documented finding and is cited in Stronger By Science writeups on autoprogression.)"
  - "Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and muscle mass: a systematic review and meta-analysis. J Sports Sci. 2017;35(11). (Cited in `docs/research/00-MASTER-SYNTHESIS.md` primary sources.)"
  - "Schoenfeld BJ, Ogborn D, Krieger JW. Effect of repetition duration on hypertrophy. Sports Med. 2015;45. (Cited in `docs/research/00-MASTER-SYNTHESIS.md` primary sources. The CLAIM — null hypertrophy benefit in the 0.5–8 s/rep tempo range — is well-supported.)"
  - "Wolf M et al. Range of motion hypertrophy meta-analysis. J Strength Cond Res. 2023. (As cited in `docs/research/00-MASTER-SYNTHESIS.md` primary-sources list — 'Wolf M et al. ROM hypertrophy meta. JSCR 2023'. Confidence: MEDIUM on full citation metadata; the claim that fuller ROM tends to produce equal/superior hypertrophy is well-supported in the broader Schoenfeld & Grgic ROM systematic-review literature — Schoenfeld BJ, Grgic J. ROM systematic review. SAGE Open Med. 2020;8.)"
related: [double-progression, rir-effort-signals, bump-vs-hold-vs-drop-rules, autoprogress-by-training-age, when-to-bump-judgment]
contradicts: []
---

# Progressive overload is multi-variable — not just "add weight"

## Claim

Progressive overload — the requirement that training stress must climb over time to drive continued adaptation — can be produced by manipulating **any** of the following variables, not solely load. In rough order of how directly each drives hypertrophy and strength when it's the variable being progressed:

1. **Load** (kg/lb on the bar) — most-cited and most-measured progression variable; the dominant driver of pure strength adaptations.
2. **Reps at a given load** — Plotkin et al. 2022 showed rep-progression and load-progression produced statistically equivalent hypertrophy in an 8-week RCT. Reps are a legitimate primary lever, not a fallback.
3. **Sets per muscle per week** (weekly volume) — Schoenfeld 2017 dose-response meta-analysis shows a roughly linear relationship between weekly hard sets (up to ~10–20 sets/muscle/week) and hypertrophy. Adding a set is overload.
4. **Range of motion (ROM)** — Wolf et al. 2023 meta-analysis: greater ROM tends to produce equal or superior hypertrophy compared to partial ROM. Lengthening a movement (e.g., deeper squat depth, fuller stretch on RDL) progressively is a real form of overload.
5. **Tempo / time-under-tension** — Effect on hypertrophy is small and inconsistent within the 0.5–8 s per rep range (Schoenfeld 2015). Tempo IS useful for technique correction, tendon adaptation, and adding overload when load can't increase (e.g., bodyweight movements, post-injury) — but it is not a high-priority lever for general hypertrophy.
6. **Density** — same work in less rest time. Increases conditioning and metabolic demand but blunts strength/hypertrophy output if rest drops below ~2 min on compounds (Schoenfeld 2016 rest-interval study). Treat density as a conditioning lever, not a hypertrophy lever.

The categorical assertion the engine and LLM should make: **"progressive overload = adding weight" is a partial myth.** It is the most legible variable but it is one of at least six.

## Nuance

- **Strength is more load-specific than hypertrophy is.** A user whose goal is strength_power will see slower 1RM progress from pure rep-progression than from load-progression, because strength adapts to the *specific load* trained. Hypertrophy is broadly equivalent across variables (Plotkin 2022).
- **Beginners progress load weekly; intermediates progress reps within a load, then load.** This is the structural basis for `double-progression`. The right variable to push depends on training age — see `autoprogress-by-training-age`.
- **ROM-as-overload only counts when ROM was previously short.** Going from a 3-inch range-of-motion bench press to a full-depth bench press is overload; going from full-depth to "slightly past full-depth" is form, not overload.
- **Tempo-as-overload should be reserved for specific cases** — bodyweight movements that have outgrown the load (push-ups, dips, pull-ups for novices), early-return-to-training after injury, or tendon rehab protocols (e.g., Alfredson eccentric heel drops). Do not default-prescribe tempo numerics like "3-1-1-0" — Schoenfeld 2015 shows no hypertrophy benefit in the normal 0.5–8 s range. (See master-synthesis "what NOT to codify".)
- **The variables can compound.** A session with +5 lb load AND +1 rep AND deeper ROM is more overload than +5 lb alone. Stack carefully — usually progress one variable per exercise per session.

## What this contradicts

- **"You have to add weight every session or you're not progressing."** False. Adding reps at the same load (the core of double-progression) is overload, full stop (Plotkin 2022).
- **"If you can't lift more, you're stuck."** Almost never true. ROM, reps, sets/week, rest density, and bar-path quality are all available levers.
- **"Time-under-tension is the key to growth."** Schoenfeld 2015 null. TUT is a useful concept for understanding effort, not a primary programming variable.

## Application in this app

- The LLM nuance layer, when explaining the next-session prescription, MUST acknowledge the active progression variable (e.g., "today we add a rep, not weight, because last session was tough at the top of the range"). Do not default to "add weight" language when reps or sets are climbing.
- The engine (`src/lib/planner/autoProgress.ts`) currently progresses ONE variable per exercise per session — load OR reps (for bodyweight), based on the double-progression gate. This is correct. Do not add multi-variable bumps without explicit user signal.
- For exercises where load cannot easily progress (calf raises with capped DBs, bodyweight push-ups before weighted progression is available), the engine should fall back to rep-target progression (see `computeBodyweightRepTarget` in `autoProgress.ts`). ROM and tempo overlays are out of scope for the autoProgress engine — they live in exercise cue copy.
- When the user has plateaued on load for ≥2 sessions at the same exercise (the two-strike drop case in `autoProgress.ts:319-352`), the LLM nuance layer is permitted to suggest "try +1 rep at this load this week instead of adding weight" — this is double-progression by another name and is supported by Plotkin 2022.
- For tendon rehab patterns (knee, shoulder), tempo IS a valid overload variable — slow eccentrics are the established protocol. Surface this in injury-specific copy, not in the general autoProgress flow.
