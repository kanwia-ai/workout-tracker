# 03 — Warmup, Technique, and Elite S&C Methodology

Evidence-ranked synthesis for the workout-tracker adaptive engine. Principles are ordered from strongest evidence (Tier A: multiple meta-analyses / consistent RCTs) to weakest (Tier D: elite lore / tradition with weak or mixed evidence). Each principle maps to a **Personalization vector** (what user/session data drives the decision) and a **Prescription template** (what the app actually renders).

Format (strict):
- **Principle** — one-line thesis
- **Claim** — what follows from the evidence
- **Evidence** — study design, effect sizes, caveats
- **Sources** — primary references
- **Personalization vector** — user/session inputs that change the prescription
- **Prescription template** — concrete output the engine emits

---

## TIER A — Strong, Converging Evidence

### 1. An active warm-up improves subsequent performance ~79% of the time
- **Claim:** Perform an active warm-up before every resistance session. Skipping it is a measurable performance cost, not a neutral choice.
- **Evidence:** Fradkin, Zazryn & Smoliga (2010) systematic review + meta-analysis, 32 high-quality studies (mean quality 7.6/10). Warm-up improved performance in 79% of measured criteria; harmed performance in only ~3%. McGowan et al. (2015) review confirms mechanism: raised muscle temperature (Q10 effect on enzyme kinetics + cross-bridge cycling rate), elevated VO2 kinetics, improved nerve conduction velocity, and psychological readiness.
- **Sources:** Fradkin et al., J Strength Cond Res 2010; 24(1):140–148. McGowan et al., Sports Medicine 2015; 45:1523–1546.
- **Personalization vector:** Time available (5/10/15 min), ambient temperature (cold environment → longer raise phase), time since last session (sedentary deconditioned → longer), injury list (meniscus, lower back → targeted mobility added).
- **Prescription template:** Every session begins with a mandatory warm-up block of 5–10 min. Default: 3–5 min Raise + 2–3 min movement-specific prep. Never zero.

### 2. Static stretching >60s before strength/power lifts acutely impairs force output
- **Claim:** Do not prescribe long-duration static stretching (hold >60s per muscle) as pre-lift warmup. Short holds (<45s) with follow-on dynamic work are acceptable but no better than dynamic alone.
- **Evidence:** Behm & Chaouachi (2011) narrative review of ~100 studies: static stretch of the prime mover, held >60s, produced strength decrements averaging 5–7%. Shorter holds (<45s) with subsequent dynamic activity showed negligible effect. Behm et al. (2016) meta-analysis quantified acute effects: static stretch -3.7% performance, PNF -4.4%, dynamic stretch +1.3%. Effect decays within minutes if followed by dynamic activity.
- **Sources:** Behm & Chaouachi, Eur J Appl Physiol 2011; 111:2633–2651. Behm et al., Appl Physiol Nutr Metab 2016; 41(1):1–11.
- **Personalization vector:** Training goal (strength/power day → no long static stretching of prime mover; hypertrophy day → less sensitive), specific mobility restrictions (e.g., hip flexor block limiting squat depth → short static + dynamic reset is acceptable tradeoff).
- **Prescription template:** Default warmup uses dynamic stretching + ramp sets. Static stretching only appears for (a) targeted mobility bottlenecks and capped at ≤30s/muscle, or (b) post-workout cooldown (no performance cost).

### 3. Ramp sets before compound lifts prime performance without fatigue cost
- **Claim:** Prescribe 3–5 ramp sets before the first working set of every main compound lift (squat, bench, deadlift, overhead press, row). Reps descend as load ascends. Stop 1–2 reps short of failure on each ramp.
- **Evidence:** McGowan et al. (2015) identifies "potentiation" as the fourth mechanism of warmup (post-activation potentiation + neural priming). Fradkin (2010) showed warmups including submaximal task-specific loading produced the largest performance gains. Practice-based consensus (powerlifting literature; Jeffreys 2007) converges on 3–5 ramp sets. Stronger athletes need more ramp sets — the gap between empty bar and working weight is bigger.
- **Sources:** McGowan et al., Sports Med 2015. Fradkin et al., J Strength Cond Res 2010. Jeffreys I., Professional Strength & Conditioning 2007; 6:12–18.
- **Personalization vector:** Working weight (higher = more ramp sets), training age (advanced lifter = more ramp sets), bar / body tolerance (cold joints → extra low-intensity set), session type (top single → full ramp; AMRAP hypertrophy set → abbreviated ramp).
- **Prescription template:**
  - Working load < 60kg: 2 ramp sets (empty bar × 8, ~60% × 5)
  - Working load 60–100kg: 3 ramp sets (40% × 8, 60% × 5, 80% × 3)
  - Working load >100kg: 4–5 ramp sets (empty bar × 8, 40% × 5, 60% × 3, 75% × 2, 88% × 1)
  - Never go to failure on a ramp; always leave 2+ reps in reserve.

### 4. Longer inter-set rest (≥2 min) beats short rest for strength AND hypertrophy in trained lifters
- **Claim:** Prescribe 2–3 min rest on compound lifts, 1.5–2 min on accessories, 60–90s on isolation/pump work. The legacy "60s for hypertrophy" rule is obsolete.
- **Evidence:** Schoenfeld et al. (2016) RCT: 21 trained men, 8 weeks, 3-min rest produced significantly greater strength AND hypertrophy than 1-min rest (e.g., bench 1RM +15.2% vs +7.6%; anterior thigh thickness +7.0% vs +4.5%). Grgic et al. (2017) systematic review: six studies, untrained tolerate short rest fine, but trained lifters gain more hypertrophy with longer rest. Grgic et al. (2018) rest-interval strength review: same conclusion for strength — robust gains possible with short rest in novices, but trained lifters need longer rest to maximize. Mechanism: short rest drops per-set volume-load (rep failure earlier), which outweighs the metabolic-stress hypothesis.
- **Sources:** Schoenfeld et al., J Strength Cond Res 2016; 30(7):1805–1812. Grgic et al., Eur J Sport Sci 2017; 17(8):983–993. Grgic et al., Sports Medicine 2018 (rest intervals + strength).
- **Personalization vector:** Exercise role (compound vs accessory vs isolation), training age (novice can run 60–90s across the board), time budget (if truncated session → keep compounds at 2+ min, compress isolations first), cardio tolerance (detrained → may need longer).
- **Prescription template:** Rest timer defaults by movement tag:
  - Compound (squat/DL/bench/OHP/row, 3–8 rep range): 180s
  - Accessory (split squat, RDL, incline DB press, pull-up, 8–12 rep range): 120s
  - Isolation/pump (curl, lateral raise, leg extension, calf, 10–20 rep range): 75s
  - Superset/drop-set: timer scales to movement-A recovery need.

### 5. Warmup should include dynamic stretching + movement-specific preparation, not just a cardio block
- **Claim:** Follow a RAMP-style structure: general Raise (2–4 min) → dynamic Mobilize/Activate for the session's movement pattern (2–3 min) → specific Potentiate via ramp sets. Replace "5 min treadmill then squat" with structured patterning.
- **Evidence:** Jeffreys' RAMP framework (2007, 2019) is the most widely adopted structure in S&C. A 2025 RCT in youth soccer (PMC12234454) found RAMP outperformed static stretching (d=0.41) and control (d=0.50) for jump and sprint. Behm et al. 2016 meta-analysis: dynamic stretching +1.3% performance vs negative effects for SS/PNF. McGowan 2015: specific task rehearsal elevates motor-unit recruitment readiness.
- **Sources:** Jeffreys I., "The Warm-Up: Maximize Performance and Improve Long-Term Athletic Development," Human Kinetics 2019. Behm et al., Appl Physiol Nutr Metab 2016. Acute RAMP effects study, Front Physiol 2025.
- **Personalization vector:** Movement pattern of the session's primary lift (squat-day warmup ≠ bench-day warmup), identified mobility restrictions (hip IR for squat, T-spine ext for OHP), injury list (Kyra: L meniscus → knees-over-toes prep; lower back → cat-camel, hip flexor, dead bug; R trap → scap CARs, band pull-aparts).
- **Prescription template:** Pattern-specific warmup module, ~6 min:
  - Raise (3 min): low-intensity aerobic (bike / jumping jacks / brisk walk)
  - Mobilize (2 min, pattern-specific): e.g., squat day → ATG split squat holds, 90/90 hip IR, goblet squat hold; bench day → thoracic open-books, band dislocates, push-up to down-dog
  - Activate/Potentiate (1 min): 1–2 low-load patterning sets that rehearse the movement (e.g., goblet squat × 5 before back squat, band pull-apart × 15 before bench)

---

## TIER B — Good Evidence, Context-Dependent

### 6. Tempo/rep-duration is NOT a critical hypertrophy variable; anything from ~1–8s per rep works
- **Claim:** Don't prescribe complex tempo codes (e.g., "3-1-1-0") for a home lifter. Default to "controlled eccentric, intentional concentric." Reserve tempo prescription for specific technique corrections or rehab.
- **Evidence:** Schoenfeld, Ogborn & Krieger (2015) meta-analysis of repetition-duration studies: hypertrophy response is equivalent across rep durations from 0.5–8s. Very slow reps (>10s) are inferior. 2025 meta-analyses (eccentric phase duration, tempo) reinforce: faster and slower tempos produce trivially different hypertrophy. Eccentric-only vs concentric-only isn't clinically relevant at this level — both contract types drive hypertrophy; eccentric has a ~0.25 ES advantage (Schoenfeld et al., 2017) but at cost of greater DOMS and coaching complexity.
- **Sources:** Schoenfeld, Ogborn & Krieger, J Strength Cond Res 2015; 29(4):1165–1176 (rep duration meta-analysis). Schoenfeld et al., J Strength Cond Res 2017 (eccentric vs concentric meta).
- **Personalization vector:** Goal (hypertrophy → default controlled; power → explosive concentric cue; rehab/technique → slow eccentric 3–4s for control), injury (tendon issues → prescribed tempo eccentrics can help), equipment constraints.
- **Prescription template:** Default cue: "Eccentric ~2s, brief pause, drive the concentric with intent." Only show explicit tempo codes when:
  - Technique correction flagged (e.g., bouncing out of the bottom of squat → "3s descent, pause")
  - Tendon rehab protocol (e.g., patellar tendinopathy → slow eccentric Spanish squat)
  - Power day prescription → "explosive concentric, fast intent; eccentric 1–2s controlled"

### 7. Eccentric-emphasized work has a small hypertrophy edge — use it selectively
- **Claim:** Programs benefit from including eccentric-biased variants (slow lowering, 2-up/1-down, lengthened-position emphasis) 1–2x per muscle per week, not as the default.
- **Evidence:** Schoenfeld et al. (2017) meta-analysis of concentric vs eccentric: ES 0.25 favoring eccentric for hypertrophy (borderline p=0.089); effect larger when total work matched. But eccentric training induces substantially more DOMS and CNS fatigue — cost/benefit is poor for daily prescription. Cal Dietz's triphasic framework (eccentric → isometric → concentric blocks) is built on this principle and has one peer-reviewed study showing strength gains but no vertical-jump improvement (Kastelan thesis, Lindenwood Univ.) — supports strength claims, weak for power transfer.
- **Sources:** Schoenfeld et al., J Strength Cond Res 2017 (eccentric vs concentric meta-analysis). Dietz & Peterson, "Triphasic Training" 2012 (coaching text; limited independent validation).
- **Personalization vector:** Training age (novice: no need, movement proficiency first), phase of mesocycle (accumulation block → can include eccentric emphasis; realization/peak → drop eccentric load due to DOMS cost), injury (tendon rehab loves slow eccentrics).
- **Prescription template:** One eccentric-emphasis variant per muscle per week, typically on a secondary/accessory slot (e.g., "4s eccentric RDL × 6–8 reps"). Never stack eccentric emphasis on a max-strength day.

### 8. Ballistic/explosive concentric intent drives strength and power gains beyond load alone
- **Claim:** For strength/power goals, prescribe "move the weight as fast as possible on the concentric" even when the weight is heavy and the bar speed is objectively slow. Intent is the variable.
- **Evidence:** Velocity-based training literature (Dan Baker's rugby-league work, González-Badillo et al.) shows bar velocity during loaded jump squats and bench throws differentiates elite from sub-elite athletes. Attempting maximal concentric velocity increases motor-unit recruitment and rate of force development even when load is heavy. Meta-analyses on power training consistently find intent-to-move-fast drives adaptation better than prescribed slow tempos for strength/power goals.
- **Sources:** Baker D., various reviews of VBT in professional rugby league (2010s). González-Badillo et al., Int J Sports Med 2014 (velocity loss and performance). Behm DG, "Neuromuscular implications and applications of resistance training" JSCR 1995 (foundational).
- **Personalization vector:** Goal (strength/power → always explosive intent; hypertrophy → intent less critical, can use controlled), equipment (free weights > machines for this cue).
- **Prescription template:** For compound lifts on strength days, include the cue "drive up fast — attempt maximum speed on the concentric." For power/explosive accessories (KB swing, jump squat, med-ball throw), this is non-negotiable.

### 9. Weightlifting-style technique progression: positions → speed → load
- **Claim:** When teaching a complex lift (Olympic lifts, but also squat/DL technique resets), follow: partial-range positions at light load → full range at light load → add speed → add load. Never add load on top of bad positions.
- **Evidence:** NSCA Position Statement on Weightlifting (Morris et al. 2022) and Catalyst Athletics (Everett) hierarchy reflect coaching consensus. Teaching progressions reduce technique error rates and accelerate skill acquisition in controlled studies (see Sands et al. review of weightlifting pedagogy). Low-load technique reps build motor pattern without reinforcing compensation.
- **Sources:** NSCA Position Statement: Weightlifting for Sports Performance (2022). Everett G., "Olympic Weightlifting" 3rd ed., Catalyst Athletics.
- **Personalization vector:** Exercise complexity (power clean/snatch → multi-week progression; squat → typically just ramp sets), form flags logged (e.g., knee cave, forward torso lean → trigger a technique-reset block), training age.
- **Prescription template:** For complex lifts, the app has a "technique progression" state machine:
  - Novice: hang-position partials with empty bar for 1–2 weeks before adding load
  - Form flag triggered mid-program (user logs "felt off" or trainer flags video): insert 1-session "deload technique reset" with 50% working weight focused on positions
  - Never auto-increase load if last session logged technique concerns

### 10. Post-Activation Potentiation (PAP) is real but small and hard to deploy without a coach
- **Claim:** Do NOT auto-prescribe PAP protocols (e.g., heavy squat before sprint) in the main app. The effect is small, inconsistent, and requires individualized timing. Flag it as an "advanced tool" only.
- **Evidence:** Seitz & Haff (2016) meta-analysis: PAP effects are small for jump (ES 0.29), throw (0.26), and upper-body ballistic (0.23), moderate for sprint (0.51). Effect is larger in stronger, more experienced lifters. Best timing window is 0.3–4 min after plyometric conditioning or ≥5 min after heavy resistance. For a home lifter without velocity sensors and without a coach timing the rest window, the signal-to-noise ratio is poor.
- **Sources:** Seitz LB, Haff GG., Sports Medicine 2016; 46(2):231–240.
- **Personalization vector:** Training age (>3 yrs + advanced lifter → unlockable feature), goal (only relevant for power/sprint/jump training), equipment (home lifter rarely has sprint lane).
- **Prescription template:** NOT in default prescription engine. Optional "advanced module" only for users who tag themselves as power/athletic and have logged consistent heavy training. Template if shown: "Heavy back squat 3 × 3 @ 85% → 4 min rest → max-effort vertical jumps 3 × 3."

---

## TIER C — Reasonable Evidence, Decent Implementation ROI

### 11. Foam rolling is an OK warmup adjunct — improves ROM, doesn't hurt performance
- **Claim:** Foam rolling is worth ~30–60s per target muscle if the user has mobility restrictions. It is NOT a substitute for dynamic warmup. Don't over-budget time here.
- **Evidence:** Wiewelhove et al. (2019) meta-analysis: foam rolling pre-exercise produces ~2.2% performance improvement and large ROM gains (d=0.76). Effect is short-lived (minutes). Primary value is ROM, secondary value is mild performance uptick. Not a recovery tool per se (small effect post-exercise).
- **Sources:** Wiewelhove et al., Front Physiol 2019; 10:376 (meta-analysis of foam rolling). Cheatham et al., Int J Sports Phys Ther 2015.
- **Personalization vector:** Mobility restriction log (tight hip flexor → roll quad/TFL; tight thoracic → peanut / lacrosse ball), time available (skip if <5 min warmup budget).
- **Prescription template:** Optional 60–120s foam rolling block BEFORE the Raise phase, only appears when user has tagged mobility restrictions in the target area. Never the main warmup.

### 12. Glute/scapular activation: EMG yes, performance transfer weak
- **Claim:** Use activation drills (glute bridges, clams, band pull-aparts, face pulls) primarily as a patterning cue for people with desk-job postures / long-sitting histories, NOT as a performance booster. Budget 60–90s max. Don't over-claim.
- **Evidence:** Multiple EMG studies (Reiman et al. 2012; Moore et al. systematic review 2020) show banded bridges and clams produce high glute EMG. But performance-transfer studies are split: 2 studies showed improved performance (Crow 2012, Pinfold 2018), 4 showed no difference (Cochrane 2017, Healy 2014, Parr 2017, Barry 2016), 1 showed worse performance (Comyns 2015). EMG ≠ hypertrophy or performance transfer. Mike Boyle's framework leans on activation heavily; the evidence base is weaker than the advocacy.
- **Sources:** Crow et al., J Strength Cond Res 2012. Healy & Harrison, J Strength Cond Res 2014. Moore et al., Int J Sports Phys Ther 2020 (systematic review of gluteal activation). Buckthorpe et al., Int J Sports Phys Ther 2019.
- **Personalization vector:** Sedentary lifestyle flag (desk worker → activation has higher patterning value), rehab/injury list (glute med weakness from meniscus history → keep it; no posterior-chain issues → skip), mood/motivation (if user wants to lift, don't burn 5 min on activation).
- **Prescription template:** 60–90s optional activation block, inserted BETWEEN Mobilize and Ramp sets. Present as "patterning" not "performance boost." For Kyra specifically (sedentary desk worker, lower back, R trap): band pull-apart × 15 + glute bridge × 10 before any pressing or squatting.

### 13. Session structure: compounds first, isolations last (exercise order matters)
- **Claim:** Prescribe compounds (multi-joint, high-load) BEFORE isolations in the session. Pre-fatiguing small muscles reduces compound-lift performance more than it gains isolation stimulus.
- **Evidence:** NSCA guidelines + multiple RCTs (Simão et al. 2012 meta-analysis on exercise order): the lift performed last tends to improve less. Compound lifts done first produce greater strength gains. Pre-exhaustion protocols (isolation-then-compound) have mixed hypertrophy evidence and clear strength decrement.
- **Sources:** Simão R et al., Sports Medicine 2012 (exercise order meta-analysis). Schoenfeld B., "Science and Development of Muscle Hypertrophy" 2nd ed. 2020.
- **Personalization vector:** Session goal (hypertrophy-focused → order matters less; strength-focused → compounds always first), weak-link flag (if a small muscle is the limiter on a compound, consider targeted work on alternate days), time budget.
- **Prescription template:** Default session template: (1) warmup → (2) main compound(s) → (3) accessory compounds → (4) isolation → (5) finisher/conditioning. Engine never schedules a bicep curl before a deadlift.

### 14. Frequency: train each movement pattern 2x/week for trained lifters
- **Claim:** Hit each major movement pattern (squat, hinge, push, pull) at least twice per week. This beats 1x/week for strength and hypertrophy in trained lifters when volume is equated.
- **Evidence:** Grgic et al. (2018) meta-analysis on resistance-training frequency: when volume is equated, higher frequency (2–3x) produces similar hypertrophy to lower frequency (1x) but generally slightly better strength. Schoenfeld et al. (2016) meta on frequency: 2x/week > 1x/week for hypertrophy when volume equated. Novices tolerate lower frequency fine; trained lifters benefit from higher frequency.
- **Sources:** Grgic et al., Sports Medicine 2018; 48(5):1207–1220 (frequency meta-analysis). Schoenfeld et al., Sports Med 2016 (frequency meta).
- **Personalization vector:** Training age, weekly session count (3 sessions → full-body or upper/lower split gets every pattern 2x; 4+ sessions → PPL or upper/lower with pattern repeats), recovery capacity (injuries, sleep quality).
- **Prescription template:** Weekly planner ensures each pattern appears ≥2x when ≥3 sessions/week are available. Program templates bias toward upper/lower or full-body splits for home lifters.

---

## TIER D — Elite S&C Lore: Weakly Supported or Context-Restricted (Flag, Don't Default)

### 15. Unilateral > bilateral (Mike Boyle) — popular but evidence doesn't support replacement
- **Claim:** Don't replace bilateral lifts with unilateral lifts wholesale. Include both. Boyle's "bilateral training is dysfunctional" framing is stronger than the evidence warrants.
- **Evidence:** Liao et al. (2023) meta-analysis on unilateral vs bilateral training: unilateral produced better single-leg strength transfer (as expected); bilateral produced better bilateral strength (as expected). No universal superiority. Unilateral IS genuinely useful for (a) back-pain sufferers who can't tolerate spinal loading, (b) asymmetry correction, (c) sport-specific transfer for running/sprinting. But for general hypertrophy and strength, bilateral lifts remain the foundation. Boyle's clinical reasoning is reasonable for specific populations (back-pain NFL linemen); his generalization to all athletes is not well-supported.
- **Sources:** Liao KF et al., Front Physiol 2022/2023 (unilateral vs bilateral meta-analysis). Boyle M., "Advances in Functional Training" 2010 (coaching text; strong opinion, moderate evidence).
- **Personalization vector:** Back pain flag (Kyra has lower back issues → bias unilateral more), meniscus/knee (unilateral loading can be problematic single-sided → goblet split squats OK; pistol squats problematic), injury asymmetry, sport (unilateral-dominant sports → more unilateral), time efficiency (bilateral = faster through weekly volume).
- **Prescription template:** For Kyra: 50/50 mix. Back squat + RDL remain staples (back-safe positions, moderate load). Add single-leg RDL, split squat, B-stance hinge for unilateral volume. Avoid heavy pistol squats (knee).

### 16. Triphasic training (eccentric → iso → concentric blocks) — interesting, thin evidence
- **Claim:** Cal Dietz's triphasic framework is intellectually attractive and has strong anecdotal track record in collegiate sports, but independent peer-reviewed validation is thin. Don't auto-prescribe. Treat as optional advanced mesocycle.
- **Evidence:** One published thesis (Kastelan, Lindenwood 2019, volleyball) found strength gains from 2-week eccentric + 2-week isometric blocks, but no vertical-jump improvement — which undercuts the power-transfer claim. The 2025 meta-analysis on eccentric phase duration (Tandfonline) found trivial differences favoring slower tempos for hypertrophy and strength, which doesn't specifically support the triphasic structure. The framework is coherent with known physiology (force-velocity curve, stretch-shortening cycle) but the specific block sequencing is coaching lore.
- **Sources:** Dietz C., Peterson B., "Triphasic Training" 2012. Kastelan GW, MS Thesis Lindenwood University 2019.
- **Personalization vector:** Not for novice/intermediate. Only surface as an option for users with 3+ years training, power-sport goal, and completed hypertrophy/strength base.
- **Prescription template:** Locked behind advanced flag. If surfaced: 3-week mesocycle — week 1 (3–5s eccentric emphasis, moderate load), week 2 (3s isometric pause at sticking point), week 3 (explosive concentric, compensatory acceleration). Only on main lifts.

### 17. Block periodization (Issurin) — strong for elite endurance, weaker for hobbyist strength
- **Claim:** Full block periodization (concentrated accumulation → transmutation → realization blocks) is overkill for a home lifter without a competition date. Use a simpler undulating structure.
- **Evidence:** Issurin (2008, 2010) reviews document block periodization's advantages in Eastern European elite cyclists, XC skiers, alpine skiers. Rønnestad et al. found block > traditional in elite cyclists for VO2max. However, for team-sport and combat-sport athletes, results are mixed, and for non-competitive hobbyists the complexity outweighs benefits. Daily Undulating Periodization (DUP) shows strong evidence for hypertrophy/strength in non-elite populations (Rhea et al. 2002; Grgic et al. 2017 meta).
- **Sources:** Issurin VB, Sports Medicine 2010; 40(3):189–206. Rhea MR et al., J Strength Cond Res 2002 (DUP vs linear).
- **Personalization vector:** Has user set a meet/event date (→ block periodization justifies itself); otherwise undulating.
- **Prescription template:** Default: daily undulating (e.g., Mon heavy/low-rep, Wed moderate, Fri hypertrophy). Block periodization only when user adds a competition date in the profile.

### 18. Heavy-light-medium training rhythm (weightlifting, Poliquin intensification) — reasonable but not specific
- **Claim:** Alternating high/medium/low intensity across the week reduces fatigue accumulation and supports better-quality work on heavy days. The specific Poliquin intensification/accumulation structure is one valid implementation among many.
- **Evidence:** Autoregulated periodization research (Helms, Zourdos RPE-based schemes; Mann et al. VBT-based autoregulation) shows matching daily intensity to readiness beats rigid linear programming. The weightlifting heavy-light-medium rhythm is longstanding coaching practice (Medvedyev, Bulgarian method variants) with some direct study support but mostly observational. Poliquin's specific claims (e.g., "6 weeks accumulation, 3 weeks intensification") are tradition, not evidence-specified.
- **Sources:** Helms ER et al., Strength Cond Journal 2016 (RPE autoregulation). Zourdos MC et al., J Strength Cond Res 2016 (velocity-based RPE). Poliquin C., "Modern Trends in Strength Training" (coaching text, not peer reviewed).
- **Personalization vector:** Recovery capacity (sleep, stress → if low, auto-bias toward lighter), consecutive heavy days logged, injury flares.
- **Prescription template:** The engine uses simple RPE-based autoregulation: if last session logged RPE ≥9 + poor recovery, tomorrow's session auto-scales to RPE 6–7. No explicit "heavy-light-medium" branding shown to user; it emerges from the autoregulation layer.

---

## Cross-Cutting Answers to Key Questions

**Q1: Should a session prescribe ramp warmup sets for main lifts, and in what format?**
Yes. See Principle 3. Format scales with working weight: 2 sets (<60kg), 3 sets (60–100kg), 4–5 sets (>100kg). Reps descend as load ascends. Never to failure on a ramp; always 2+ reps in reserve. Example 100kg squat: empty bar × 8 → 40 × 5 → 60 × 5 → 80 × 3 → (working: 100 × 5).

**Q2: Is activation work (glute bridges, band pull-aparts) worth the time investment?**
Marginal. See Principle 12. EMG evidence is strong; performance-transfer evidence is split. For sedentary users (Kyra's profile: desk worker, L meniscus, R trap, lower back), 60–90s of targeted activation serves as patterning / injury-prevention priming, not as performance enhancement. Don't spend >90s. Don't claim it "potentiates" performance.

**Q3: Rest prescription by exercise role?**
- Compound (squat, DL, bench, OHP, row, pull-up @ <12 reps): **180s**
- Accessory compound (split squat, RDL, incline DB, row variants): **120s**
- Isolation/pump (curls, raises, extensions, calves, 10–20 rep range): **75s**
- Novices tolerate 60–90s across the board fine; trained lifters benefit most from the tiered scheme (Schoenfeld 2016, Grgic 2017/2018).

**Q4: Tempo prescription for a home lifter without a coach?**
Default cue: "Controlled eccentric (~2s), brief pause if cued, drive the concentric with intent." Only show explicit tempo codes (e.g., 3-1-1-0) when (a) correcting a specific technique flag, (b) tendon rehab, or (c) deliberately eccentric-biased accessory. The evidence doesn't justify more complexity (Schoenfeld 2015 meta). Home lifters execute explicit tempos poorly without a clock/coach, so the benefit-to-complexity ratio is bad. Principle 8 overrides on power/strength days: intent to move fast matters more than the prescribed tempo.

---

## Summary Prescriptions for the Engine

**Default session skeleton:**
1. Warmup block (6–10 min, RAMP structure, pattern-specific)
2. Ramp sets on primary lift (2–5 sets, scales with working weight)
3. Primary compound (2–3 min rest)
4. Secondary compound (2 min rest)
5. Accessory work (1.5–2 min rest)
6. Isolation / finisher (60–90s rest)
7. Optional cooldown with static stretching (no performance cost)

**Personalization inputs that drive warmup:**
- Sedentary hours today → longer Raise phase
- Injury list (meniscus, back, trap) → mandatory targeted mobility drills
- Cold ambient / morning session → extra ramp set
- Pattern of today's primary lift → movement-specific mobilize module

**What NOT to prescribe by default:**
- Long static stretches of prime movers pre-lift
- Complex tempo codes for routine hypertrophy sets
- Full PAP protocols (advanced-only feature)
- Triphasic blocks / full block periodization (advanced-only)
- Activation work marketed as "performance boost"

**Honesty labels in UI:**
- Activation drills: "patterning" not "potentiation"
- Foam rolling: "mobility adjunct" not "recovery tool"
- Ramp sets: "prep" not "warm-up stretching"
- PAP: "advanced experimental" with effect-size disclaimer if surfaced
