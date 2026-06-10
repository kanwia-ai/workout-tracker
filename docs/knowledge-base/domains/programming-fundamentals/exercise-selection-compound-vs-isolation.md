---
id: exercise-selection-compound-vs-isolation
type: principle
domain: programming-fundamentals
title: "Exercise selection — compounds and isolations are complementary"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, glutes, aesthetics, general_fitness, fat_loss]
  training_age: any
  sex: any
  injuries: []
tags: [exercise-selection, compound, isolation, free-weights, machines, stimulus-to-fatigue]
citations:
  - "Gentil P, Soares S, Bottaro M. Single vs. Multi-Joint Resistance Exercises: Effects on Muscle Strength and Hypertrophy. Asian J Sports Med. 2015;6(2):e24057. PMID: 26446291."
  - "Paoli A, Gentil P, Moro T, Marcolin G, Bianco A. Resistance Training with Single vs. Multi-joint Exercises at Equal Total Load Volume. Front Physiol. 2017;8:1105. PMID: 29312007."
  - "Haugen ME, Vårvik FT, Larsen S, Haugen AS, van den Tillaar R, Bjørnsen T. Effect of free-weight vs. machine-based strength training on maximal strength, hypertrophy and jump performance: a systematic review and meta-analysis. BMC Sports Sci Med Rehabil. 2023;15(1):103."
  - "Schoenfeld BJ, Contreras B, Krieger J, et al. Resistance Training Volume Enhances Muscle Hypertrophy but Not Strength in Trained Men. Med Sci Sports Exerc. 2019;51(1):94-103."
  - "Israetel M, Hoffmann J, Smith C. Scientific Principles of Hypertrophy Training. Renaissance Periodization, 2017. (Stimulus-to-fatigue ratio framework.)"
related: [session-structure-ordering, muscle-group-grouping, set-volume-landmarks, range-of-motion]
contradicts: []
---

# Exercise selection — compounds and isolations are complementary

## Claim

When weekly set volume is equated, **compound and isolation exercises produce similar hypertrophy of the target muscle** (Gentil 2015; Paoli 2017). Compounds are *more time-efficient* (multiple muscles per set); isolations allow targeting lagging muscles or specific muscle regions. **Both belong in a well-designed program** — they are complementary, not competitive.

Similarly, **free weights and machines produce equivalent hypertrophy when volume is matched** (Haugen 2023 meta). Strength gains are modality-specific: free-weight training transfers to free-weight tests; machine training transfers to machine tests.

**Stimulus-to-fatigue ratio (SFR)** is the operational lens for selecting between options:
- **High SFR**: machine leg press, hack squat, chest-supported row, cable lateral raise, pec deck. These produce growth stimulus efficiently — minimal stabilization cost, minimal systemic fatigue per set.
- **Low SFR**: heavy back squat, conventional deadlift, barbell row. Produce growth + strength, but at high systemic recovery cost.

**Practical rule**: use low-SFR compounds as the *main lift* (when fresh, 3–6 or 5–8 reps for strength + hypertrophy combined). Use high-SFR machines and isolations to accumulate the bulk of weekly volume on each muscle without burning recovery.

## Nuance

- **Compounds train multiple muscles per set**, so "compound vs isolation" comparisons need careful volume equating. A row trains back + biceps + posterior delts — the biceps gets ~0.5 sets of indirect work per set of rows. The Pelland 2025 meta-regression formalized this: indirect sets count partially toward target-muscle volume.
- **For novices, compounds are essential** — they're the practice vehicle for motor skill, balance, and load. A novice on isolations only will never learn to squat or deadlift. Bias the novice prescription toward compounds (with machine/supported variations if injury limits direct compound work).
- **Time-budget shapes the ratio.** With <45 min per session, compounds dominate (70–80%). With 45–75 min, mix moves to 50/50. With 75+ min, more room for isolations on lagging muscles.
- **Lagging-muscle priority** — every lagging or priority muscle group warrants ≥1 dedicated isolation exercise per week, even on a compound-heavy program. Side delts and biceps especially: most people don't grow them enough from indirect work alone.
- **Machines have specific advantages**:
  - Safer when fatigued or training alone (no spotter required).
  - Better for some injuries (chest-supported row spares lower back; hack squat spares lower back vs barbell squat).
  - Lower stabilization cost → can push closer to failure without form collapse.
  - Better access to long-length emphasis on some muscles (preacher curl bottom for biceps in the wrong way, but overhead cable triceps for triceps long-head).
- **Free weights have specific advantages**:
  - Higher CNS demand → better neural drive practice.
  - Transfer to free-weight 1RM tests (relevant if the user has powerlifting goals).
  - Equipment-flexible (a home gym with DBs covers many bases; one Smith machine doesn't).
- **Equipment constrains choice.** Bodyweight + bands only → unilateral progression + isolation via cables/bands. Full gym → mix freely.

## What this contradicts

- **"Only compounds build muscle; isolations are wasted reps."** False; meta-analytic evidence shows equivalent target-muscle hypertrophy at matched volume. (Myth: `myth-only-compounds-build-muscle`.)
- **"Machines are for beginners; real lifters use free weights."** Haugen 2023 meta: equivalent hypertrophy, equivalent strength on modality-specific tests. Machines are tools, not a tier. (Myth: `myth-machines-are-inferior`.)
- **"Isolation is wasted time if you do compounds."** False for the biceps, side delts, calves, and hamstrings specifically — indirect work from compounds is usually insufficient for the volume-tolerant muscles. (Myth: `myth-isolation-is-wasted`.)

## Application in this app

- **Every session includes ≥1 compound from each major pattern per week**: horizontal push (bench, push-up, DB press), horizontal pull (row variants), vertical push (OHP, machine press), vertical pull (pulldown, chin-up), squat pattern, hinge pattern.
- **Every lagging / priority muscle gets ≥1 dedicated isolation per week** even on compound-heavy programs.
- **Exercise pool**:
  - Filtered by `equipment` (full_gym / home_basic / bands_only / bodyweight) before any LLM sees it.
  - Filtered by `injury_list` per the injury matrix (see master synthesis injury-modification tables).
  - Each exercise tagged with `role` (compound / compound_accessory / isolation / rehab_primer / power) and `sfr_class` (high / moderate / low).
- **Mesocycle build** during accumulation phases biases toward high-SFR options for volume accumulation. Strength peaks shift toward bilateral free-weight compounds.
- **Injury overrides**: knee modify → prefer chest-supported and machine lower-body; lower back modify → prefer trap bar / machine for hinges; shoulder modify → prefer neutral-grip DB or landmine pressing over barbell OHP.
- **LLM nuance layer**: when explaining "why a machine row instead of a barbell row," cite Haugen 2023 (equivalent hypertrophy) and the SFR argument (less stabilization cost → more reps near failure → more stimulus). When explaining "why we added direct biceps work even though you row," note that indirect work usually under-doses the biceps for visible growth (cite Pelland 2025 indirect-vs-direct quantification). Do NOT claim machines are inferior to free weights; do NOT claim isolations are unnecessary.
