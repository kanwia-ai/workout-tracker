---
id: pregnancy-postpartum
type: pattern
domain: special-populations
title: "Pregnancy and postpartum — out of scope for this app"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, fat_loss, glutes, aesthetics, general_fitness, longevity, mobility]
  training_age: any
  sex: female
  injuries: []
tags: [pregnancy, postpartum, prenatal, perinatal, pelvic-floor, diastasis-recti, out-of-scope, medical-consult]
citations:
  - "ACOG Committee Opinion No. 804: Physical Activity and Exercise During Pregnancy and the Postpartum Period. Obstet Gynecol. 2020;135(4):e178-e188. PMID: 32217980. (Reaffirmed 2024; superseded earlier Committee Opinion 650, 2015.)"
  - "Mottola MF, Davenport MH, Ruchat SM, et al. 2019 Canadian guideline for physical activity throughout pregnancy. Br J Sports Med. 2018;52(21):1339-1346. PMID: 30337460."
  - "ACSM's Guidelines for Exercise Testing and Prescription, 11th ed. (2022). Chapter on Pregnancy and Postpartum Exercise."
  - "Bø K, Artal R, Barakat R, et al. Exercise and pregnancy in recreational and elite athletes: 2016/17 evidence summary from the IOC expert group meeting. Br J Sports Med. 2016;50(10):571-589. PMID: 27127296."
related: [women-training-fundamentals, chronic-conditions-meta]
contradicts: []
---

# Pregnancy and postpartum — out of scope for this app

## Claim

**Pregnancy and the postpartum period are explicitly out of scope for this app's coaching.** The current onboarding does not capture pregnancy status, gestational age, trimester, postpartum stage, pelvic-floor history, diastasis recti status, or relevant complications (placenta previa, preterm contractions, hypertensive disorders, gestational diabetes, etc.). Without that input, the LLM cannot responsibly tailor a program to this population — and it should not pretend otherwise.

This entry is deliberately NOT a research summary. The point is the **boundary**, not the science. If a user is pregnant or postpartum:

1. **Refer them to qualified clinical support.** A pelvic-floor physical therapist + their OB/midwife are the appropriate first-line providers. The ACOG Committee Opinion 804 and the 2019 Canadian Guideline (Mottola 2018) are the consensus references those professionals work from; the IOC expert group (Bø 2016) covers elite athletes. The user benefits from human clinicians who can assess them individually — the app cannot.

2. **Surface a clear disclaimer.** When the LLM nuance layer detects pregnancy-related context (free-text in `posture_notes`, `specific_target` mentioning "post-baby," explicit user statement), it should explicitly say: *"Pregnancy and postpartum training have specific guidelines this app doesn't currently support. The program here is built for the general adult population; for pregnancy- or postpartum-specific coaching, please work with a pelvic-floor physical therapist and your OB or midwife — they can tailor exercise selection, intensity, and progression to your trimester, complications, and recovery."*

3. **Do not improvise pregnancy-tailored programming.** Specifically, the LLM should NOT:
   - Auto-modify exercises based on pregnancy assumptions (e.g., guessing trimester).
   - Prescribe pelvic-floor or "core after baby" work without a pelvic-floor PT clearance.
   - Claim the program is "pregnancy-safe" — that's a clinical judgment, not a programming judgment.
   - Continue with a heavy-load progression for a user who has flagged pregnancy without surfacing the consult-your-doctor disclaimer.

4. **Don't enforce a stop, either.** This is not a gate to exit the app — many pregnant and postpartum women safely strength-train through and after pregnancy with appropriate clinical support. The app simply doesn't have the inputs needed to BE that clinical support. The right response is "we'll keep building you a general adult program; please pair it with your clinician's specific advice on what to modify."

## Nuance

- **The research IS strong that strength training during pregnancy is generally safe and beneficial for uncomplicated pregnancies** (ACOG 804; Mottola 2018; Bø 2016 IOC summary). This is not a "don't exercise" entry — it's a "the app's onboarding doesn't capture the inputs needed to coach you specifically" entry.

- **Postpartum return-to-training has real considerations** the app does not currently address: pelvic-floor reconditioning, diastasis recti screening, the 6-week clinical clearance window for vaginal birth and 8–12 week window for cesarean birth, breastfeeding nutrition + hydration demands, sleep deprivation effects on recovery and RIR accuracy, etc. A pelvic-floor PT can assess these; the app cannot.

- **Common pregnancy modifications the LLM should NOT improvise without clinical input** (these are listed so the LLM knows what it's NOT qualified to prescribe, not as a how-to):
  - Avoiding supine work after the first trimester (vena cava compression risk).
  - Modifying load and ROM on hinge patterns as the bump grows.
  - Substituting standing core work for crunch/sit-up patterns.
  - Reducing peak intracranial pressure events (Valsalva) in later trimesters.
  - Postpartum return: starting at substantially reduced load with explicit pelvic-floor reconditioning before resuming heavy bilateral lifts.

  These are real, evidence-based modifications — but they require trimester data, complication screening, and individual pelvic-floor assessment. The app has none of those.

- **This entry is not clinical advice.** It is a domain-boundary entry that tells the LLM to refer out, not what to refer for. The cited references exist for maintainers who want to extend the app into this domain in the future.

## What this contradicts

- The casual practice of generic fitness apps issuing pregnancy-modified programs without clinical input. The variance in pregnancy (week-by-week, complication-by-complication) makes generic prescription unsafe and inappropriate.

- "If we just add a pregnancy toggle, we can coach this population." False — the toggle is one of many inputs needed (trimester, prior pregnancies, complications, pelvic-floor history, birth route, postpartum week). A single boolean does not unlock the programming difference responsibly.

## Application in this app

- **The app currently does NOT have a pregnancy status field.** This is consistent with the app's scope. The trade-off is intentional: rather than ship a half-built "pregnancy mode," the app explicitly declines this domain and routes users to clinical care.

- **LLM nuance layer behavior when pregnancy context surfaces:**
  - **Trigger conditions:** `posture_notes` contains "pregnant," "expecting," "trimester," "postpartum," "post-baby," "after birth," "breastfeeding," "pelvic floor," "diastasis," "c-section," "cesarean"; OR `specific_target` mentions these patterns; OR the user volunteers this in any future session-notes/check-in free-text channel.
  - **Response:** surface the disclaimer at the top of the next plan rationale (verbatim or paraphrased): *"Pregnancy and postpartum training have specific guidelines this app doesn't currently support. The program here is built for the general adult population; for pregnancy- or postpartum-specific coaching, please work with a pelvic-floor physical therapist and your OB or midwife."* Continue to build a general adult program; do NOT auto-modify based on pregnancy assumptions.
  - **Persistence:** the disclaimer should surface once per mesocycle if the trigger condition remains in the profile, not every session.

- **Future onboarding affordance (not yet built):** if the app eventually adds pregnancy support, the minimum input set would include: pregnancy status (yes/no), trimester (1/2/3), complication flags (high BP, gestational diabetes, placenta previa, preterm labor, twin pregnancy, etc.), pelvic-floor PT clearance status, prior pregnancy count. Until that input set is captured AND the engine + prompt have been extended for it, pregnancy remains out of scope.

- **For postpartum users (any time after birth) returning to training without pregnancy-specific complications:** the standard returning-after-layoff logic applies (see `returning-after-layoff`), but the LLM disclaimer should still surface a pelvic-floor PT referral. The skip-recalibration ladder handles the load ramp; the pelvic-floor reconditioning is what the app can't substitute for.

- **Cross-reference:** the broader "this app is not your doctor" framing lives in `chronic-conditions-meta`. Pregnancy and postpartum are the most clear-cut "consult a clinician" case in the special-populations domain.
