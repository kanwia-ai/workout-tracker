---
id: protein-requirements-for-muscle-preservation
type: principle
domain: body-composition
title: "Protein 1.6-2.2 g/kg/day preserves muscle during a deficit"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [fat_loss, lean_and_strong, build_muscle, athletic, get_stronger]
  training_age: any
  sex: any
  injuries: []
tags: [protein, muscle-preservation, deficit, nutrition, recomp]
citations:
  - "Helms ER, Aragon AA, Fitschen PJ. Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation. J Int Soc Sports Nutr 2014; 11:20. PMID 24864135. DOI 10.1186/1550-2783-11-20"
  - "Murphy CH, Hector AJ, Phillips SM. Considerations for protein intake in managing weight loss in athletes. Eur J Sport Sci 2015; 15(1):21-28. DOI 10.1080/17461391.2014.936325"
  - "Phillips SM, Van Loon LJC. Dietary protein for athletes: from requirements to optimum adaptation. J Sports Sci 2011; 29(S1):S29-S38. DOI 10.1080/02640414.2011.619204"
  - "Helms ER, Zinn C, Rowlands DS, Brown SR. A systematic review of dietary protein during caloric restriction in resistance trained lean athletes: a case for higher intakes. Int J Sport Nutr Exerc Metab 2014; 24(2):127-38. PMID 24092765."
related: [fat-loss-fundamentals, recomp-possibility, realistic-fat-loss-rate, deadline-aware-programming, the-workout-app-domain-boundary]
contradicts: []
---

# Protein 1.6-2.2 g/kg/day preserves muscle during a deficit

## Claim
During a sustained calorie deficit, dietary protein in the range of approximately 1.6-2.2 g/kg total bodyweight per day (or roughly 2.3-3.1 g/kg of lean body mass), paired with resistance training, robustly preserves fat-free mass and limits muscle-loss accompanying weight loss. This range is supported by:
- Helms, Aragon & Fitschen 2014 (JISSN) bodybuilding contest-prep review: 2.3-3.1 g/kg LBM during deficit.
- Murphy, Hector & Phillips 2015 (EJSS) weight-loss-in-athletes review: 1.8-2.7 g/kg/day (or 2.3-3.1 g/kg FFM) plus moderate deficit (~−500 kcal) plus resistance training.
- Helms et al. 2014 (IJSNEM) systematic review of protein in lean athletes under restriction: argues for higher-than-general-population intakes during cuts.
- Phillips & Van Loon 2011 (J Sports Sci): 1.8-2.0 g/kg/day during energy restriction is advantageous for preventing lean-mass loss.

The deeper the deficit and the leaner the user, the more protein matters. Resistance training is required for protein to work this way — without a training stimulus, protein alone does not preserve muscle effectively in a deficit.

## Nuance
- 1.6 g/kg is the consensus floor for muscle preservation during a deficit; intakes above ~2.2-2.4 g/kg show diminishing returns for most users (Helms 2014 IJSNEM).
- Distribution matters less than total but isn't trivial: 3-5 protein-containing meals per day, each ~0.3-0.4 g/kg, is the standard distribution Helms recommends.
- For very lean populations (sub-15% bf men, sub-22% bf women) doing aggressive cuts, the top of the range (closer to 3.1 g/kg LBM) is more justified.
- For overweight users (high body fat), basing protein on total bodyweight overshoots; using a target weight or lean mass is more accurate. Practical default: 1.6 g/kg of TARGET bodyweight is a reasonable approximation when LBM is unknown.
- These numbers are for adults doing resistance training. They are not requirements for sedentary people or general health.
- High protein intake is safe for healthy kidneys (no evidence of harm); users with diagnosed renal disease should not self-prescribe high intakes.

## What this contradicts
- "0.8 g/kg is enough" — that is the RDA, set for nitrogen balance in sedentary adults, not for athletes in a deficit.
- "Too much protein gets stored as fat" — true in extreme excess, but irrelevant within the 1.6-2.2 range during a deficit; protein has the highest thermic effect and the highest satiety per calorie.
- "Protein timing matters more than total" — total daily intake is the dominant variable; timing is a smaller modulator.

## Application in this app
- The app does NOT track macros. It can, however, surface protein guidance as part of fat-loss / recomp / get_stronger plan rationale, citing this entry.
- For `primary_goal = fat_loss` AND/OR a deadline within 8 weeks, the LLM rationale layer is authorized to say: "during a deficit, aim for ~1.6-2.2 g/kg/day of protein paired with this lifting volume — that's what protects the muscle you've built."
- The engine should NOT condition workout prescription on protein intake (it doesn't know). It SHOULD include this guidance in the "things you control" section of the fat-loss rationale.
- Cross-reference `recomp-possibility` (high protein is necessary for simultaneous gain+loss) and `realistic-fat-loss-rate` (without protein, an aggressive deficit loses more muscle).
