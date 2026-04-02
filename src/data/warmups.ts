import type { BodyRegion, KneeSafety, Equipment } from '../types'

export interface WarmupExercise {
  id: string
  name: string
  target: BodyRegion | 'hips' | 'shoulders' | 'thoracic' | 'ankles' | 'wrists'
  type: 'dynamic_stretch' | 'activation' | 'mobility' | 'cardio'
  duration: string // "10 each side", "30s", "15 reps" -- per set
  est_per_set_seconds: number // how long one set takes
  seconds?: number // for timer (per-set, if timed)
  equipment: Equipment[]
  knee_safety: KneeSafety
  cues?: string[]
  good_for: ('legs' | 'glutes' | 'back' | 'shoulders' | 'arms' | 'core' | 'full_body')[]
}

// Returned by the builder -- exercise + how many sets to do
export interface ProgrammedWarmup {
  exercise: WarmupExercise
  sets: number
}

export const WARMUP_LIBRARY: WarmupExercise[] = [
  // ─── LOWER BODY / GLUTE ACTIVATION ──────────────────────────────────────
  {
    id: 'wu-glute-bridge',
    name: 'Bodyweight Glute Bridge',
    target: 'lower_body',
    type: 'activation',
    duration: '15 reps',
    est_per_set_seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Squeeze glutes at top', 'Drive through heels', 'Don\'t hyperextend back'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'wu-clamshell',
    name: 'Clamshell',
    target: 'hips',
    type: 'activation',
    duration: '12 each side',
    est_per_set_seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Keep feet together', 'Rotate from hip, not back', 'Slow and controlled'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'wu-banded-lateral-walk',
    name: 'Banded Lateral Walk',
    target: 'hips',
    type: 'activation',
    duration: '10 steps each direction',
    est_per_set_seconds: 30,
    equipment: ['mini_band'],
    knee_safety: 'knee_safe',
    cues: ['Stay low in quarter squat', 'Push knees out against band', 'Controlled steps'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'wu-fire-hydrant',
    name: 'Fire Hydrant',
    target: 'hips',
    type: 'activation',
    duration: '10 each side',
    est_per_set_seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Keep core tight', 'Lift from the hip', 'Don\'t shift weight to one side'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'wu-donkey-kick',
    name: 'Donkey Kick',
    target: 'lower_body',
    type: 'activation',
    duration: '10 each side',
    est_per_set_seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Keep knee at 90 degrees', 'Squeeze glute at top', 'Don\'t arch lower back'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'wu-hip-circle',
    name: 'Standing Hip Circle',
    target: 'hips',
    type: 'mobility',
    duration: '10 each direction per leg',
    est_per_set_seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Big slow circles', 'Hold wall for balance', 'Full range of motion'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'wu-leg-swing-fb',
    name: 'Leg Swing (front-to-back)',
    target: 'hips',
    type: 'dynamic_stretch',
    duration: '10 each leg',
    est_per_set_seconds: 40,
    seconds: 20,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Hold wall for balance', 'Keep standing leg straight', 'Controlled swing'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'wu-leg-swing-ss',
    name: 'Leg Swing (side-to-side)',
    target: 'hips',
    type: 'dynamic_stretch',
    duration: '10 each leg',
    est_per_set_seconds: 40,
    seconds: 20,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Face the wall', 'Swing across body', 'Gradually increase range'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'wu-walking-knee-hug',
    name: 'Walking Knee Hug',
    target: 'hips',
    type: 'dynamic_stretch',
    duration: '10 each leg',
    est_per_set_seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Pull knee to chest', 'Stand tall', 'Rise onto toes on standing leg'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'wu-single-leg-glute-bridge',
    name: 'Single-Leg Glute Bridge',
    target: 'lower_body',
    type: 'activation',
    duration: '8 each side',
    est_per_set_seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Extend one leg', 'Drive through planted heel', 'Keep hips level'],
    good_for: ['legs', 'glutes'],
  },
  {
    id: 'wu-banded-monster-walk',
    name: 'Banded Monster Walk',
    target: 'hips',
    type: 'activation',
    duration: '10 steps each direction',
    est_per_set_seconds: 30,
    equipment: ['mini_band'],
    knee_safety: 'knee_safe',
    cues: ['Quarter squat position', 'Step forward and out', 'Keep tension on band'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'wu-ankle-circle',
    name: 'Ankle Circle',
    target: 'ankles',
    type: 'mobility',
    duration: '10 each direction per foot',
    est_per_set_seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    good_for: ['legs', 'full_body'],
  },
  {
    id: 'wu-tke',
    name: 'Terminal Knee Extension (TKE)',
    target: 'lower_body',
    type: 'activation',
    duration: '12 each leg',
    est_per_set_seconds: 40,
    equipment: ['resistance_band'],
    knee_safety: 'knee_safe',
    cues: ['Band behind knee', 'Lock out knee against resistance', 'Great for VMO activation'],
    good_for: ['legs', 'glutes'],
  },

  // ─── UPPER BODY ─────────────────────────────────────────────────────────
  {
    id: 'wu-arm-circle',
    name: 'Arm Circles (small to large)',
    target: 'shoulders',
    type: 'mobility',
    duration: '10 each direction',
    est_per_set_seconds: 30,
    seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Start small, gradually bigger', 'Keep arms straight'],
    good_for: ['shoulders', 'arms', 'back', 'full_body'],
  },
  {
    id: 'wu-band-pull-apart',
    name: 'Band Pull-Apart',
    target: 'upper_body',
    type: 'activation',
    duration: '15 reps',
    est_per_set_seconds: 30,
    equipment: ['resistance_band'],
    knee_safety: 'knee_safe',
    cues: ['Squeeze shoulder blades together', 'Arms at shoulder height', 'Controlled return'],
    good_for: ['shoulders', 'back', 'full_body'],
  },
  {
    id: 'wu-band-dislocate',
    name: 'Band Shoulder Pass-Through',
    target: 'shoulders',
    type: 'mobility',
    duration: '10 reps',
    est_per_set_seconds: 30,
    equipment: ['resistance_band'],
    knee_safety: 'knee_safe',
    cues: ['Wide grip', 'Straight arms overhead and behind', 'Go slow'],
    good_for: ['shoulders', 'back', 'arms'],
  },
  {
    id: 'wu-scapular-pushup',
    name: 'Scapular Push-Up',
    target: 'upper_body',
    type: 'activation',
    duration: '10 reps',
    est_per_set_seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Push-up position', 'Only move shoulder blades', 'Protract and retract'],
    good_for: ['shoulders', 'back', 'arms'],
  },
  {
    id: 'wu-wall-slide',
    name: 'Wall Slide (Wall Angel)',
    target: 'shoulders',
    type: 'mobility',
    duration: '10 reps',
    est_per_set_seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Back flat against wall', 'Slide arms up and down', 'Keep contact with wall'],
    good_for: ['shoulders', 'back'],
  },
  {
    id: 'wu-cat-cow',
    name: 'Cat-Cow',
    target: 'thoracic',
    type: 'mobility',
    duration: '10 cycles',
    est_per_set_seconds: 45,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Arch and round spine', 'Move segment by segment', 'Breathe with movement'],
    good_for: ['back', 'core', 'full_body'],
  },
  {
    id: 'wu-thread-needle',
    name: 'Thread the Needle',
    target: 'thoracic',
    type: 'mobility',
    duration: '8 each side',
    est_per_set_seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['From all fours', 'Reach under and rotate', 'Follow hand with eyes'],
    good_for: ['back', 'shoulders', 'full_body'],
  },
  {
    id: 'wu-yt-raise',
    name: 'Prone Y-T-W Raise',
    target: 'upper_body',
    type: 'activation',
    duration: '5 each position',
    est_per_set_seconds: 45,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Lie face down', 'Lift arms in Y, T, then W shapes', 'Squeeze shoulder blades'],
    good_for: ['shoulders', 'back'],
  },
  {
    id: 'wu-wrist-circle',
    name: 'Wrist Circles',
    target: 'wrists',
    type: 'mobility',
    duration: '10 each direction',
    est_per_set_seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    good_for: ['arms'],
  },

  // ─── FULL BODY / GENERAL ───────────────────────────────────────────────
  {
    id: 'wu-inchworm',
    name: 'Inchworm',
    target: 'full_body',
    type: 'dynamic_stretch',
    duration: '6 reps',
    est_per_set_seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Walk hands out to plank', 'Walk feet to hands', 'Keep legs as straight as possible'],
    good_for: ['full_body', 'core', 'shoulders'],
  },
  {
    id: 'wu-bird-dog',
    name: 'Bird Dog',
    target: 'core',
    type: 'activation',
    duration: '8 each side',
    est_per_set_seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Extend opposite arm and leg', 'Keep hips square', 'Slow and controlled'],
    good_for: ['core', 'back', 'full_body'],
  },
  {
    id: 'wu-dead-bug',
    name: 'Dead Bug',
    target: 'core',
    type: 'activation',
    duration: '8 each side',
    est_per_set_seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Back pressed to floor', 'Lower opposite arm and leg', 'Don\'t let back arch'],
    good_for: ['core', 'full_body'],
  },
  {
    id: 'wu-bear-crawl',
    name: 'Bear Crawl',
    target: 'full_body',
    type: 'activation',
    duration: '20 feet forward and back',
    est_per_set_seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Knees hover 1 inch off ground', 'Opposite hand and foot move together', 'Keep hips low'],
    good_for: ['core', 'shoulders', 'full_body'],
  },
  {
    id: 'wu-half-kneeling-hip-flexor',
    name: 'Half-Kneeling Hip Flexor Stretch',
    target: 'hips',
    type: 'dynamic_stretch',
    duration: '30s each side',
    est_per_set_seconds: 40,
    seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Pad under back knee', 'Squeeze glute on stretching side', 'Tall posture'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'wu-pallof-press',
    name: 'Pallof Press (light band)',
    target: 'core',
    type: 'activation',
    duration: '10 each side',
    est_per_set_seconds: 40,
    equipment: ['resistance_band'],
    knee_safety: 'knee_safe',
    cues: ['Resist rotation', 'Press band straight out from chest', 'Brace core'],
    good_for: ['core', 'full_body'],
  },
  {
    id: 'wu-pelvic-tilt',
    name: 'Pelvic Tilt',
    target: 'core',
    type: 'activation',
    duration: '10 reps',
    est_per_set_seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Lie on back, knees bent', 'Flatten lower back to floor', 'Engage deep core'],
    good_for: ['core', 'full_body'],
  },
]

// ─── Adaptive warm-up builder ─────────────────────────────────────────────

export type WarmupFocus = 'balanced' | 'dynamic' | 'mobility' | 'activation'

interface BuildWarmupOptions {
  targetMinutes: number
  workoutFocus: ('legs' | 'glutes' | 'back' | 'shoulders' | 'arms' | 'core' | 'full_body')[]
  focus?: WarmupFocus
  kneeFlag?: boolean
}

export function buildAdaptiveWarmup(options: BuildWarmupOptions): ProgrammedWarmup[] {
  const { targetMinutes, workoutFocus, focus, kneeFlag } = options
  const targetSeconds = targetMinutes * 60

  // Filter out knee-unsafe exercises if flagged
  let pool = kneeFlag
    ? WARMUP_LIBRARY.filter(e => e.knee_safety !== 'knee_avoid')
    : [...WARMUP_LIBRARY]

  // Filter by focus type if specified (balanced uses the full pool)
  if (focus && focus !== 'balanced') {
    const typeMap: Record<string, WarmupExercise['type'][]> = {
      dynamic: ['dynamic_stretch', 'cardio'],
      mobility: ['mobility'],
      activation: ['activation'],
    }
    const types = typeMap[focus]
    if (types) {
      const focused = pool.filter(e => types.includes(e.type))
      if (focused.length >= 3) pool = focused
    }
  }

  // Score exercises by relevance to today's workout
  const scored = pool.map(exercise => {
    let score = 0
    for (const f of workoutFocus) {
      if (exercise.good_for.includes(f)) score += 2
    }
    if (exercise.type === 'activation') score += 1
    score += Math.random() * 0.5
    return { exercise, score }
  })

  scored.sort((a, b) => b.score - a.score)

  // Pick 4-6 exercises (not 12!) and give them proper volume (2 sets each)
  // A real warm-up is fewer movements done with enough reps to actually warm up
  const maxExercises = targetMinutes <= 5 ? 4 : targetMinutes <= 10 ? 5 : 6
  const selected: ProgrammedWarmup[] = []
  let totalTime = 0
  const usedTypes = new Set<string>()

  // First pass: ensure type variety
  // For 'balanced' or default: guarantee at least one activation, one dynamic, one mobility
  const requiredTypes: WarmupExercise['type'][] =
    (!focus || focus === 'balanced')
      ? ['activation', 'dynamic_stretch', 'mobility']
      : []

  for (const reqType of requiredTypes) {
    const match = scored.find(s => s.exercise.type === reqType && !selected.some(sel => sel.exercise.id === s.exercise.id))
    if (match) {
      const sets = 2
      const time = match.exercise.est_per_set_seconds * sets
      if (totalTime + time <= targetSeconds + 30) {
        selected.push({ exercise: match.exercise, sets })
        totalTime += time
        usedTypes.add(match.exercise.type)
      }
    }
  }

  // If no required types (focused mode), pick one of each available type
  if (requiredTypes.length === 0) {
    for (const { exercise } of scored) {
      if (selected.length >= maxExercises) break
      if (!usedTypes.has(exercise.type)) {
        const sets = 2
        const time = exercise.est_per_set_seconds * sets
        if (totalTime + time <= targetSeconds + 30) {
          selected.push({ exercise, sets })
          totalTime += time
          usedTypes.add(exercise.type)
        }
      }
    }
  }

  // Second pass: fill remaining with highest-scored
  for (const { exercise } of scored) {
    if (selected.length >= maxExercises) break
    if (selected.some(s => s.exercise.id === exercise.id)) continue

    // Determine sets: 2 if we have time, 1 if tight
    const timeFor2 = exercise.est_per_set_seconds * 2
    const timeFor1 = exercise.est_per_set_seconds

    if (totalTime + timeFor2 <= targetSeconds + 30) {
      selected.push({ exercise, sets: 2 })
      totalTime += timeFor2
    } else if (totalTime + timeFor1 <= targetSeconds + 30) {
      selected.push({ exercise, sets: 1 })
      totalTime += timeFor1
    }
  }

  return selected
}
