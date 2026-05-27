---
id: hard-to-feel-exercises-catalog
type: exercise
domain: exercises
title: "Hard-to-feel exercises — catalog with cues and machine-first progression"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, glutes, aesthetics, general_fitness]
  training_age: any
  sex: any
  injuries: []
tags: [mind-muscle, hard-to-feel, cueing, machine-first, lat-pulldown, glute-med, hamstring-curl, face-pull, rear-delt, prone-y]
citations:
  - "Trainer conversation, docs/research/02-coaching-philosophy.md §7: 'Some exercises are notorious for being hard to feel correctly (lat pulldown lives at the top of this list).'"
  - "Schoenfeld BJ, Vigotsky AD, Contreras B, et al. Differential effects of attentional focus strategies during long-term resistance training. Eur J Sport Sci. 2018;18(5):705-712. PMID: 29533715. DOI: 10.1080/17461391.2018.1447020."
  - "Calatayud J, Vinstrup J, Jakobsen MD, et al. Importance of mind-muscle connection during progressive resistance training. Eur J Appl Physiol. 2016;116(3):527-533. PMID: 26700744."
  - "Snyder BJ, Leech JR. Voluntary increase in latissimus dorsi muscle activity during the lat pull-down following expert instruction. J Strength Cond Res. 2009;23(8):2204-2209. PMID: 19826299."
  - "Selkowitz DM, Beneck GJ, Powers CM. Which exercises target the gluteal muscles while minimizing activation of the tensor fascia lata? Electromyographic assessment using fine-wire electrodes. J Orthop Sports Phys Ther. 2013;43(2):54-64. PMID: 23160432."
related: [mind-muscle-connection-research, lat-pulldown-cueing, machine-vs-free-weight-progression, warmup-set-count, chest-supported-not-compound]
contradicts: []
---

# Hard-to-feel exercises — catalog with cues and machine-first progression

## Claim

A specific set of exercises is **notoriously hard to "feel"** — the bar / handle / band moves through the prescribed ROM but the target muscle isn't necessarily the muscle doing the work. The lifter compensates via momentum, secondary muscles, or postural cheats; the exercise looks correct on video and produces poor stimulus.

The trainer (philosophy doc §7): *"More warmup sets, sometimes a machine version first to teach the body the pattern, sometimes asking another human 'am I doing this right?'. The app should not pretend a fixed warmup count works for everyone."*

This entry catalogues the exercises that trigger the in-app `isHardToFeel()` predicate (`src/lib/planner/constants.ts`), the *reason* each is hard to feel, the single best cue, and the machine-first stepping-stone path when one exists.

## The catalog

### Lat pulldown — top of the list

- **Library ids:** `ex-lat-pulldown`, `ex-lat-pulldown-wide`, `ex-lat-pullover`, `ex-cable-row` (when used as a pulldown-substitute).
- **Variant ids:** `variant:cable_row_neutral`, `variant:chest_supported_row`, `variant:seated_cable_row`.
- **Why it's hard to feel:** the lats are a large, hard-to-mentally-locate muscle on the back. The biceps and forearms are forward of the eye, easy to feel; the lats are behind the lifter and load through scapular depression + shoulder adduction, which most people don't have a kinesthetic map for. Default failure mode = pulling with the arms, not the back.
- **Single cue:** *"Drive your elbows DOWN and BACK. Lead with your back, not your arms — pretend your hands are hooks."*
- **Machine-first path:** lat pulldown machine first; pull-up only after the lifter reports feeling the lats on the machine consistently (2-3 sessions of `mind_muscle_felt='felt'`). See [lat-pulldown-cueing](lat-pulldown-cueing.md).
- **Warmup expectation:** treat as +1 ramp set vs the standard table (so 3 warmup sets on a heavy day, not 2). The trainer reported needing 2-4 warmup sets on his own barbell rows specifically because of this issue.

### Glute medius isolation — clamshell, hip abduction, lateral band walk

- **Library ids:** `ex-banded-clamshell`, `ex-hip-abduction`, `ex-cable-hip-abduction`, `ex-banded-lateral-walk`, `ex-banded-monster-walk`.
- **Variant ids:** `variant:banded_clamshell`, `variant:hip_abduction_machine`.
- **Why it's hard to feel:** the glute medius sits on the side of the hip under the IT band. It's smaller and deeper than glute max. Most people compensate by leaning their torso (lateral side bend recruits QL / obliques instead of glute med) or by hiking the hip (engages TFL — the tensor fascia lata — instead of glute med). Selkowitz 2013 specifically identified that the clamshell and side-lying hip abduction were among the few exercises to recruit glute med *without* lighting up the TFL — but only when form is correct.
- **Single cue:** *"Keep your torso DEAD STILL. The only thing moving is the leg / knee — if you feel it on the side of your hip pocket, you've got it. If you feel it in your low back or the outside of your thigh, you're cheating."*
- **Machine-first path:** hip abduction machine (seated, fixed pad — eliminates the torso-stability variable) before clamshell / lateral band walk for users who can't find the muscle.
- **Warmup expectation:** these are 0-warmup-set isolations by role, but the engine should show the mind-muscle tap after set 1 because the form-quality variability is the most important signal for these.

### Hamstring curls — seated leg curl, lying leg curl, Nordic curl

- **Library ids:** `ex-leg-curl`, `ex-nordic-curl-assisted`.
- **Variant ids:** `variant:seated_leg_curl`, `variant:nordic_hamstring_curl`.
- **Why it's hard to feel:** the hamstrings are hard to recruit in seated or supine positions because the hip is not extending. Hamstrings have two functions — hip extension and knee flexion — and the curl trains only knee flexion in a position where the body is otherwise relaxed. Most beginners feel the curl in the calf or even the lower back (especially on lying leg curl) before they find the hamstring belly.
- **Single cue:** *"Curl your heel UP toward your butt — feel the squeeze in the back of your thigh, not your knee or calf. Point your toes UP (dorsiflex) to take the calf out of it."*
- **Machine-first path:** seated leg curl (knee starts at ~90°) is easier to feel than lying leg curl (knee fully extended at start) for most lifters — start there.
- **Warmup expectation:** 0-1 warmup sets; treat as +1 vs standard table for the first 4-6 sessions a lifter does it.

### Mid-trap rows, chest-supported rows (mid-back focus)

- **Library ids:** `ex-chest-supported-row`, `ex-cable-row` (when target is mid-back not lats).
- **Variant ids:** `variant:chest_supported_row`, `variant:seated_cable_row`.
- **Why it's hard to feel:** mid-traps + rhomboids sit between the shoulder blades and contract via *scapular retraction* — a movement most desk workers cannot consciously initiate. The default cheat is biceps-driven elbow flexion (looks like a row, feels like a curl), or shoulder-extension-only (lat-dominant, also fine, but not what we wanted).
- **Single cue:** *"Pinch a pencil between your shoulder blades at the top. Pull until the shoulder blades touch, then pause for a beat. Don't think about the arms — they're just hooks."*
- **Machine-first path:** chest-supported machine row (chest pad eliminates the lower-back variable, isolates scapular retraction) before any free-weight row when mid-back is the target.
- **Warmup expectation:** 1 warmup set; +1 from the hard-to-feel baseline.

### Face pulls

- **Library ids:** `ex-face-pull`.
- **Variant ids:** `variant:face_pull`.
- **Why it's hard to feel:** targets posterior delts + external rotators (infraspinatus, teres minor). These are small and posterior — same problem as glute medius, just upper-body. The default cheat is bicep-driven elbow flexion + scapular shrug — looks like a face pull, trains traps + biceps.
- **Single cue:** *"Elbows HIGH (above shoulder), pull to the SIDES of your face, externally rotate at the top (knuckles to ceiling). Light weight — these are tiny muscles."*
- **Machine-first path:** the face pull is already the machine-first version; if the lifter can't find it, drop weight by half and pause 1 second at the end range to feel the contraction.
- **Warmup expectation:** 0-1 warmup sets; the bigger leverage point is dropping the load 30-50% versus what the lifter would naturally select.

### Prone Y-raise, rear delt fly, reverse fly

- **Library ids:** `ex-rear-delt-fly`, `ex-db-rear-delt-fly`, plus any prone Y / I / T variants.
- **Variant ids:** `variant:prone_y_raise`.
- **Why it's hard to feel:** posterior deltoid is small and overshadowed by middle/anterior delt in most movements. Default cheats: arching the lower back (lumbar extension makes the move look bigger), bending the elbows (turns it into a reverse row, recruits rhomboids instead of rear delt), or using too much load (momentum dominates).
- **Single cue:** *"Arms straight (slight elbow bend, locked), thumbs UP, raise the dumbbells out to the SIDES — pinky to the ceiling at the top. Stop when arms are at shoulder height — going higher = trap dominance. Feather-light weight."*
- **Machine-first path:** reverse pec deck (chest-against-pad rear delt fly) — the pad eliminates the lumbar-arch cheat. Start here, graduate to prone DB version on a bench.
- **Warmup expectation:** 0 warmup sets; smaller weight, longer pause at peak contraction is the lever.

## Cross-reference with `HARD_TO_FEEL_EXERCISE_IDS`

The canonical set in `src/lib/planner/constants.ts` enumerates:

```
'variant:cable_row_neutral'
'variant:chest_supported_row'
'variant:seated_cable_row'
'variant:banded_clamshell'
'variant:hip_abduction_machine'
'variant:seated_leg_curl'
'variant:nordic_hamstring_curl'
'variant:face_pull'
'variant:prone_y_raise'
```

The name-pattern fallback (`HARD_TO_FEEL_NAME_PATTERNS`) catches synonym variants from free-exercise-db and LLM-emitted exercises:

```
'lat pulldown', 'pulldown', 'clamshell', 'hip abduction',
'leg curl', 'hamstring curl', 'face pull', 'rear delt',
'reverse fly', 'reverse flye', 'y raise', 'prone y'
```

### Suggested additions (audit with the owner)

These exercises exhibit the same hard-to-feel pattern but are not currently in `HARD_TO_FEEL_EXERCISE_IDS`:

| Library id / pattern | Why it should be added |
|---|---|
| `ex-cable-kickback` | Glute-isolation movement; most users feel it in the lower back or hamstring before the glute. Same "find the muscle" problem. |
| `ex-cable-pull-through` | Hip-hinge with cable; lats and lower back compete with glutes for the work unless the cue is correct. |
| `ex-cable-hip-extension` | Same family as kickback — glute-specific cable work, hard to find. |
| `ex-cable-hip-abduction` | Already caught by `'hip abduction'` name pattern. Worth explicit id-set membership for audit clarity. |
| `ex-lat-pullover` (and `ex-dumbbell-pullover`) | Lat isolation with straight arms — extremely hard for novices to feel in the lats vs the triceps. |
| Name pattern: `'pullover'` | Catches dumbbell pullover, cable pullover, straight-arm pulldown variants. |
| Name pattern: `'kickback'` | Catches glute kickback and tricep kickback (latter is also hard to feel). |
| Name pattern: `'pull through'` / `'pull-through'` | Catches cable pull-through variants. |
| `ex-shrug` | Traps shrug — most users default to neck-tension instead of upper-trap contraction. |
| Name pattern: `'lateral raise'` | Side delts are famously hard to feel; default cheat is upper-trap shrug. |
| Name pattern: `'shrug'` | Trap shrug; see above. |

The owner should review this list and decide which to promote into the canonical id set. The name-pattern fallback is cheap and catches them automatically until then.

## Application in this app

- **`isHardToFeel(libraryId, name)`** in `constants.ts` is the gate. Returns true → the engine:
  - Adds +1 to the default warmup-set count (see [warmup-set-count](../warmup-recovery/warmup-set-count.md)).
  - Surfaces the **mind-muscle tap** after the first working set is logged: *"felt it" / "didn't feel it."*
  - On `'missed'`: the next session's warmup count for this exercise stays at +1.
  - On two consecutive `'felt'` signals: the +1 delta returns to 0.
- **LLM nuance copy** for hard-to-feel exercises must (a) include the single cue from this catalog and (b) point at the machine-first path if the lifter has logged `'missed'` previously. Do NOT generate a different cue per session — the cue persistence *is* the mind-muscle teaching. Variation in cue = noise.
- **Per-exercise info sheet** should render the cue from this catalog as the primary content (above instructions).
- **Replan / substitution logic**: if the user logs `'missed'` 3 sessions in a row on the same exercise, the engine should propose a machine-first swap *before* swapping to a different exercise entirely (lat pulldown machine → keep working on it; pull-up only when machine connection is established).
