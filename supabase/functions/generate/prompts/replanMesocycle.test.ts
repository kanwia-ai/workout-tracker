// Prompt-string contract tests for the replan-mesocycle Opus prompt.
//
// Two changes audit-driven (see docs/audits/2026-05-07-adaptive-logic-audit.md
// items #1 and #7):
//   1. The system prompt declares MEV / MAV / MRV volume landmarks and the
//      decision rules that flow from them.
//   2. The user prompt body includes a per-muscle-group rollup table built
//      from the completed mesocycle's session.focus + checkin ratings.
//
// We assert the system prompt carries the volume-landmark scaffolding and the
// rendered user prompt contains a "Muscle group rollup" header. We also unit-
// test the pure helpers (buildLibraryMuscleMap, summarizeByMuscleGroup,
// renderMuscleRollupTable) since they're the load-bearing data path.

import { describe, it, expect } from 'vitest'
import {
  REPLAN_SYSTEM_PROMPT,
  buildReplanPrompt,
  buildLibraryMuscleMap,
  summarizeByMuscleGroup,
  renderMuscleRollupTable,
} from './replanMesocycle'

// ─── System prompt: volume-landmark scaffolding ────────────────────────────

describe('REPLAN_SYSTEM_PROMPT (audit item #1 — MEV/MAV/MRV)', () => {
  it('declares MEV, MAV, and MRV as named landmarks', () => {
    expect(REPLAN_SYSTEM_PROMPT).toContain('MEV')
    expect(REPLAN_SYSTEM_PROMPT).toContain('MAV')
    expect(REPLAN_SYSTEM_PROMPT).toContain('MRV')
  })

  it('declares the canonical RP set-count ranges per landmark', () => {
    // MEV ~ 8-10, MAV ~ 12-18, MRV ~ 20-25 — these are the numbers the
    // model is expected to anchor adjustments against.
    expect(REPLAN_SYSTEM_PROMPT).toMatch(/8-10/)
    expect(REPLAN_SYSTEM_PROMPT).toMatch(/12-18/)
    expect(REPLAN_SYSTEM_PROMPT).toMatch(/20-25/)
  })

  it('spells out the decision rules (easy → +sets, failed → -sets; tough stays on-target)', () => {
    expect(REPLAN_SYSTEM_PROMPT).toMatch(/MOSTLY EASY/i)
    expect(REPLAN_SYSTEM_PROMPT).toMatch(/ADD 1-2 sets/i)
    // WHY changed: the old rule cut 2 sets/week any time the dominant rating
    // was 'tough'. RIR 1-3 (the prescription) is supposed to feel tough; cutting
    // on 'tough' over-deloads users who are training correctly. Set cuts now
    // trigger ONLY on 'failed' (reps not completed) — true overreach signal.
    expect(REPLAN_SYSTEM_PROMPT).toMatch(/dominated by 'failed' ratings/i)
    expect(REPLAN_SYSTEM_PROMPT).toMatch(/CUT 2 sets/i)
    // 'tough' with reps cleared = on-target → maintain, not cut
    expect(REPLAN_SYSTEM_PROMPT).toMatch(/dominated by 'tough' ratings with reps cleared/i)
    expect(REPLAN_SYSTEM_PROMPT).toMatch(/Do NOT cut volume/i)
  })

  it('tells the model to aggregate per muscle group, not per exercise', () => {
    expect(REPLAN_SYSTEM_PROMPT).toMatch(/PER-MUSCLE-GROUP REASONING/)
    expect(REPLAN_SYSTEM_PROMPT).toMatch(/not per exercise/i)
  })

  it('still preserves the existing HARD RULES (no regression)', () => {
    expect(REPLAN_SYSTEM_PROMPT).toMatch(/PRESERVE CLINICAL CONSTRAINTS/)
    expect(REPLAN_SYSTEM_PROMPT).toMatch(/DON'T SWAP PROVEN-GOOD EXERCISES/)
    expect(REPLAN_SYSTEM_PROMPT).toMatch(/NEVER remove a root_causes entry/)
    expect(REPLAN_SYSTEM_PROMPT).toMatch(/RESPECT THE PROGRESSION ARC/)
  })
})

// ─── User prompt body: muscle group rollup section ─────────────────────────

const MESO = {
  id: 'meso-1',
  user_id: 'u1',
  sessions: [
    {
      id: 's1',
      week_number: 1,
      focus: ['quads', 'glutes'],
      exercises: [
        { library_id: 'ex-back-squat', name: 'Back Squat' },
        { library_id: 'ex-leg-press', name: 'Leg Press' },
      ],
    },
    {
      id: 's2',
      week_number: 1,
      focus: ['glutes', 'hamstrings'],
      exercises: [
        { library_id: 'ex-hip-thrust', name: 'Barbell Hip Thrust' },
        { library_id: 'ex-rdl', name: 'Romanian Deadlift' },
      ],
    },
  ],
}

const CHECKINS = [
  {
    session_id: 's1',
    user_id: 'u1',
    week_number: 1,
    overall_feel: 4,
    exercises: [
      { library_id: 'ex-back-squat', name: 'Back Squat', rating: 'solid' },
      { library_id: 'ex-leg-press', name: 'Leg Press', rating: 'easy' },
    ],
  },
  {
    session_id: 's2',
    user_id: 'u1',
    week_number: 1,
    overall_feel: 3,
    exercises: [
      { library_id: 'ex-hip-thrust', name: 'Barbell Hip Thrust', rating: 'easy' },
      { library_id: 'ex-rdl', name: 'Romanian Deadlift', rating: 'tough' },
    ],
  },
]

describe('buildReplanPrompt (audit item #7 — per-muscle-group rollup)', () => {
  const prompt = buildReplanPrompt({
    profile: { goal: 'strength', sessions_per_week: 4 },
    completedMesocycle: MESO,
    checkins: CHECKINS,
    previousDirectives: { goal: { primary_adaptation: 'strength_power' } },
  })

  it('renders the "Muscle group rollup" section header', () => {
    expect(prompt).toContain('## Muscle group rollup (this block)')
  })

  it('renders the rollup as a Markdown table with the required columns', () => {
    expect(prompt).toContain('| Muscle | Exercises | Dominant rating | Mean session feel | Tough+ % |')
  })

  it('still renders the per-exercise aggregate AND the raw checkins', () => {
    // The per-exercise list stays — the model still wants the granular detail.
    expect(prompt).toContain('## Per-exercise rating aggregate (last block)')
    expect(prompt).toContain('## Raw check-ins (full detail for notes + reps_done)')
  })

  it('places the rollup BEFORE the per-exercise aggregate', () => {
    const rollupIdx = prompt.indexOf('## Muscle group rollup')
    const perExIdx = prompt.indexOf('## Per-exercise rating aggregate')
    expect(rollupIdx).toBeGreaterThan(0)
    expect(perExIdx).toBeGreaterThan(rollupIdx)
  })

  it('directs the model to read the rollup FIRST', () => {
    expect(prompt).toMatch(/rollup FIRST/i)
  })
})

// ─── Pure helpers ──────────────────────────────────────────────────────────

describe('buildLibraryMuscleMap', () => {
  it('returns an empty map for empty / malformed input', () => {
    expect(buildLibraryMuscleMap(undefined).size).toBe(0)
    expect(buildLibraryMuscleMap(null).size).toBe(0)
    expect(buildLibraryMuscleMap({}).size).toBe(0)
    expect(buildLibraryMuscleMap({ sessions: [] }).size).toBe(0)
  })

  it('attributes each library_id to the dominant session.focus[0]', () => {
    const map = buildLibraryMuscleMap(MESO)
    expect(map.get('ex-back-squat')).toBe('quads')
    expect(map.get('ex-leg-press')).toBe('quads')
    expect(map.get('ex-hip-thrust')).toBe('glutes')
    expect(map.get('ex-rdl')).toBe('glutes')
  })

  it('picks the most frequent focus when an exercise appears under multiple sessions', () => {
    const meso = {
      sessions: [
        { focus: ['back'], exercises: [{ library_id: 'ex-row' }] },
        { focus: ['back'], exercises: [{ library_id: 'ex-row' }] },
        { focus: ['biceps'], exercises: [{ library_id: 'ex-row' }] },
      ],
    }
    expect(buildLibraryMuscleMap(meso).get('ex-row')).toBe('back')
  })
})

describe('summarizeByMuscleGroup', () => {
  it('returns an empty array on empty checkins', () => {
    expect(summarizeByMuscleGroup([], new Map())).toEqual([])
  })

  it('aggregates ratings across multiple checkins per muscle group', () => {
    const map = buildLibraryMuscleMap(MESO)
    const rollup = summarizeByMuscleGroup(CHECKINS, map)
    const byMuscle = Object.fromEntries(rollup.map((r) => [r.muscle, r]))

    // quads: ex-back-squat (solid) + ex-leg-press (easy)
    expect(byMuscle.quads.exercise_count).toBe(2)
    expect(['solid', 'easy']).toContain(byMuscle.quads.dominant_rating)
    expect(byMuscle.quads.mean_session_feel).toBe(4)
    expect(byMuscle.quads.tough_or_failed_pct).toBe(0)

    // glutes: ex-hip-thrust (easy) + ex-rdl (tough)
    expect(byMuscle.glutes.exercise_count).toBe(2)
    // 1 of 2 was tough → 50%
    expect(byMuscle.glutes.tough_or_failed_pct).toBe(0.5)
    expect(byMuscle.glutes.mean_session_feel).toBe(3)
  })

  it('computes tough_or_failed_pct correctly with mixed ratings', () => {
    const checkins = [
      {
        session_id: 'sx',
        overall_feel: 3,
        exercises: [
          { library_id: 'a', rating: 'tough' },
          { library_id: 'b', rating: 'failed' },
          { library_id: 'c', rating: 'solid' },
          { library_id: 'd', rating: 'easy' },
        ],
      },
    ]
    const map = new Map([
      ['a', 'chest'],
      ['b', 'chest'],
      ['c', 'chest'],
      ['d', 'chest'],
    ])
    const rollup = summarizeByMuscleGroup(checkins, map)
    expect(rollup).toHaveLength(1)
    // 2 of 4 = 0.5
    expect(rollup[0].tough_or_failed_pct).toBe(0.5)
    expect(rollup[0].exercise_count).toBe(4)
  })

  it('buckets unknown library_ids under "other"', () => {
    const checkins = [
      {
        session_id: 'sx',
        overall_feel: 5,
        exercises: [
          { library_id: 'unknown-id', rating: 'easy' },
          { library_id: 'another-mystery', rating: 'solid' },
        ],
      },
    ]
    const rollup = summarizeByMuscleGroup(checkins, new Map())
    expect(rollup).toHaveLength(1)
    expect(rollup[0].muscle).toBe('other')
    expect(rollup[0].exercise_count).toBe(2)
  })

  it('handles missing overall_feel by reporting null mean_session_feel', () => {
    const checkins = [
      {
        session_id: 's1',
        // overall_feel intentionally omitted
        exercises: [{ library_id: 'a', rating: 'solid' }],
      },
    ]
    const map = new Map([['a', 'back']])
    const rollup = summarizeByMuscleGroup(checkins, map)
    expect(rollup[0].mean_session_feel).toBeNull()
  })
})

describe('renderMuscleRollupTable', () => {
  it('returns a friendly placeholder when the rollup is empty', () => {
    expect(renderMuscleRollupTable([])).toMatch(/no muscle group rollup/i)
  })

  it('renders header + separator + one row per muscle', () => {
    const out = renderMuscleRollupTable([
      {
        muscle: 'quads',
        exercise_count: 4,
        dominant_rating: 'solid',
        mean_session_feel: 3.5,
        tough_or_failed_pct: 0.25,
      },
      {
        muscle: 'glutes',
        exercise_count: 6,
        dominant_rating: 'easy',
        mean_session_feel: 4.2,
        tough_or_failed_pct: 0,
      },
    ])
    expect(out).toContain('| Muscle | Exercises | Dominant rating | Mean session feel | Tough+ % |')
    expect(out).toContain('| quads | 4 | solid | 3.5 | 25% |')
    expect(out).toContain('| glutes | 6 | easy | 4.2 | 0% |')
  })

  it('emits "—" for null mean_session_feel', () => {
    const out = renderMuscleRollupTable([
      {
        muscle: 'biceps',
        exercise_count: 2,
        dominant_rating: 'solid',
        mean_session_feel: null,
        tough_or_failed_pct: 0,
      },
    ])
    expect(out).toContain('| biceps | 2 | solid | — | 0% |')
  })
})
