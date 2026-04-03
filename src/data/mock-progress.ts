// ─── Mock Progress Data ──────────────────────────────────────────────────
// Realistic sample data for progress visualizations.
// Once real history is populated, these will be replaced by DB queries.

export interface WeightEntry {
  date: string
  weight: number
}

export interface CardioEntry {
  date: string
  minutes: number
  type: string
}

export interface SessionEntry {
  date: string // YYYY-MM-DD
  workoutId: string
  workoutTitle: string
  durationMinutes: number
}

export interface VolumeEntry {
  muscleGroup: string
  sets: number
}

// ─── Weight progression per exercise ─────────────────────────────────────

function generateWeightProgression(
  startWeight: number,
  weeks: number,
  sessionsPerWeek: number,
  increment: number,
): WeightEntry[] {
  const entries: WeightEntry[] = []
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - weeks * 7)

  let weight = startWeight
  for (let w = 0; w < weeks; w++) {
    for (let s = 0; s < sessionsPerWeek; s++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + w * 7 + s * 2)
      // Slight variation
      const jitter = (Math.random() - 0.5) * 2
      entries.push({
        date: d.toISOString().split('T')[0],
        weight: Math.round(weight + jitter),
      })
    }
    weight += increment
  }
  return entries
}

export const MOCK_WEIGHT_PROGRESS: Record<string, { name: string; data: WeightEntry[] }> = {
  'ex-glute-bridge': {
    name: 'Glute Bridges',
    data: generateWeightProgression(95, 8, 1, 5),
  },
  'ex-leg-press': {
    name: 'Leg Press',
    data: generateWeightProgression(135, 8, 1, 10),
  },
  'ex-rdl': {
    name: 'RDLs',
    data: generateWeightProgression(65, 8, 1, 5),
  },
  'ex-lat-pulldown': {
    name: 'Lat Pulldowns',
    data: generateWeightProgression(70, 8, 2, 2.5),
  },
  'ex-shoulder-press': {
    name: 'Shoulder Press',
    data: generateWeightProgression(30, 8, 1, 2.5),
  },
  'ex-cable-row': {
    name: 'Cable Rows',
    data: generateWeightProgression(60, 8, 1, 5),
  },
}

// ─── Cardio duration trend ───────────────────────────────────────────────

export const MOCK_CARDIO_TREND: CardioEntry[] = (() => {
  const entries: CardioEntry[] = []
  const today = new Date()
  for (let i = 55; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dayOfWeek = d.getDay()
    // Skip some days realistically (weekends less likely, some random misses)
    if (dayOfWeek === 0 && Math.random() > 0.3) continue
    if (Math.random() > 0.65) continue

    const baseMinutes = 15 + Math.floor(i / 55 * 15) // Progress from ~15 to ~30 min
    const jitter = Math.floor((Math.random() - 0.3) * 8)
    const types = ['stairmaster', 'treadmill_walk', 'stairmaster', 'stairmaster']
    entries.push({
      date: d.toISOString().split('T')[0],
      minutes: Math.max(10, baseMinutes + jitter),
      type: types[Math.floor(Math.random() * types.length)],
    })
  }
  return entries
})()

// ─── Consistency calendar (last 12 weeks of gym days) ────────────────────

export const MOCK_GYM_DAYS: string[] = (() => {
  const days: string[] = []
  const today = new Date()
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dayOfWeek = d.getDay()
    // Rest days: Wed (3) and Sun (0)
    if (dayOfWeek === 0 || dayOfWeek === 3) continue
    // Random misses (~15% skip rate)
    if (Math.random() > 0.85) continue
    days.push(d.toISOString().split('T')[0])
  }
  return days
})()

// ─── Session duration over time ──────────────────────────────────────────

export const MOCK_SESSIONS: SessionEntry[] = (() => {
  const entries: SessionEntry[] = []
  const today = new Date()
  const workouts = [
    { id: 'w-glutes-legs-back', title: 'Glutes, Legs & Back', baseDuration: 58 },
    { id: 'w-shoulders-arms', title: 'Shoulders & Arms', baseDuration: 50 },
    { id: 'w-heavy-legs', title: 'Heavy Legs', baseDuration: 62 },
    { id: 'w-back-focus', title: 'Back Focus', baseDuration: 48 },
    { id: 'w-home-circuit', title: 'At-Home Circuit', baseDuration: 40 },
  ]

  for (let i = 55; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dayOfWeek = d.getDay()
    // Rest days
    if (dayOfWeek === 0 || dayOfWeek === 3) continue
    if (Math.random() > 0.85) continue

    const workout = workouts[Math.floor(Math.random() * workouts.length)]
    const jitter = Math.floor((Math.random() - 0.5) * 16)
    entries.push({
      date: d.toISOString().split('T')[0],
      workoutId: workout.id,
      workoutTitle: workout.title,
      durationMinutes: workout.baseDuration + jitter,
    })
  }
  return entries
})()

// ─── Volume by muscle group (this week) ──────────────────────────────────

export const MOCK_VOLUME: VolumeEntry[] = [
  { muscleGroup: 'Glutes', sets: 18 },
  { muscleGroup: 'Quads', sets: 15 },
  { muscleGroup: 'Back', sets: 14 },
  { muscleGroup: 'Hamstrings', sets: 12 },
  { muscleGroup: 'Shoulders', sets: 9 },
  { muscleGroup: 'Arms', sets: 9 },
  { muscleGroup: 'Core', sets: 9 },
]

// ─── Weekly recap data ───────────────────────────────────────────────────

export interface WeeklyRecapData {
  weekLabel: string
  workoutsCompleted: number
  totalMinutes: number
  highlights: string[]
  newPRs: { exercise: string; weight: number }[]
  cardioHighlight?: string
}

export const MOCK_WEEKLY_RECAP: WeeklyRecapData = {
  weekLabel: 'This Week',
  workoutsCompleted: 4,
  totalMinutes: 218,
  highlights: [
    'You trained 4x this week',
    'New PR on hip thrusts: 135 lbs',
  ],
  newPRs: [
    { exercise: 'Glute Bridges', weight: 135 },
  ],
  cardioHighlight: 'Stair master up to 28 min',
}
