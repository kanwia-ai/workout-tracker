# Rehab Best Practices — Shoulder, Hip, Trap/Posture, Ankle

Scope: evidence-ranked synthesis feeding the workout-tracker adaptive engine. Primary user profile: right-trap tension, lower-back/hip-flexor issues, L meniscus, desk worker, forward-head posture risk. Rehab content is woven into daily workouts (never standalone screens) and generated from profile + library by the LLM layer.

Evidence ranking:
- **A** — Consistent high-quality RCTs, meta-analyses, clinical practice guidelines
- **B** — Limited RCT evidence, EMG/biomechanical studies, expert consensus
- **C** — Case reports, anecdotal, mechanistic reasoning only
- **POP-PT MYTH** — Popular practice without strong evidentiary support

Primary sources: Cools (scapular EMG/balance), Reinold (RTC EMG), Kibler (scapular dyskinesis), JOSPT clinical practice guidelines 2022/2025, Sahrmann (movement system impairment), Page/Frank (Janda), Cook (FMS), 2022 Bern Consensus on shoulder.

---

## Principle 1 — Exercise therapy is first-line for rotator-cuff-related shoulder pain (equivalent to surgery at 5+ years)

- **Claim:** Structured exercise therapy should be prescribed as the first-line intervention for subacromial pain / RC tendinopathy. Arthroscopic subacromial decompression provides no clinically meaningful benefit over exercise at 5 years.
- **Evidence:** A — CSAW trial (Lancet 2017), Paavola et al. 5-yr follow-up (2020), Cochrane / PLOS ONE systematic reviews, JOSPT 2022 CPG "Diagnosing, Managing… RC Disorders", JOSPT 2025 "RC Tendinopathy CPG".
- **Sources:** Lancet CSAW (PIIS0140-67361732457-1); JOSPT 2022 CPG (jospt.2022.11306); JOSPT 2025 RC CPG (jospt.2025.13182); PLOS ONE meta-analysis (pone.0216961).
- **Personalization vector:** `shoulder.status ∈ {healthy, irritable, rehab}`; `rc_strength_deficit`; `overhead_pain_arc`.
- **Prescription template:** If `shoulder.status = irritable`, load ≤ pain 3/10, 2–3x/week, progressive FITT (Frequency, Intensity, Time, Type) per JOSPT CPG. Swap barbell OHP for landmine/neutral-grip DB; add scapular + RTC work. Reassess at 6 weeks.

---

## Principle 2 — Scapular control is programmable via EMG-specific exercises (Cools)

- **Claim:** For scapular dyskinesis / shoulder pain, prescribe exercises with high lower-trap (LT), middle-trap (MT), and serratus-anterior (SA) activation and LOW upper-trap (UT) activation. Use UT/LT, UT/MT, UT/SA ratios to guide selection.
- **Evidence:** A — Cools et al. 2007 (AJSM, "Rehabilitation of Scapular Muscle Balance: Which Exercises to Prescribe?"); Reinold et al. JOSPT 2009 "Current Concepts… Glenohumeral and Scapulothoracic Musculature"; Cools 2013 JOSPT scapular ratios paper.
- **Sources:** Cools 2007 (pubmed 17606671); Reinold JOSPT 2009 (jospt.2009.2835).
- **Low UT/high LT-MT-SA exercises (preferred):** side-lying ER, side-lying forward flexion, prone horizontal abduction with ER, prone extension.
- **High UT (avoid if UT-dominant):** shrugs, upright row, heavy loaded carries with strap, behind-neck press.
- **Personalization vector:** `right_trap = modify` → programming response is (a) REMOVE shrug-dominant exercises, (b) REDUCE UT-heavy loaded carries, (c) ADD Cools low-UT/high-LT exercises 2–3x/week, (d) MT/LT rows (mid-row, prone T/Y) instead of high-pull variants.
- **Prescription template:**
  - Tier 1 (daily, 2 min): side-lying ER, prone Y (low load).
  - Tier 2 (2x/wk): prone T, prone horizontal abduction with ER, serratus wall slides.
  - Tier 3 (1x/wk heavy): mid-row, face pull. Track UT-tension subjective score.

---

## Principle 3 — Prone Y is the gold-standard lower-trap recruiter (add scapular-depression cue)

- **Claim:** Prone Y above 90° shoulder elevation produces 85–97% MVIC of LT. Cueing scapular posterior tilt / depression increases LT activation by 14–16% vs free form.
- **Evidence:** A (EMG) — Ekstrom JOSPT 2003; Yu et al. 2025 (Physiotherapy Research). Sidelying ER: highest infraspinatus (62%) and teres minor (67%) MVIC (Reinold 2004).
- **Sources:** Ekstrom JOSPT 2003 (jospt.2003.33.5.247); Reinold JOSPT 2004 (jospt.2004.34.7.385).
- **Personalization vector:** `lower_trap_weakness`, `ut_dominance`, `overhead_rom`.
- **Prescription template:** Prone Y on bench, arms in line with LT fibers, thumbs up, cue "posterior tilt + depress scapula". 2–3x12 at 1–3 lb. Progress load slowly; form first.

---

## Principle 4 — "Upper trap tightness" is usually dysfunction, not shortness — strengthen > stretch

- **Claim:** Chronic upper-trap tension in desk workers is more commonly a lengthened/weak/over-recruited state than a truly shortened muscle. Stretching provides transient relief but does not resolve the pattern. Strengthening the middle/lower trap off-loads the UT and reduces subjective tension over 4–8 weeks.
- **Evidence:** B — Lee et al. (PMC4905927) "Effect of middle/lower trapezius strength + levator scapulae/UT stretch on upper crossed syndrome"; narrative reviews by Cools/Kibler. POP-PT MYTH: "just stretch your traps and use a massage gun."
- **Sources:** PMC4905927; PMC7692548 "Comprehensive corrective exercise program improves upper crossed syndrome" (RCT).
- **Personalization vector:** `right_trap = modify` + `desk_worker = true`.
- **Prescription template:** 70% strengthen (MT/LT rows, prone Y/T, face pulls, serratus wall slide) + 30% mobilize (levator scapulae stretch 2x30s, UT stretch 2x30s post-session only — not as a standalone "fix"). Do NOT prescribe doorway pec stretch in isolation.

---

## Principle 5 — Forward-head posture: craniocervical flexion ("chin-tuck with pressure biofeedback") has modest but positive evidence

- **Claim:** Deep cervical flexor (DCF) training using craniocervical flexion improves craniovertebral angle, neck pain, and neuromuscular coordination. Pressure-biofeedback version (Jull's protocol) outperforms conventional chin-tucks. Effect sizes modest; evidence is low-to-moderate quality.
- **Evidence:** B — Jull et al. cervical flexor program; PMC7559831 DCF in adolescents RCT; Alghadir 2021 (Wiley) RCT in teachers; PMC6263552 systematic review (effects on neuromuscular coordination strong, strength effects small). Note: "forward head posture" as a disease entity is contested (posture ≠ pain is current consensus).
- **Sources:** PMC7559831; PMC6263552; Alghadir 2021 BioMed Research International.
- **Personalization vector:** `forward_head = true` + `neck_pain_frequency`.
- **Prescription template:** Supine craniocervical flexion, 5s hold x 10 reps, 2x/day, progress pressure target 22 → 30 mmHg with biofeedback (or chin-tuck-to-wall without). Pair with scapular work (LT/MT). Do NOT prescribe as one-off daily "chin tucks" in isolation — combine with strengthening.

---

## Principle 6 — Pec minor stretching + lower trap strengthening outperforms either alone for rounded-shoulder posture

- **Claim:** A 3-min manual-therapy + stretch session to pec minor reduces rounded-shoulder posture for ≥2 weeks and increases LT strength. Combined pec-minor stretch + trap strengthening is superior to stretch alone for both posture and ROM.
- **Evidence:** B — Rosa et al. (Effects of stretching protocol for PM on scapular kinematics, J Shoulder Elbow Surg, ScienceDirect S0894113016301077); PMC9956189 RCT (trap strengthening + PM stretch in young females); Borstad JOSPT 2005. Note: PM length-test diagnostic accuracy is equivocal (PMC1934353).
- **Sources:** JOSPT 2005 (jospt.2005.35.4.227); PMC9956189; PMC1934353.
- **Personalization vector:** `rounded_shoulders`, `pec_minor_length_test`.
- **Prescription template:** Stretch in scapular retraction at 30° shoulder flexion (biomechanically most effective). 2x30s. Pair with prone Y, prone T, and band pull-aparts same session.

---

## Principle 7 — Thoracic extension mobility directly improves shoulder outcomes

- **Claim:** Thoracic mobilization + extension exercise improves shoulder function, ROM, pain, and disability in subacromial pain. Adding thoracic work to shoulder exercise is superior to shoulder exercise alone (Grade B).
- **Evidence:** A/B — PMC7551755 RCT on T-spine mob + extension in SAIS; MDPI Healthcare 2025 systematic review (better outcomes across pain, disability, ROM); JOSPT 2016 Mintken et al. cervicothoracic + exercise.
- **Sources:** PMC7551755; JOSPT 2016 (jospt.2016.6319); Healthcare MDPI 2025 (13192479).
- **Personalization vector:** `desk_worker`, `kyphosis`, `overhead_rom_limited`.
- **Prescription template:** Daily (2 min): foam-roller thoracic extension x 6–8 segments; open-book rotation 5x/side. Pre-overhead-day warmup (5 min): thoracic cat-cow + wall slides.

---

## Principle 8 — Landmine press is a defensible substitute for vertical overhead press when shoulder is irritable or overhead ROM is limited

- **Claim:** Landmine press uses a diagonal bar path avoiding full shoulder flexion, providing deltoid activation comparable to vertical press with reduced subacromial impingement risk. Appropriate substitute when: (a) painful arc 60–120°, (b) overhead ROM < ear, (c) pec/lat tightness prevents neutral shoulder at lockout.
- **Evidence:** B — Biomechanical reasoning strong; direct RCT comparisons are limited. Journal of Strength & Conditioning Research has EMG comparisons showing similar deltoid activation with lower shoulder stress.
- **Sources:** Medicaldaily biomechanics summary; Conor Harris landmine biomech article (non-blog sources limited here — flag as B evidence).
- **Personalization vector:** `overhead_rom`, `shoulder_pain_history`, `overhead_pain_arc_positive`.
- **Prescription template:** Decision rule — if overhead ROM ≥ full AND painless AND no active impingement symptoms → barbell/DB OHP OK. Else → half-kneeling landmine press or incline DB (45–60°) instead. Progress landmine → seated neutral-grip DB → standing DB → barbell over 8–12 weeks.

---

## Principle 9 — Return-to-overhead-press criteria (not calendar)

- **Claim:** Return to overhead pressing is criterion-based, not time-based. Prerequisites: full pain-free passive + active overhead elevation (olecranon aligned with ear), pain-free horizontal abd/add, ER/IR strength ratio ≥ 66%, scapular dyskinesis resolved or controlled.
- **Evidence:** A — 2022 Bern Consensus Statement (JOSPT); JOSPT return-to-sport clinical commentary (PMC7735686).
- **Sources:** JOSPT 2022 Bern Consensus (jospt.2022.10952); PMC7735686 RTS criteria; PMC8811509 Rehab/RTP upper extremity.
- **Personalization vector:** `shoulder.status`, `er_ir_ratio`, `pain_free_rom`.
- **Prescription template:** 3-P progression (Performance → Practice → Play): (1) isometric overhead push against wall, pain-free; (2) landmine press, bodyweight load; (3) neutral-grip DB press 45°; (4) seated DB press; (5) standing DB press; (6) barbell OHP. Gate each with pain-free criteria + symmetric ER/IR strength.

---

## Principle 10 — Kibler scapular dyskinesis classification: useful for clinical reasoning, poor reliability for precise typing

- **Claim:** Kibler's type I/II/III scapular dyskinesis types provide a clinical-reasoning framework but have fair-to-poor inter-rater reliability (κ 0.31–0.42). Use "yes/no dyskinesis present" rather than precise typing in an app.
- **Evidence:** A (reliability) — McClure & Kibler PMC2657031 (Part 1: Reliability); Kibler 2021 overhead athletes (austinstonemd PDF); PMC11371877 "Breaking the operator variability".
- **Sources:** PMC2657031; Kibler 2021 management of scapular dyskinesis in overhead athletes.
- **Personalization vector:** `scapular_dyskinesis_yes_no` (video self-assessment — low reliability).
- **Prescription template:** Do not attempt precise type classification in-app. Offer a binary "does your shoulder blade wing or pop out during overhead?" self-screen → if yes, program scapular series (Principles 2, 3, 7) and flag for clinician referral if persistent.

---

## Principle 11 — Hip-flexor "tightness" in desk workers: often lengthened/overactive, not short — strengthen and eccentric, don't just stretch

- **Claim:** Chronic hip-flexor "tightness" in sedentary adults is frequently a lengthened + overused state (especially psoas) rather than true shortness. Stretching dysfunctional psoas can aggravate. Eccentric loading (RFE split squat, reverse lunge) + psoas activation (supine marching, standing hip-flexion isometrics) produces superior long-term outcomes.
- **Evidence:** B — Stickler et al. case report iliopsoas tendinopathy with eccentric (PMC5717490); PMC11546833 Hip Flexor Activation MDPI 2024; PMC11515218 stretching crossover trial (stretching improves extensor performance but decreases flexor output). Note: NOT a unanimous consensus — if stretch relieves and doesn't return, stretch is fine.
- **Sources:** PMC5717490; PMC11546833; PMC11515218; IJSPT 137692 lunge-and-reach.
- **Personalization vector:** `hip_flexor_tightness_subjective`, `desk_hours_per_day`, `anterior_pelvic_tilt`.
- **Prescription template:**
  - Daily (desk micro): standing hip-flexion march 15/side, posterior-pelvic-tilt hold 5x10s.
  - 2x/wk: RFE split squat with 3s eccentric, 3x6–8; reverse lunge 3x8. Cue posterior pelvic tilt at bottom to bias rectus-femoris lengthening.
  - Optional: half-kneeling hip flexor stretch (2x30s) ONLY if it provides lasting relief (>2h).

---

## Principle 12 — Loaded Jefferson curls: contested — reserve for advanced, experienced lifters only

- **Claim:** Jefferson curls are a loaded spinal-flexion mobility exercise. Moderate loads are defensible for advanced lifters building tissue capacity; heavy loads accumulate flexion-compression stress associated (in bench lit) with disc herniation risk. For rehab populations or desk workers with back pain, START with unloaded cat-cow and segmental flexion before considering load.
- **Evidence:** C — McGill lab biomechanics (cumulative flexion + load → disc). No RCTs support loaded Jefferson curls for injury prevention. POP-PT MYTH that Jefferson curls are universally safe "because spine flexion isn't bad" — flexion isn't bad but cumulative loaded flexion carries risk. PMC9826080 "From protection to non-protection" mixed-methods (pro-flexion perspective).
- **Sources:** McGill lab references; PMC9826080.
- **Personalization vector:** `back_pain_history`, `training_age`, `lumbar_flexion_comfort`.
- **Prescription template:** Default OFF in app. If user is advanced + pain-free + elects: unloaded Jefferson curl 2x5, progress to 5–10kg over 8 weeks. Gate with 8-point self-check (no radicular symptoms, morning stiffness < 15 min, etc.). For primary user with lower back + hip issues: SKIP. Use cat-cow + 90/90 + tall-kneel hip flexor drills instead.

---

## Principle 13 — Ankle dorsiflexion is the dominant squat-depth limiter — assess with half-kneel wall test, train with weighted half-kneel mob

- **Claim:** Deep squat requires 30–38° ankle dorsiflexion (vs typical 20° normal ROM). Ankle DF ROM accounts for 23–39% of variance in squat depth. Assess with half-kneel wall test (toe 5 in / 12.7 cm from wall — can knee touch without heel lifting?). Weighted half-kneel ankle mobilization improves DF and squat performance over 4–12 weeks.
- **Evidence:** A — Hemmerich 2006 (38.5±5.9° DF for squat); Kim et al. (PMC4415844) LE strength + ROM to squat depth; PMC7017897 RCT ankle self-mob + CrossFit (DF + balance improvement); meta-analyses on joint-mobilization + chronic ankle instability.
- **Sources:** PMC4415844; PMC7017897; MDPI 5-4-86 simulation study.
- **Personalization vector:** `ankle_df_rom_deg`, `squat_depth_goal`, `heels_lift_at_parallel`.
- **Prescription template:** Assess monthly (5" wall test). If FAIL:
  - Daily (2 min): half-kneel DF mob with dowel (toe-hand distance tracked) x 10/side; banded DF mobilization x 10/side.
  - Pre-squat day: goblet squat pry, 3x5 deep holds.
  - Temporary accommodation: 5 mm heel lift until DF ≥ 25°. Re-test at 4 weeks.

---

## Principle 14 — Strengthening > stretching for desk-worker neck/shoulder pain

- **Claim:** Workplace-based strengthening (and endurance) exercise outperforms stretching-only programs for non-specific neck pain in office workers. Large RCT (n=567) showed 52-wk combined neck endurance + stretching reduced neck-pain incidence in at-risk workers.
- **Evidence:** A — Chen et al. PMC6093121 systematic review + meta-analysis; Oxford Academic PTJ 2018 (98/1/40) 27-RCT review; BMJ Open PMC8804637 2022 systematic review.
- **Sources:** PMC6093121; Oxford PTJ 2018 (98/1/40); PMC8804637.
- **Personalization vector:** `desk_worker`, `neck_pain_frequency`, `compliance_history`.
- **Prescription template:** 3x/week, ≥20 min: neck isometrics (4 directions, 10s x 5), scapular retractions, band pull-aparts, face pulls, prone Y/T. Pair with 5 min end-of-day stretching (UT, levator, pec minor). Do NOT prescribe stretching-only; NOT prescribe ergonomic-only intervention.

---

## Principle 15 — Sahrmann Movement System Impairment: useful clinical framework, weak RCT evidence for superiority

- **Claim:** MSI syndromes (humeral anterior glide + scap downward rotation; femoral anterior glide; etc.) offer a useful framework for identifying directional-susceptibility patterns (i.e., "which direction hurts + which is short/long?") but MSI-specific treatments have NOT shown superiority over non-specific treatment in RCTs (Van Dillen LBP trial).
- **Evidence:** B — PMC5693453 Van Dillen review; JOSPT 2003 (jospt.2003.33.3.126); Caldwell & Sahrmann 2007 shoulder case. Use as reasoning tool, not prescriptive algorithm.
- **Sources:** PMC5693453; JOSPT 2003 33/3/126.
- **Personalization vector:** Direction-specific pain patterns (e.g., pain-on-shoulder-extension vs flexion).
- **Prescription template:** App uses MSI language for ORIENTATION ("avoid excessive humeral anterior glide — cue elbow behind body on pressing") but does NOT diagnose syndromes. Provide movement-quality cues, not syndrome labels.

---

## Principle 16 — Janda / Upper Crossed Syndrome: partially superseded framework — use patterns as heuristics, not truths

- **Claim:** Janda's Upper Crossed Syndrome (tight UT/levator/pecs + weak DCF/MT/LT) is a useful heuristic for desk workers but has NOT been validated as a distinct clinical diagnosis. Modern pain science de-emphasizes posture-as-pathology; movement variability and load tolerance are more predictive of outcomes than static alignment.
- **Evidence:** B/C — Page & Frank textbook; Medsciencegroup systematic review ASMP-10-121; PMC7692548 corrective RCT; modern critiques noting lack of validation. POP-PT MYTH: "your pain is because of your posture."
- **Sources:** PMC7692548; Medsciencegroup ASMP-10-121; Brookbush Institute critique article (flag: blog — for heuristic only).
- **Personalization vector:** `desk_worker`, pattern heuristics.
- **Prescription template:** Use UCS vocabulary sparingly in user-facing copy ("desk tightness pattern"). Program the substance (Principles 2, 3, 4, 5, 6, 7, 14) without claiming posture is the cause of pain.

---

## Principle 17 — FMS / screening tests: limited predictive validity — don't gate users out based on FMS score alone

- **Claim:** Functional Movement Screen (FMS) has good inter-rater reliability but poor-to-modest predictive validity for injury. A composite score ≤14 is associated with some injury-risk elevation in senior athletes, but effect sizes are small and inconsistent. Do NOT use FMS to prevent someone from training.
- **Evidence:** A — Dorrel et al. 2015 PMC4622382 meta-analysis; Bonazza 2016 (0363546516641937); Moran 2019 PMC systematic review. POP-PT MYTH: "FMS score ≤14 means you shouldn't lift."
- **Sources:** PMC4622382; Bonazza Am J Sports Med 2016; Moran 2019.
- **Personalization vector:** Use individual movement self-assessment (overhead squat, wall ankle test, shoulder ROM) as PROGRAMMING inputs, not pass/fail gates.
- **Prescription template:** App offers 4-test self-screen (overhead reach, wall ankle, shoulder IR/ER, single-leg balance). Results DRIVE programming (more mobility work, specific rehab), never LOCK user out. Transparent copy: "This is guidance, not a diagnosis."

---

## Principle 18 — Load management + frequency matter more than exercise perfection (FITT principle)

- **Claim:** For RC-related shoulder pain, the dose (frequency, intensity, time) matters as much as the specific exercise choice. Higher-frequency, progressively-loaded programs outperform low-dose programs regardless of exercise selection.
- **Evidence:** A — Naunton et al. JOSPT 2024 systematic review + meta-analysis of FITT principle for RC-related shoulder pain (jospt.2024.12453). JOSPT 2025 CPG reinforces progressive-loading recommendation.
- **Sources:** JOSPT 2024 FITT meta-analysis; JOSPT 2025 RC CPG.
- **Personalization vector:** `weekly_rehab_minutes`, `load_progression_rate`.
- **Prescription template:** 2–3x/week, ≥20 min, progressive load (RPE 6–8 by week 4). Do NOT program "perfect exercise 1x/week" — program "good-enough exercise 3x/week." Track streak + load progression.

---

## Summary — Programming Response for Primary User

For user with `right_trap = modify`, `lower_back_sensitive`, `hip_flexor_tightness`, `desk_worker`, `L_meniscus_modify`:

1. **Remove or de-prioritize:** barbell shrugs, upright rows, heavy farmer carries with straps (UT loading); deep bilateral squats (meniscus + ankle); Jefferson curls; barbell OHP until ER/IR + ROM gated.
2. **Add daily (2–5 min, woven into workouts):** side-lying ER, prone Y (low load), face pull, scapular depression cue drills, half-kneel ankle mob, supine DCF chin-tuck with feedback, standing hip-flexion march.
3. **Add 2–3x/wk (warmup or accessory):** thoracic extension on roller, wall slides, band pull-aparts, prone T, RFE split squat with slow eccentric, reverse lunge, pec minor stretch at 30° flex + scap retract.
4. **Swap pattern:** Barbell OHP → half-kneeling landmine press → neutral-grip DB → seated DB → standing DB → barbell (criterion-gated).
5. **Monitor:** weekly UT tension self-score, monthly wall ankle test (5"), monthly overhead reach test. Adjust program based on trend, not single-day readings.
6. **Messaging:** Do NOT tell user their posture is the cause of their pain. Frame as "desk-day tightness pattern" with strengthening emphasis, not postural correction.
