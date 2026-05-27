---
id: chronic-conditions-meta
type: principle
domain: special-populations
title: "Chronic conditions — the app's onboarding doesn't capture them; the LLM must say so"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, fat_loss, glutes, aesthetics, general_fitness, longevity, mobility]
  training_age: any
  sex: any
  injuries: []
tags: [chronic-conditions, medical-disclaimer, comorbidity, beta-blockers, hypertension, diabetes, cardiovascular, scope, medical-consult]
citations:
  - "American College of Sports Medicine. ACSM's Guidelines for Exercise Testing and Prescription, 11th ed. Lippincott Williams & Wilkins, 2022. Chapters on pre-participation screening + special populations."
  - "Riebe D, Franklin BA, Thompson PD, et al. Updating ACSM's recommendations for exercise preparticipation health screening. Med Sci Sports Exerc. 2015;47(11):2473-2479. PMID: 26473759."
  - "Liguori G, ACSM. ACSM's Resources for the Exercise Physiologist, 3rd ed. 2021. (Cardiovascular medications + exercise response; beta-blocker HR-blunting interaction.)"
  - "Pelliccia A, Sharma S, Gati S, et al. 2020 ESC Guidelines on sports cardiology and exercise in patients with cardiovascular disease. Eur Heart J. 2021;42(1):17-96. PMID: 32860412."
  - "Colberg SR, Sigal RJ, Yardley JE, et al. Physical activity/exercise and diabetes: a position statement of the American Diabetes Association. Diabetes Care. 2016;39(11):2065-2079. PMID: 27926890."
  - "American Heart Association. Resistance Exercise in Individuals With and Without Cardiovascular Disease: 2007 Update — A Scientific Statement from the AHA Council on Clinical Cardiology and Council on Nutrition, Physical Activity, and Metabolism. Circulation. 2007;116(5):572-584. PMID: 17638929."
related: [older-adults-fragala-2019, pregnancy-postpartum, prior-eating-disorder, the-workout-app-domain-boundary]
contradicts: []
---

# Chronic conditions — the app's onboarding doesn't capture them; the LLM must say so

## Claim

The current app onboarding captures **injuries** (per body part + severity) and **posture/lifestyle context** (free-text). It does NOT capture:

- Cardiovascular conditions (hypertension, coronary artery disease, prior MI, arrhythmias, heart failure, pacemaker/ICD status).
- Pulmonary conditions (asthma, COPD, exercise-induced bronchoconstriction).
- Metabolic conditions (Type 1 / Type 2 diabetes, thyroid disorders, metabolic syndrome).
- Autoimmune / inflammatory conditions (rheumatoid arthritis, lupus, MS, IBD).
- Pregnancy / postpartum status (see `pregnancy-postpartum`).
- Recent surgery (other than knee/back-area proxies that map to the injury matrix).
- Prescription medications (especially beta-blockers and other cardiovascular medications that alter HR/BP response to exercise, but also corticosteroids, immunosuppressants, anticoagulants, etc.).
- Neurological conditions (epilepsy, prior stroke, peripheral neuropathy, vestibular disorders).
- Bone-density status (osteopenia, osteoporosis, prior fragility fracture) beyond what may be implied by age.
- Eating-disorder history (see `prior-eating-disorder`).

**For any user with significant chronic conditions, the program this app generates is NOT medically tailored** — it is a general-adult-population resistance program with injury-matrix gating and posture-aware warmups. The LLM nuance layer must say this honestly when red flags surface, and recommend that the user work with their physician + relevant specialists (cardiologist, endocrinologist, pelvic-floor PT, sports-medicine clinician, registered dietitian) to determine what's appropriate for THEM individually.

This is not "the app is unsafe." It is "the app is general-purpose. For your specific medical situation, the people qualified to tailor exercise to you are your clinicians — pair this app with their guidance."

## Nuance

- **The ACSM 2015 pre-participation screening update (Riebe 2015)** is the consensus screening framework in the US. It distinguishes "currently active" from "currently inactive" individuals and stratifies by cardiovascular disease, metabolic disease, and renal disease — the trio that most warrants medical clearance before initiating exercise. The current app does NOT implement this screening. A defensible future addition would be a one-screen chronic-conditions checklist on onboarding, with the LLM applying clearance disclaimers when items are checked.

- **Beta-blockers specifically blunt HR response to exercise** (Liguori 2021, ACSM ExPhys resources). Any cardio prescription that anchors to HR zones (e.g., "Zone 2" or "60-70% HRmax") becomes inaccurate for a beta-blocker user. The current app does not prescribe HR-zone-anchored cardio (cardio is prescribed by goal-fit and post-strength placement, not HR target), so the immediate clinical risk is low — but if cardio prescription ever shifts to HR-based, beta-blocker users will need an alternate intensity anchor (RPE 12–14 on Borg 6–20, or talk-test).

- **Hypertension responds well to resistance training in most cases.** The AHA 2007 scientific statement on resistance exercise (and 2025 follow-up consensus work) supports resistance training as part of standard CV-risk management — with the caveat that uncontrolled hypertension (≥180/110) is a relative contraindication to high-intensity exertion until controlled. The 2020 ESC sports-cardiology guidelines (Pelliccia 2021) similarly endorse resistance training across most CV-disease subpopulations with appropriate clearance. The LLM should not discourage strength training for hypertensive users with controlled BP — but it must surface "work with your cardiologist on what intensity is appropriate" when the user flags the condition.

- **Type 2 diabetes responds well to resistance training.** Colberg 2016 ADA position statement: resistance training improves insulin sensitivity, glycemic control, and body composition in T2D. The clinical caveats are around hypoglycemia risk in users on insulin or sulfonylureas (timing exercise relative to meals + medication; glucose monitoring) — these are management details the app cannot handle without the diabetes-specific input set.

- **Type 1 diabetes is more complex.** The Colberg 2016 ADA position statement covers T1D as well, but the management around insulin dosing, glucose monitoring, and exercise-induced glycemic excursions is highly individual. The LLM should explicitly route T1D users to their endocrinologist + a CDE (certified diabetes educator) or sports-endocrinology specialist.

- **Recent surgery** is a real contraindication that the app's injury matrix only partially captures. A user with "knee surgery 6 weeks ago" maps to the knee-injury matrix; a user with "abdominal surgery 4 weeks ago," "shoulder surgery 3 weeks ago," "cesarean section 5 weeks ago" do not have clean mappings. The LLM should explicitly ask in rationale if a user mentions recent surgery, and recommend clearance.

- **Cancer in active treatment or post-treatment** has its own evidence base (Schmitz 2019 ACSM Roundtable on Exercise and Cancer); the app does not capture treatment status and the LLM should refer out to oncology-rehab services.

- **The principle is honest scope-naming, not defensive boilerplate.** Adding a one-line "consult your doctor" disclaimer to every plan is over-trigger and ignored. The intent is condition-specific: when the user's free-text reveals a specific condition the app's general programming can't responsibly accommodate, the LLM names the SPECIFIC consultation the user should seek (cardiologist for CV; endocrinologist for diabetes; pelvic-floor PT for pregnancy/postpartum; oncologist or oncology PT for cancer; etc.).

- **The app is not unsafe.** It generates resistance-training plans within the standard adult evidence base. The honest scope claim is "this is general fitness guidance, not medical care" — same as any consumer fitness product. The improvement vs. competitors is that THIS app explicitly says so when red flags surface, rather than pretending its general output is medically tailored.

## What this contradicts

- **The fitness-app marketing pattern of claiming "personalized" or "AI-tailored" when the program is actually general-population output with light gating.** This app's plan IS adapted to goals, injuries, equipment, training age, posture context, and deadlines — but it is not adapted to the user's CV health, metabolic status, medication regimen, or any chronic condition the onboarding doesn't ask about. Honesty about that boundary is a feature, not a limitation.

- **The implicit assumption that "general adult resistance training is safe for everyone."** It is safe for the vast majority of adults. The exceptions are real and clinically important. The LLM's job is to identify those exceptions when cues surface and route the user to appropriate care — not to assume the boundary doesn't exist.

## Application in this app

- **LLM nuance layer red-flag scanning.** When generating plan rationale OR responding in any conversational interaction, the LLM should scan `posture_notes`, `specific_target`, future session-notes/free-text channels for the following patterns and surface a brief, condition-specific consult-your-doctor disclaimer:

  | Red-flag pattern in user free-text | Disclaimer the LLM should surface |
  |---|---|
  | "high blood pressure", "hypertension", "heart attack", "MI", "stent", "angina", "AFib", "arrhythmia", "pacemaker", "heart failure", "cardio condition" | "I noticed you mentioned a cardiovascular condition. This program is general adult strength training — please work with your cardiologist to confirm what intensity range and modality is appropriate for you specifically. The general principles still apply, but the safe ceiling is something only your clinician can set." |
  | "diabetes", "T1D", "T2D", "insulin", "blood sugar" | "I noticed you mentioned diabetes. Resistance training has well-documented benefits for glycemic control (Colberg 2016 ADA position), but the timing of exercise relative to meals and medication is something your endocrinologist or diabetes educator should help you plan — especially if you're on insulin or sulfonylureas." |
  | "beta blocker", "atenolol", "metoprolol", "propranolol", "carvedilol", "bisoprolol", "nadolol" | "I noticed you're on a beta-blocker. Your heart-rate response to exercise will be blunted — if you ever use HR zones as an intensity anchor, the numbers won't reflect your actual effort. Talk-test or RPE is the more accurate gauge for you. Please work with the prescribing clinician on what exertion is appropriate." |
  | "rheumatoid", "lupus", "MS", "Crohn", "ulcerative colitis", "autoimmune", "fibromyalgia", "chronic fatigue" | "I noticed you mentioned an autoimmune / chronic-fatigue condition. These have specific exercise-response patterns this program doesn't account for. Please work with your specialist (rheumatologist, gastroenterologist, or condition-specific clinician) on intensity and recovery — the general program here is a starting point, not a tailored prescription." |
  | "recent surgery", "post-op", "post-surgery" (without a clear body-part match in the injury matrix) | "I noticed you mentioned recent surgery. The injury matrix in this app covers knee, back, shoulder, hip flexor, ankle, and trap-related issues — but for any surgery outside those, please get clearance from the operating surgeon or your sports-medicine clinician before resuming the prescribed load." |
  | "cancer", "chemo", "radiation", "oncology", "tumor" | "I noticed you mentioned cancer or cancer treatment. There's a well-established exercise-oncology evidence base (Schmitz 2019 ACSM Roundtable) supporting strength training during and after treatment — but the right modality and dosing is highly individual. Please work with an oncology PT or a clinician familiar with exercise during cancer care." |
  | "pregnant", "postpartum", "expecting", "trimester", "post-baby", "breastfeeding", "pelvic floor", "diastasis" | See `pregnancy-postpartum` for the full handling. Surface the pregnancy-specific disclaimer. |
  | "eating disorder", "ED history", "anorexia", "bulimia", "binge eating", "in recovery" | See `prior-eating-disorder` for the full handling. Soften body-comp framing and surface the ED-specific disclaimer. |

- **Persistence:** condition disclaimers should surface ONCE per mesocycle when the cue is present, not on every session rationale. Repeated disclaimers become wallpaper.

- **The disclaimers are condition-specific, not generic.** The LLM should name the SPECIFIC clinician type (cardiologist, endocrinologist, pelvic-floor PT, etc.) rather than a generic "see your doctor." Specificity respects the user's intelligence and gives them a useful next step.

- **The training plan itself does NOT change in response to most chronic conditions** (because the app doesn't have the input set to change it responsibly). The change is the disclaimer + the gentle steer toward clinical care. The user keeps the same plan; the rationale acknowledges the boundary.

## Onboarding affordance gaps to consider (recommended additions)

These are FUTURE additions, flagged here as the LLM's honest perspective on what would make the app safer + more useful for special populations. NOT changes to commit now:

1. **Pregnancy / postpartum status** — a single optional field on the body-info step (`StepBodyInfo`). Maps to `pregnancy-postpartum`.

2. **Chronic-conditions multi-select** — a single optional onboarding step with the most-clinically-relevant flags (cardiovascular condition, diabetes, autoimmune, recent surgery, current pregnancy, on prescription medications affecting exercise tolerance). Skippable. Each flag triggers a condition-specific disclaimer pattern via the LLM nuance layer.

3. **Recent-injury free-text field** — currently the injury matrix maps to specific body parts. Adding a "anything else about your body / health right now?" free-text field that the LLM scans for red flags would catch surgeries, conditions, and pregnancies that don't fit the injury matrix.

4. **Eating-disorder sensitivity toggle** — an optional onboarding toggle (recommended to be soft / hidden behind "more options") that suppresses body-comp framing across the app. See `prior-eating-disorder`.

5. **Medication-list free-text** — for beta-blocker and similar medications that alter exercise physiology. Beta-blocker users specifically need the HR-blunting disclaimer.

The current state — no chronic-conditions capture at all — is conservative and defensible AS LONG AS the LLM nuance layer surfaces honest condition-specific disclaimers when free-text cues appear. The recommendations above would let the engine apply those disclaimers proactively rather than reactively.
