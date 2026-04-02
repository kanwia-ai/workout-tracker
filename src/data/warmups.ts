import type { BodyRegion, KneeSafety, Equipment } from '../types'

export interface WarmupExercise {
  id: string
  name: string
  target: BodyRegion | 'hips' | 'shoulders' | 'thoracic' | 'ankles' | 'wrists'
  type: 'dynamic_stretch' | 'activation' | 'mobility' | 'cardio'
  duration: string // "10 each side", "30s", "15 reps"
  seconds?: number // for timer
  equipment: Equipment[]
  knee_safety: KneeSafety
  cues?: string[]
  // Which workout focuses this is good for
  good_for: ('legs' | 'glutes' | 'back' | 'shoulders' | 'arms' | 'core' | 'full_body')[]
}

export const WARMUP_LIBRARY: WarmupExercise[] = [
  // ─── LOWER BODY / GLUTE ACTIVATION ──────────────────────────────────────
  {
    id: 'wu-glute-bridge',
    name: 'Bodyweight Glute Bridge',
    target: 'lower_body',
    type: 'activation',
    duration: '15 reps',
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
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Lie on back, knees bent', 'Flatten lower back to floor', 'Engage deep core'],
    good_for: ['core', 'full_body'],
  },
]

// ─── Adaptive warm-up builder ─────────────────────────────────────────────

export type WarmupFocus = 'dynamic' | 'mobility' | 'activation'

interface BuildWarmupOptions {
  targetMinutes: number
  workoutFocus: ('legs' | 'glutes' | 'back' | 'shoulders' | 'arms' | 'core' | 'full_body')[]
  focus?: WarmupFocus
  kneeFlag?: boolean
}

export function buildAdaptiveWarmup(options: BuildWarmupOptions): WarmupExercise[] {
  const { targetMinutes, workoutFocus, focus, kneeFlag } = options

  // Filter out knee-unsafe exercises if flagged
  let pool = kneeFlag
    ? WARMUP_LIBRARY.filter(e => e.knee_safety !== 'knee_avoid')
    : [...WARMUP_LIBRARY]

  // Filter by focus type if specified
  if (focus) {
    const typeMap: Record<WarmupFocus, WarmupExercise['type'][]> = {
      dynamic: ['dynamic_stretch', 'cardio'],
      mobility: ['mobility'],
      activation: ['activation'],
    }
    const types = typeMap[focus]
    const focused = pool.filter(e => types.includes(e.type))
    // Keep at least some exercises even if focus doesn't match
    if (focused.length >= 3) pool = focused
  }

  // Score exercises by relevance to today's workout
  const scored = pool.map(exercise => {
    let score = 0
    for (const focus of workoutFocus) {
      if (exercise.good_for.includes(focus)) score += 2
    }
    // Bonus for activation exercises (always good)
    if (exercise.type === 'activation') score += 1
    // Small random factor for variety
    score += Math.random() * 0.5
    return { exercise, score }
  })

  // Sort by score (most relevant first)
  scored.sort((a, b) => b.score - a.score)

  // Pick exercises to fill the target time
  // Rough estimate: ~45 seconds per exercise
  const targetCount = Math.max(4, Math.min(12, Math.round((targetMinutes * 60) / 45)))

  // Ensure variety: pick from different types
  const selected: WarmupExercise[] = []
  const usedTypes = new Set<string>()

  // First pass: one of each type that's relevant
  for (const { exercise } of scored) {
    if (selected.length >= targetCount) break
    if (!usedTypes.has(exercise.type) || selected.length < 3) {
      selected.push(exercise)
      usedTypes.add(exercise.type)
    }
  }

  // Second pass: fill remaining with highest-scored
  for (const { exercise } of scored) {
    if (selected.length >= targetCount) break
    if (!selected.includes(exercise)) {
      selected.push(exercise)
    }
  }

  return selected
}
