// TEMPORARY fuzz harness — brute-forces orchestratePlan across the onboarding
// input space to find profile combinations that fail generation. Delete after use.
import { describe, it } from 'vitest'
import { orchestratePlan } from './orchestrate'
import {
  PrimaryGoal,
  primaryGoalToLegacyGoal,
  type UserProgramProfile,
} from '../../types/profile'

const GOALS = PrimaryGoal.options
const GOAL_COMBOS: (typeof GOALS[number])[][] = [
  ...GOALS.map((g) => [g]),
  ...GOALS.flatMap((a, i) => GOALS.slice(i + 1).map((b) => [a, b])),
]

const EQUIPMENT_SETS: UserProgramProfile['equipment'][] = [
  ['full_gym'],
  ['home_weights'],
  ['bands_only'],
  ['bodyweight_only'],
  ['barbell', 'cable_machine'],
  ['home_weights', 'bands_only'],
]

const INJURY_SETS: UserProgramProfile['injuries'][] = [
  [],
  [{ part: 'left_meniscus', severity: 'modify' }],
  [{ part: 'left_meniscus', severity: 'avoid' }],
  [{ part: 'lower_back', severity: 'chronic' }],
  [
    { part: 'left_meniscus', severity: 'modify' },
    { part: 'lower_back', severity: 'chronic' },
    { part: 'right_trap', severity: 'modify' },
  ],
  [{ part: 'hamstring', severity: 'modify' }],
  [
    { part: 'left_shoulder', severity: 'avoid' },
    { part: 'wrist', severity: 'avoid' },
    { part: 'lower_back', severity: 'avoid' },
    { part: 'left_knee', severity: 'avoid' },
  ],
]

const SESSIONS = [2, 3, 4, 5, 6]
const MINUTES = [30, 60, 90]
const AGES_MONTHS = [3, 12, 48]
const DISLIKES: NonNullable<UserProgramProfile['exercise_dislikes']>[] = [
  [],
  ['burpees'],
  [
    'burpees',
    'running',
    'jumping',
    'overhead_pressing',
    'cardio_machines',
    'kettlebell_swings',
    'box_jumps',
  ],
]
const PRIORITIES: NonNullable<UserProgramProfile['muscle_priority']>[] = [
  [],
  ['glutes', 'hamstrings'],
]
const DAYS: NonNullable<UserProgramProfile['preferred_days']>[] = [
  [],
  [0, 1, 3, 4],
  [5, 6], // fewer days than sessions — padding path
]

describe('generation fuzz', () => {
  it('orchestratePlan survives the onboarding input space', () => {
    const failures: { profile: UserProgramProfile; error: string }[] = []
    let runs = 0
    let idx = 0

    for (const goals of GOAL_COMBOS) {
      for (const equipment of EQUIPMENT_SETS) {
        for (const injuries of INJURY_SETS) {
          for (const sessions of SESSIONS) {
            idx++
            const profile: UserProgramProfile = {
              goal: primaryGoalToLegacyGoal(goals[0]),
              primary_goals: goals,
              sessions_per_week: sessions,
              training_age_months: AGES_MONTHS[idx % AGES_MONTHS.length],
              equipment,
              injuries,
              time_budget_min: MINUTES[idx % MINUTES.length],
              active_minutes: MINUTES[idx % MINUTES.length],
              sex: 'female',
              posture_notes: idx % 2 === 0 ? 'desk worker, tight hips' : '',
              muscle_priority: PRIORITIES[idx % PRIORITIES.length],
              exercise_dislikes: DISLIKES[idx % DISLIKES.length],
              preferred_days: DAYS[idx % DAYS.length],
              age: 30,
              units: 'imperial',
            }
            runs++
            try {
              const { mesocycle } = orchestratePlan(profile, 'fuzz-user', 6)
              if (!mesocycle.sessions.length) {
                failures.push({ profile, error: 'EMPTY: zero sessions emitted' })
              } else {
                const noLifts = mesocycle.sessions.filter(
                  (s) => !s.exercises || s.exercises.length === 0,
                )
                if (noLifts.length > 0) {
                  failures.push({
                    profile,
                    error: `DEGENERATE: ${noLifts.length}/${mesocycle.sessions.length} sessions have zero exercises`,
                  })
                }
              }
            } catch (err) {
              failures.push({ profile, error: String(err).slice(0, 300) })
            }
          }
        }
      }
    }

    console.log(`\nFUZZ COMPLETE: ${runs} profiles, ${failures.length} failures`)
    const byError = new Map<string, { count: number; example: UserProgramProfile }>()
    for (const f of failures) {
      const key = f.error.slice(0, 120)
      const cur = byError.get(key)
      if (cur) cur.count++
      else byError.set(key, { count: 1, example: f.profile })
    }
    for (const [err, { count, example }] of byError) {
      console.log(`\n[x${count}] ${err}`)
      console.log(
        `  example: goals=${example.primary_goals?.join('+')} eq=${example.equipment.join('+')} inj=${example.injuries.map((i) => `${i.part}:${i.severity}`).join(',') || 'none'} sess=${example.sessions_per_week} min=${example.active_minutes} dislikes=${example.exercise_dislikes?.length} days=${example.preferred_days?.join(',') || 'auto'}`,
      )
    }
    if (failures.length > 0) {
      throw new Error(`${failures.length}/${runs} profile combinations failed generation — see console output`)
    }
  }, 120_000)
})
