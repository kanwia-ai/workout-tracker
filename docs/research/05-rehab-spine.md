# Spine / Lower Back Rehab — Evidence Synthesis

**Audience:** workout-tracker adaptive engine + end-user rehab logic.
**Primary user profile (this app):** desk worker with lower back pain + hip flexor issues (plus L meniscus, R trap, lower-back-reactive posture).
**Method:** graded against hierarchy — (1) clinical practice guidelines (APTA/JOSPT 2021, Lancet 2018), (2) systematic reviews & meta-analyses, (3) RCTs, (4) foundational biomechanics (McGill porcine work), (5) expert frameworks (McGill, McKenzie, Sahrmann, O'Sullivan). Janda is included as historically influential but explicitly flagged where superseded.

Format for each principle: **Principle → Claim → Evidence → Sources → Personalization vector → Prescription template.**

---

## P1. First-line for non-specific LBP is movement + education, NOT rest or imaging

**Claim.** For non-specific low back pain (the ~85–90% of LBP that has no identifiable pathology), the evidence-based first-line response is: keep moving, stay at work, avoid routine imaging, avoid opioids, provide reassurance + self-management education. Bed rest is actively harmful — it increases disability and fear-avoidance.

**Evidence.**
- Foster et al., *Lancet* 2018 (Prevention & treatment series paper): globally, LBP is over-medicalized with "inappropriately high use of imaging, rest, opioids, spinal injections, and surgery." First-line = education + self-management + resumption of activity.
- Hartvigsen et al., *Lancet* 2018: biopsychosocial framework is the guiding model; psychological and social factors meaningfully contribute to chronicity.
- Cochrane / NEJM: controlled trials of workers with acute LBP show avoiding bed rest + maintaining ordinary activity → fastest recovery.
- APTA/JOSPT 2021 CPG: advice to stay active + education are core recommendations across virtually every national guideline.

**Sources.** Foster et al., Lancet 2018 (PMID 29573872); Hartvigsen et al., Lancet 2018 (PMID 29573870); APTA CPG (JOSPT 51(11) 2021, PMID 34719942); Malmivaara NEJM 1995.

**Personalization vector.** `lower_back: acute` OR `lower_back: modify`. Always pair with reassurance copy.

**Prescription template.**
- Don't prescribe "rest days" as a treatment for a sore back.
- Default adaptation: REDUCE LOAD, DON'T REMOVE MOVEMENT. Sub heavy compound → variation with less spinal load; keep sets/reps, drop 30–50% load; keep user walking daily.
- In-app copy on flare: "Keep moving. Short walks, the Big 3, and lighter loads beat lying down."

---

## P2. Imaging findings (bulge / herniation / degeneration) are NOT reliable pain generators

**Claim.** Disc bulges, protrusions, degeneration, and facet changes are common in pain-free adults. Don't let an MRI finding dictate exercise restriction by itself.

**Evidence.**
- Jensen et al., NEJM 1994: in 98 asymptomatic adults, 52% had ≥1 disc bulge, 27% had protrusion on MRI.
- Brinjikji et al., systematic review: disc degeneration prevalence in asymptomatic people rises with age — 37% at age 20, 80% at age 50, 96% at age 80. Most findings are normal aging.
- Brinjikji et al. 2015 (AJNR): while some findings (Modic 1, extrusion, annular defects) are more prevalent in people with pain than without, no single finding reliably CAUSES pain.

**Sources.** Jensen et al., NEJM 1994; Brinjikji et al. 2015 (PMID 25430861, 26359154).

**Personalization vector.** Any user with "I have a herniated disc" self-report → DO NOT auto-restrict lifting. Symptom behavior (see P3, P6) dictates programming, not the MRI label.

**Prescription template.** In onboarding, if user reports imaging findings: surface short explainer ("imaging findings are common in people without pain — we program around how movements feel, not the MRI"). Route based on `symptom_behavior` flags (direction preference, aggravators), NOT diagnostic label.

---

## P3. Spine-sparing lifting mechanics: hip hinge + neutral spine + brace

**Claim.** For loaded compound lifts, the safest default is a hip-dominant hinge pattern with the spine close to neutral and an abdominal brace that generates intra-abdominal pressure (IAP). "Perfect" neutral isn't required, but large loaded flexion-under-load is the biomechanically risky posture — especially first thing in the morning.

**Evidence.**
- McGill biomechanics (Low Back Disorders, 3rd ed.): the lumbar spine tolerates compression very well in neutral but loses tolerance as it approaches end-range flexion; peak disc stress ~30° of lumbar flexion under load.
- Callaghan & McGill (2001), porcine model: repeated flexion-extension cycles under modest compression reliably produced annular disc herniation. Cumulative flexion under load is the mechanism of concern, not one bent-over pickup.
- Biomechanical/IAP research: bracing + IAP reduces lumbar spine compressive stress ~30% and shear ~24% under load. Valsalva during maximal lifts increases spinal stiffness.
- Snook et al. (occupational): avoiding early-morning flexion reduced workplace LBP — discs are fully hydrated on waking and endure more stress in flexion.

**Sources.** McGill, *Low Back Disorders* (3rd ed., Human Kinetics); Callaghan & McGill, *Clin Biomech* 2001 (PMID 11114441); Snook et al. occupational studies; IAP/bracing reviews.

**Personalization vector.** `lower_back: modify | chronic` AND `movement_literacy: novice/intermediate` → emphasize hinge drills first. `desk_worker = true` → include morning mobility before any spinal flexion.

**Prescription template.**
- Teach hip hinge before deadlift. Dowel-on-spine drill (head/upper-back/sacrum 3 points of contact).
- Every loaded compound: cue "ribs down, brace 360° like before a punch, keep dowel-alignment."
- Skip loaded spinal flexion drills (weighted sit-ups, Jefferson curls, heavy good-mornings with a round) in the first 90min of waking.

---

## P4. McGill's "Big 3" — modest but real evidence, optimal for endurance-based stabilization

**Claim.** The Big 3 (modified curl-up, side bridge, bird dog) are the most-studied spine-sparing core endurance drills. They're equivalent-or-better than conventional PT for pain + disability in chronic non-specific LBP and they don't impose loaded flexion. NOT a magic bullet — they're the *entry-level dose* of core.

**Evidence.**
- Areeudomwong et al. 2018 RCT (JPTS; PMC5908986): 6-wk McGill-style program vs conventional PT in chronic non-specific LBP (n=30). McGill group: pain -15.3%, disability -12.1%, back ROM +8.9% (all p<0.01 within-group). Conventional: ~half the effect. Between-group NS.
- McGill 1999 (*Arch Phys Med Rehabil*): normative endurance database. Side-bridge R/L ratio should be within 0.05 of 1.0; side-bridge:extension ratio ≤0.75. Asymmetry > symmetry as a risk marker.
- Biering-Sørensen test: <176s hold = elevated 1-yr LBP risk; >198s = protective. Endurance > strength for LBP.
- Bird dog EMG (Marshall & Murphy; standing bird dog 2023): multifidus activation ~60% MVIC dynamically, good lumbar ES recruitment without loaded flexion.

**Sources.** Areeudomwong et al., *J Phys Ther Sci* 2018; McGill et al., *Arch Phys Med Rehabil* 1999 (PMID 10453772); Biering-Sørensen 1984.

**Personalization vector.** Anyone with `lower_back: any` → Big 3 as daily baseline. `desk_worker: true` → as a 5-min "morning deposit" before sitting.

**Prescription template.**
- Daily, morning: curl-up 3×(8–10s hold × 4 reps) · side bridge 3×10s each side · bird dog 3×(8–10s × 4 reps each side).
- Progress by REPS not hold time (McGill: "build endurance via descending pyramid: 6-4-2 reps").
- Log side-bridge L/R symmetry as a weekly metric.

---

## P5. Loaded spinal flexion — context-dependent, not universally evil

**Claim.** Repeated, loaded, end-range lumbar flexion is the highest-evidence mechanism for disc injury. BUT: (a) small amounts of spinal flexion occur in every real lift, (b) a spine that NEVER flexes under any load becomes a spine with no flexion tolerance, and (c) loaded flexion exercises (Jefferson curls, weighted roman-chair flexion) have specific adaptive value for trained lifters. For the app's target user (LBP history, desk-worker), the default is AVOID loaded flexion in training; reserve as a later-stage graded-exposure tool.

**Evidence.**
- Callaghan & McGill 2001 + follow-ups: cumulative flexion cycles under load = disc herniation mechanism in porcine model.
- Greg Lehman (Revisiting the spinal flexion debate): critique that the "flexion is dangerous" message is overstated; the dose matters. The same research McGill cites shows injury requires THOUSANDS of cycles.
- Physically active adults with LBP don't show altered deadlift mechanics (Swinton et al.; PMC10761629) — suggesting mechanics alone don't predict pain.

**Sources.** Callaghan & McGill, *Clin Biomech* 2001; McGill, *Back Mechanic* 2015 (lay) + *Low Back Disorders*; Lehman G., critical reviews.

**Personalization vector.** `lower_back: modify | chronic | acute` → avoid loaded flexion. `lower_back: none AND trained` → loaded flexion OK as a progression tool but still not a staple.

**Prescription template.** No Jefferson curls, weighted sit-ups, or rounded good-mornings for this user. Abs = anti-flexion (dead bug) and anti-extension + anti-rotation instead (P9).

---

## P6. Directional preference (McKenzie) is real and should drive acute-phase exercise choice

**Claim.** A subgroup of LBP patients (often ~60–70% of those with derangement-pattern symptoms) experience centralization or relief with repeated movement in one direction — most commonly extension (prone press-up), less commonly flexion or side glide. For those people, exercising INTO the direction of preference reduces pain and disability faster than generic or opposing exercise.

**Evidence.**
- Long et al. 2004 (*Spine*): patients with directional preference who got matched exercise had significantly greater pain + disability improvements than mismatched-direction or generic exercise.
- Lam et al., *JOSPT* 2018 systematic review + meta-analysis: McKenzie method produced moderate short-term improvements in pain/disability versus other exercise.
- 2024 SR/MA (credentialed McKenzie delivery, *J Manual Manip Ther* 2025; PMC11924268): low-to-moderate certainty that McKenzie > other exercise short-term (MD −1.11/10 pain), superior to minimal intervention for up to 12 mo on disability.
- ~67–85% of centralizers show extension preference in the literature.

**Sources.** Long, Donelson, Fung, *Spine* 2004; Lam et al., *JOSPT* 2018 (PMID 29602304); 2024 systematic review (PMID 39383118).

**Personalization vector.** Any user reporting leg symptoms (`radiating_pain: true`) OR acute flare → onboarding quiz: "does bending forward make it worse/better? Does lying on your stomach and propping up on elbows feel better, worse, or the same?"
- Extension-preference → press-ups, standing back extensions.
- Flexion-preference (often stenosis-type, older) → knees-to-chest, cat-camel into flexion.
- No preference → default to generic motor-control.

**Prescription template.**
- Acute phase with extension preference: prone press-up 10 reps every 2 hours × 3 days. Avoid sustained flexion (slouched sitting).
- Re-test preference weekly; once symptoms centralize, begin graded return to loading (P11).

---

## P7. Exercise type for chronic non-specific LBP: effect is SMALL, specificity matters LESS than dose + preference

**Claim.** Across dozens of meta-analyses, Pilates, motor control, resistance training, aerobic exercise, yoga, and McGill-style programs all produce similar modest-to-moderate pain/disability reductions in chronic non-specific LBP. The best exercise is the one the user will do consistently, matched to their preference and any directional preference.

**Evidence.**
- Owen et al. 2020 network MA (*Br J Sports Med*; PMID 31666220): Pilates, stabilization/motor control, resistance training, aerobic training were most effective — effect sizes small, no single modality clearly superior.
- Hayden Cochrane update (2021): exercise > no treatment for chronic LBP, modest effects, subgroup/tailored superior to generic.
- Individualized exercise ~38% better than generic (meta-analysis, *J Pain* 2022; PMC S1526-5900(22)00364-9).

**Sources.** Owen et al. *BJSM* 2020; Hayden et al. Cochrane 2021; Fernández-Rodríguez et al. *J Pain* 2022.

**Personalization vector.** Every user. The app's edge is *individualization + adherence*, not picking the "right" exercise modality.

**Prescription template.** Don't force a modality. Offer Big 3, hinge work, Pallof/dead bug, walking, and (if user is a lifter) return-to-lift progression as menu items, not mandates. Track adherence > exercise selection.

---

## P8. Deadlifts and squats can be THERAPEUTIC for the right LBP subgroup

**Claim.** For people with mechanical, non-radicular LBP who aren't in acute flare, a progressive deadlift-based program reduces pain and disability. But it works best for those with baseline capacity; those who are in high pain + low endurance don't benefit as much (and may regress).

**Evidence.**
- Berglund et al. 2015 (*J Strength Cond Res*; PMID 25559899): patients with lower pain intensity, less disability, and better Biering-Sørensen endurance benefitted most from deadlift training. Higher-pain / lower-endurance subgroup did NOT improve and sometimes got worse.
- Welch et al. 2021 (*J Sport Rehabil*, PMID 33626500): 16-wk progressive deadlift program → pain -72%, disability -76% in chronic LBP.
- Aasa et al. — non-specific LBP + strength training including deadlifts = superior to low-load motor-control when patients can tolerate it.

**Sources.** Berglund et al. *JSCR* 2015; Welch et al. *JSR* 2021; Aasa et al.

**Personalization vector.**
- Baseline triage: pain ≤4/10 + Biering-Sørensen ≥60s → green light for loaded hinge progression.
- Pain >6/10 or Biering-Sørensen <30s → start with P4 (Big 3), P6 (directional), hinge pattern with dowel; build 4–8 weeks before loading.

**Prescription template.** Gate heavy loaded hinge work behind a simple readiness check: can the user hold a Sørensen-style prone-extension hold ≥45s AND report pain ≤4/10 at rest? If no, delay. If yes, start RDL/trap bar light (P10).

---

## P9. Core training = anti-flexion, anti-extension, anti-rotation, anti-lateral-flexion — NOT crunches

**Claim.** The trunk's job during lifting + daily life is to RESIST movement of the spine, not create it. Train that. Dead bug (anti-extension), Pallof press (anti-rotation), side plank / suitcase carry (anti-lateral-flexion), bird dog + farmer carry (anti-everything-under-load) are evidence-concordant core choices. Crunches and sit-ups impose repeated loaded flexion with no unique training benefit.

**Evidence.**
- McGill core work philosophy + porcine flexion-cycle data (P3, P5).
- EMG: farmer carry / suitcase carry produce bilateral core activation with unique QL and oblique loading (Kang et al., *J Athl Train* 2024; PMC11042841).
- Pallof press + anti-rotation drills effective for reducing LBP by training lumbopelvic control without loaded flexion.
- APTA 2021 CPG: trunk muscle activation + endurance training recommended for acute LBP (Grade B) and chronic LBP.

**Sources.** McGill, *Ultimate Back Fitness*; Kang et al., *J Athl Train* 2024; APTA/JOSPT CPG 2021.

**Personalization vector.** All users; the higher the lumbar-spine-reactivity, the more you weight anti-flexion/anti-rotation over any flexion-based ab work.

**Prescription template.**
- Mandatory staple: dead bug + side plank + Pallof (2–3×/wk).
- Progression: heavy farmer carries as the "trunk finisher" for anyone past acute phase.
- Removed: crunch, sit-up, Russian twist (loaded flexion-rotation = worst-case disc mechanic).

---

## P10. For LBP history: Trap bar > Conventional deadlift; RDL is solid; rack pulls conditional

**Claim.** Bar choice and movement pattern meaningfully change spine load. For a user with LBP history, the ranking for loaded hinge is (easiest → hardest on the back): hip thrust → KB deadlift → trap bar deadlift → RDL → rack pull → conventional deadlift. All can be programmed, but default = trap bar.

**Evidence.**
- Swinton et al., *JSCR* 2011: peak spinal flexion moment ~9% higher conventional vs trap bar; peak lumbar torque ~749 N·m conventional vs ~640 N·m trap bar (~15% less). Trap bar shifts load toward quads, spares hamstrings/erectors proportionally.
- Lake et al., Camara et al.: trap bar deadlift allows higher velocity + load with less lumbar shear.
- Rack pull: shortened ROM + heavier loads; lumbar compressive/shear loads can *exceed* conventional depending on pin height. Use only as graded-exposure tool, not a default.
- RDL: safe with neutral spine + hip hinge; higher sustained erector demand than trap bar but lower peak compression than conventional because load stays close to body. Caveat: demands good hip hinge pattern; novices often flex the spine → sub with trap bar first.

**Sources.** Swinton, Stewart, Agouris et al. *JSCR* 2011; Camara et al. *JSCR* 2016; McGill *Low Back Disorders*.

**Personalization vector.** `lower_back: modify | chronic` AND `loaded_hinge_goal: true` → default trap bar. Sub conventional → trap bar unless user is a competitive powerlifter with intact technique.

**Prescription template.** Default sub table:
| User's planned lift | Sub (`lower_back: modify`) |
|---|---|
| Conventional deadlift | Trap bar deadlift (same load) OR hip thrust |
| Deficit deadlift | Remove deficit, standard trap bar |
| Jefferson curl / weighted flexion | Remove; replace with dead bug |
| Good morning | RDL with dowel |
| Barbell back squat | Goblet / front squat OR box squat to reduce forward lean |
| Rack pull | Trap bar to knee-height blocks |
| Heavy rotational (Russian twists w/ load) | Pallof press, cable chop with neutral spine |

---

## P11. Return to heavy hinge/squat after LBP — objective criteria, not just "feels better"

**Claim.** Rushing back to heavy deadlift is the #1 re-injury driver. Gate re-entry on objective endurance + symptom stability, not arbitrary time.

**Evidence / criteria (consolidated from McGill, Berglund, physio rehab literature):**
- Pain at rest ≤3/10 for at least 7 straight days.
- Biering-Sørensen ≥60s (target 90s+ for full RTS).
- Side bridge ≥45s each side; R/L difference <10%.
- Can perform unloaded hinge 3×10 with dowel-on-spine maintaining contact throughout.
- Can perform KB RDL @ 24–32kg × 10 with no symptom reproduction 24h post.
- 24-hour rule: any exercise that produces pain >2/10 during OR worsens pain the next day → regress one step.

**Sources.** Berglund et al. *JSCR* 2015; McGill *Back Mechanic* 2015; Barbell Physio / PT consensus.

**Personalization vector.** User flag: `returning_from_flare: true`.

**Prescription template.**
- Week 1–2: Big 3 + walks + hinge pattern unloaded.
- Week 3–4: KB deadlift / hip thrust (moderate loads); reassess endurance.
- Week 5–6: Trap bar deadlift 3×5 @ RPE 6. RDL 3×8 @ light.
- Week 7+: If all criteria met, begin loading trap bar toward prior working weights. Don't chase conventional deadlift 1RM for 12+ weeks post-flare.

---

## P12. Hip flexors are usually NOT "tight" in the way people think — treat with activation + eccentric strengthening, not (only) stretching

**Claim.** In a desk-bound population, the iliopsoas complex is chronically shortened positionally but often NEUROLOGICALLY INHIBITED or LENGTHENED-WEAK ("stretch weakness"). Stretching alone produces small, short-lived ROM gains (~2.6° hip extension, ~1.2° pelvic tilt reduction, no lumbar lordosis change) and rarely solves the felt "tightness." What works: restore length with active ROM, then strengthen at long muscle lengths (eccentric + isometric).

**Evidence.**
- Johanson et al. 2004 (*Phys Ther*): passive vs active hip-flexor stretching — both improve ROM equivalently. No advantage to either alone.
- Heyrman et al. 2021 (cited in hip-flexor review): single-session hip-flexor stretch → +2.6° hip extension, −1.2° ant pelvic tilt, no change in lumbar lordosis, no correlation between ROM gain and pelvic-tilt gain.
- Tyler et al., Tottori et al.: iliopsoas tendinopathy case series — eccentric-biased loading at length (e.g., decline split squat, standing hip flexion with tubing) produced clinically meaningful pain reduction (6/10 → 2/10 at 12 wk).
- Mendiguchia et al. — active hip flexor strengthening at length (banded marches, dynamic L-sit) outperforms stretching for hip-flexor function and related LBP.
- Lack of correlation between pelvic tilt and hip muscle torque ratio (PMC8136572) — the "tight hip flexor → APT → LBP" causal chain is not well supported.

**Sources.** Johanson et al. *Phys Ther* 2004 (PMID 15330693); Heyrman et al. 2021; Tyler et al. *N Am J Sports Phys Ther* 2008 (PMC2642547); case reports on eccentric iliopsoas work (PMC5717490).

**Personalization vector.** `hip_flexor_tightness: true` — default protocol is NOT just couch stretch.

**Prescription template.**
- 2 min/day active hip flexor mobility: world's greatest stretch, half-kneeling rock-back, 90/90 transitions.
- 2–3×/wk hip flexor strengthening at length: banded supine marches, banded standing hip flexion (eccentric 3s), dead bug with posterior pelvic tilt, Copenhagen-style side plank variations.
- Optional static couch stretch post-workout (30s × 2 per side). Don't lead with it.
- Deload sitting time: every 30 min stand + 10 banded march each side.

---

## P13. Glute strength is the cheapest insurance against LBP — but "activation" has been over-hyped

**Claim.** Gluteus maximus and medius are directly involved in lumbopelvic load transfer; weakness and delayed activation are associated with chronic LBP. BUT: "glute activation" drills (clams, glute bridges for 30 reps) are small-dose strengthening, not a neurological light-switch. Actual strengthening — heavy hip thrusts, Bulgarian split squats, RDLs — matters far more than low-load activation drills done in isolation.

**Evidence.**
- Kang et al. 2013 / Sun & Park 2016 (PMC4713798): glute strengthening + stabilization combined > stabilization alone for LBP pain + back muscle strength.
- Delayed glute max activation observed in chronic LBP (Leinonen et al., Nelson-Wong et al.).
- Janda's reciprocal-inhibition claim ("tight psoas → inhibited glute max") — NOT well validated (Lehman, 2016 critique). The correlation between glute weakness and LBP is real; the specific mechanism Janda proposed is underpowered.

**Sources.** Sun & Park 2016 (PMC4713798); Nelson-Wong et al.; Lehman G. (critique of LCS).

**Personalization vector.** Every user with LBP history or desk-job pattern → minimum weekly glute work.

**Prescription template.**
- 2×/wk: hip thrust 3×8–12 (heavy-ish, RPE 7) + single-leg bridge or step-up 3×8 each side.
- Don't bill monster walks, clams, or mini-band bridges as "strengthening" — use them as warm-up only.

---

## P14. SI joint pain: legitimately exists, but most "SI joint" self-diagnoses are actually lumbar referred pain — treat with lumbopelvic strengthening, not manipulation-chasing

**Claim.** True SI joint pathology is hard to diagnose without a cluster of provocation tests (or fluoro-guided block). Most people who say "my SI joint is out" have lumbar-origin pain or pelvic-girdle pain that responds to the same gluteal + core + hinge protocol as non-specific LBP. Manipulation + stability exercise combined has slightly more evidence than stability alone, but no treatment has high-quality RCT support.

**Evidence.**
- Al-Subahi et al. 2017 (PMC5599847): systematic review of physiotherapy for SI joint dysfunction — manipulation + exercise most effective; both reduce pain and disability. Quality of evidence is mixed/low.
- Hungerford et al., Cohen et al.: gluteus maximus dysfunction observed in SI joint dysfunction; strengthening contralateral glutes + core = evidence-concordant.
- No definitive RCT gold standard for any single SI joint intervention.

**Sources.** Al-Subahi et al. *JPTS* 2017; Cohen et al. SI joint reviews; Laslett et al. on provocation testing.

**Personalization vector.** `si_joint_pain: suspected`. Don't treat as a fundamentally different condition from LBP for exercise programming.

**Prescription template.** Same as LBP chronic protocol. Add: unilateral glute work (single-leg hip thrust, step-ups), anti-rotation (Pallof), and avoid end-range hip ROM in early phase (deep lunges, overstretching hamstrings).

---

## P15. Janda / lower-crossed syndrome — historically influential, largely NOT validated; use cautiously

**Claim.** Lower crossed syndrome (tight hip flexors + lumbar extensors paired with weak glutes + deep abs) is still taught widely. The pattern is plausible and sometimes useful as a rough clinical frame, but the specific mechanism (reciprocal inhibition causing the opposite muscle to shut down) is not supported by current research, and correcting LCS via targeted exercises is not clinically superior to general strengthening.

**Evidence.**
- Greg Lehman 2016 critique: LCS reciprocal-inhibition claim not supported by electromyography or imaging evidence.
- Hrysomallis 2009; multiple muscle-imbalance reviews: asymptomatic people frequently show LCS posture. Its presence does not predict pain.
- 2024 RCT comparing LCS-specific corrective protocol vs generalized exercise: both groups improved; no specific advantage to LCS-targeted protocol.

**Sources.** Janda 1987 original framework; Lehman 2016 critique; Hrysomallis 2009; 2024 LCS RCT (IJISRT25FEB1611).

**Personalization vector.** Don't diagnose LCS in the app. DO include the constituent interventions (hip flexor length + strength, glute strength, core control) because each has independent evidence — just don't brand them as "fixing your LCS."

**Prescription template.** Treat as a heuristic, not a diagnosis. The protocol in P12 + P13 + P4 already addresses every component of LCS via higher-evidence mechanisms.

---

## Cross-cutting adaptation rules for the app's engine

Combining the above into the `lower_back` profile logic:

### `lower_back: none`
- Full lift menu.
- Still include Big 3 as 5-min "movement hygiene" 2–3×/wk.
- Farmer carry + Pallof as core staples instead of crunches.

### `lower_back: modify` (history of LBP, currently asymptomatic)
- SUB conventional deadlift → trap bar.
- No loaded spinal flexion drills.
- Glute strengthening 2×/wk mandatory.
- Daily Big 3 (short dose).
- Warm up includes hip hinge dowel drill before any loaded hinge.

### `lower_back: chronic` (ongoing symptoms, stable)
- Loaded hinge only after 4+ wk Big 3 base + meets P11 gates.
- Use KB deadlift and hip thrust as primary hinge.
- All compound lifts capped at RPE 7.
- Daily Big 3 + daily walking (≥3×10 min).
- Onboarding: run directional preference quiz (P6).

### `lower_back: acute` (current flare, <6 weeks)
- No loaded hinge. No squats under load.
- Directional preference protocol (P6) daily.
- Walk 3×10 min/day.
- McGill Big 3 at low dose — if not pain-provoking.
- 24-hour rule governs progression.

### Always
- Never program crunches / Russian twists / Jefferson curls / weighted sit-ups for this user.
- Default ab work = dead bug, Pallof, side plank, farmer carry, bird dog.
- Hip flexor intervention is activation + length-strengthening first, stretch second.
- Surface the biopsychosocial framing: pain ≠ damage, imaging ≠ destiny, movement helps.

---

## Evidence ranking summary

**Tier 1 (CPG / meta-analysis — high confidence):** P1 (activity > rest), P2 (imaging interpretation), P6 (directional preference), P7 (exercise type non-specific), P9 (core anti-movement), P13 (glute strength).

**Tier 2 (RCTs / systematic reviews, moderate confidence):** P3 (hip hinge mechanics), P4 (Big 3 endurance), P8 (deadlift therapeutic for subgroup), P10 (trap bar < conventional stress), P11 (return-to-lift criteria), P12 (active > passive hip flexor work).

**Tier 3 (biomechanics / mechanism + expert consensus):** P5 (loaded flexion nuance), P14 (SI joint), P15 (Janda/LCS — explicitly superseded where noted).

---

## Primary source shortlist (for app citations / "why we recommend this" surfaces)

1. Foster NE, Maher CG, et al. *Lancet* 2018 — Prevention and treatment of LBP. PMID 29573872.
2. Hartvigsen J, Hancock MJ, et al. *Lancet* 2018 — What LBP is. PMID 29573870.
3. George SZ, Fritz JM, et al. *JOSPT* 2021 — APTA CPG for LBP Revision 2021. PMID 34719942.
4. McGill SM. *Low Back Disorders* (3rd ed.), Human Kinetics 2016; *Back Mechanic* 2015.
5. Callaghan JP, McGill SM. *Clin Biomech* 2001 — Porcine disc herniation model. PMID 11114441.
6. McGill SM, Childs A, Liebenson C. *Arch Phys Med Rehabil* 1999 — Endurance norms. PMID 10453772.
7. Long A, Donelson R, Fung T. *Spine* 2004 — Directional preference RCT.
8. Lam OT, Strenger DM, et al. *JOSPT* 2018 — McKenzie SR/MA. PMID 29602304.
9. Berglund L, Aasa B, Hellqvist J, et al. *JSCR* 2015 — Which LBP patients benefit from deadlift. PMID 25559899.
10. Swinton PA, Stewart A, Agouris I, et al. *JSCR* 2011 — Trap bar vs conventional biomechanics.
11. Johanson M, et al. *Phys Ther* 2004 — Passive vs active hip flexor stretch. PMID 15330693.
12. Jensen MC et al. *NEJM* 1994 — MRI of asymptomatic spines.
13. Brinjikji W, et al. 2015 AJNR + meta-analysis — Imaging findings and age.
14. Areeudomwong P, et al. *J Phys Ther Sci* 2018 — McGill stabilization RCT. PMC5908986.
15. Sahrmann SA. *Diagnosis and Treatment of Movement Impairment Syndromes*, Mosby 2002.
16. O'Sullivan P. *Man Ther* 2005; Kent et al. *Lancet* RESTORE trial 2023 — Cognitive functional therapy.
