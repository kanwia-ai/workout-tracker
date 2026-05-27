---
id: elbow-tendinopathy
type: pattern
domain: injuries
title: "Elbow tendinopathy (tennis / golfer's elbow)"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, get_stronger, lean_and_strong, fat_loss, mobility, athletic, general_fitness, glutes, aesthetics, strength, longevity, rehab]
  training_age: any
  sex: any
  injuries: [elbow]
tags: [elbow, epicondylitis, tendinopathy, eccentric, tyler-twist, flexbar, isometric, progressive-loading]
citations:
  - "Tyler TF, Thomas GC, Nicholas SJ, McHugh MP. Addition of isolated wrist extensor eccentric exercise to standard treatment for chronic lateral epicondylosis: a prospective randomized trial. J Shoulder Elbow Surg 2010; 19(6):917-922. PMID: 20579907. (Flexbar eccentric Tyler twist protocol — 81% improvement in symptoms at 7 weeks vs 33% in standard care control.)"
  - "Cullinane FL, Boocock MG, Trevelyan FC. Is eccentric exercise an effective treatment for lateral epicondylitis? A systematic review. Clin Rehabil 2014; 28(1):3-19. PMID: 23881334. (Systematic review supporting eccentric loading as first-line conservative treatment.)"
  - "Stasinopoulos D, Stasinopoulou K, Johnson MI. An exercise programme for the management of lateral elbow tendinopathy. Br J Sports Med 2005; 39(12):944-947."
  - "Coombes BK, Bisset L, Vicenzino B. Efficacy and safety of corticosteroid injections and other injections for management of tendinopathy: a systematic review of randomised controlled trials. Lancet 2010; 376(9754):1751-1767. (Corticosteroid injections produce short-term relief but worse long-term outcomes than exercise — supports loading-forward approach.)"
  - "Bisset L, Beller E, Jull G, Brooks P, Darnell R, Vicenzino B. Mobilisation with movement and exercise, corticosteroid injection, or wait and see for tennis elbow: randomised trial. BMJ 2006; 333(7575):939. (Exercise non-inferior to injection short-term, superior long-term.)"
  - "Waseem M, Nuhmani S, Ram CS, Sachin Y. Lateral epicondylitis: a review of the literature. J Back Musculoskelet Rehabil 2012; 25(2):131-142."
  - "Stevens M, Tan CW. Effectiveness of the Alfredson protocol compared with a lower repetition-volume protocol for midportion Achilles tendinopathy. JOSPT 2014; 44(2):59-67. (Tendinopathy loading principles generalize; eccentric volume matters.)"
related: [wrist-pain]
contradicts: []
---

# Elbow tendinopathy (tennis / golfer's elbow)

## Claim

Lateral epicondylopathy ("tennis elbow") and medial epicondylopathy ("golfer's elbow") are **tendinopathies of the wrist extensor / flexor origins** at the elbow. The most evidence-backed conservative treatment is **eccentric loading** of the affected tendon (Tyler 2010 RCT: 81% improvement at 7 weeks with flexbar Tyler twist protocol vs 33% in standard care; Cullinane 2014 systematic review).

**Drivers of the pattern:**

- **Grip-heavy work without forearm conditioning** — high-volume pulling, heavy curls, bodyweight rows, dead hangs, climbing.
- **Sudden volume / load increase** — adding new pulling work, starting a new sport (tennis, golf, rowing).
- **Repetitive wrist extension / flexion under load** — bench press, curls with collapsed wrist, computer/mouse work.
- **Tendinopathy mechanism:** failed tendon healing response → collagen disorganization → pain on loading. Tendons heal with progressive loading, not rest.

**The rehab integration:**

- **Eccentric loading via Tyler twist (flexbar)** — TheraBand Flexbar (or similar), 3 sets × 15 reps daily for lateral epicondylitis (extensor protocol) or reverse Tyler twist for medial epicondylitis (flexor protocol). 6–8 weeks for clinically meaningful improvement.
- **Isometric holds** in early/painful phase — wrist extension or flexion isometric, 30–45s × 5 sets. Rio-pattern analgesia.
- **Volume reduction on aggravating patterns** — temporarily drop biceps curl volume, switch to neutral-grip pulling, use straps on heavy deadlifts (offload grip).
- **Progressive reloading** — over 6–8 weeks, return to supinated pull-ups, barbell curls, full-grip deadlifts.
- **NEUTRAL-GRIP bias for pulling** during the rebuild phase — neutral-grip rows, hammer curls, hammer-grip pull-ups (reduces medial elbow stress).

**Corticosteroid injection vs exercise:** Coombes 2010 + Bisset 2006 both showed corticosteroid injections produce SHORT-TERM relief but WORSE long-term outcomes than exercise alone. Exercise is the durable intervention.

## Nuance

- **Lateral vs medial** matters for the eccentric protocol. Lateral epicondylitis = wrist extensor origin = Tyler twist (load with elbow extended, wrist extended; release eccentrically to flexion). Medial epicondylitis = wrist flexor origin = reverse Tyler twist.
- **Pain during the eccentric is acceptable up to ~4/10.** Tendinopathy loading doesn't require pain-free movement — it requires controlled loading without flare. Discomfort is expected; sharp pain or next-day flare = back off load.
- **Tendons heal slowly.** 6–8 weeks of consistent loading is a minimum. The Alfredson Achilles protocol (referenced for generalization) is 12 weeks. User expectation should not be "this fixes in 2 weeks."
- **Avoidance entrenches the tendinopathy.** Resting until pain-free + returning to full load reproduces the failure. The mechanism is failed-healing-response; progressive loading is the intervention.
- **Grip volume is the dial.** During flare, reduce supinated pulling, biceps curl volume, dead-hang time. Don't omit — reduce.
- **Lifting straps are legitimate.** They offload the grip during heavy deadlift / row work so the back can train without further stressing the elbow tendons.

## What this contradicts

- **"Rest until it stops hurting."** Tendons require progressive loading to heal; rest produces continued failed-healing-response.
- **"Corticosteroid injection will fix this."** Short-term relief, worse long-term outcomes than exercise (Coombes 2010 Lancet; Bisset 2006 BMJ).
- **"Stop curling forever."** Once the eccentric protocol rebuilds tendon capacity, the lifts return. The protocol's `do_not_ban` for chronic elbow is explicit: pull-up, row, curl.
- **"Just stretch your forearm."** Stretching alone doesn't address the tendinopathy mechanism. Eccentric loading does.

## Application in this app

**Protocol file:** `src/data/rehab-protocols/elbow.ts` — `avoid` block (acute flare) + `rehab` block (phased return, 6 weeks) + `chronic` block + `ok` watch-outs.

**Engine behavior when `injuries: [{ part: 'elbow', severity: 'modify' | 'chronic' }]`:**

1. **Mandatory weekly inclusions:**
   - Flexbar eccentric Tyler twist (lateral) or reverse Tyler twist (medial) — 3 × 15 daily (chronic) or progressively introduced (rehab stages).
   - Wrist mobility (flexion/extension 12 reps) in warmup on upper-body days.
   - Forearm isometric holds (20–30s × 2–3 sets) as warmup or accessory.
2. **Substitutions (modify, don't omit):**
   - Supinated pull-up → neutral-grip pull-up (chronic / rehab early).
   - Barbell biceps curl → hammer curl / EZ-bar curl (neutral or partial supination).
   - Heavy barbell deadlift → use straps to offload grip during rebuild.
   - Wide-grip bench → close-grip or neutral-grip DB bench if wrist position aggravates elbow.
3. **Hard ban (`avoid` / acute flare):** heavy gripping volume, biceps curls heavy, wrist curls heavy, hammer-grip pulls heavy. Stay isometric + light eccentric for 1–2 weeks before progressive return.
4. **No hard ban on pull-up / row / curl** for chronic — they stay in with modifications. Protocol's `do_not_ban` is explicit.
5. **Phased rehab stages** (from `elbow.ts`):
   - wk1–2: flexbar eccentric intro + isometric holds + neutral-grip rows light.
   - wk3–4: progressive flexbar load, hammer curls light, neutral-grip pull-up assisted, bench moderate.
   - wk5–6: return to supinated pull-up, barbell curl moderate, full-load deadlift.
6. **Body-part-to-muscle resolver** maps `elbow` to `[biceps, triceps, back, chest, shoulders]` — correct.
7. **LLM nuance layer must NOT** say: "you need a corticosteroid injection," "rest until it stops hurting," "stop curling forever." It SHOULD say: "we're using the flexbar Tyler twist daily — it's the most evidence-backed conservative treatment, ~80% improvement at 7 weeks in the original RCT. Pulling switches to neutral grip while the tendon rebuilds capacity. Discomfort up to about 4/10 is expected during the eccentric; sharp pain or next-day flare means we back off the load. This is a 6–8 week reshape, minimum."
8. **Equipment gating:** the flexbar is an inexpensive piece of equipment (~$15–20). Surface the protocol with a brief note about acquiring one if the user doesn't have it; offer a banded eccentric alternative as fallback.
