# Strength & Hypertrophy Programming — Curated Synthesis

> Evidence-ranked principles for an LLM-generated training plan. Ordered strongest-to-weakest evidence. Each principle includes a personalization vector (which user inputs change the prescription) and a prescription template the LLM can parameterize.

User inputs assumed to be available: `training_age` (novice | intermediate | advanced), `goal` (strength | hypertrophy | endurance | general | rehab), `sex`, `age`, `injury_list`, `equipment` (full_gym | home_basic | bands_only | bodyweight), `time_budget_min`, `sessions_per_week`.

---

## Principle 1: Volume is the primary driver of hypertrophy, with diminishing returns
**Claim:** Weekly hard-set volume per muscle shows a graded dose-response on muscle growth; more sets produce more growth up to an individual ceiling, then plateau or regress.
**Evidence strength:** strong
**Primary sources:**
- Schoenfeld, Ogborn & Krieger (2017), *Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis*, Journal of Sports Sciences 35(11).
- Pelland et al. (2025), *The Resistance Training Dose-Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains*, Sports Medicine. (67 studies, 2058 participants; posterior probability of positive volume effect = 100%, with diminishing returns.)
- Schoenfeld et al. (2019), *Resistance Training Volume Enhances Muscle Hypertrophy but Not Strength in Trained Men*.
**Personalization vector:** training_age (novices need less); sessions_per_week (caps feasible volume); age (older adults tolerate less); injury_list (reduce volume on affected muscles).
**Prescription template:**
- Novice: start 8–10 hard sets/muscle/week.
- Intermediate: 10–20 hard sets/muscle/week.
- Advanced: 12–25 hard sets/muscle/week, progress toward individual ceiling.
- "Hard set" = within 0–3 RIR.
- If a muscle group is lagging or a priority, bias toward the top of the range; if secondary, bias to the bottom.

---

## Principle 2: Volume landmarks (MV / MEV / MAV / MRV) organize weekly prescription
**Claim:** For a given muscle group, training exists on a continuum: Maintenance Volume (MV) preserves mass, Minimum Effective Volume (MEV) produces any growth, Maximum Adaptive Volume (MAV) produces near-maximal growth, Maximum Recoverable Volume (MRV) is the upper recoverable ceiling. Progress weekly volume from MEV toward MRV within a mesocycle, then deload.
**Evidence strength:** moderate (framework widely used; specific numeric landmarks are extrapolated from the volume-dose literature rather than validated per muscle)
**Primary sources:**
- Israetel, Hoffmann & Smith (2017), *Scientific Principles of Hypertrophy Training*, Renaissance Periodization.
- Schoenfeld, Ogborn & Krieger (2017) volume dose-response meta-analysis (feeds the landmarks).
- Helms, Morgan & Valdez (2019), *The Muscle & Strength Pyramid: Training* (2nd ed.), which endorses progressive volume within a mesocycle.
**Personalization vector:** training_age, sex, sessions_per_week, recovery capacity proxies (sleep, age, stress).
**Prescription template (per muscle/week, starting points):**
| Muscle | MV | MEV | MAV | MRV |
|---|---|---|---|---|
| Chest | 4–6 | 8 | 12–16 | 20–22 |
| Back | 6–8 | 10 | 14–20 | 22–25 |
| Shoulders (side/rear delt) | 4–6 | 8 | 14–20 | 22–26 |
| Biceps | 4–6 | 8 | 14–20 | 20–26 |
| Triceps | 4–6 | 6–8 | 10–14 | 18–22 |
| Quads | 6–8 | 8–10 | 12–18 | 20 |
| Hamstrings | 4–6 | 6 | 10–14 | 16–20 |
| Glutes | 0–4 | 4–6 | 8–12 | 16+ |
| Calves | 6–8 | 8 | 12–16 | 20 |
Start the mesocycle at MEV, add ~1–2 sets/muscle/week until fatigue markers appear or performance drops, then deload.

---

## Principle 3: Training intensity determines outcome — heavy loads for strength, wide range for hypertrophy
**Claim:** 1RM strength gains are significantly greater with heavy loads (>~60% 1RM, 1–6 reps); hypertrophy is achievable across a wide loading spectrum (~30–85% 1RM) when sets are taken close to failure.
**Evidence strength:** strong
**Primary sources:**
- Schoenfeld, Grgic, Ogborn & Krieger (2017), *Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-analysis*, JSCR 31(12).
- Schoenfeld, Grgic & Krieger (2021), *Loading Recommendations for Muscle Strength, Hypertrophy, and Local Endurance: A Re-Examination of the Repetition Continuum*, Sports 9(2).
- NSCA (Haff & Triplett, eds., 2016), *Essentials of Strength Training and Conditioning* (4th ed.).
**Personalization vector:** goal (strength vs hypertrophy vs endurance), injury_list (heavy compounds may be contraindicated), training_age (novices under-recruit at low loads), equipment (bands/bodyweight shift toward higher reps).
**Prescription template:**
- Strength focus: 70–90% 1RM, 3–6 reps, 2–5 min rest.
- Hypertrophy focus: 65–80% 1RM, 6–12 reps as the backbone; supplement with 30–60% 1RM, 15–30 reps (to failure) for pump/metabolic sets; supplement with 80–90% 1RM, 3–6 reps for mechanical tension.
- Local endurance: <60% 1RM, 15+ reps.
- For hypertrophy, allocate ~60% of sets to the 6–12 range, ~20% heavy (3–6), ~20% lighter (15–30).

---

## Principle 4: Proximity to failure matters, but training to absolute failure is not required
**Claim:** Sets must be taken reasonably close to failure to maximize growth, but stopping 0–3 reps shy of failure produces equivalent hypertrophy to training to failure, with less fatigue and better session-to-session recovery. The relationship is non-linear.
**Evidence strength:** strong
**Primary sources:**
- Grgic, Schoenfeld, Orazem & Sabol (2022), *Effects of resistance training performed to repetition failure or non-failure on muscular strength and hypertrophy: A systematic review and meta-analysis*, Journal of Sport and Health Science.
- Robinson et al. (2023), *Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis*, Sports Medicine.
- Helms et al. (2016), *Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training*, Strength & Conditioning Journal 38(4).
**Personalization vector:** training_age (novices are inaccurate at gauging RIR — bias to lower intensities), exercise complexity (compound: leave more in reserve; isolation: can go closer to failure), load (lower loads require closer proximity to failure).
**Prescription template:**
- Compound lifts (squat, deadlift, bench, row): 1–3 RIR on work sets, save failure for final set of isolation work only.
- Isolation lifts: 0–2 RIR; last set of a movement can go to failure.
- If load <50% 1RM, push closer to failure (0–1 RIR) for the stimulus to land.
- If load >80% 1RM, stay further from failure (2–4 RIR) to manage CNS fatigue.

---

## Principle 5: Frequency is a volume-distribution tool, not an independent driver
**Claim:** When total weekly volume is equated, training a muscle 1x vs 2x vs 3x+ per week produces similar hypertrophy. Higher frequency is useful when it enables more weekly volume, better technique practice, or higher per-set quality.
**Evidence strength:** strong
**Primary sources:**
- Schoenfeld, Grgic & Krieger (2019), *How many times per week should a muscle be trained to maximize muscle hypertrophy? A systematic review and meta-analysis*, Journal of Sports Sciences 37(11).
- Schoenfeld, Ogborn & Krieger (2016), *Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy*, Sports Medicine 46.
- Grgic et al. (2018), *Effect of Resistance Training Frequency on Gains in Muscular Strength*, Sports Medicine.
**Personalization vector:** sessions_per_week, time_budget_min, training_age (novices benefit from 3x full-body), equipment.
**Prescription template:**
- Strength: hit each main lift pattern 2–3x/week.
- Hypertrophy: hit each muscle 2x/week as the default; go 1x/week only if total weekly volume is low (<10 sets); go 3x+ only when volume >16 sets/muscle/week and recovery permits.
- If sessions_per_week ≤ 3: full-body or upper/lower.
- If sessions_per_week = 4: upper/lower.
- If sessions_per_week = 5–6: push/pull/legs, upper/lower 2x/week, or bro-split (less preferred).

---

## Principle 6: RIR-based RPE is a valid intensity regulator for intermediate+ lifters
**Claim:** The Zourdos RIR-based RPE scale (1–10, where RPE 10 = 0 RIR) correlates strongly with bar velocity and %1RM in experienced lifters. Accuracy improves with training age; novices systematically over- or under-rate effort.
**Evidence strength:** strong
**Primary sources:**
- Zourdos et al. (2016), *Novel Resistance Training-Specific Rating of Perceived Exertion Scale Measuring Repetitions in Reserve*, JSCR 30(1).
- Helms et al. (2016), *Application of the Repetitions in Reserve-Based RPE Scale for Resistance Training*, Strength & Conditioning Journal 38(4).
- Helms et al. (2018), *RPE vs. Percentage 1RM Loading in Periodized Programs Matched for Sets and Repetitions*, Frontiers in Physiology.
**Personalization vector:** training_age (gate RIR prescription behind intermediate), goal.
**Prescription template:**
- Novice (< 1 year consistent training): prescribe sets × reps at fixed % 1RM or target reps, mention RIR as informational.
- Intermediate: prescribe RIR targets directly (e.g., "3 × 8 @ RPE 8 / 2 RIR").
- Advanced: use RPE/RIR for daily autoregulation.
- Progress across a mesocycle: Week 1 at 3 RIR → Week 2 at 2 RIR → Week 3 at 1 RIR → Week 4 at 0–1 RIR → deload.

---

## Principle 7: Novices progress with linear session-to-session load increases
**Claim:** Untrained lifters have a wide adaptation window and can add load to compound lifts every session for weeks to months. More complex periodization is unnecessary and can slow progress.
**Evidence strength:** strong
**Primary sources:**
- Rippetoe & Kilgore (2006, 2011), *Practical Programming for Strength Training*, The Aasgaard Company.
- NSCA (Haff & Triplett, 2016), *Essentials of Strength Training and Conditioning*.
- Grgic, Mikulic, Podnar & Pedisic (2017), *Effects of linear and daily undulating periodized resistance training programs on muscle hypertrophy*, PeerJ (novices respond to simple linear programs).
**Personalization vector:** training_age, sex (women may need smaller increments), age, equipment (jump size depends on smallest plate pair available).
**Prescription template:**
- Novice program: 3 sessions/week, full-body, 3 × 5 on main compounds.
- Add 2.5–5 lb (1.25–2.5 kg) per session on upper-body lifts, 5–10 lb (2.5–5 kg) on lower-body lifts.
- When the lifter misses reps on two consecutive sessions at a given load, reset load to ~90% and re-progress.
- Transition to double progression or DUP when linear progression stalls twice within a month.

---

## Principle 8: Intermediates progress with double progression
**Claim:** Once linear weekly load increases stall, progress by accumulating reps within a rep range at a fixed load, then increasing load when the top of the range is hit on all sets.
**Evidence strength:** moderate (universally used in intermediate/bodybuilding programming; direct RCT evidence vs other intermediate methods is sparse)
**Primary sources:**
- Helms, Morgan & Valdez (2019), *The Muscle & Strength Pyramid: Training* (2nd ed.).
- NSCA (2016), *Essentials of Strength Training and Conditioning*.
- Zatsiorsky & Kraemer (2020), *Science and Practice of Strength Training* (3rd ed.).
**Personalization vector:** training_age, goal, equipment (minimum increment).
**Prescription template:**
- Pick a rep range (strength: 4–6; hypertrophy: 6–10, 8–12, 10–15).
- Pick a load that lets the lifter hit the bottom of the range across all sets at 1–2 RIR.
- Progress reps session-to-session until all sets hit the top of the range.
- Then increase load by the smallest available increment and return to bottom of range.

---

## Principle 9: Advanced lifters benefit from periodization — DUP and block are both valid
**Claim:** Periodized training produces greater strength gains than non-periodized once past novice status. Daily Undulating Periodization (DUP) and block periodization are roughly equivalent when volume/intensity are equated.
**Evidence strength:** moderate
**Primary sources:**
- Grgic et al. (2017), *Effects of linear and daily undulating periodized resistance training programs on measures of muscle hypertrophy: a systematic review and meta-analysis*, PeerJ 5:e3695.
- Harries, Lubans & Callister (2015), *Systematic review and meta-analysis of linear and undulating periodized resistance training programs on muscular strength*, JSCR.
- Zatsiorsky & Kraemer (2020), *Science and Practice of Strength Training* (3rd ed.).
**Personalization vector:** training_age (only helpful intermediate+), goal, sessions_per_week.
**Prescription template:**
- DUP (recommended for busy 3–4x/week lifters): vary rep range across sessions within the week on the same lift (e.g., Mon: 5×5, Wed: 4×8, Fri: 6×3).
- Block (recommended for peaking or single-goal mesocycles): 4-week accumulation (hypertrophy-leaning) → 3-week intensification (strength-leaning) → 1-week realization/deload.
- Avoid daily undulation on highly technical lifts for novices.

---

## Principle 10: Deload roughly every 4–8 weeks prevents accumulated fatigue
**Claim:** Reducing volume (and sometimes intensity) for ~1 week every 4–8 weeks preserves training quality, reduces injury risk, and facilitates adaptation. Longitudinal muscle mass outcomes are preserved or improved.
**Evidence strength:** moderate (consensus practice; direct RCT evidence limited; Delphi consensus exists)
**Primary sources:**
- Bell et al. (2023), *Gaining more from doing less? The effects of a one-week deload period during supervised resistance training on muscular adaptations*, European Journal of Applied Physiology.
- Coleman et al. (2024), *Integrating Deloading into Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach*, Sports Medicine.
- Bell et al. (2022), *Deloading Practices in Strength and Physique Sports: A Cross-sectional Survey*.
**Personalization vector:** training_age (advanced need them more often), volume at MRV, age, life stress.
**Prescription template:**
- Novice: deload only when performance stalls (rare; every 8–12 weeks).
- Intermediate: every 5–6 weeks.
- Advanced: every 4–5 weeks or when performance drops two sessions in a row.
- Deload week = maintain frequency, cut sets by ~40–50%, cut load by ~10–20% (or increase RIR to 4–5), hold technique work.

---

## Principle 11: Full range of motion is (mostly) superior to partial ROM for hypertrophy
**Claim:** Training through a full ROM, especially one that loads the muscle at long lengths, produces greater hypertrophy than short-ROM training for most muscles. Emerging evidence favors long-length partials over short-length partials when a partial is used.
**Evidence strength:** moderate-to-strong (lower body strong; upper body more mixed)
**Primary sources:**
- Schoenfeld & Grgic (2020), *Effects of range of motion on muscle development during resistance training interventions: A systematic review*, SAGE Open Medicine 8.
- Wolf et al. (2023), *Which ROMs Lead to Rome? A Systematic Review of the Effects of Range of Motion on Muscle Hypertrophy*, Journal of Strength and Conditioning Research.
- Pedrosa et al. (2022), long-length partial vs. full ROM elbow flexor training.
**Personalization vector:** injury_list (meniscus, lower back: restrict ROM on squats/deadlifts; shoulder impingement: restrict overhead ROM), equipment (limits ROM on some machines), mobility limits.
**Prescription template:**
- Default to full ROM on all lifts.
- For users with specific injuries (e.g., meniscus): reduce bottom-range ROM on squats to pain-free depth; substitute leg press or Bulgarian split squat at safer ROM.
- For advanced hypertrophy specialization: add lengthened-partial sets at end of a movement (e.g., bottom-half RDLs after full RDLs).

---

## Principle 12: Rest between sets should be long enough to preserve performance on the next set — ~2–3 min for compounds, ~60–90s for isolation
**Claim:** Longer rest intervals (~2–3 min) produce more hypertrophy and strength than short rest (~1 min), mediated by preserved volume-load. Diminishing returns past ~2 min for isolation work.
**Evidence strength:** moderate-to-strong
**Primary sources:**
- Schoenfeld, Pope, Benik, Hester et al. (2016), *Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men*, JSCR 30(7).
- Grgic et al. (2018), *Effects of rest interval duration in resistance training on measures of muscular strength*, Sports Medicine.
- Piqueras-Sanchiz et al. (2024), *Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy*, Frontiers.
**Personalization vector:** time_budget_min, goal (strength needs more), exercise type (compound vs isolation).
**Prescription template:**
- Compound lifts (squat/deadlift/press/row): 2–4 min.
- Isolation/single-joint (curls, lateral raises, leg extensions): 60–120s.
- If time_budget_min is tight, use supersets/antagonist pairing for isolation work to preserve rest on compounds.

---

## Principle 13: Exercise selection — compound vs isolation are complementary, not competitive
**Claim:** When weekly set volume is equated, compound and isolation exercises produce similar hypertrophy of the target muscle. Compounds are more time-efficient; isolations allow targeting lagging muscles or specific muscle regions.
**Evidence strength:** moderate-to-strong
**Primary sources:**
- Gentil et al. (2015), *Single vs. Multi-Joint Resistance Exercises: Effects on Muscle Strength and Hypertrophy*, Asian Journal of Sports Medicine 6(2).
- Paoli et al. (2017), *Resistance Training with Single vs. Multi-joint Exercises at Equal Total Load Volume*, Frontiers in Physiology.
- Schoenfeld et al. (2015), single- vs multi-joint elbow flexor training.
**Personalization vector:** time_budget_min (more time → more isolation; less time → compound-heavy), goal (strength: compound-dominant; hypertrophy: mixed; rehab: isolation-dominant with controlled load), equipment, injury_list.
**Prescription template:**
- Minutes per session ≤ 45: 70–80% compounds, 20–30% isolation.
- Minutes per session 45–75: 50–60% compounds, 40–50% isolation.
- Always include at least one isolation exercise per lagging / priority muscle.
- Every session includes ≥1 horizontal push, ≥1 horizontal pull, ≥1 vertical push, ≥1 vertical pull, ≥1 squat pattern, ≥1 hinge pattern across the week.

---

## Principle 14: Free weights and machines are roughly equivalent for hypertrophy; free weights transfer better to free-weight strength tests
**Claim:** Hypertrophy outcomes from free-weight and machine-based training are equivalent when volume and effort are matched. Strength gains are modality-specific — free weights transfer to free-weight tests; machines transfer to machine tests.
**Evidence strength:** strong
**Primary sources:**
- Haugen, Myklebust, Øvretveit & Paulsen (2023), *Effect of free-weight vs. machine-based strength training on maximal strength, hypertrophy and jump performance — a systematic review and meta-analysis*, BMC Sports Science Medicine Rehabilitation.
- Schwanbeck et al. (2020), free-weight vs. machine hypertrophy.
**Personalization vector:** equipment, injury_list (machines are safer for many injuries), training_age (novices with poor technique benefit from machine stabilization).
**Prescription template:**
- If equipment = full_gym: mix free weights (compounds, core movements) with machines (isolation, higher-effort-to-failure work).
- If equipment = home_basic or bands: design around free weights + unilateral work.
- If injury_list includes lower back or knee: prefer machines/supported positions for loaded squats/hinges (leg press, hack squat, Smith squat, chest-supported row).

---

## Principle 15: Unilateral and bilateral training produce similar hypertrophy; pick based on movement-skill carryover
**Claim:** Unilateral and bilateral resistance training produce similar muscle growth when equated. Strength adaptations are specific — bilateral training transfers to bilateral tests, unilateral to unilateral.
**Evidence strength:** moderate-to-strong
**Primary sources:**
- Zhang et al. (2025), *Comparison of Muscle Growth and Dynamic Strength Adaptations Induced by Unilateral and Bilateral Resistance Training: A Systematic Review and Meta-analysis*, Sports Medicine.
- Moran et al. (2021), unilateral vs. bilateral systematic review in JSCR.
**Personalization vector:** injury_list (unilateral work corrects asymmetry and spares lower back), sport/goal, equipment (unilateral enables bodyweight-only progression), age.
**Prescription template:**
- Always include at least one unilateral lower-body movement per week (split squat, single-leg RDL, step-up).
- If user has meniscus/back/hip asymmetry: lean unilateral (split squat, single-leg press, rear-foot-elevated split squat) as primary lower-body driver.
- Heavy bilateral (barbell squat, deadlift) remains the default for pure strength goals without injury.

---

## Principle 16: Advanced set structures (drop sets, rest-pause, clusters) are time-efficient but not superior
**Claim:** Drop sets, rest-pause, and cluster sets produce hypertrophy outcomes equivalent to traditional straight sets when volume is matched, but they deliver the stimulus in less time. Useful for time-efficient sessions or for adding volume to a muscle that is fatigue-limited on straight sets.
**Evidence strength:** moderate
**Primary sources:**
- Coleman et al. (2023), *Effects of Drop Sets on Skeletal Muscle Hypertrophy: A Systematic Review and Meta-analysis*, Sports Medicine — Open.
- Enes et al. (2021), *Rest-pause and drop-set training elicit similar strength and hypertrophy adaptations compared with traditional sets in resistance-trained males*, Applied Physiology, Nutrition, and Metabolism.
- Tufano, Brown & Haff (2017), cluster set methodology review.
**Personalization vector:** training_age (reserve for intermediate+), time_budget_min, goal (hypertrophy: drop/rest-pause; strength-power: clusters).
**Prescription template:**
- Reserve for intermediate+ lifters.
- Use drop sets on isolation movements only (mechanical-disadvantage exercises like curls, lateral raises, leg extensions). Pattern: set to 1 RIR → drop load 20–30% → rep out.
- Use rest-pause on single-joint work when short on time. Pattern: 8 reps @ 0 RIR → 15s rest → AMRAP → 15s rest → AMRAP.
- Use cluster sets (e.g., 5 × 3 with 20s intra-set rest) for heavy-load quality reps without grinding.
- Do not use more than ~20% of weekly sets from advanced techniques; straight sets remain the backbone.

---

## Principle 17: Repetition tempo within a wide range does not meaningfully change hypertrophy
**Claim:** Rep durations between ~0.5s and ~8s per rep produce similar hypertrophy. Super-slow tempos (>10s/rep) are inferior. No evidence that prescribed eccentric tempos (e.g., 3-1-1-0) outperform self-selected moderate tempo.
**Evidence strength:** strong (null finding)
**Primary sources:**
- Schoenfeld, Ogborn & Krieger (2015), *Effect of repetition duration during resistance training on muscle hypertrophy: a systematic review and meta-analysis*, Sports Medicine 45.
- Enes et al. (2025), *How slow should you go? A systematic review with meta-analysis of the effect of resistance training repetition tempo on muscle hypertrophy*.
**Personalization vector:** training_age (novices benefit from deliberate tempo for motor control), injury_list (controlled eccentrics aid rehab), goal.
**Prescription template:**
- Default cue: "Control the eccentric (2–3s), lift with intent (1–2s concentric)." Don't prescribe a numeric tempo unless there's a specific reason.
- Rehab/injury context: longer eccentric (3–5s) on affected movements.
- Power/strength context: aim for maximal concentric intent regardless of load.

---

## Principle 18: Progressive overload is the non-negotiable — something must increase over time
**Claim:** For continued adaptation, some training variable must progress over time. The specific variable that progresses can be load, reps, sets, proximity to failure, ROM, or exercise difficulty — but without progression, stimulus plateaus.
**Evidence strength:** strong (foundational principle; supported by every training meta-analysis implicitly)
**Primary sources:**
- Zatsiorsky & Kraemer (2020), *Science and Practice of Strength Training* (3rd ed.).
- NSCA (Haff & Triplett, 2016), *Essentials of Strength Training and Conditioning*.
- Helms, Morgan & Valdez (2019), *Muscle & Strength Pyramid: Training*.
**Personalization vector:** training_age (dictates fastest-progressing variable), equipment (constrains which variable can progress), injury_list (restricts load/ROM progression; reps/sets still available).
**Prescription template:**
- Novice: progress load every session (linear).
- Intermediate: progress reps within a range, then load (double progression); add a set every 1–2 weeks to accumulate volume within a mesocycle.
- Advanced: progress across the mesocycle (volume week 1 → intensity week 3), and between mesocycles (1–2% yearly on lifetime strength, or new volume PR).
- Bodyweight/band-limited: progress by harder variation (knee push-up → push-up → decline → archer → one-arm), or increased ROM, or slower tempo, or shorter rest.

---

## Principle 19: Stimulus-to-fatigue ratio guides exercise selection
**Claim:** Exercises differ in how much growth stimulus they produce per unit of systemic fatigue. Prefer exercises with high SFR (machine leg press, hack squat, chest-supported row, cable lateral raise) over exercises with low SFR (very heavy squats/deadlifts performed frequently) when accumulating volume. Reserve lower-SFR, high-skill lifts for dedicated strength work.
**Evidence strength:** emerging (conceptually sound and widely used by RP/Helms; not directly RCT-validated as a ratio; supported by effective-reps and fatigue literature)
**Primary sources:**
- Israetel, Hoffmann & Smith (2017), *Scientific Principles of Hypertrophy Training*, RP.
- Helms et al. (2019), *Muscle & Strength Pyramid: Training*.
- Grgic et al. (2022) failure meta-analysis (indirectly supports via fatigue cost argument).
- **Gap flag:** this is more of an applied heuristic than a directly-validated construct. Use as organizing principle, not a hard metric.
**Personalization vector:** training_age, injury_list, equipment, time_budget_min.
**Prescription template:**
- When accumulating volume (hypertrophy mesocycle): lean on high-SFR exercises (machines, chest-supported, unilateral with support).
- When peaking strength: prioritize the competition lifts / bilateral free weights.
- Limit hard-to-recover lifts (deadlift, heavy squat) to 1–2x/week.
- When injury_list is present, rank all exercises for the target muscle and pick those with least pain / aggravation.

---

## Principle 20: For older adults / sarcopenia, resistance training works — use moderate-to-high loads, progressive overload, 2–3x/week
**Claim:** Resistance training is the single most effective intervention for strength, function, and muscle quality in older adults. Moderate-to-high loads (60–85% 1RM) with progressive overload, 2–3 sessions per week, produce meaningful gains. Lower loads produce less strength benefit even when sets reach failure.
**Evidence strength:** strong
**Primary sources:**
- Fragala et al. (2019), *Resistance Training for Older Adults: Position Statement From the NSCA*, JSCR 33(8).
- Li et al. (2025), *Optimal resistance training prescriptions to improve muscle strength, physical function, and muscle mass in older adults diagnosed with sarcopenia: a systematic review and meta-analysis*, Aging Clinical and Experimental Research.
- Chen et al. (2021), *Effects of resistance training in healthy older people with sarcopenia: a systematic review and meta-analysis of randomized controlled trials*, European Review of Aging and Physical Activity.
**Personalization vector:** age, injury_list, equipment, training_age.
**Prescription template:**
- 2–3 full-body sessions/week.
- 6–12 exercises per session; each muscle hit 2x/week.
- Primary compound pattern per session (goblet squat, leg press, chest-supported row, machine press).
- Load at 65–80% 1RM (or RIR 1–3), 6–12 reps, 2–3 sets per exercise.
- Progress via double progression; deload every 6–8 weeks.
- Include one unilateral balance/stability movement per session.

---

## Summary guidance for the LLM plan generator

1. **Start with the user's training age** — it determines progression model (linear → double → DUP/block).
2. **Then set volume per muscle** using the MEV/MRV table (Principle 2), biased to the user's priorities and recovery capacity.
3. **Distribute volume across sessions_per_week** — aim for 2x/muscle frequency unless time-budget forces 1x (Principle 5).
4. **Select intensity zone from goal** — strength: heavy; hypertrophy: mid-range with heavy/light support; endurance: light (Principle 3).
5. **Prescribe RIR** — intermediates get explicit RIR; novices get load/reps (Principle 6).
6. **Pick exercises** — mix compounds and isolation, bias to high-SFR options, honor injury_list and equipment (Principles 13, 14, 15, 19).
7. **Build in progression** — specify the progression rule (load per session / reps then load / RPE autoregulation) (Principles 7, 8, 18).
8. **Schedule a deload** — every 4–8 weeks depending on training age (Principle 10).
9. **Rest intervals default** — 2–3 min compound, 60–120s isolation (Principle 12).
10. **Full ROM with injury-aware modifications** (Principle 11).

---

## What was omitted and why

- **"Metabolic stress" / "pump" as an independent mechanism:** mechanism debated; the volume/load/proximity-to-failure framework subsumes it.
- **Blood flow restriction (BFR):** useful in specific contexts (injury, low-load), but niche — not a core programming principle.
- **Specific supplement / nutrient timing:** out of scope (this doc is programming, not nutrition).
- **Training-to-failure as a default:** evidence says not required; captured under Principle 4 rather than as its own principle.
- **Muscle confusion / "shocking" the muscle:** not evidence-based.
- **Time-under-tension as a primary programming variable:** evidence null (Principle 17).
