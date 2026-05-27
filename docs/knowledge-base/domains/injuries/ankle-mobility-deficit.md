---
id: ankle-mobility-deficit
type: pattern
domain: injuries
title: "Ankle dorsiflexion deficit"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, get_stronger, lean_and_strong, fat_loss, mobility, athletic, general_fitness, glutes, aesthetics, strength, longevity, rehab]
  training_age: any
  sex: any
  injuries: [ankle]
tags: [ankle, dorsiflexion, soleus, knee-to-wall, heel-elevated-squat, mobility, knee-valgus, root-cause]
citations:
  - "Macrum E, Bell DR, Boling M, Lewek M, Padua D. Effect of limiting ankle-dorsiflexion range of motion on lower extremity kinematics and muscle-activation patterns during a squat. J Sport Rehabil 2012; 21(2):144-150. (DF restriction → increased knee valgus, reduced quad activation, increased forward trunk lean.)"
  - "Hemmerich A, Brown H, Smith S, Marthandam SS, Wyss UP. Hip, knee, and ankle kinematics of high range of motion activities of daily living. J Orthop Res 2006; 24(4):770-781. (Quantifies the DF ROM needed for deep squat — ~34° DF for full bodyweight squat to ground.)"
  - "Hoch MC, Staton LC, McKeon PO. Dorsiflexion range of motion significantly influences dynamic balance. J Sci Med Sport 2011; 14(1):90-92."
  - "Kim KM, Hart JM, Saliba SA, Hertel J. Effects of focal ankle joint mobilization on limits of stability and postural control. Int J Sports Phys Ther 2015; 10(6):788-797."
  - "Bennell K, Talbot R, Wajswelner H, Techovanich W, Kelly D, Hall AJ. Intra-rater and inter-rater reliability of a weight-bearing lunge measure of ankle dorsiflexion. Aust J Physiother 1998; 44(3):175-180. (Knee-to-wall test reliability + norms — typical cutoff ≥10–12 cm bilateral for full-depth squat tolerance.)"
  - "Konor MM, Morton S, Eckerson JM, Grindstaff TL. Reliability of three measures of ankle dorsiflexion range of motion. Int J Sports Phys Ther 2012; 7(3):279-287."
related: [knee-meniscus-chronic, knee-meniscus-acute, lower-back-chronic]
contradicts: []
---

# Ankle dorsiflexion deficit

## Claim

Limited ankle dorsiflexion (DF) is **the single most common mobility restriction affecting squat mechanics** in the desk-worker and sedentary-adult lifting population. Hemmerich 2006 quantified that full bodyweight squat to ground requires ~34° DF; restricted DF below ~25–30° forces compensatory patterns: forward knee translation, heel lift, frontal-plane knee collapse (valgus), or trunk-forward / lumbar-flexion compensation.

**Why this matters:**

- Macrum 2012 showed that experimentally limiting DF ROM during squats increased knee valgus, reduced quad activation, and increased forward trunk lean. The same biomechanical consequences appear in users with chronic DF restriction.
- DF restriction is a **shared upstream driver** for two other patterns tracked in this app: knee-meniscus issues (forced valgus) and lower-back issues (lumbar compensation for missing ankle ROM).
- The soleus is the bigger contributor to closed-chain DF (knee bent) than the gastrocnemius. Soleus-biased mobility (bent-knee calf stretch) typically yields more squat-applicable ROM than straight-knee calf stretching alone.

**The rehab integration:**

- **Mobility:** half-kneel ankle mobilization with dowel (knee-to-wall), banded posterior glide of the talus, soleus stretch (bent-knee) — daily on lower-body days.
- **Compensation:** heel-elevated squat (5–10mm wedge or weightlifting shoes) bridges the gap while DF improves. Goblet squat pry pre-squat day for end-range loading. Cyclic loading restores tissue tolerance faster than static stretching.
- **Strengthening at end-range:** loaded calf raises with full ROM, tibialis anterior raises (for the anterior compartment), single-leg balance work at end range.
- **Knee-to-wall test as gating criterion:** ≥10–12 cm (toes-to-wall, knee touching wall with heel down) bilateral is typical cutoff for full-depth back squat without compensation (Bennell 1998 norms).

## Nuance

- **Mobility = strength at range, not just passive ROM.** Static calf stretches alone produce short-lived ROM gains. End-range loaded work (deep goblet squat holds, full-ROM calf raises, knee-to-wall drills) produce more durable change.
- **Heel-elevated squats are not a "regression."** They are a legitimate tool used by world-class lifters; weightlifting shoes serve the same function. Frame them as a tool, not a failure.
- **Some DF restriction is bony, not soft-tissue.** A small fraction of users have anterior talar impingement / bone spur / old fracture that limits DF and won't respond to mobility work alone. If 4–6 weeks of consistent mobility produces no measurable change AND restriction is significant — refer for evaluation.
- **DF restriction is a downstream cause of MANY other symptoms.** A user with knee pain, lower-back pain, hip pain — and limited DF — often has the DF restriction as upstream driver. Screen DF early.
- **Acute ankle sprain ≠ chronic DF restriction.** This entry covers chronic restriction. For acute lateral ankle sprain — phased rehab is similar to other acute injuries: phase down, isolate adjacent musculature, return to full loading gradually. Refer to acute lateral ankle sprain literature (CAI rehab) — not covered in this protocol.

## What this contradicts

- **"Just stretch your calves more."** Static stretching alone produces minimal durable DF change; loaded end-range work (knee-to-wall drilling, deep goblet squat) produces more reliable improvement.
- **"Heel-elevated squats are cheating."** They are a tool. They let the user train the squat pattern while DF mobility catches up.
- **"You need to fix your ankle before squatting."** False — heel-elevated squat is the workaround that lets training continue while mobility improves. Avoidance entrenches the restriction.

## Application in this app

**Protocol file:** `src/data/rehab-protocols/ankle.ts` — `chronic` block (only severity defined for chronic restriction; lateral sprain has separate acute considerations not covered).

**Engine behavior when `injuries: [{ part: 'ankle', severity: 'modify' | 'chronic' }]`:**

1. **Mandatory inclusions on lower-body / squat days (master synthesis R3 P5 + R6 P13):**
   - Half-kneel ankle DF mob with dowel — pre-squat warmup.
   - Knee-to-wall mobility drill (2 × 10/side).
   - Banded posterior glide or goblet-squat pry hold pre-squat.
   - Soleus stretch (bent-knee, 60s/side) in cooldown or rehab-mobility session.
2. **Substitutions (modify, don't omit):**
   - Full-depth barbell back squat → heel-elevated back squat (5–10mm wedge, weightlifting shoes, or plates under heels) until knee-to-wall ≥10–12cm bilateral.
   - Full-depth front squat → front squat to box (box at user's pain-free depth).
3. **No hard ban on squat / lunge / front squat** — they stay in with modifications. Protocol's `do_not_ban` is explicit.
4. **Cross-link to knee + back patterns:** if user has BOTH ankle deficit AND knee or lower-back flag, ankle work is upstream priority — surface in the warmup before knee-specific or back-specific work.
5. **Knee-to-wall measurement** as a progression gate — surface in onboarding ("how close can your knee get to the wall, heel-down?") and re-test monthly. Move from heel-elevated to flat squat when bilateral ≥10–12cm.
6. **Body-part-to-muscle resolver** maps `ankle` to `[quads, hamstrings, glutes, calves]` — correct (any standing/loaded leg work).
7. **LLM nuance layer must NOT** say: "you need surgery," "ankle restriction will go away on its own," "just stretch more." It SHOULD say: "your ankle mobility is the upstream piece — when it improves, your squat depth and your knees track better automatically. We're using heel-elevated squats while we drill the knee-to-wall position daily. This is a 4–8 week reshape, not a one-session fix."
