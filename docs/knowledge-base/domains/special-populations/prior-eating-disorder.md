---
id: prior-eating-disorder
type: pattern
domain: special-populations
title: "History of disordered eating — body-comp framing can be harmful; let users hide it"
confidence: medium
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, fat_loss, glutes, aesthetics, general_fitness, longevity, mobility]
  training_age: any
  sex: any
  injuries: []
tags: [eating-disorder, disordered-eating, mental-health, body-composition, weight-tracking, UX, sensitivity, tone]
citations:
  - "Bratland-Sanda S, Sundgot-Borgen J. Eating disorders in athletes: overview of prevalence, risk factors and recommendations for prevention and treatment. Eur J Sport Sci. 2013;13(5):499-508. PMID: 24050467."
  - "Mountjoy M, Sundgot-Borgen JK, Burke LM, et al. IOC consensus statement on Relative Energy Deficiency in Sport (RED-S): 2018 update. Br J Sports Med. 2018;52(11):687-697. PMID: 29773536."
  - "Schaefer LM, Smith KE, Anderson LM, et al. The role of affect in the maintenance of binge-eating disorder: evidence from an ecological momentary assessment study. J Abnorm Psychol. 2020;129(4):387-396. PMID: 32202817. (Cited for context on affective triggers of disordered eating; cardio + body-comp content + weight-tracking are documented triggers in the broader literature.)"
  - "Levinson CA, Brosof LC, Vanzhula I, Christian C, Jones P, Rodebaugh TL, Langer JK, Lim MH, Fernandez KC, Rodriguez JG, Smith TE, Crosby RD, Wonderlich SA, Crow SJ, Peterson CB. Social anxiety and eating disorder comorbidity and underlying vulnerabilities: using network analysis to conceptualize comorbidity. Int J Eat Disord. 2018;51(7):693-709. PMID: 29906330."
  - "American Psychiatric Association. Practice Guideline for the Treatment of Patients With Eating Disorders, 4th ed. 2023. (Cited for the clinical principle that weight-tracking, calorie content, and body-image-focused framing can be triggering for recovering patients.)"
related: [the-workout-app-domain-boundary, calorie-tracking-realism, fat-loss-fundamentals, chronic-conditions-meta, women-training-fundamentals]
contradicts: []
---

# History of disordered eating — body-comp framing can be harmful; let users hide it

## Claim

Some users come to a fitness app with a history of disordered eating (anorexia nervosa, bulimia nervosa, binge-eating disorder, orthorexia, OSFED, or sub-clinical disordered patterns that never met full diagnostic criteria). For these users, **the body-composition affordances of a fitness app — fat-loss goal selection, deficit guidance, weight tracking, body-image-focused rationale — can be psychologically harmful and behaviorally counterproductive**. The user is showing up to train, not to be re-exposed to triggers from their recovery.

This entry is a **UX and tone consideration**, not a programming difference. The training itself — sets, reps, load, RIR, exercise selection — does not change based on eating-disorder history. What changes is what the app SURFACES to the user:

1. **Body-composition affordances should be skippable / hideable.** The fat-loss goal, deficit guidance, "lose X lbs by Y" deadline framing, weight-tracking inputs, body-image-focused rationale — any user should be able to turn these off without losing access to the core training functionality. The app does not currently have weight tracking (verified: there is no `BodyWeight` table or weigh-in feature), so the immediate scope is the goal selection + deadline framing + LLM rationale tone.

2. **The LLM nuance layer should NOT lead with body-comp framing.** Default plan rationale should anchor on strength, capability, energy, function, and consistency — not on weight, leanness, or visual changes. When body-comp framing is appropriate (the user explicitly selected `fat_loss` as a primary goal and did NOT flag eating-disorder sensitivity), it can be surfaced — but the absence of such framing should never be a void in the rationale. Capability-anchored framing works for every user.

3. **Honest tone over motivational tone.** Fitness marketing leans on "you're not enough yet — buy the transformation." For users with disordered-eating history, that's pre-built trigger material. The app's existing tone is already largely capability-anchored (per the trainer philosophy in `docs/research/02-coaching-philosophy.md`) — keep it that way. Avoid copy that compares the user's current body to an aspirational body; avoid "lose 1 dress size" framing as a celebrated success metric.

4. **No surveillance.** The app does not currently track food intake, body weight, or body measurements (verified by code review of `src/types/profile.ts` and `src/components`). This is consistent with `the-workout-app-domain-boundary` — the app's domain is the training plan, not the kitchen. **Maintain this boundary.** A future product decision to add weight tracking would need an explicit "hide / skip" affordance, and the rationale for adding it would need to weigh the body-comp-tracking benefits against the harm to users in eating-disorder recovery.

5. **Refer to clinical care, do not improvise.** Eating disorders are mental-health conditions with high mortality and complex treatment needs. The app is not — and cannot be — a substitute for clinical care from a registered dietitian, therapist, or eating-disorder specialist. If the user volunteers eating-disorder context, the LLM should acknowledge it, soften body-comp framing, and gently note that working with a clinician is the right primary support — without making the user feel pathologized.

## Nuance

- **Prevalence is non-trivial.** Bratland-Sanda & Sundgot-Borgen 2013 cite eating-disorder prevalence in athletic populations meaningfully higher than in the general population, particularly in sports with body-composition focus. Users coming to a fitness app are a self-selected population in which this prevalence is plausibly elevated. The app should assume some non-zero fraction of users are in recovery or sub-clinical disordered patterns.

- **RED-S (Relative Energy Deficiency in Sport) is the clinical syndrome that connects under-fueling to performance and health consequences.** Mountjoy 2018 IOC consensus update: chronic energy deficiency — whether from disordered eating, intentional aggressive cutting, or simple under-fueling — causes hormonal disruption, bone-density loss, increased injury rate, and impaired training adaptations. This is the mechanism by which "small deficit, every day, for months" becomes counterproductive even for users without diagnosable EDs. The training contraindication is the same: under-fueling impairs the program's effectiveness AND the user's health.

- **The "small deficit, sustained" prescription common in fitness content is double-edged.** For most users in caloric surplus or maintenance, a small deficit produces fat loss. For users with disordered tendencies, the small-deficit framing reinforces restriction patterns that can spiral. The app's `fat_loss` goal currently triggers diet-pairing language (per `the-workout-app-domain-boundary` and `deadline-aware-programming`) but does NOT prescribe specific calorie targets — this is correctly cautious. Keep it that way.

- **Aesthetic preference fields are a yellow flag.** A user selecting `aesthetic_preference: build_muscle` is body-comp-aware; that's not pathology. The signal of concern is more in the combination: aggressive deadline + fat-loss goal + body-image-focused free-text in `specific_target` ("lose 20 lbs by my wedding," "fit in size 4"). The LLM nuance layer should already (per the deadline-aware overlay in `generatePlan.ts:308-313`) deflect promises about dress-size outcomes and route to capability framing. This entry reinforces that the deflection should be the DEFAULT for body-comp targets, not the exception.

- **This entry is NOT a diagnosis tool.** The app cannot diagnose disordered eating and should not try. The pattern is: provide hideable body-comp affordances, lead with capability framing by default, and route to clinical care when relevant cues surface.

- **Cross-population sensitivity.** Athletes, dancers, gymnasts, runners, wrestlers, and figure/physique competitors have elevated risk profiles. Users with prior history of restrictive dieting, weight cycling, or rapid pre-event weight cuts are also at elevated risk. The app does not capture this history; the LLM should respond to cues if surfaced (free-text `specific_target`, `posture_notes`, future session-notes channels).

## What this contradicts

- **The standard fitness-app pattern of leading with body-transformation content** (before-and-afters, "lose 30 lbs in 30 days," weight-tracking dashboards as the primary UI). This is the pattern most likely to trigger or sustain disordered eating. The app deliberately does not adopt this pattern, and entries like `the-workout-app-domain-boundary`, `realistic-fat-loss-rate`, and `calorie-tracking-realism` already push against it.

- **"Just eat in a small deficit, every day, for months."** For most users, this works. For users in eating-disorder recovery, this is a trigger pattern. The app does not prescribe specific calorie targets, which is correctly cautious. The LLM should not improvise specific calorie advice either.

- **"Cardio for fat loss" framing as a moral good.** Cardio has training value and metabolic value; it is not a virtue. For users in recovery, framing cardio as the "burn the food off" mechanism is psychologically harmful. The existing `cardio-for-fat-loss` entry frames cardio as a workout-side lever, not a virtue — keep it that way.

## Application in this app

- **Default LLM rationale tone:** capability-anchored, not body-comp-anchored. The phrase pattern is "this session builds your [pattern / strength / capacity]" rather than "this session will get you closer to [body-image goal]." This is already largely the case in the existing prompt; reinforce.

- **Body-composition affordance review:** confirm and maintain that the following are hideable / skippable / soft:
  - `fat_loss` as a primary goal — user can pick `lean_and_strong`, `get_stronger`, or `build_muscle` instead and not be forced into deficit framing.
  - Deadline framing for body-comp targets (`specific_target` containing "lose X lbs," "dress size," etc.) — the LLM is already directed to deflect to diet-pairing and capability framing (per `generatePlan.ts:311-313`).
  - The app does NOT currently track body weight. If/when this is added, it MUST be opt-in with an explicit hide option.

- **LLM nuance layer behavior when eating-disorder context surfaces:**
  - **Trigger conditions:** `posture_notes` or `specific_target` contains "eating disorder," "ED history," "anorexia," "bulimia," "binge eating," "recovery," "disordered eating," "restriction history," "RED-S," "in recovery from," "history of food issues," or similar.
  - **Response:** soften all body-comp framing in plan rationale; lead with capability and consistency. Surface a brief, non-pathologizing note: *"I noticed you mentioned a history with food / disordered eating. This program is built around training capability, not body-composition outcomes. If you'd like to work with someone on the food side specifically, a registered dietitian — especially one with eating-disorder experience — is the right kind of support. The training program here stands on its own and doesn't depend on you tracking food or weight."*
  - **Persistence:** surface this note once per mesocycle, then drop it. Don't re-pathologize on every session.

- **Onboarding affordance gap:** the app does not currently have a "sensitive to body-comp content" toggle or an eating-disorder-history flag. A defensible future addition would be a soft optional toggle in onboarding ("hide body-composition content and weight-related framing") that suppresses fat-loss goal-related rationale, dress-size-style deadline framing, and any future weight-tracking UI. This is a UX decision, not a clinical one.

- **Cross-references:** `the-workout-app-domain-boundary` for the broader scope rationale; `calorie-tracking-realism` for why the app doesn't track food; `realistic-fat-loss-rate` for the honest framing around rate-of-change expectations; `chronic-conditions-meta` for the broader "this is general guidance, not clinical care" disclaimer pattern.
