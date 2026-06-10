---
id: tempo-and-time-under-tension
type: principle
domain: programming-fundamentals
title: "Tempo and time-under-tension — not a primary programming variable"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, glutes, aesthetics, general_fitness, fat_loss]
  training_age: any
  sex: any
  injuries: []
tags: [tempo, time-under-tension, eccentric, concentric, technique]
citations:
  - "Schoenfeld BJ, Ogborn D, Krieger JW. Effect of repetition duration on muscle hypertrophy: a systematic review and meta-analysis. Sports Med. 2015;45(4):577-585. PMID: 25601394. DOI: 10.1007/s40279-015-0304-0."
  - "Wilk M, Zajac A, Tufano JJ. The Influence of Movement Tempo During Resistance Training on Muscular Strength and Hypertrophy Responses: A Review. Sports Med. 2021;51(8):1629-1650. PMID: 34043184."
  - "Schoenfeld BJ, Grgic J. Eccentric Overload Training: A Viable Methodology to Improve Muscular Hypertrophy. Strength Cond J. 2018;40(2):78-81."
related: [hypertrophy-rep-ranges, proximity-to-failure-rir, range-of-motion]
contradicts: [tempo-prescriptions-drive-growth]
---

# Tempo and time-under-tension — not a primary programming variable

## Claim

**Rep durations between approximately 0.5 and 8 seconds per rep produce equivalent hypertrophy when sets are taken close to failure.** Schoenfeld 2015's meta-analysis on repetition duration found no significant hypertrophy difference within this range. Super-slow tempos (>10 seconds per rep) are *inferior* — they reduce achievable load and total volume without growth benefit.

**There is no evidence that prescribed numeric tempos (e.g., "3-1-1-0" = 3s eccentric, 1s pause, 1s concentric, 0s top) outperform self-selected moderate tempo.** Time-under-tension as a primary programming variable is not supported by current evidence.

**Practical default cue:** "Control the eccentric (2–3 seconds), lift with intent (1–2 seconds concentric)." Don't prescribe a numeric tempo unless there's a specific reason.

## Nuance

- **Tempo prescriptions have specific niches:**
  - **Tendon rehab** — slow eccentrics (4–6s) on the affected movement; eccentric-emphasis is supported in patellar tendinopathy (Rio 2015) and elsewhere.
  - **Technique correction** — slowing the eccentric helps users learn motor patterns and improve mind-muscle connection on hard-to-feel exercises (lat pulldown, hip thrust).
  - **Novices for motor learning** — deliberate eccentric (3s) on compounds while pattern is being learned.
  - **Power / strength** — *maximal concentric intent* (move the bar as fast as possible) regardless of load. Slow eccentrics are fine; intentional slow concentrics for strength are counter-productive.
- **"Time under tension" as a *result* matters; as a *prescription* it doesn't.** A set of 8 reps at moderate tempo produces ~30s of TUT, which is plenty. Stretching TUT artificially (3-1-3-1 tempo on bench) just reduces achievable load and total volume.
- **The eccentric phase produces meaningful hypertrophy signal.** Don't *drop* the bar — control it. The standard cue "control the eccentric" exists because dropping the bar throws away ~40% of the work. But adding 3 more seconds to a 3s eccentric doesn't add 3s of growth signal proportionally.
- **Super-slow training (10s+ per rep) is empirically inferior.** Either the load is so low the stimulus is sub-threshold, OR the volume per session collapses so total volume drops.
- **The Wilk 2021 review** notes tempo effects on strength are also limited within the typical range; *concentric velocity* (intent on the way up) matters more than total rep duration for strength outcomes.

## What this contradicts

- **"3-1-1-0 tempo (or any specific numeric tempo) is optimal."** No evidence in support; meta-analytic data is null within the typical range. (Myth: `myth-3-1-1-0-tempo-magic`.)
- **"Slow reps build more muscle."** False above the 0.5–8s range; super-slow is actively worse. (Myth: `myth-slow-reps-build-more`.)
- **"Maximizing time under tension is how you maximize growth."** TUT is a downstream effect of sets × reps × tempo. Volume × proximity-to-failure subsumes it. (Myth: `myth-tut-determines-growth`.)

## Application in this app

- **The engine does NOT prescribe numeric tempo by default.** Per-exercise notes carry the simple cue "control the eccentric, lift with intent."
- **Tempo prescription is enabled for specific contexts only:**
  - Rehab protocols (knee tendon, shoulder RC) — explicit slow-eccentric cues on the affected lift.
  - Novice on a hard-to-feel exercise — slow-eccentric cue for mind-muscle connection (e.g., lat pulldown 3s down).
  - User explicitly requesting tempo work in advanced specialization.
- **For power / explosive work** — cue "maximal concentric intent" regardless of load. Don't slow the bar voluntarily.
- **LLM nuance layer**: when the user asks about tempo, cite Schoenfeld 2015 (null effect within typical range) and emphasize that effort (proximity to failure) and total volume drive growth, not tempo. Don't prescribe "3-1-1-0" unless there's an explicit reason. If the user reports "I read I should do 5-second eccentrics for growth," reframe: that's a niche technique, not a hypertrophy principle. Acknowledge the controlled-eccentric default; push back on the prescription-of-tempo claim.
