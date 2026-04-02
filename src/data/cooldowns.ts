import type { BodyRegion, KneeSafety, Equipment } from '../types'

export interface CooldownExercise {
  id: string
  name: string
  target: BodyRegion | 'hips' | 'shoulders' | 'thoracic' | 'chest' | 'neck' | 'calves'
  type: 'static_stretch' | 'mobility' | 'recovery' | 'foam_roll'
  duration: string
  seconds?: number
  equipment: Equipment[]
  knee_safety: KneeSafety
  cues?: string[]
  good_for: ('legs' | 'glutes' | 'back' | 'shoulders' | 'arms' | 'core' | 'full_body')[]
}

export const COOLDOWN_LIBRARY: CooldownExercise[] = [
  // ─── LOWER BODY STRETCHES ──────────────────────────────────────────────
  {
    id: 'cd-quad-stretch',
    name: 'Standing Quad Stretch',
    target: 'lower_body',
    type: 'static_stretch',
    duration: '30s each side',
    seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_caution',
    cues: ['Hold wall for balance', 'Keep knees together', 'Gentle pull, don\'t force'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'cd-hamstring-stretch',
    name: 'Standing Hamstring Stretch (foot elevated)',
    target: 'lower_body',
    type: 'static_stretch',
    duration: '30s each side',
    seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Foot on low surface', 'Hinge at hips', 'Keep back flat'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'cd-figure-4',
    name: 'Figure-4 Stretch (supine)',
    target: 'hips',
    type: 'static_stretch',
    duration: '30-45s each side',
    seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Lie on back', 'Ankle on opposite knee', 'Pull bottom leg toward chest'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'cd-pigeon',
    name: 'Pigeon Pose',
    target: 'hips',
    type: 'static_stretch',
    duration: '45-60s each side',
    seconds: 50,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Front shin parallel to mat', 'Square hips', 'Use figure-4 if knee sensitive'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'cd-butterfly',
    name: 'Butterfly Stretch (seated)',
    target: 'hips',
    type: 'static_stretch',
    duration: '30-45s',
    seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Soles of feet together', 'Sit tall', 'Gentle press on knees with elbows'],
    good_for: ['legs', 'glutes'],
  },
  {
    id: 'cd-hip-flexor',
    name: 'Kneeling Hip Flexor Stretch',
    target: 'hips',
    type: 'static_stretch',
    duration: '30-45s each side',
    seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Pad under back knee', 'Squeeze glute', 'Lean gently forward'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'cd-90-90-hip',
    name: '90/90 Hip Stretch',
    target: 'hips',
    type: 'mobility',
    duration: '30-45s each side',
    seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Both legs at 90 degrees', 'Sit tall', 'Great for internal/external rotation'],
    good_for: ['legs', 'glutes'],
  },
  {
    id: 'cd-calf-stretch',
    name: 'Standing Calf Stretch (wall)',
    target: 'calves',
    type: 'static_stretch',
    duration: '30s each side',
    seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Hands on wall', 'Back leg straight, heel down', 'Lean forward'],
    good_for: ['legs', 'full_body'],
  },
  {
    id: 'cd-happy-baby',
    name: 'Happy Baby Pose',
    target: 'hips',
    type: 'static_stretch',
    duration: '45s',
    seconds: 45,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Grab outside of feet', 'Pull knees toward armpits', 'Rock side to side'],
    good_for: ['legs', 'glutes', 'full_body'],
  },
  {
    id: 'cd-frog-stretch',
    name: 'Frog Stretch',
    target: 'hips',
    type: 'static_stretch',
    duration: '45-60s',
    seconds: 50,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['On all fours, knees wide', 'Sink hips back', 'Feel inner thigh stretch'],
    good_for: ['legs', 'glutes'],
  },
  {
    id: 'cd-legs-up-wall',
    name: 'Legs Up the Wall',
    target: 'lower_body',
    type: 'recovery',
    duration: '2-3 min',
    seconds: 120,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Scoot close to wall', 'Legs straight up', 'Close eyes, breathe'],
    good_for: ['legs', 'full_body'],
  },

  // ─── UPPER BODY STRETCHES ─────────────────────────────────────────────
  {
    id: 'cd-chest-stretch',
    name: 'Doorway Chest Stretch',
    target: 'chest',
    type: 'static_stretch',
    duration: '30s each side',
    seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Arm on doorframe at 90 degrees', 'Step through', 'Feel stretch in chest'],
    good_for: ['shoulders', 'arms', 'back'],
  },
  {
    id: 'cd-cross-body-shoulder',
    name: 'Cross-Body Shoulder Stretch',
    target: 'shoulders',
    type: 'static_stretch',
    duration: '30s each arm',
    seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Pull arm across chest', 'Use other hand to press', 'Don\'t rotate torso'],
    good_for: ['shoulders', 'back', 'arms'],
  },
  {
    id: 'cd-tricep-stretch',
    name: 'Overhead Tricep Stretch',
    target: 'upper_body',
    type: 'static_stretch',
    duration: '30s each arm',
    seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Reach behind head', 'Use other hand to press elbow', 'Keep core engaged'],
    good_for: ['arms', 'shoulders'],
  },
  {
    id: 'cd-lat-stretch',
    name: 'Lat Stretch (side bend)',
    target: 'upper_body',
    type: 'static_stretch',
    duration: '30s each side',
    seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Reach arm overhead', 'Lean to opposite side', 'Feel stretch along side'],
    good_for: ['back', 'shoulders'],
  },
  {
    id: 'cd-neck-stretch',
    name: 'Neck Side Bend Stretch',
    target: 'neck',
    type: 'static_stretch',
    duration: '20s each side',
    seconds: 20,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Ear toward shoulder', 'Gentle hand pressure', 'Don\'t force it'],
    good_for: ['shoulders', 'back', 'full_body'],
  },

  // ─── BACK & SPINE ─────────────────────────────────────────────────────
  {
    id: 'cd-childs-pose',
    name: 'Child\'s Pose',
    target: 'thoracic',
    type: 'static_stretch',
    duration: '45-60s',
    seconds: 50,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Knees wide, big toes together', 'Reach arms forward', 'Sink hips to heels'],
    good_for: ['back', 'shoulders', 'full_body'],
  },
  {
    id: 'cd-spinal-twist',
    name: 'Supine Spinal Twist',
    target: 'thoracic',
    type: 'static_stretch',
    duration: '30-45s each side',
    seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Lie on back', 'Drop knees to one side', 'Look opposite direction'],
    good_for: ['back', 'core', 'full_body'],
  },
  {
    id: 'cd-cat-cow-slow',
    name: 'Cat-Cow (slow, held)',
    target: 'thoracic',
    type: 'mobility',
    duration: '8-10 slow cycles',
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Hold each position 3s', 'Move through entire spine', 'Breathe deeply'],
    good_for: ['back', 'core', 'full_body'],
  },
  {
    id: 'cd-knees-to-chest',
    name: 'Knees-to-Chest Hug',
    target: 'lower_body',
    type: 'recovery',
    duration: '30s',
    seconds: 30,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Lie on back', 'Hug both knees to chest', 'Rock gently side to side'],
    good_for: ['back', 'glutes', 'full_body'],
  },

  // ─── FULL BODY RECOVERY ───────────────────────────────────────────────
  {
    id: 'cd-downward-dog',
    name: 'Downward Dog',
    target: 'full_body',
    type: 'static_stretch',
    duration: '30-45s',
    seconds: 40,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Inverted V shape', 'Push hips up and back', 'Pedal feet to loosen calves'],
    good_for: ['legs', 'shoulders', 'back', 'full_body'],
  },
  {
    id: 'cd-cobra',
    name: 'Cobra / Upward Dog',
    target: 'core',
    type: 'static_stretch',
    duration: '20-30s',
    seconds: 25,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Hips on floor', 'Press up through hands', 'Open chest, look up gently'],
    good_for: ['core', 'back', 'full_body'],
  },
  {
    id: 'cd-deep-breathing',
    name: 'Deep Breathing (4-4-6)',
    target: 'full_body',
    type: 'recovery',
    duration: '60s',
    seconds: 60,
    equipment: ['bodyweight'],
    knee_safety: 'knee_safe',
    cues: ['Inhale 4s, hold 4s, exhale 6s', 'Belly breathing', 'Close eyes'],
    good_for: ['full_body'],
  },
  {
    id: 'cd-foam-roll-quads',
    name: 'Foam Roll Quads',
    target: 'lower_body',
    type: 'foam_roll',
    duration: '60s each leg',
    seconds: 60,
    equipment: ['foam_roller'],
    knee_safety: 'knee_safe',
    cues: ['Face down, roller under thighs', 'Roll hip to knee slowly', 'Pause on tender spots'],
    good_for: ['legs', 'glutes'],
  },
  {
    id: 'cd-foam-roll-back',
    name: 'Foam Roll Upper Back',
    target: 'thoracic',
    type: 'foam_roll',
    duration: '60-90s',
    seconds: 75,
    equipment: ['foam_roller'],
    knee_safety: 'knee_safe',
    cues: ['Roller under upper back', 'Arms crossed or behind head', 'Roll mid to upper back'],
    good_for: ['back', 'shoulders'],
  },
]

// ─── Adaptive cool-down builder ───────────────────────────────────────────

interface BuildCooldownOptions {
  targetMinutes: number
  workoutFocus: ('legs' | 'glutes' | 'back' | 'shoulders' | 'arms' | 'core' | 'full_body')[]
  kneeFlag?: boolean
  hasFoamRoller?: boolean
}

export function buildAdaptiveCooldown(options: BuildCooldownOptions): CooldownExercise[] {
  const { targetMinutes, workoutFocus, kneeFlag, hasFoamRoller = false } = options

  let pool = kneeFlag
    ? COOLDOWN_LIBRARY.filter(e => e.knee_safety !== 'knee_avoid')
    : [...COOLDOWN_LIBRARY]

  // Filter out foam roller exercises if not available
  if (!hasFoamRoller) {
    pool = pool.filter(e => e.type !== 'foam_roll')
  }

  // Score by relevance
  const scored = pool.map(exercise => {
    let score = 0
    for (const focus of workoutFocus) {
      if (exercise.good_for.includes(focus)) score += 2
    }
    // Always include at least one recovery exercise
    if (exercise.type === 'recovery') score += 1
    score += Math.random() * 0.5
    return { exercise, score }
  })

  scored.sort((a, b) => b.score - a.score)

  // Estimate ~50 seconds per stretch
  const targetCount = Math.max(4, Math.min(10, Math.round((targetMinutes * 60) / 50)))

  const selected: CooldownExercise[] = []

  // Ensure at least one stretch for the primary worked area
  for (const { exercise } of scored) {
    if (selected.length >= targetCount) break
    if (!selected.includes(exercise)) {
      selected.push(exercise)
    }
  }

  // Always end with deep breathing if time allows
  const breathing = COOLDOWN_LIBRARY.find(e => e.id === 'cd-deep-breathing')
  if (breathing && !selected.includes(breathing) && selected.length < targetCount) {
    selected.push(breathing)
  }

  return selected
}
