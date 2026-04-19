# Periodization & Detraining — Curated Synthesis

Evidence-ranked principles for an LLM-driven workout planner. Each principle is written so the model can convert it into prescription decisions. Ordered roughly by evidence strength and practical leverage for a 2–5x/week home-ish lifter.

Quick answers to the key app questions:

- **Detraining ceiling (strength):** Strength is stable for ~2–3 weeks off, drops ~7–12% by 8–12 weeks, older adults start losing at ~2 weeks. Use ~14 days as the "safe skip" threshold, ~21 days as the "re-ramp" threshold.
- **Detraining ceiling (hypertrophy):** Muscle size drops measurably after ~3 weeks of zero training. Myonuclei appear retained (rodent evidence strong, human evidence mixed), explaining rapid regain.
- **VO2max:** Measurable decline at 2 weeks (4–14% in trained people); 10% by 5 weeks.
- **Deload cadence for beginners/intermediates:** Novices rarely need scheduled deloads; intermediates benefit from ~1 reduced week every 4–6 weeks, triggered by readiness signals, not the calendar.
- **Simplest model that works for this user:** Weekly-undulating periodization inside 4–6 week blocks with autoregulated RIR targets and a reactive deload. DUP beats linear for trained lifters; they tie for hypertrophy and for novices.

---

## Principle 1: Novices progress fastest on linear progression; periodization benefits appear at the intermediate stage
**Claim:** Untrained lifters improve session-to-session on simple linear load progression; periodization (linear or undulating) only meaningfully outperforms non-periodized training once the lifter is "trained" (~3–12 months of consistent lifting).
**Evidence strength:** strong
**Primary sources:** Rippetoe & Baker, *Practical Programming for Strength Training* (3rd ed.); Williams et al. 2017 meta-analysis on LP vs DUP hypertrophy (PeerJ); Grgic et al. 2022 meta-analysis, *Sports Medicine* — "Effects of Periodization on Strength and Muscle Hypertrophy in Volume-Equated Resistance Training Programs."
**Personalization vector:** `training_age_months`, consistency history, prior 1RM progression rate.
**Prescription template:**
- If `training_age_months < 3` OR lifter set a rep/load PR on ≥80% of recent sessions → **Linear Progression**: add 2.5 kg (upper) / 5 kg (lower) per session on main lifts, hold RIR 2–3, no scheduled deload.
- Transition trigger: two consecutive failed progression attempts on the same lift at the same load → switch to weekly/undulating model.

---

## Principle 2: For trained lifters, undulating periodization (DUP) beats linear for strength; hypertrophy is equivalent when volume is matched
**Claim:** In volume-equated studies, undulating periodization produces modestly greater 1RM gains than linear periodization in trained populations; hypertrophy outcomes do not differ between models.
**Evidence strength:** strong
**Primary sources:** Grgic et al. 2022 meta-analysis (35 studies); Williams et al. 2017 PeerJ meta-analysis on hypertrophy; Rhea et al. earlier RCTs.
**Personalization vector:** `goal` (strength vs hypertrophy vs general), training age.
**Prescription template:**
- Strength-priority, intermediate/advanced: rotate stimulus within the week — e.g., Mon heavy (3–5 @ RIR 2), Wed speed/technique (3–5 @ 60–70% 1RM, RIR 4), Fri volume (6–10 @ RIR 2).
- Hypertrophy-priority: either model is fine; pick whichever has higher adherence for this user. Do not claim DUP is "better" for size.

---

## Principle 3: Block periodization concentrates one stimulus per mesocycle; superior for multi-quality athletes, overkill for most general lifters
**Claim:** Sequential blocks (accumulation → transmutation/intensification → realization) outperform concurrent training in athletes preparing for a peak, via residual adaptations from the prior block. Advantage shrinks when the user has no competition date and no advanced baseline.
**Evidence strength:** moderate (strong in athlete sub-populations, weaker for general fitness)
**Primary sources:** Issurin, *Sports Medicine* 2008 "Block periodization versus traditional training theory: a review"; Issurin 2010 "New horizons for the methodology and physiology of training periodization"; Issurin 2016 "Benefits and Limitations of Block Periodized Training Approaches" (*Sports Medicine*); Verkhoshansky & Siff, *Supertraining*.
**Personalization vector:** has-competition/event date, training age, number of fitness qualities being trained.
**Prescription template:**
- Default for 2–5x/wk general lifter: skip pure block. Run a 4–6 week **mini-block** where weeks 1–2 emphasize volume/accumulation (RIR 3, 8–12 reps), weeks 3–4 emphasize intensity (RIR 1–2, 3–6 reps), week 5 is optional realization/test, week 6 is deload if readiness markers demand it.
- Only trigger full Issurin-style blocks when `event_date_within_16_weeks == true`.

---

## Principle 4: Accumulation → Intensification → Realization → Deload is a defensible default 4–6 week cycle
**Claim:** Sequencing a mesocycle from higher-volume/lower-intensity → lower-volume/higher-intensity → peak/test → reduced load captures residual adaptations (hypertrophy feeds strength; strength feeds power) and manages fatigue.
**Evidence strength:** moderate
**Primary sources:** Bompa & Buzzichelli, *Periodization: Theory and Methodology of Training* (6th ed.); Issurin 2010; Verkhoshansky & Siff *Supertraining* (Chapter on sequencing).
**Personalization vector:** goal, cycle length the user can commit to.
**Prescription template:** Default 4-week cycle for most users:
- Week 1 (Accumulation): 4×8–10 @ RIR 3, ~65–72% 1RM.
- Week 2 (Accumulation+): 4×6–8 @ RIR 2, ~72–78% 1RM.
- Week 3 (Intensification): 3–4×4–6 @ RIR 1–2, ~80–87% 1RM.
- Week 4 (Realization/Deload by readiness): if readiness green, 2–3 top singles or heavy triples @ RIR 1; if red, cut volume 40–50% and intensity 10–20%.

---

## Principle 5: Deloads work better when triggered by readiness signals than by a fixed every-4-weeks calendar
**Claim:** Scheduled deloads every 4 weeks do not consistently improve outcomes; one RCT showed a mid-program deload slightly reduced lower-body strength gains in trained men without benefit to hypertrophy. Coach-consensus practice uses roughly 5–7 day deloads every 4–6 weeks, but triggered reactively by fatigue markers.
**Evidence strength:** emerging → moderate (mechanistic support strong; RCT evidence mixed)
**Primary sources:** Coleman et al. 2023 (*PeerJ*) "Gaining more from doing less? The effects of a one-week deload period"; Bell et al. 2023 "Deloading Practices in Strength and Physique Sports: A Cross-sectional Survey" (*Sports Medicine — Open*); Bell et al. 2023 Delphi consensus on deloading; Coleman & Helms/Schoenfeld commentary.
**Personalization vector:** readiness markers (sleep, soreness, session RPE creep, bar speed drop, mood), weeks since last deload, training age.
**Prescription template:**
- **Trigger a deload** if ANY of: (a) session RPE at matched loads has risen ≥1 point for 2 consecutive sessions, (b) estimated bar velocity/jump proxy dropped >10% from rolling baseline, (c) user reports persistent soreness >72h or sleep disruption ≥3 nights, or (d) it has been 6+ weeks of hard training with no forced rest.
- **Deload prescription** (evidence-based default): hold frequency constant, cut volume 30–50% (fewer sets, not fewer sessions), cut load 10–20% or raise RIR by 2, keep movement patterns the same. Duration: 5–7 days.
- Novices: skip scheduled deloads; use a reactive rest day instead.

---

## Principle 6: Strength is remarkably durable; ~14–28 days off produces little measurable loss in young adults
**Claim:** After complete training cessation, strength in young trained adults is preserved through ~2–4 weeks; between 8–12 weeks strength drops ~7–12% from peak. Eccentric and sport-specific power decline faster than general strength.
**Evidence strength:** strong
**Primary sources:** Mujika & Padilla, *Sports Medicine* 2000 "Detraining: loss of training-induced physiological and performance adaptations" Parts I & II; Bosquet et al. 2013/2022 meta-analyses on detraining (*IJERPH* and related); Andersen et al. 2005 "Neuromuscular adaptations to detraining" (*Eur J Appl Physiol*).
**Personalization vector:** age, layoff duration, prior training age.
**Prescription template:** LLM uses `days_since_last_session` to branch:
- `≤ 7 days` → treat as normal week, no adjustment.
- `8–21 days` → reduce loads 5–10% on first session back, keep sets the same.
- `22–56 days` → cut loads 15–25%, cut top-set volume 30%, expect full return in 2–3 weeks.
- `> 56 days` → restart as "returning intermediate": two-week reintroduction block (see Principle 11).

---

## Principle 7: Hypertrophy declines faster than strength, but "muscle memory" restores it quickly
**Claim:** Muscle cross-sectional area declines measurably by ~3 weeks of zero training and can drop ~5–15% over 8–12 weeks; however, previously trained individuals regain size much faster than the original gain, likely via retained myonuclei (strong in rodents, contested in humans) plus epigenetic and neural factors.
**Evidence strength:** moderate (time course: strong; myonuclei mechanism in humans: contested)
**Primary sources:** Bruusgaard et al. 2010 *PNAS* "Myonuclei acquired by overload exercise precede hypertrophy and are not lost on detraining"; Psilander et al. 2019 *J Appl Physiol* "Effects of training, detraining, and retraining on strength, hypertrophy, and myonuclear number in human skeletal muscle"; Murach et al. 2020 *J Appl Physiol* commentary; Snijders et al. 2020 review; Gundersen 2016 *J Exp Biol*.
**Personalization vector:** prior peak CSA/strength if available, layoff duration, training age (years with lifting history).
**Prescription template:**
- After layoffs, confidently promise faster return than initial build: "~2–6 weeks to return to prior peak after a ~8–12 week layoff" is a reasonable default copy.
- During return blocks, keep volume progressive — hypertrophy regain responds well to normal dose-response (10–20 hard sets/muscle/wk) and does not require extra volume.

---

## Principle 8: VO2max and cardiovascular conditioning are the least durable adaptations
**Claim:** Significant VO2max declines occur within 2 weeks of training cessation (4–14% in trained athletes), driven early by plasma volume and stroke volume reductions; can reach 15–20% loss by 8–12 weeks.
**Evidence strength:** strong
**Primary sources:** Mujika & Padilla 2000 Parts I & II; Chen et al. 2022 *Eur J Sport Sci* "Two weeks of detraining reduces cardiopulmonary function"; Jones & Carter 2021 systematic review; Spiering et al. 2021 reviews of reduced training.
**Personalization vector:** cardio goal flag, last cardio session date, baseline aerobic status.
**Prescription template:**
- If user does concurrent cardio, protect it with at least **2 intensity-matched sessions/week** during strength-focused blocks — intensity can't be compromised, but volume can drop ~60%.
- After cardio layoff > 14 days, cut first session duration 40% and re-ramp over 2 weeks.

---

## Principle 9: Minimum effective dose to MAINTAIN is dramatically lower than to BUILD — intensity is the non-negotiable
**Claim:** Maintenance of strength and muscle size for up to ~15–32 weeks is achievable with as little as 1/3 the training volume of building phases, **provided intensity (load and proximity to failure) is preserved**. Frequency can drop moderately; volume can drop by 60–70%; intensity must not.
**Evidence strength:** strong
**Primary sources:** Bickel et al. 2011 *Med Sci Sports Exerc* on maintenance dosing; Spiering et al. 2021 *Sports Medicine* "Maintaining Physical Performance: The Minimal Dose of Exercise Needed"; Androulakis-Korakakis et al. 2020 *Sports Medicine* "The Minimum Effective Training Dose Required to Increase 1RM Strength"; Mujika & Padilla reviews on reduced training.
**Personalization vector:** travel mode, busy-week flag, maintenance vs growth goal, age.
**Prescription template:**
- **Maintenance floor:** 1 hard set per muscle per session, 2 sessions/week per muscle, loads ≥70% 1RM or RIR ≤2 — for ~15 weeks with minimal loss in <50 y/o.
- **Older adults (≥60):** bump to 2 sessions/week with 2–3 sets to achieve same maintenance effect (Bosquet 2022 older-adult meta).
- LLM rule: when user flags "busy week" or "travel," keep intensity prescription unchanged, cut sets ~50%, keep at least 2 sessions.

---

## Principle 10: RIR-based RPE (Zourdos scale) is a validated autoregulation tool that also acts as a built-in fatigue sensor
**Claim:** The RIR-based RPE scale (10 = no reps left, 8 = 2 reps left, etc.) correlates strongly with bar velocity (r ≈ –0.77 to –0.88) and with %1RM performance, allowing daily intensity adjustment without a velocity device. Volume autoregulated by RPE can match or exceed fixed-%1RM programming for strength in trained lifters.
**Evidence strength:** strong
**Primary sources:** Zourdos et al. 2016 *J Strength Cond Res* "Novel Resistance Training-Specific Rating of Perceived Exertion Scale Measuring Repetitions in Reserve"; Helms et al. 2016 "Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training" (*NSCA Strength & Conditioning Journal*); Helms et al. 2018 *J Strength Cond Res* "RPE as a Method of Volume Autoregulation Within a Periodized Program"; Graham & Cleather 2021 "Autoregulation in Resistance Training: Addressing the Inconsistencies" (*Sports Medicine*).
**Personalization vector:** prescribed RIR target, user-reported actual RIR after the set, experience with the scale.
**Prescription template:**
- Always prescribe in (load range, RIR target) pairs — e.g., "3×5 @ ~80% 1RM, RIR 2."
- Autoregulation rules the LLM can run each session:
  - If actual RIR at prescribed load > target by ≥2 → add 2.5–5 kg next set (user had more in the tank).
  - If actual RIR < target by ≥1 → hold load, cut the last set, or add a warmup set next time.
  - If RIR runs low for 2 sessions running despite load decreases → flag as fatigue signal (see Principle 5 deload trigger).
- Calibrate novices over 2–3 weeks; their RIR estimates are initially unreliable but improve with feedback.

---

## Principle 11: Velocity loss thresholds are the most objective autoregulation method, with dose-dependent outcomes
**Claim:** Terminating sets when mean concentric velocity drops 10–40% from the first rep's velocity scales neuromuscular fatigue and adaptation: ~10–20% loss favors speed/strength with low fatigue; ~20–30% balances strength and hypertrophy; ~30–40% maximizes hypertrophy but accumulates fatigue.
**Evidence strength:** strong (within athletic populations; home users rarely have a velocity device)
**Primary sources:** Pareja-Blanco et al. 2017–2020 series on velocity-loss dose–response; Weakley et al. 2021 *NSCA Strength & Conditioning Journal* "Velocity-Based Training: From Theory to Application"; Jukic et al. 2023 *Sports Medicine* dose-response meta-analysis on velocity loss; González-Badillo & Sánchez-Medina 2010.
**Personalization vector:** has-velocity-device flag, goal (strength vs hypertrophy), day-to-day readiness.
**Prescription template:**
- If user has a VBT device or phone app: prescribe sets with a velocity-loss cap. Strength day → 15–20% cap. Hypertrophy day → 25–30% cap.
- If no device: use RIR as a proxy. Strength day → RIR 2–3. Hypertrophy day → RIR 0–2 on last set.
- Use session-1 first-set mean velocity (or subjective "bar speed felt") as a daily readiness check: if notably slow vs rolling baseline, reduce the day's top load 5–10%.

---

## Principle 12: Neural and eccentric strength is more resistant to detraining than concentric strength
**Claim:** In previously untrained subjects, maximal eccentric force and EMG can be preserved even after 3 months of detraining, while concentric strength declines. Implication: neural adaptations persist longer than muscular ones, supporting fast re-ramp for returning lifters.
**Evidence strength:** moderate
**Primary sources:** Andersen et al. 2005 *Eur J Appl Physiol* "Neuromuscular adaptations to detraining following resistance training in previously untrained subjects"; Mujika & Padilla 2000 Parts I & II; Häkkinen et al. force-EMG studies in elite lifters.
**Personalization vector:** layoff duration, training age.
**Prescription template:**
- In reintroduction blocks, start with tempo/eccentric work (e.g., 3-second eccentrics) at 60–70% of pre-layoff load — low injury risk, fast neural re-priming.
- Don't test 1RM in the first 2 weeks back; concentric force lags.

---

## Principle 13: Return-to-training after layoff — use a 2-week reintroduction block sized to layoff length
**Claim:** Re-ramping gradually limits DOMS, tendinopathy risk, and early-session readiness crashes; muscle memory then allows rapid progression in weeks 3+.
**Evidence strength:** moderate (mechanistic + practitioner consensus; less RCT-grade data)
**Primary sources:** Mujika & Padilla 2000 Parts I & II; Psilander et al. 2019; Staron et al. retraining studies; coaching consensus (Helms, Nuckols reviews of primary lit).
**Personalization vector:** `days_since_last_session`, prior peak loads, age, any current pain flags from profile.
**Prescription template:** Re-ramp schedule keyed to layoff length:
- 1–2 weeks off: 1 week at 90% of pre-layoff loads, RIR 3, then resume.
- 2–4 weeks off: 2 weeks at 75–85% of pre-layoff loads, RIR 3, volume 60–70% of prior, then resume.
- 4–12 weeks off: 2–3 week reintro (Week 1: 60–70% loads, 50% volume, RIR 3–4 with tempo work. Week 2: 75–80% loads, 70% volume, RIR 2–3. Week 3: return to normal block, expect PRs within 2–6 weeks).
- 12+ weeks: treat as returning intermediate; run a 4-week accumulation block at moderate loads before attempting any heavy work.

---

## Principle 14: Conjugate and Triphasic are evidence-informed but primarily validated in advanced/athletic populations
**Claim:** Conjugate method (Westside-style max-effort + dynamic-effort rotation) and Triphasic training (sequential eccentric → isometric → concentric emphasis blocks) show positive outcomes in powerlifters and team-sport athletes respectively, but controlled evidence vs. simpler periodization in general-population lifters is limited.
**Evidence strength:** emerging (strong case studies and field data; limited RCTs against simpler DUP/block)
**Primary sources:** Verkhoshansky & Siff *Supertraining* (origins of dynamic-effort and shock methods); Simmons, *Westside Barbell Book of Methods*; Dietz & Peterson, *Triphasic Training: A Systematic Approach to Elite Speed and Explosive Strength Performance* (2012); Harris et al. & Rhea et al. comparison studies.
**Personalization vector:** training age, event/sport requiring explosive power, user interest.
**Prescription template:**
- Default: do not route a general-population user to Conjugate or Triphasic.
- Triggers to offer: user is intermediate+ AND has an explosive-sport goal (jumping, sprint, contact sports). Offer as optional advanced track, not default.
- Lightweight Triphasic idea to borrow safely: include 2–3 week tempo/eccentric emphasis within a hypertrophy block (3–5 second eccentrics) before moving to heavier concentric work — evidence for eccentric overload on hypertrophy and tendon health is solid.

---

## Principle 15: The simplest model that actually works for 2–5x/week home-ish lifters — a reactive, DUP-flavored 4–6 week cycle
**Claim:** A concrete, defensible default program for the target user emerges from combining the principles above: weekly-undulated loading, RIR-autoregulated sets, readiness-triggered deloads, and layoff-aware re-ramps.
**Evidence strength:** synthesis of the above (strong composite).
**Primary sources:** Grgic et al. 2022 meta-analysis; Zourdos 2016; Helms 2016/2018; Mujika & Padilla 2000; Spiering et al. 2021 maintenance review; Bell et al. 2023 Delphi.
**Personalization vector:** weekly sessions available, goal, training age, layoff state, pain flags (user's meniscus/lower back/hip flexor profile).
**Prescription template:** default prescription the LLM should output when nothing unusual is flagged:

```
Block length: 4 weeks (repeatable), then 1 deload-or-realization week.
Sessions/week: user-chosen (2–5). Prefer 3 full-body days for 3x/wk or upper/lower split for 4x/wk.
Weekly DUP pattern (pick 2–3 of these per week per main movement pattern):
  - Heavy day:  3–5 sets × 3–6 reps @ RIR 2, ~78–85% 1RM
  - Moderate:   3–4 sets × 6–10 reps @ RIR 2, ~70–78% 1RM
  - Volume/hyp: 3–4 sets × 8–12 reps @ RIR 1–2, ~65–72% 1RM
Progression: add 2.5–5 kg when actual RIR exceeds target by 1+ for two consecutive sessions.
Readiness check each session: quick 3-question prompt (sleep, soreness, motivation) + warmup-set "bar speed felt."
Deload: triggered by Principle 5 rules; default prescription is frequency-preserved, volume -40%, load -10%, for 5–7 days.
Layoff handling: apply Principle 13 re-ramp table.
Maintenance mode (travel/busy): Principle 9 floor — keep intensity, halve sets, 2 sessions/wk.
Respect profile pain flags: (see user_body_profile.md) modify exercise selection, not the periodization structure.
```

This is the LLM's default skeleton. Everything else in the curated principle set is a rule that modifies it.

---

## Source map (primary, peer-reviewed or textbook)

- **Periodization theory:** Verkhoshansky & Siff, *Supertraining*; Bompa & Buzzichelli, *Periodization: Theory and Methodology of Training* (6th ed.); Issurin 2008, 2010, 2016 reviews in *Sports Medicine*.
- **Model comparisons:** Grgic et al. 2022 *Sports Medicine*; Williams et al. 2017 *PeerJ*; Rhea et al. 2002 *JSCR*; Harris et al.
- **Autoregulation:** Zourdos et al. 2016 *JSCR*; Helms et al. 2016 *NSCA SCJ* and 2018 *JSCR*; Graham & Cleather 2021 *Sports Medicine*.
- **Velocity-based training:** Pareja-Blanco et al. 2017–2020; Weakley et al. 2021 *NSCA SCJ*; González-Badillo & Sánchez-Medina 2010; Jukic et al. 2023 dose-response meta.
- **Detraining:** Mujika & Padilla 2000 *Sports Medicine* Parts I & II; Bosquet et al. 2013/2022 meta-analyses; Andersen et al. 2005 *Eur J Appl Physiol*; Chen et al. 2022 *Eur J Sport Sci*; Spiering et al. 2021.
- **Muscle memory / myonuclei:** Bruusgaard et al. 2010 *PNAS*; Gundersen 2016 *J Exp Biol*; Psilander et al. 2019 *J Appl Physiol*; Snijders et al. 2020 review; Murach et al. 2020 commentary.
- **Deload evidence:** Coleman et al. 2023 *PeerJ*; Bell et al. 2023 *Sports Medicine — Open*; Bell et al. 2023 Delphi consensus.
- **Novice/intermediate programming:** Rippetoe & Baker, *Practical Programming for Strength Training* (3rd ed.); Helms et al., *The Muscle and Strength Pyramid*.
- **Conjugate/Triphasic:** Simmons, *Westside Barbell Book of Methods*; Dietz & Peterson, *Triphasic Training* (2012).
