# Knee Rehab — Curated Synthesis

Evidence-ranked principles for adapting a workout tracker to users with knee injuries, with particular emphasis on meniscus (the app's primary user has a left-knee meniscus issue). Each principle is translatable into a Gemini rule that modifies exercise selection, ROM, or loading.

Severity taxonomy used throughout:
- `ok` — no current knee issue (default)
- `modify` — active/recent meniscus tear (conservative), PFP, mild OA, irritable knee
- `avoid` — acute flare, locked knee, effusion +2, post-op restricted phase
- `chronic` — long-standing degenerative meniscus or knee OA, stable, pain-managed

---

## Principle 1: Conservative exercise therapy is non-inferior to arthroscopic partial meniscectomy for degenerative meniscus tears

**Claim:** In middle-aged patients with non-traumatic (degenerative) meniscus tears, a 12-week supervised progressive exercise program produces equivalent pain and function outcomes to arthroscopic partial meniscectomy at 2, 5, and 10-year follow-up — and produces superior quadriceps strength.
**Evidence strength:** strong (multiple RCTs: Kise et al. BMJ 2016; 10-year OMEX follow-up; ESCAPE trial 5-year; systematic reviews via Osteoarthritis & Cartilage 2023 IPD meta-analysis of 605 patients).
**Primary sources:** Kise NJ et al., BMJ 2016;354:i3740 (OMEX trial, 2-yr); OMEX 10-year follow-up 2024; ESCAPE trial JAMA Netw Open 2022; Moksnes et al. JOSPT 2012 (12-week protocol, n=20 case series from ongoing RCT); 2024 EU-US ESSKA-AOSSM-AASPT Meniscus Rehab Consensus Part II.
**Personalization vector:** meniscus severity=modify OR chronic; age 35+; degenerative tear pattern (not acute traumatic with locking).
**Prescription template:** If `meniscus_status ∈ {modify, chronic}` AND `tear_type = degenerative`: default the program to 12 weeks of progressive strength + neuromuscular work, 2-3 sessions/week, BEFORE suggesting a surgical consult. Surface evidence line in UI: "Exercise therapy has equal long-term outcomes to surgery — and builds more quad strength."

---

## Principle 2: Quadriceps strength is the single biggest lever for knee function and pain

**Claim:** Quadriceps strength (MVC and rate of force development) explains 24-38% of variance in stair-climbing and sit-to-stand in knee OA populations and is inversely associated with symptomatic knee OA incidence. Quad weakness is both a cause and a consequence of knee pathology.
**Evidence strength:** strong (multiple cross-sectional + longitudinal; Segal et al. 2010 MOST cohort; Sharma et al. 2003; systematic reviews).
**Primary sources:** Segal NA et al., Arthritis Care Res 2010; Palmieri-Smith et al. 2008 (mechanisms of arthrogenic quad inhibition); Bennell et al. 2015 reviews; OARSI 2019 guidelines.
**Personalization vector:** any knee issue; critical for `modify` and `chronic`.
**Prescription template:** Every knee-adapted program MUST include at least one direct quad-loading exercise per week. Priority order when knee is irritable: (1) isometric quad sets / wall-sit at tolerable angle, (2) Spanish squat / TKE, (3) leg extension limited arc, (4) partial squat/leg press. Caution in malaligned/lax knees — add alignment cues rather than remove strength work.

---

## Principle 3: Hip abductor/external rotator strengthening is non-negotiable for PFP and any knee pain with dynamic valgus

**Claim:** A 10° increase in dynamic knee valgus increases peak patellofemoral contact stress by ~45%. Hip + knee strengthening outperforms knee-only strengthening for PFP pain and function, and hip work alone produces faster early pain reduction. This applies broadly to knee issues, not just PFP, because proximal control dictates frontal-plane knee alignment.
**Evidence strength:** strong (APTA 2019 PFP CPG; Powers JOSPT 2010; Na et al. 2021 meta-analysis; Ferber et al. 2011; Nakagawa et al. JOSPT 2012).
**Primary sources:** Willy RW et al., JOSPT 2019 (APTA Patellofemoral Pain CPG); Powers CM, JOSPT 2010 40(2):42-51; Nascimento et al. JOSPT 2018 meta-analysis; Na Y et al. Orthop J Sports Med 2021.
**Personalization vector:** any knee issue (meniscus, PFP, OA); especially female users, desk workers, users with weak glutes flagged.
**Prescription template:** Every knee-adapted week MUST include ≥2 posterolateral-hip exercises BEFORE or ALONGSIDE knee exercises. Default slots: hip thrust OR glute bridge (weekly), clamshell / side-lying hip abduction / side-plank with hip abduction, monster walk / lateral band walk, single-leg RDL (for glute-med in frontal plane). Early-stage PFP: lead with hip, delay deep knee flexion until valgus is controlled.

---

## Principle 4: Cap loaded knee flexion for meniscus "modify" — safe depth is partial squat to ~60-90°, with caveats

**Claim:** The meniscus experiences progressively higher shear and compressive load past ~90° of loaded flexion, especially under external load. Partial range (0-60°) closed-chain work is low-risk and loads the quads effectively. Unrestricted deep squats are appropriate only once pain-free, effusion-free full ROM and ≥80% limb symmetry are established.
**Evidence strength:** strong for post-surgical restriction (consensus), moderate for non-op modify (inferred from post-op principles + Kise protocol which capped depth early). Note Principle 5 tempers this for chronic OA.
**Primary sources:** Calanna et al. J Exp Orthop 2022 (evidence-based meniscal repair protocol); MGH, Brigham & Women's, Lahey post-op meniscus protocols; 2024 EU-US ESSKA Meniscus Rehab Consensus Part I; Moksnes JOSPT 2012 protocol.
**Personalization vector:** meniscus severity=modify or recent tear, current symptoms present (mechanical clicking, effusion, pain past 90°).
**Prescription template:** If `meniscus_status = modify`: cap squats/lunges/leg press at ~60-90° knee flexion. Substitute full-depth barbell back squat → box squat to parallel, goblet squat to bench, leg press with stop at 90°, belt squat partial. Avoid loaded deep lunges. OK: step-ups (low-medium box), TKEs, Spanish squats at 70-90°, hip thrusts, RDLs (knee stays relatively straight). Re-introduce full depth only after criteria in Principle 11.

---

## Principle 5: Deep squats are NOT inherently harmful to healthy cartilage and may be protective; the problem is load × depth mismatch

**Claim:** Biomechanical review shows retropatellar compressive force peaks at ~90° and actually drops past that due to the quad-tendon wrap and increased contact area. Knee-loading exercise in people with or at risk of OA does not damage cartilage (Bricca systematic review). Half/quarter squats with excessive load produce more maladaptive stress than full squats with appropriate load.
**Evidence strength:** moderate (biomechanical + Bricca cartilage-imaging RCTs in humans; animal dose-response data).
**Primary sources:** Bricca A et al., Br J Sports Med 2019 (cartilage imaging systematic review); Hartmann et al. Sports Med 2013 (squat depth biomechanics review); Frontiers Sports Act Living 2024 scoping review on deep squat.
**Personalization vector:** severity=chronic (stable OA, degenerative meniscus without acute symptoms), severity=ok returning from old injury.
**Prescription template:** For `chronic` without mechanical symptoms: do NOT categorically ban deep squats — moderate the LOAD instead. Default to high-rep bodyweight or goblet squat full depth before heavy partial. For `modify`: keep depth cap but avoid "fear-avoidance" messaging in UI copy. Frame as "we're protecting the tissue while it settles, not because depth is dangerous."

---

## Principle 6: Closed-chain loads the patellofemoral joint more at deep angles; open-chain loads it more near extension

**Claim:** Patellofemoral joint reaction force is lowest in closed-chain work from 0-45° and in open-chain work from 45-90°. The safe overlap band for PFP/knee-cap pain is CKC work in the 0-45° range. TKEs (CKC, last 30° of extension) are a highlight exercise because they load quads with minimal PFJ stress.
**Evidence strength:** strong (Escamilla 1998 biomechanics foundational; confirmed in multiple reviews and PFP CPG).
**Primary sources:** Escamilla RF, Med Sci Sports Exerc 1998; APTA PFP CPG 2019; Willson & Davis 2008.
**Personalization vector:** PFP, patellar tendinopathy, anterior knee pain component.
**Prescription template:** If user reports `pfp` or anterior/kneecap pain: prioritize CKC 0-45° (mini-squats, partial leg press, step-ups to low box, TKEs) AND OKC 45-90° (short-arc leg extension). De-prioritize: full-ROM leg extension machine (loads PFJ near extension), deep single-leg squats, pistol squats, forward lunges with long stride. Substitute forward lunge → reverse lunge (lower PFJ load per research).

---

## Principle 7: Reverse lunges and lateral/forward step-ups are lower-PFJ-stress alternatives to forward lunges and step-downs

**Claim:** Forward lunges generate greater patellofemoral joint reaction force, greater quad force, and higher loading rate than backward (reverse) lunges. Forward step-DOWN produces significantly greater peak patellofemoral stress than forward step-UP or lateral step-up.
**Evidence strength:** moderate (Riemann et al. JOSPT 2012; Irish et al. 2022 lunge step-height biomechanics).
**Primary sources:** Riemann BL et al., JOSPT 2011 41(6):391-398; Irish S et al., IJSPT 2022; Lunge studies by Wallace et al.
**Personalization vector:** PFP, meniscus modify, anyone with anterior knee pain.
**Prescription template:** Substitution rules: forward lunge → reverse lunge, walking lunge → split squat (static), forward step-down → lateral step-up, Bulgarian split squat with deep dip → elevated reverse lunge to 90°. In `modify` Gemini prompt: add "reverse > forward" default for lunge family.

---

## Principle 8: Spanish squats and isometric quad holds produce acute analgesia and are excellent "in-season" pain-reduction tools

**Claim:** Isometric quadriceps exercise (5×45s at 70% MVC on leg extension, or Spanish squat at 70-90° knee flexion) produces several hours of analgesia and reduces muscle inhibition in patellar tendinopathy. The Spanish squat is a knee-friendly analog because the band at the tibia moves the line of resistance backward, reducing shear at the knee while loading the quads isometrically.
**Evidence strength:** moderate (Rio et al. BJSM 2015 isometric analgesia; van Ark et al. 2016; Basas technique case series IJSPT 2023).
**Primary sources:** Rio E et al., Br J Sports Med 2015 (isometric vs isotonic); van Ark M et al., J Sci Med Sport 2016; Basas Spanish squat case series IJSPT 2023.
**Personalization vector:** patellar tendon pain, irritable PFP/anterior knee, meniscus modify with quad inhibition.
**Prescription template:** When knee is flared or quad inhibition is flagged, insert a Spanish squat (5×45s or 5×30s) or wall-sit hold (5×30-45s) at start of session as a "priming analgesic." Explicit rule: if `pain_today ≥ 4/10`, replace first knee exercise with isometric at 70-90° for 5 sets of 30-45s.

---

## Principle 9: Progression is criteria-based, not time-based, for non-operative knee rehab

**Claim:** Modern consensus (2024 ESSKA-AOSSM-AASPT) recommends criterion-based progression for meniscectomy and combined time+criterion for repairs. Key gates: full/near-full passive ROM, no effusion, neuromuscular quad control before "restorative phase"; full active ROM + ≥80% contralateral strength + dynamic single-leg control before "return to activity."
**Evidence strength:** strong (formal international consensus 2024; Rossi/Calanna evidence-based protocols).
**Primary sources:** 2024 EU-US Meniscus Rehab Consensus (ESSKA-AOSSM-AASPT) Part I & II, JOSPT Open; Calanna F et al. J Exp Orthop 2022; APTA PFP CPG 2019.
**Personalization vector:** any knee issue, especially `modify` transitioning back to full training.
**Prescription template:** App logic: treat ROM, effusion, and limb-symmetry as gates in the user profile. Questions to surface: "Any swelling this week?" "Can you fully straighten the knee?" "Single-leg squat to a box — symmetric side-to-side?" Only advance loaded depth / plyo stage when answers align.

---

## Principle 10: Hip thrusts, glute bridges, and RDLs are "knee-sparing" posterior-chain staples — load them hard

**Claim:** Hip thrust and glute bridge variants load the posterior chain with near-zero knee shear or flexion moment, allowing heavy loading even during knee-irritated phases. Gluteal strengthening specifically produces clinically meaningful pain reduction in knee OA (RCT data, 2019).
**Evidence strength:** moderate (hip-thrust biomechanics + knee OA glute-strengthening RCTs; Contreras et al. EMG work).
**Primary sources:** Contreras B et al., J Appl Biomech (barbell hip thrust EMG); Bennell KL et al., Arthritis Care Res 2019 (gluteal program in knee OA); systematic reviews on posterior chain in OA.
**Personalization vector:** any knee issue, especially when squats/lunges are capped.
**Prescription template:** When `knee_status ∈ {modify, avoid, chronic}` caps loaded squatting: compensate weekly leg-day volume with hip thrust (3-4×6-10), glute bridge (3×10-15), RDL (3×8-10, knee ~soft), cable pull-through. Tag these as "knee-sparing heavy" so user still gets a hard stimulus while irritable knee heals.

---

## Principle 11: Clear re-entry criteria for full-depth squats, loaded deep lunges, and plyometrics

**Claim:** Gating criteria for returning to (a) full ROM lifting and (b) plyometric/RTR:
- Full pain-free active knee ROM symmetric to other leg
- No effusion (grade 0 wipe test)
- ≥80% limb symmetry on isometric quad strength (handheld dynamometry or proxy)
- ≥80% on functional hop distance (single hop for distance) for plyo
- ≥90% LSI preferred for cutting/pivoting sports (not relevant for this app user)
- Successful single-leg squat to 60° with no frontal-plane collapse
**Evidence strength:** strong (APTA PFP CPG; ACL RTS literature; 2024 ESSKA meniscus consensus).
**Primary sources:** APTA PFP CPG 2019; Barber-Westin & Noyes RTS systematic reviews; 2024 Meniscus Rehab Consensus Part II.
**Personalization vector:** user previously in `modify`, wanting to re-introduce deep squats, lunges, plyo.
**Prescription template:** App surfaces progression check-in. Weekly question: "Is the knee quiet? Symmetric single-leg sit-to-stand?" At profile level: hidden flag `deep_knee_flex_cleared = false` until user self-reports passing criteria (or PT clears them). When `cleared = true`: Gemini may re-introduce full-depth squat, split squat to full depth, box jumps, jump squats.

---

## Principle 12: Plyometrics introduce a distinct load category and require their own progression — no jumping during `modify` for meniscus

**Claim:** Jumping, hopping, and pivoting load the meniscus via shear under axial impact and are explicitly contraindicated in the acute/subacute conservative management phase. Post-op meniscus repair, most protocols delay jumping to ≥4 months (simple tears) or 5-6 months (root/radial). For non-op degenerative, most Kise-style protocols omit plyo entirely in the 12-week phase.
**Evidence strength:** strong for post-op (consensus), moderate for non-op (protocol inference).
**Primary sources:** Rossi et al. / Calanna J Exp Orthop 2022; 2024 ESSKA Consensus Part I; Kise 2016 protocol description.
**Personalization vector:** meniscus modify; any knee with mechanical symptoms; PFP with jumping pain.
**Prescription template:** If `meniscus_status = modify` OR `mechanical_symptoms = true`: exclude jump squat, box jump, depth jump, jump lunge, burpee, tuck jump, plyo push-up from foot (fine, unrelated), pivoting agility drills. Substitute with: slow tempo squats (3-0-3), pause squats, heavy RDL, heavy hip thrust. Re-introduce per Principle 11 gating.

---

## Principle 13: Daily volume rule — low-load rehab daily, high-load 3×/week max

**Claim:** Low-load isometric and activation work (quad sets, glute bridges, clamshells, TKE with band, short walks) can be done daily and often accelerates recovery. Higher-load strength work (loaded squats, leg press, heavy lunges) needs 48h recovery. Doing heavy work too frequently on a rehabbing knee impairs tissue adaptation and raises flare risk.
**Evidence strength:** moderate (dose-response animal/human cartilage data — Bricca 2017; general strength training recovery literature).
**Primary sources:** Bricca A et al. 2017 (dose-response animal cartilage); OARSI 2019; clinical protocol consensus.
**Personalization vector:** all knee-issue users.
**Prescription template:** App splits knee work into two buckets. "Daily" bucket (show every day): TKE with band, quad set, SL glute bridge, clamshell, calf raise, hip flexor / TFL soft-tissue. "Heavy" bucket (cap at 3 sessions/week with ≥48h gap): loaded squat/lunge/leg press/step-up. Enforce spacing in scheduler.

---

## Principle 14: Red flags — when to stop training and see a clinician

**Claim:** Discrete red-flag presentations warrant exit from self-managed programming and referral:
- **True locking** (knee won't fully extend or flex, something physically blocks motion) — suggests displaced bucket-handle fragment
- **Sudden inability to weight-bear** after an event
- **Rapid effusion within minutes** of injury (suggests hemarthrosis, outer-third meniscus tear with vascular involvement, or ACL)
- **Giving-way that causes a fall**
- **Effusion that doesn't settle within 48-72h of backing off**
- **Night pain waking user, constant unremitting pain**
- **Fever + hot swollen knee** (septic until proven otherwise)
**Evidence strength:** strong (clinical consensus; Alberta primary-care knee pathway; orthopedic texts).
**Primary sources:** Alberta Health Services Knee Primary Care Pathway; StatPearls Knee Effusion; Medscape Meniscal Injury.
**Personalization vector:** universal.
**Prescription template:** App includes a weekly pulse check: "Any locking, giving way, sudden swelling, or new injury?" If YES to any hard red flag → program pauses, UI shows "See a clinician before continuing." This is a non-negotiable override, not a nudge.

---

## Principle 15: Rehab protocols should be WOVEN INTO daily workouts, not isolated "rehab days"

**Claim:** User-confirmed preference + adherence research: standalone rehab sessions have poor compliance compared to rehab integrated into the normal training flow. Primer/activation blocks at session start, corrective "super-sets" between primary lifts, and a deload rotation keep the knee work consistent without requiring willpower.
**Evidence strength:** emerging (behavioral adherence literature) + user-specified preference (see `feedback_protocols_integrated.md`).
**Primary sources:** Jack K et al. 2010 (adherence to home rehab); user memory note 2026-04-17.
**Personalization vector:** any knee user — structural rule for how the app composes sessions.
**Prescription template:** Gemini composition rule: do NOT emit a separate "rehab day." Instead, at start of every lower-body session, inject 2-3 rehab primers (TKE, clamshell, glute bridge). Between primary lifts on other days (push/pull/core), inject 1-2 low-load knee items as rest-fillers (quad sets during rest, clamshells, standing hip abduction). On full rest days, prompt a 10-min mobility + activation micro-session with knee items present.

---

## Quick Reference — Gemini modification rules table

| User flag | Ban | Modify | Favor |
|---|---|---|---|
| `meniscus.modify` | jump squat, box jump, depth jump, burpee, jump lunge, pivoting agility, deep loaded lunge, pistol squat, full ATG back squat | cap all squat/lunge/leg press ≤90° flexion, prefer reverse lunge over forward, use bench box for squat depth | TKE, Spanish squat, wall-sit, step-up (low box), hip thrust, glute bridge, RDL, clamshell, leg press 0-60° |
| `meniscus.chronic` (stable) | loaded deep flexion past 120° with max load, high-volume jumping | moderate load on full-depth work; emphasize daily low-load volume | full squat at moderate load, step-ups, hip thrust heavy, NEMEX-style balance work, walking, cycling |
| `pfp` (patellofemoral pain) | full-ROM loaded leg extension, deep forward lunge, step-DOWN from high box | CKC work 0-45° range; OKC work 45-90° range | hip abductor/ER work FIRST, Spanish squat isometric, TKE, glute med drills, reverse lunge, lateral step-up, hip thrust |
| `knee.oa.chronic` | high-impact jumping, repetitive deep load at max intensity | moderate load, frequent low-load days | NEMEX-style neuromuscular work, progressive strength 2×/wk at 60-80% 1RM (OARSI), aquatic/cycling, Tai Chi/yoga (Type 2 OARSI) |
| `knee.acute` (flare / effusion / locked) | ALL loaded knee work, jumping, running | — | isometric quad set, glute bridge, hip abduction lying, ankle pumps, gentle ROM; flag for clinical review per Principle 14 |

---

## Primary-source bibliography (for Gemini citation and UI evidence tags)

1. Kise NJ, Risberg MA, Stensrud S, et al. Exercise therapy versus arthroscopic partial meniscectomy for degenerative meniscal tear in middle aged patients: randomised controlled trial with two year follow-up. **BMJ** 2016;354:i3740.
2. OMEX 10-year follow-up: Arthroscopic partial meniscectomy versus exercise therapy for degenerative meniscal tears. 2024.
3. van de Graaf VA et al. ESCAPE 5-year follow-up. **JAMA Netw Open** 2022.
4. Moksnes H, Snyder-Mackler L, Risberg MA. A 12-week exercise therapy program in middle-aged patients with degenerative meniscus tears. **JOSPT** 2012;42(7):597-608.
5. Willy RW et al. Patellofemoral Pain: Clinical Practice Guidelines. **JOSPT** 2019;49(9):CPG1-CPG95 (APTA Academy of Orthopaedic Physical Therapy).
6. Powers CM. The influence of abnormal hip mechanics on knee injury: a biomechanical perspective. **JOSPT** 2010;40(2):42-51.
7. Nascimento LR et al. Hip and Knee Strengthening Is More Effective Than Knee Strengthening Alone for PFP. **JOSPT** 2018.
8. Bannuru RR et al. OARSI guidelines for the non-surgical management of knee, hip, and polyarticular osteoarthritis. **Osteoarthritis Cartilage** 2019;27(11):1578-1589.
9. Calanna F et al. Rehabilitation and return to sports after isolated meniscal repairs: a new evidence-based protocol. **J Exp Orthop** 2022;9:80.
10. 2024 EU-US Meniscus Rehabilitation Consensus (ESSKA-AOSSM-AASPT) Parts I & II. **JOSPT Open** 2025.
11. Rio E et al. Isometric exercise induces analgesia and reduces inhibition in patellar tendinopathy. **Br J Sports Med** 2015;49(19):1277-1283.
12. Escamilla RF. Biomechanics of the knee during closed kinetic chain and open kinetic chain exercises. **Med Sci Sports Exerc** 1998.
13. Riemann BL et al. Patellofemoral Joint Forces and Stress During Forward Step-up, Lateral Step-up, and Forward Step-down Exercises. **JOSPT** 2011;41(6):391-398.
14. Bricca A et al. Impact of exercise on articular cartilage in people at risk of, or with established, knee osteoarthritis: a systematic review of randomised controlled trials. **Br J Sports Med** 2019;53(15):940-947.
15. Ageberg E, Roos EM. Neuromuscular exercise as treatment of degenerative knee disease (GLA:D / NEMEX). **Exerc Sport Sci Rev** 2015.
16. Sahrmann S. Diagnosis and Treatment of Movement System Impairment Syndromes. (Knee chapter on Hip Extension with Knee Extension syndrome — gluteus maximus participation deficit.)
17. Segal NA et al. Quadriceps strength and knee function. **Arthritis Care Res** 2010.
