---
id: rest-periods-by-role
type: principle
domain: programming-fundamentals
title: "Rest intervals scale by exercise role"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, glutes, aesthetics, general_fitness, athletic, fat_loss]
  training_age: any
  sex: any
  injuries: []
tags: [rest, inter-set, recovery, compound, isolation, timer]
citations:
  - "Schoenfeld BJ, Pope ZK, Benik FM, Hester GM, Sellers J, Nooner JL, Schnaiter JA, Bond-Williams KE, Carter AS, Ross CL, Just BL, Henselmans M, Krieger JW. Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men. J Strength Cond Res. 2016;30(7):1805-1812. PMID: 26605807. DOI: 10.1519/JSC.0000000000001272."
  - "Grgic J, Schoenfeld BJ, Skrepnik M, Davies TB, Mikulic P. Effects of Rest Interval Duration in Resistance Training on Measures of Muscular Strength: A Systematic Review. Sports Med. 2018;48(1):137-151. PMID: 28933024."
  - "Piqueras-Sanchiz F, et al. Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy. PMC11349676 (2024)."
  - "de Salles BF, Simão R, Miranda F, et al. Rest interval between sets in strength training. Sports Med. 2009;39(9):765-777. PMID: 19691365."
related: [hypertrophy-rep-ranges, strength-rep-ranges, session-structure-ordering, proximity-to-failure-rir]
contradicts: [myth-60s-rest-hypertrophy, myth-short-rest-builds-more-muscle]
---

# Rest intervals scale by exercise role

## Claim

Inter-set rest interval should be **long enough to preserve performance (load × reps) on the next set**. Schoenfeld et al. 2016 demonstrated that **3-minute rest produced significantly greater muscle strength AND hypertrophy than 1-minute rest** over 8 weeks in resistance-trained men, mediated by preserved volume-load across the workout. The 2024 Bayesian meta-analysis confirms longer rest (≥2 min) favors hypertrophy outcomes, with diminishing returns past ~3 min for isolation work.

**Practical default, by exercise role:**

| Role | Default rest | Why |
|---|---|---|
| **Compound** (squat, deadlift, bench, OHP, row, weighted pull-up <12 reps) | **180s** | Large muscle mass × heavy load → ATP/PCr + neural recovery takes >2 min. Cutting rest cuts reps, cuts working-set quality. |
| **Compound accessory** (split squat, RDL, incline DB press, chest-supported row, chin-up 8–12) | **120s** | Less systemic, but still multi-joint; 2 min preserves the working reps. |
| **Isolation / pump** (curl, lateral raise, leg extension, calf, cable crossover, 10–20 reps) | **75s** | Single joint, smaller muscle mass; full strength recovery not required, just enough to land another quality near-failure set. |
| **Rehab primer** (TKE, clamshell, bird dog, dead bug) | **30–45s** | Low load, patterning purpose, not stimulus-limited. |
| **Superset / antagonist pair** | timer = movement A's recovery need (compound wins → 180s) | The longer-rest movement dictates the pair's pacing. |

**Overrides:**
- Strength-focused day (≥85% 1RM, 1–5 reps): compounds push to **240s** (4 min).
- Time-budget constrained: novice override allows 60–90s across the board if the session would otherwise exceed budget — accept the small performance hit to keep the session viable.

## Nuance

- **The mechanism is volume-load preservation.** Short rest doesn't directly impair growth; it impairs the *next set's reps at the prescribed load*, which downstream reduces weekly volume, which reduces growth. The Schoenfeld 2016 effect is mediated through this chain — not through magic "rest hormones."
- **Trained vs untrained matters.** Schoenfeld 2016 was in *resistance-trained* men. In novices, shorter rest with submaximal loads may still produce growth because near-failure stimulus is rarer and any volume is productive. Still: defaulting to 60s for hypertrophy in trained lifters is outdated.
- **Isolation tolerates shorter rest** because the recovery limiter is local (intramuscular ATP/lactate clearance) rather than systemic. 75s on lateral raises lets you land another hard set without burning session time.
- **Antagonist pairing / supersets** can preserve total session work and rest implicitly — while you do triceps, biceps recover. Useful for time-constrained sessions on opposing muscles (bench + row, curl + pushdown). Don't pair agonists (bench + OHP) — both fatigue the shoulder.
- **Cardio-style metabolic conditioning** (15–30 reps, 30–60s rest, continuous push) is a different goal — that's work capacity / hypertrophy hybrid, not strength or pure hypertrophy.
- **Rest is per the *user's actual recovery need*, not the timer.** The trainer's lens: if a user reports "didn't need that much" repeatedly on an exercise, the personal rest default for that movement can drop. If a user reports "needed every second and more," extend it. UX surface: `rest-needed tap` after each set ("ready already / right amount / needed more").

## What this contradicts

- **"60s rest is optimal for hypertrophy."** Legacy gym-bro lore from the metabolic-stress-as-mechanism era. Schoenfeld 2016 (the author who *built* the metabolic-stress hypothesis) found longer rest is better even for hypertrophy outcomes. (Myth: `myth-60s-rest-hypertrophy`.)
- **"Short rest builds more muscle because of the pump / growth hormone."** Acute GH spikes do not drive long-term hypertrophy at meaningful magnitudes; volume × proximity-to-failure does. (Myth: `myth-short-rest-builds-more-muscle`.)
- **"Resting more is wasting time."** Resting less *literally* costs reps and thus weekly volume. Time spent resting on a heavy compound is producing the next quality set.

## Application in this app

- **Session renderer**: every prescribed set inherits the rest-interval from its exercise's `role` tag. The rest timer in the UI counts down from this value automatically. No more legacy "60s default."
- **Exercise library**: every entry has a `role` field — `compound` / `compound_accessory` / `isolation` / `rehab_primer` / `power` — driving the timer.
- **Overrides supported**:
  - Strength block on main lift → bump compound rest to 240s.
  - Novice + time-constrained → cap rest at 90s with a session note ("we shortened rest to fit your time budget — expect slightly fewer reps on later sets; this is fine for now").
  - Supersets → timer = max of paired exercise rests (compound dominates).
- **Per-user rest learning** (future): track user-reported "ready already" / "needed more" responses per exercise; nudge per-user defaults ±15s after 3 consistent signals on the same exercise. Don't override session-level rest mid-session.
- **LLM nuance layer**: when the user asks "why is the rest so long?" cite Schoenfeld 2016 (longer rest, more strength + hypertrophy, mediated by volume-load preservation). For lateral raises being 75s, note that isolation work recovers locally faster and 3 min would just lengthen sessions without growth benefit. Do NOT cite "metabolic stress" or GH as a reason for short rest — both are outdated mechanisms.
