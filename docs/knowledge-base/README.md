# Workout Tracker Knowledge Base

This directory is the **source of truth** for every evidence-based or coach-derived claim the app makes. The LLM nuance layer (when generating plan rationale, per-exercise notes, deadline acknowledgments, replan reviews) pulls from THIS directory — not from training-data priors.

The whole point: if the LLM cites a claim, that claim lives here with the research that backs it (or is explicitly marked as a heuristic).

## Why this exists

The trainer in `docs/research/02-coaching-philosophy.md` made one specific point: *don't trust generic internet fitness content — it's engagement-bait that contradicts what the research actually says.* The LLM was trained on that content. Without a counterweight, it'll regress to gym-bro defaults.

This KB is the counterweight. Every entry is:
- A claim the LLM is allowed to make
- An applicability scope (when this claim is relevant)
- A citation (real paper or trainer-derived heuristic — labeled honestly)
- A confidence rating

The nuance layer prompt instructs the LLM: *"You may only assert claims that match an entry in the KB. If you don't find a matching entry, say 'I'm not sure' rather than guessing."*

## Directory structure

```
docs/knowledge-base/
  README.md                        ← this file
  domains/
    programming-fundamentals/      ← rep ranges, sets, rest, RIR, volume, frequency
    body-composition/              ← fat loss, protein, cardio, recomp, deadlines
    warmup-recovery/               ← RAMP, dynamic vs static, cooldown, mobility tab
    progression/                   ← progressive overload variables, autoprogress signals, deload
    injuries/                      ← per body part: root causes, rehab work, acute vs chronic
    exercises/                     ← compound taxonomy, mind-muscle difficulty, hard-to-feel list
    myths/                         ← every myth we've identified + the research that debunks it
    special-populations/           ← women, older adults, beginners, returning-after-layoff
```

## Entry schema

Every entry is a markdown file with YAML frontmatter:

```yaml
---
id: hypertrophy-rep-ranges            # kebab-case, unique across KB
type: principle                       # principle | heuristic | citation | myth | pattern | exercise
domain: programming-fundamentals       # matches a subfolder name
title: "Rep ranges for hypertrophy"   # short, human-readable
confidence: high                       # high | medium | low
last_reviewed: 2026-05-27              # ISO date
applicability:
  goals: [build_muscle, lean_and_strong, fat_loss]   # which user goals this applies to
  training_age: any                    # any | beginner (≤6mo) | early (6-12mo) | intermediate (12-36mo) | advanced (36+mo)
  sex: any                             # any | female | male
  injuries: []                         # body parts this entry is specific to (empty = generic)
tags: [hypertrophy, rep-ranges, set-volume]  # for retrieval keyword match
citations:
  - "Schoenfeld 2017 — full title, journal, PMID/DOI"
related: [other-entry-id, ...]         # cross-references
contradicts: [myth-entry-id, ...]      # myths this entry debunks
---

# Title (matches frontmatter title)

## Claim
The actual claim, written so the LLM can quote or paraphrase it directly.

## Nuance
When does this NOT apply? What does it depend on? What's the gradient?

## What this contradicts (optional)
Myths or common misconceptions this entry refutes.

## Application in this app
How the engine + LLM nuance layer should USE this claim. Concrete: "for goal=fat_loss, prescribe 2-3 cardio segments/week post-strength." NOT vague: "consider cardio."
```

### Entry types — what each is for

| Type | When to use | Example |
|---|---|---|
| **principle** | A research-backed statement of how training works | "Hypertrophy occurs across 5-30 reps near failure" |
| **heuristic** | Practical rule of thumb backed by experience, not strong research | "1 warmup set for isolation work; 2-3 for compound main lifts" |
| **citation** | A standalone reference entry that other entries link to | "Schoenfeld 2017 dose-response paper" |
| **myth** | A widely-believed claim that research contradicts | "High reps tone" |
| **pattern** | A typical user situation that maps to specific guidance | "Desk worker with chronic lower back pain" |
| **exercise** | Exercise-specific guidance (mind-muscle difficulty, cues, swap options) | "Lat pulldown — hard to feel" |

### Confidence ratings

- **high** — Multiple peer-reviewed studies or strong meta-analytic consensus
- **medium** — One or two studies, or coach consensus, or theoretical mechanism with some empirical support
- **low** — Trainer-derived heuristic, expert opinion, or weak/conflicting evidence (still useful; just labeled)

## What does NOT go in the KB

- App-specific implementation details (those live in code comments)
- Marketing copy or motivational language
- Anything that depends on the specific user (those are computed at runtime from profile + history)
- Speculation dressed up as fact (mark it as `confidence: low` or don't include it)

## How the LLM retrieves

At nuance-layer call time, the orchestrator:
1. Computes a relevance filter from the user's profile + the engine's plan (goals, injuries, training_age, etc.)
2. Pulls matching entries from the KB
3. Injects them as context with the instruction: "you may only assert claims supported by these entries"

For now (MVP), retrieval is naive — inject every entry matching the user's goals + injuries. Later: embedding-based RAG if the KB grows past prompt-context limits.

## Source documents this KB synthesizes

- `docs/research/00-MASTER-SYNTHESIS.md` — the original research synthesis
- `docs/research/01-strength-hypertrophy.md` — Schoenfeld-era hypertrophy literature
- `docs/research/02-coaching-philosophy.md` — the trainer conversation, philosophical lens
- `docs/audits/2026-05-07-adaptive-logic-audit.md` — the engine audit + research citations

All entries in this KB should be traceable back to one of these source docs OR a real external citation. No hallucinated papers.
