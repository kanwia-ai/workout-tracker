// Mobility routine pools grouped by section.
//
// Each section corresponds to one card on the Mobility tab. A section holds a
// pool of 3-5 routines; the picker selects one deterministically based on the
// local day-of-year so the routine is stable within a day but cycles over time.
//
// The `MobilityExercise` shape mirrors what MobilityRoutines.tsx already renders
// (name/duration/seconds/cue). Keep it in sync with the component.

export interface MobilityExercise {
  name: string
  duration: string
  seconds?: number
  cue: string
}

export interface MobilityRoutine {
  id: string
  title: string
  duration: string
  description: string
  minutes: number
  exercises: MobilityExercise[]
}

export interface MobilitySection {
  id: string
  title: string
  emoji: string
  description: string
  routines: MobilityRoutine[]
}

export const MOBILITY_SECTIONS: MobilitySection[] = [
  {
    id: 'hip-mobility',
    title: 'Hip Mobility',
    emoji: '\u{1F9D8}',
    description: 'Open up tight hips from sitting all day. Great before leg day or as a standalone routine. Targets hip flexors, adductors, external rotators, and glute activation.',
    routines: [
      {
        id: 'hip-90-90-flow',
        title: '90/90 flow',
        duration: '10-12 min',
        minutes: 11,
        description: 'A seated 90/90 progression that opens internal and external hip rotation, then finishes with a gentle flexor stretch.',
        exercises: [
          { name: '90/90 Hip Stretch', duration: '45s each side', seconds: 45, cue: 'Sit tall, both legs at 90 degrees. Breathe into the stretch.' },
          { name: '90/90 Transition (lift-overs)', duration: '6 each direction', cue: 'Windshield-wiper knees side to side. Keep chest tall, move from the hips.' },
          { name: 'Half-Kneeling Hip Flexor Stretch', duration: '30s each side', seconds: 30, cue: 'Pad under back knee, squeeze back glute, lean forward gently.' },
          { name: 'Pigeon Pose', duration: '45s each side', seconds: 45, cue: 'Square hips, sink down. Use figure-4 if knee-sensitive.' },
          { name: 'Butterfly Stretch', duration: '45s', seconds: 45, cue: 'Soles of feet together, sit tall, gentle press with elbows.' },
          { name: 'Happy Baby Pose', duration: '30s', seconds: 30, cue: 'Grab outside of feet, pull knees toward armpits, rock side to side.' },
        ],
      },
      {
        id: 'hip-deep-squat-series',
        title: 'deep squat series',
        duration: '8-10 min',
        minutes: 9,
        description: 'Builds comfort in the bottom of a squat. Good before lower-body lifts when ankles and adductors feel locked up.',
        exercises: [
          { name: 'Deep Squat Hang', duration: '45s', seconds: 45, cue: 'Heels down, elbows inside knees, pry gently. Hold a post if you need balance.' },
          { name: 'Cossack Squat', duration: '6 each side', cue: 'Shift weight side to side. Keep the straight leg long, toes up.' },
          { name: 'Frog Stretch', duration: '45s', seconds: 45, cue: 'On all fours, knees wide. Rock hips back and forward slowly.' },
          { name: 'Adductor Rockback', duration: '8 each side', cue: 'One leg out to the side, rock hips back. Feel the inner thigh lengthen.' },
          { name: 'Standing Figure-4 Hold', duration: '30s each side', seconds: 30, cue: 'Ankle on opposite knee, sit into the standing leg. Wall for balance.' },
        ],
      },
      {
        id: 'hip-flexor-reset',
        title: 'hip flexor reset',
        duration: '7-9 min',
        minutes: 8,
        description: 'Desk-worker special: lengthens the front of the hip and wakes the glutes so extension feels free again.',
        exercises: [
          { name: 'Couch Stretch', duration: '45s each side', seconds: 45, cue: 'Back foot up against wall or couch, front foot planted. Squeeze the back glute hard.' },
          { name: 'Half-Kneeling Hip Flexor Stretch', duration: '30s each side', seconds: 30, cue: 'Tall chest, tuck tailbone, drive the back hip forward. Do not let the low back arch.' },
          { name: 'Glute Bridge', duration: '12 reps', cue: 'Drive through heels, squeeze glutes at the top. Ribs down.' },
          { name: 'Single-Leg Glute Bridge', duration: '8 each side', cue: 'Other knee pulled toward chest. Push the planted heel into the floor.' },
          { name: 'Standing Hip Circle', duration: '10 each direction per leg', cue: 'Big slow circles. Hold wall for balance.' },
          { name: 'Banded Clamshell', duration: '12 each side', cue: 'Keep feet together, rotate from hip. Slow and controlled.' },
        ],
      },
      {
        id: 'hip-rotation-control',
        title: 'rotation & control',
        duration: '9-11 min',
        minutes: 10,
        description: 'Active control work for the hip joint. Less stretching, more ownership of the end ranges you do have.',
        exercises: [
          { name: 'Hip CARs (Controlled Articular Rotation)', duration: '4 each direction per leg', cue: 'On all fours or standing. Slowest-possible circle through full range.' },
          { name: 'Hip Airplane', duration: '6 each side', cue: 'Hinge over standing leg, rotate hip open then closed. Wall for balance.' },
          { name: 'Fire Hydrant', duration: '10 each side', cue: 'Keep core tight, lift from the hip. No spinal rotation.' },
          { name: 'Cossack Squat (slow)', duration: '5 each side', cue: 'Three-count down, pause, drive up. Heels down.' },
          { name: 'Leg Swing (front-to-back)', duration: '10 each leg', cue: 'Hold wall for balance. Controlled swing, gradually increase range.' },
          { name: 'Leg Swing (side-to-side)', duration: '10 each leg', cue: 'Face the wall. Swing across body.' },
        ],
      },
    ],
  },
  {
    id: 'back-spine',
    title: 'Back & Spine',
    emoji: '\u{1F9B4}',
    description: 'Release tension in the thoracic spine, lower back, and surrounding muscles. Essential if you sit at a desk or feel "tight as a knot."',
    routines: [
      {
        id: 'spine-thoracic-unlock',
        title: 'thoracic unlock',
        duration: '9-11 min',
        minutes: 10,
        description: 'Targets the upper-back rotation and extension that collapses after a long desk day.',
        exercises: [
          { name: 'Cat-Cow (slow)', duration: '10 slow cycles', cue: 'Hold each position 3 seconds. Move through the entire spine.' },
          { name: 'Thread the Needle', duration: '8 each side', cue: 'From all fours, reach under and rotate. Follow hand with eyes.' },
          { name: 'Thoracic Spine Rotation', duration: '8 each side', cue: 'Hand behind head, rotate open. Move from upper back, not lower.' },
          { name: 'Foam Roll Upper Back', duration: '60s', seconds: 60, cue: 'Roller under upper back, arms crossed. Roll mid to upper back slowly.' },
          { name: 'Open Book Stretch', duration: '8 each side', cue: 'Side-lying, knees stacked. Sweep top arm open, follow with your eyes.' },
          { name: 'Cobra / Upward Dog', duration: '20s', seconds: 20, cue: 'Hips on floor, press up through hands, open chest.' },
        ],
      },
      {
        id: 'spine-low-back-decompress',
        title: 'low-back decompress',
        duration: '8-10 min',
        minutes: 9,
        description: 'Low-back soothing flow. Good after deadlifts, long flights, or a bad sleep.',
        exercises: [
          { name: 'Knees-to-Chest Hug', duration: '30s', seconds: 30, cue: 'Lie on back, hug both knees to chest, rock gently side to side.' },
          { name: 'Supine Spinal Twist', duration: '30s each side', seconds: 30, cue: 'Lie on back, drop knees to one side, look opposite direction.' },
          { name: 'Child\'s Pose', duration: '45s', seconds: 45, cue: 'Knees wide, reach arms forward, sink hips to heels.' },
          { name: 'Cat-Cow', duration: '10 cycles', cue: 'Arch and round spine, move segment by segment.' },
          { name: 'Dead Bug', duration: '8 each side', cue: 'Low back pressed into floor. Opposite arm and leg extend slowly.' },
          { name: 'Bird Dog', duration: '8 each side', cue: 'Extend opposite arm and leg. Keep hips square, slow and controlled.' },
        ],
      },
      {
        id: 'spine-desk-worker-reset',
        title: 'desk-worker reset',
        duration: '7-9 min',
        minutes: 8,
        description: 'Undoes the seated slouch: extends the mid-back, decompresses the low back, recruits deep core.',
        exercises: [
          { name: 'Prone Press-Up', duration: '10 slow reps', cue: 'Hips stay down, press chest up gently. Exhale at the top.' },
          { name: 'Child\'s Pose to Cobra Flow', duration: '8 cycles', cue: 'Flow between the two with breath. Move segment by segment.' },
          { name: 'Thread the Needle', duration: '8 each side', cue: 'From all fours, reach under and rotate. Keep hips over knees.' },
          { name: 'Seated Thoracic Rotation', duration: '8 each side', cue: 'Cross arms over chest, rotate from mid-back. Hips stay square.' },
          { name: 'Dead Bug', duration: '8 each side', cue: 'Low back pressed into floor. Opposite arm and leg extend slowly.' },
          { name: 'Glute Bridge', duration: '12 reps', cue: 'Drive through heels, squeeze glutes at the top. Ribs down.' },
        ],
      },
      {
        id: 'spine-full-segmental-flow',
        title: 'full segmental flow',
        duration: '10-12 min',
        minutes: 11,
        description: 'A longer sequence that moves the entire spine: flexion, extension, rotation, side-bending.',
        exercises: [
          { name: 'Cat-Cow (slow)', duration: '10 slow cycles', cue: 'Hold each position 3 seconds. Move through the entire spine.' },
          { name: 'Thread the Needle', duration: '8 each side', cue: 'From all fours, reach under and rotate. Follow hand with eyes.' },
          { name: 'Side-Lying Rib Reach', duration: '30s each side', seconds: 30, cue: 'Bottom arm long, top arm sweeps overhead. Breathe into the side ribs.' },
          { name: 'Cobra / Upward Dog', duration: '20s', seconds: 20, cue: 'Hips on floor, press up through hands, open chest.' },
          { name: 'Child\'s Pose', duration: '45s', seconds: 45, cue: 'Knees wide, reach arms forward, sink hips to heels.' },
          { name: 'Supine Spinal Twist', duration: '30s each side', seconds: 30, cue: 'Lie on back, drop knees to one side, look opposite direction.' },
          { name: 'Bird Dog', duration: '8 each side', cue: 'Extend opposite arm and leg. Keep hips square, slow and controlled.' },
        ],
      },
    ],
  },
  {
    id: 'general-flexibility',
    title: 'General Flexibility',
    emoji: '\u{1F938}',
    description: 'Full-body stretch and flexibility routine. Covers hips, shoulders, back, and legs. Perfect for rest days or after any workout.',
    routines: [
      {
        id: 'general-full-body-stretch',
        title: 'full-body stretch',
        duration: '9-11 min',
        minutes: 10,
        description: 'Classic static stretch session that hits every major region. Great wind-down before bed.',
        exercises: [
          { name: 'Downward Dog', duration: '30s', seconds: 30, cue: 'Inverted V, push hips up and back, pedal feet.' },
          { name: 'Half-Kneeling Hip Flexor Stretch', duration: '30s each side', seconds: 30, cue: 'Pad under back knee, squeeze glute, tall posture.' },
          { name: 'Pigeon Pose', duration: '45s each side', seconds: 45, cue: 'Square hips, sink down gently.' },
          { name: 'Standing Hamstring Stretch', duration: '30s each side', seconds: 30, cue: 'Foot on low surface, hinge at hips, keep back flat.' },
          { name: 'Doorway Chest Stretch', duration: '30s each side', seconds: 30, cue: 'Arm on doorframe at 90 degrees, step through.' },
          { name: 'Supine Spinal Twist', duration: '30s each side', seconds: 30, cue: 'Lie on back, drop knees to one side, look opposite.' },
          { name: 'Deep Breathing (4-4-6)', duration: '60s', seconds: 60, cue: 'Inhale 4s, hold 4s, exhale 6s. Belly breathing, close eyes.' },
        ],
      },
      {
        id: 'general-movement-prep',
        title: 'movement prep',
        duration: '7-9 min',
        minutes: 8,
        description: 'Dynamic warm-up that raises temperature and greases major joints. Use before lifting, running, or sports.',
        exercises: [
          { name: 'Inchworm Walkout', duration: '6 reps', cue: 'Hinge, walk hands to plank, hold 1s, walk feet in. Ribs over hips.' },
          { name: 'World\'s Greatest Stretch', duration: '5 each side', cue: 'Lunge, hand to floor inside foot, rotate up. Feel hip flexor and T-spine.' },
          { name: 'Spiderman Lunge with Reach', duration: '5 each side', cue: 'Step-lunge wide, drop elbow to instep, then rotate top arm to sky.' },
          { name: 'Leg Swing (front-to-back)', duration: '10 each leg', cue: 'Hold wall for balance. Controlled swing, gradually increase range.' },
          { name: 'Arm Circles', duration: '10 each direction', cue: 'Small to big, forward then reverse. Loose and easy.' },
          { name: 'Toy Soldier Walk', duration: '10 each leg', cue: 'Straight-leg kick, opposite hand taps toe. Keep a tall chest.' },
        ],
      },
      {
        id: 'general-upper-body-open',
        title: 'upper-body open-up',
        duration: '8-10 min',
        minutes: 9,
        description: 'Shoulders, chest, neck, and upper back. Especially good for trap tension and forward-head posture.',
        exercises: [
          { name: 'Doorway Chest Stretch', duration: '30s each side', seconds: 30, cue: 'Arm on doorframe at 90 degrees, step through. Tall posture.' },
          { name: 'Wall Slide (Wall Angel)', duration: '10 reps', cue: 'Back flat against wall, slide arms up and down keeping contact.' },
          { name: 'Scapular CARs', duration: '5 each direction', cue: 'Shrug up, back, down, forward. One shoulder at a time, full circle.' },
          { name: 'Band Pull-Apart', duration: '15 reps', cue: 'Arms straight, squeeze shoulder blades together. No shrugging.' },
          { name: 'Upper Trap Stretch', duration: '30s each side', seconds: 30, cue: 'Ear to shoulder, gentle hand pressure on head. Opposite shoulder drops.' },
          { name: 'Chin Tuck', duration: '10 reps', cue: 'Glide head straight back (double chin). Hold 3 seconds each rep.' },
          { name: 'Cross-Body Shoulder Stretch', duration: '20s each arm', seconds: 20, cue: 'Pull arm across chest, do not rotate torso.' },
        ],
      },
      {
        id: 'general-lower-body-length',
        title: 'lower-body lengthen',
        duration: '9-11 min',
        minutes: 10,
        description: 'Posterior chain and legs — hamstrings, calves, glutes, quads. Great after a run or a heavy squat day.',
        exercises: [
          { name: 'Downward Dog', duration: '30s', seconds: 30, cue: 'Inverted V, push hips up and back, pedal feet to stretch calves.' },
          { name: 'Standing Hamstring Stretch', duration: '30s each side', seconds: 30, cue: 'Foot on low surface, hinge at hips, keep back flat.' },
          { name: 'Standing Calf Stretch (wall)', duration: '30s each side', seconds: 30, cue: 'Back leg straight, heel down, lean forward.' },
          { name: 'Standing Quad Stretch', duration: '20s each side', seconds: 20, cue: 'Hold wall for balance, keep knees together, gentle pull.' },
          { name: 'Figure-4 Stretch', duration: '30s each side', seconds: 30, cue: 'Lie on back, ankle on opposite knee, pull bottom leg toward chest.' },
          { name: 'Pigeon Pose', duration: '45s each side', seconds: 45, cue: 'Square hips, sink down. Use figure-4 if knee-sensitive.' },
          { name: 'Seated Forward Fold', duration: '45s', seconds: 45, cue: 'Legs long, hinge from hips. Chase length, not depth.' },
        ],
      },
    ],
  },
]

// Local-timezone day of year, 0-based (Jan 1 = 0, Dec 31 = 364 or 365).
export function dayOfYearLocal(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1)
  const diffMs = date.getTime() - start.getTime()
  const dayMs = 24 * 60 * 60 * 1000
  return Math.floor(diffMs / dayMs)
}

// Deterministic routine pick. Same day-of-year always returns the same routine.
export function pickRoutineForDay(section: MobilitySection, date: Date = new Date()): MobilityRoutine {
  if (section.routines.length === 0) {
    throw new Error(`Section "${section.id}" has no routines`)
  }
  const idx = ((dayOfYearLocal(date) % section.routines.length) + section.routines.length) % section.routines.length
  return section.routines[idx]
}
