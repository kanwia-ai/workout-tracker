// ─── Periodized Program with Exercise Rotation ─────────────────────────────
// 6-week repeating cycle:
//   Weeks 1-2: Hypertrophy (12-15 reps, moderate weight, 60s rest)
//   Weeks 3-4: Strength-Hypertrophy (8-10 reps, heavier, 90s rest)
//   Weeks 5-6: Strength (6-8 reps, heavy, 120s rest)
//   Then deload week 7, and repeat.
//
// Exercises rotate within each slot so you're not doing the same movement
// every week — but the muscle focus stays consistent.

export type PeriodPhase = 'hypertrophy' | 'strength-hypertrophy' | 'strength' | 'deload'

export interface PeriodConfig {
  phase: PeriodPhase
  label: string
  setsMain: number
  repsMain: string
  restMain: number
  setsAccessory: number
  repsAccessory: string
  restAccessory: number
  intensity: string
}

export const PERIOD_CYCLE: PeriodConfig[] = [
  { phase: 'hypertrophy', label: 'Hypertrophy', setsMain: 3, repsMain: '12-15', restMain: 60, setsAccessory: 3, repsAccessory: '15', restAccessory: 45, intensity: 'Moderate weight, chase the burn' },
  { phase: 'hypertrophy', label: 'Hypertrophy', setsMain: 3, repsMain: '12-15', restMain: 60, setsAccessory: 3, repsAccessory: '15', restAccessory: 45, intensity: 'Moderate weight, chase the burn' },
  { phase: 'strength-hypertrophy', label: 'Str / Hyp', setsMain: 4, repsMain: '8-10', restMain: 90, setsAccessory: 3, repsAccessory: '10-12', restAccessory: 60, intensity: 'Heavier — controlled reps' },
  { phase: 'strength-hypertrophy', label: 'Str / Hyp', setsMain: 4, repsMain: '8-10', restMain: 90, setsAccessory: 3, repsAccessory: '10-12', restAccessory: 60, intensity: 'Heavier — controlled reps' },
  { phase: 'strength', label: 'Strength', setsMain: 4, repsMain: '6-8', restMain: 120, setsAccessory: 3, repsAccessory: '8-10', restAccessory: 75, intensity: 'Heavy — rest fully between sets' },
  { phase: 'strength', label: 'Strength', setsMain: 4, repsMain: '6-8', restMain: 120, setsAccessory: 3, repsAccessory: '8-10', restAccessory: 75, intensity: 'Heavy — rest fully between sets' },
  { phase: 'deload', label: 'Deload', setsMain: 2, repsMain: '12', restMain: 45, setsAccessory: 2, repsAccessory: '12', restAccessory: 45, intensity: 'Light & easy — active recovery' },
]

// ─── Exercise Pools ─────────────────────────────────────────────────────────
// Each slot has 3+ exercise options. The program rotates through them.

interface ExerciseOption {
  id: string
  name: string
  isMain: boolean // main lift vs accessory (affects set/rep scheme)
}

interface WorkoutSlot {
  role: string // e.g. "Glute Compound", "Quad Movement"
  options: ExerciseOption[]
}

interface DayProgram {
  dayLabel: string
  emoji: string
  slots: WorkoutSlot[]
  coreSlots: WorkoutSlot[]
}

export const PROGRAM: Record<string, DayProgram> = {
  'w-glutes-legs-back': {
    dayLabel: 'Glutes, Legs & Back',
    emoji: '🦵',
    slots: [
      {
        role: 'Glute Compound',
        options: [
          { id: 'ex-glute-bridge', name: 'Glute Bridges', isMain: true },
          { id: 'ex-hip-thrust', name: 'Barbell Hip Thrusts', isMain: true },
          { id: 'ex-cable-pull-through', name: 'Cable Pull-Throughs', isMain: true },
        ],
      },
      {
        role: 'Lunge Pattern',
        options: [
          { id: 'ex-walking-lunge', name: 'Walking Lunges', isMain: true },
          { id: 'ex-reverse-lunge-elevated', name: 'Front Foot Elevated Reverse Lunges', isMain: true },
          { id: 'ex-split-squat-kb', name: 'Split Squats (kettlebell)', isMain: true },
        ],
      },
      {
        role: 'Hamstring',
        options: [
          { id: 'ex-leg-curl', name: 'Leg Curls', isMain: false },
          { id: 'ex-rdl', name: 'RDLs', isMain: true },
          { id: 'ex-kb-rdl', name: 'Kettlebell RDLs', isMain: false },
        ],
      },
      {
        role: 'Vertical Pull',
        options: [
          { id: 'ex-lat-pulldown', name: 'Lat Pulldowns', isMain: false },
          { id: 'ex-lat-pulldown-wide', name: 'Lat Pulldowns (wide grip)', isMain: false },
          { id: 'ex-lat-pullover', name: 'Lat Pullover', isMain: false },
        ],
      },
      {
        role: 'Horizontal Pull',
        options: [
          { id: 'ex-cable-row', name: 'Cable Rows', isMain: false },
          { id: 'ex-single-arm-cable-row', name: 'Single Arm Cable Rows', isMain: false },
          { id: 'ex-face-pull', name: 'Face Pulls', isMain: false },
        ],
      },
    ],
    coreSlots: [
      {
        role: 'Core',
        options: [
          { id: 'ex-plank', name: 'Planks', isMain: false },
          { id: 'ex-dead-bug', name: 'Dead Bugs', isMain: false },
          { id: 'ex-side-plank', name: 'Side Planks', isMain: false },
        ],
      },
    ],
  },

  'w-shoulders-arms': {
    dayLabel: 'Shoulders & Arms',
    emoji: '💪',
    slots: [
      {
        role: 'Shoulder Press',
        options: [
          { id: 'ex-shoulder-press', name: 'Machine Shoulder Press', isMain: true },
          { id: 'ex-arnold-press', name: 'Dumbbell Arnold Press', isMain: true },
          { id: 'ex-db-shoulder-press', name: 'Dumbbell Shoulder Press', isMain: true },
        ],
      },
      {
        role: 'Lateral Raise',
        options: [
          { id: 'ex-lateral-raise', name: 'Lateral Raises', isMain: false },
          { id: 'ex-cable-lateral-raise', name: 'Cable Lateral Raises', isMain: false },
          { id: 'ex-leaning-lateral-raise', name: 'Leaning Lateral Raises', isMain: false },
        ],
      },
      {
        role: 'Triceps',
        options: [
          { id: 'ex-tricep-extension', name: 'Tricep Extensions', isMain: false },
          { id: 'ex-tricep-pushdown', name: 'Tricep Pushdowns', isMain: false },
          { id: 'ex-overhead-tricep', name: 'Overhead Tricep Extension', isMain: false },
        ],
      },
      {
        role: 'Biceps',
        options: [
          { id: 'ex-dumbbell-curl', name: 'Dumbbell Curls', isMain: false },
          { id: 'ex-hammer-curl', name: 'Hammer Curls', isMain: false },
          { id: 'ex-cable-curl', name: 'Cable Curls', isMain: false },
        ],
      },
      {
        role: 'Rear Delt',
        options: [
          { id: 'ex-rear-delt-fly', name: 'Rear Delt Flies', isMain: false },
          { id: 'ex-face-pull', name: 'Face Pulls', isMain: false },
          { id: 'ex-db-rear-delt-fly', name: 'DB Rear Delt Flies', isMain: false },
        ],
      },
    ],
    coreSlots: [
      {
        role: 'Core 1',
        options: [
          { id: 'ex-scissors', name: 'Scissors', isMain: false },
          { id: 'ex-leg-raise', name: 'Leg Raises', isMain: false },
          { id: 'ex-toe-touches', name: 'Toe Touches', isMain: false },
        ],
      },
      {
        role: 'Core 2',
        options: [
          { id: 'ex-toe-touches', name: 'Toe Touches', isMain: false },
          { id: 'ex-russian-twist', name: 'Russian Twists', isMain: false },
          { id: 'ex-bicycle-crunch', name: 'Bicycle Crunches', isMain: false },
        ],
      },
      {
        role: 'Core 3',
        options: [
          { id: 'ex-side-plank', name: 'Side Planks', isMain: false },
          { id: 'ex-plank', name: 'Planks', isMain: false },
          { id: 'ex-dead-bug', name: 'Dead Bugs', isMain: false },
        ],
      },
    ],
  },

  'w-heavy-legs': {
    dayLabel: 'Heavy Legs',
    emoji: '🏋️',
    slots: [
      {
        role: 'Quad Compound',
        options: [
          { id: 'ex-leg-press', name: 'Leg Press', isMain: true },
          { id: 'ex-goblet-squat', name: 'Goblet Squats', isMain: true },
          { id: 'ex-smith-squat', name: 'Smith Machine Squat', isMain: true },
        ],
      },
      {
        role: 'Hip Hinge',
        options: [
          { id: 'ex-rdl', name: 'RDLs (heavy, go slow!)', isMain: true },
          { id: 'ex-sumo-deadlift', name: 'Sumo Deadlift', isMain: true },
          { id: 'ex-good-morning', name: 'Good Mornings', isMain: true },
        ],
      },
      {
        role: 'Adductor',
        options: [
          { id: 'ex-hip-adduction', name: 'Hip Adduction Machine', isMain: false },
          { id: 'ex-copenhagen-plank', name: 'Copenhagen Plank', isMain: false },
        ],
      },
      {
        role: 'Single Leg',
        options: [
          { id: 'ex-reverse-lunge-elevated', name: 'Front Foot Elevated Reverse Lunges', isMain: true },
          { id: 'ex-walking-lunge', name: 'Walking Lunges (heavy)', isMain: true },
          { id: 'ex-step-up', name: 'Weighted Step-Ups', isMain: true },
        ],
      },
      {
        role: 'Abductor / Glute Iso',
        options: [
          { id: 'ex-hip-abduction', name: 'Hip Abduction Machine', isMain: false },
          { id: 'ex-cable-kickback', name: 'Cable Kickbacks', isMain: false },
          { id: 'ex-banded-lateral-walk', name: 'Banded Lateral Walks', isMain: false },
        ],
      },
    ],
    coreSlots: [
      {
        role: 'Core 1',
        options: [
          { id: 'ex-dead-bug', name: 'Dead Bugs', isMain: false },
          { id: 'ex-plank', name: 'Planks', isMain: false },
          { id: 'ex-hollow-hold', name: 'Hollow Hold', isMain: false },
        ],
      },
      {
        role: 'Core 2',
        options: [
          { id: 'ex-bicycle-crunch', name: 'Bicycle Crunches', isMain: false },
          { id: 'ex-russian-twist', name: 'Russian Twists', isMain: false },
          { id: 'ex-scissors', name: 'Scissors', isMain: false },
        ],
      },
      {
        role: 'Core 3',
        options: [
          { id: 'ex-plank', name: 'Planks', isMain: false },
          { id: 'ex-side-plank', name: 'Side Planks', isMain: false },
          { id: 'ex-leg-raise', name: 'Leg Raises', isMain: false },
        ],
      },
    ],
  },

  'w-back-focus': {
    dayLabel: 'Back Focus',
    emoji: '🔙',
    slots: [
      {
        role: 'Vertical Pull',
        options: [
          { id: 'ex-lat-pulldown-wide', name: 'Lat Pulldowns (wide grip)', isMain: true },
          { id: 'ex-lat-pulldown', name: 'Lat Pulldowns (close grip)', isMain: true },
          { id: 'ex-assisted-pullup', name: 'Assisted Pull-Ups', isMain: true },
        ],
      },
      {
        role: 'Pullover / Sweep',
        options: [
          { id: 'ex-lat-pullover', name: 'Lat Pullover', isMain: false },
          { id: 'ex-straight-arm-pushdown', name: 'Straight Arm Pushdown', isMain: false },
        ],
      },
      {
        role: 'Horizontal Row',
        options: [
          { id: 'ex-single-arm-cable-row', name: 'Single Arm Cable Rows', isMain: true },
          { id: 'ex-cable-row', name: 'Seated Cable Rows', isMain: true },
          { id: 'ex-db-row', name: 'Dumbbell Rows', isMain: true },
        ],
      },
      {
        role: 'Rear Delt / Posture',
        options: [
          { id: 'ex-face-pull', name: 'Face Pulls', isMain: false },
          { id: 'ex-rear-delt-fly', name: 'Rear Delt Flies', isMain: false },
          { id: 'ex-band-pull-apart', name: 'Band Pull-Aparts', isMain: false },
        ],
      },
    ],
    coreSlots: [
      {
        role: 'Core',
        options: [
          { id: 'ex-leg-raise', name: 'Leg Raises', isMain: false },
          { id: 'ex-toe-touches', name: 'Toe Touches', isMain: false },
          { id: 'ex-scissors', name: 'Scissors', isMain: false },
        ],
      },
    ],
  },

  'w-home-circuit': {
    dayLabel: 'At-Home Circuit',
    emoji: '🏠',
    slots: [
      {
        role: 'Lower Compound',
        options: [
          { id: 'ex-goblet-squat', name: 'Goblet Squats (kettlebell)', isMain: true },
          { id: 'ex-split-squat-kb', name: 'Split Squats (kettlebell)', isMain: true },
          { id: 'ex-sumo-squat-kb', name: 'Sumo Squat (kettlebell)', isMain: true },
        ],
      },
      {
        role: 'Upper Press',
        options: [
          { id: 'ex-arnold-press', name: 'Dumbbell Arnold Press', isMain: false },
          { id: 'ex-floor-press', name: 'Floor Press (15s, slow!)', isMain: false },
          { id: 'ex-push-up', name: 'Push-Ups', isMain: false },
        ],
      },
      {
        role: 'Arms',
        options: [
          { id: 'ex-dumbbell-curl', name: 'Dumbbell Curls', isMain: false },
          { id: 'ex-hammer-curl', name: 'Hammer Curls', isMain: false },
          { id: 'ex-tricep-kickback', name: 'Tricep Kickbacks', isMain: false },
        ],
      },
      {
        role: 'Hip Hinge',
        options: [
          { id: 'ex-kb-rdl', name: 'Kettlebell RDLs', isMain: true },
          { id: 'ex-kb-swing', name: 'Kettlebell Swings', isMain: true },
          { id: 'ex-single-leg-rdl', name: 'Single Leg RDL', isMain: true },
        ],
      },
      {
        role: 'Rear Delt',
        options: [
          { id: 'ex-db-rear-delt-fly', name: 'DB Rear Delt Flies', isMain: false },
          { id: 'ex-band-pull-apart', name: 'Band Pull-Aparts', isMain: false },
        ],
      },
    ],
    coreSlots: [],
  },
}

// ─── Program State ──────────────────────────────────────────────────────────

const PROGRAM_KEY = 'program-week'

export function getProgramWeek(): number {
  try {
    const stored = localStorage.getItem(PROGRAM_KEY)
    if (!stored) return 1
    const data = JSON.parse(stored)
    // Auto-advance: check if a week has passed since last recorded Monday
    const lastMonday = new Date(data.lastMonday)
    const now = new Date()
    const daysSince = Math.floor((now.getTime() - lastMonday.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince >= 7) {
      const weeksToAdvance = Math.floor(daysSince / 7)
      const newWeek = ((data.week - 1 + weeksToAdvance) % PERIOD_CYCLE.length) + 1
      saveProgramWeek(newWeek)
      return newWeek
    }
    return data.week
  } catch {
    return 1
  }
}

export function saveProgramWeek(week: number) {
  // Find the most recent Monday
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  monday.setHours(0, 0, 0, 0)

  localStorage.setItem(PROGRAM_KEY, JSON.stringify({
    week,
    lastMonday: monday.toISOString(),
  }))
}

export function getPeriodConfig(week: number): PeriodConfig {
  return PERIOD_CYCLE[(week - 1) % PERIOD_CYCLE.length]
}

// Select which exercise from each slot based on week number
// Rotates through options so each week gets a different variation
export function selectExerciseForSlot(slot: WorkoutSlot, week: number): ExerciseOption {
  const idx = (week - 1) % slot.options.length
  return slot.options[idx]
}

// Build the full workout for a day given the program week
export function buildWorkoutForDay(workoutId: string, week: number): {
  title: string
  emoji: string
  period: PeriodConfig
  exercises: { id: string; name: string; sets: number; reps: string; rest: number; role: string; isMain: boolean }[]
  coreExercises: { id: string; name: string; sets: number; reps: string; rest: number; role: string }[]
} | null {
  const day = PROGRAM[workoutId]
  if (!day) return null

  const period = getPeriodConfig(week)

  const exercises = day.slots.map(slot => {
    const picked = selectExerciseForSlot(slot, week)
    return {
      id: picked.id,
      name: picked.name,
      sets: picked.isMain ? period.setsMain : period.setsAccessory,
      reps: picked.isMain ? period.repsMain : period.repsAccessory,
      rest: picked.isMain ? period.restMain : period.restAccessory,
      role: slot.role,
      isMain: picked.isMain,
    }
  })

  const coreExercises = day.coreSlots.map(slot => {
    const picked = selectExerciseForSlot(slot, week)
    return {
      id: picked.id,
      name: picked.name,
      sets: period.setsAccessory,
      reps: period.repsAccessory,
      rest: 30,
      role: slot.role,
    }
  })

  return {
    title: day.dayLabel,
    emoji: day.emoji,
    period,
    exercises,
    coreExercises,
  }
}

// Initialize program on first use
export function initProgramIfNeeded() {
  if (!localStorage.getItem(PROGRAM_KEY)) {
    saveProgramWeek(1)
  }
}
