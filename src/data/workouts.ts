import type { Workout } from '../types'

export const DEFAULT_WORKOUTS: Workout[] = [
  {
    id: 'w-glutes-legs-back',
    title: 'Glutes, Legs & Back',
    emoji: '🦵',
    est_minutes: 60,
    sections: [
      {
        id: 's-mon-main', workout_id: 'w-glutes-legs-back', name: 'Main Lifts', sort_order: 0,
        exercises: [
          { id: 'e-mon-1', exercise_id: 'ex-glute-bridge', sets: 3, reps: '8', rest_seconds: 90, track_weight: true, sort_order: 0 },
          { id: 'e-mon-2', exercise_id: 'ex-walking-lunge', sets: 3, reps: '16', rest_seconds: 60, track_weight: true, sort_order: 1 },
          { id: 'e-mon-3', exercise_id: 'ex-leg-curl', sets: 3, reps: '12', rest_seconds: 60, track_weight: true, sort_order: 2 },
          { id: 'e-mon-4', exercise_id: 'ex-lat-pulldown', sets: 3, reps: '15', rest_seconds: 60, track_weight: true, sort_order: 3 },
          { id: 'e-mon-5', exercise_id: 'ex-cable-row', sets: 3, reps: '10', rest_seconds: 60, track_weight: true, sort_order: 4 },
        ],
      },
      {
        id: 's-mon-core', workout_id: 'w-glutes-legs-back', name: 'Core', sort_order: 1,
        exercises: [
          { id: 'e-mon-6', exercise_id: 'ex-plank', sets: 3, reps: 'to failure', rest_seconds: 45, track_weight: false, sort_order: 0 },
        ],
      },
    ],
  },
  {
    id: 'w-shoulders-arms',
    title: 'Shoulders & Arms',
    emoji: '💪',
    est_minutes: 55,
    sections: [
      {
        id: 's-tue-main', workout_id: 'w-shoulders-arms', name: 'Main Lifts', sort_order: 0,
        exercises: [
          { id: 'e-tue-1', exercise_id: 'ex-shoulder-press', sets: 3, reps: '12', rest_seconds: 60, track_weight: true, sort_order: 0 },
          { id: 'e-tue-2', exercise_id: 'ex-lateral-raise', sets: 3, reps: '15', rest_seconds: 45, track_weight: true, sort_order: 1 },
          { id: 'e-tue-3', exercise_id: 'ex-tricep-extension', sets: 3, reps: '15', rest_seconds: 45, track_weight: true, sort_order: 2 },
          { id: 'e-tue-4', exercise_id: 'ex-dumbbell-curl', sets: 3, reps: '10 each arm', rest_seconds: 45, track_weight: true, sort_order: 3 },
          { id: 'e-tue-5', exercise_id: 'ex-rear-delt-fly', sets: 3, reps: '15', rest_seconds: 45, track_weight: true, sort_order: 4 },
        ],
      },
      {
        id: 's-tue-core', workout_id: 'w-shoulders-arms', name: 'Core', sort_order: 1,
        exercises: [
          { id: 'e-tue-6', exercise_id: 'ex-scissors', sets: 3, reps: '30 sec', rest_seconds: 15, track_weight: false, work_seconds: 30, sort_order: 0 },
          { id: 'e-tue-7', exercise_id: 'ex-toe-touches', sets: 3, reps: '15', rest_seconds: 15, track_weight: false, sort_order: 1 },
          { id: 'e-tue-8', exercise_id: 'ex-side-plank', sets: 3, reps: '20 sec each', rest_seconds: 15, track_weight: false, work_seconds: 20, sort_order: 2 },
        ],
      },
    ],
  },
  {
    id: 'w-heavy-legs',
    title: 'Heavy Legs',
    emoji: '🏋️',
    est_minutes: 65,
    sections: [
      {
        id: 's-thu-main', workout_id: 'w-heavy-legs', name: 'Main Lifts', note: 'Slow on the way down, explode up!', sort_order: 0,
        exercises: [
          { id: 'e-thu-1', exercise_id: 'ex-leg-press', sets: 4, reps: '10 (slow down, explode up)', rest_seconds: 120, track_weight: true, sort_order: 0 },
          { id: 'e-thu-2', exercise_id: 'ex-rdl', sets: 3, reps: '8', rest_seconds: 90, track_weight: true, sort_order: 1 },
          { id: 'e-thu-3', exercise_id: 'ex-hip-adduction', sets: 3, reps: '12', rest_seconds: 60, track_weight: true, note: 'if available', sort_order: 2 },
          { id: 'e-thu-4', exercise_id: 'ex-reverse-lunge-elevated', sets: 3, reps: '6-8 (heavy, controlled)', rest_seconds: 90, track_weight: true, sort_order: 3 },
          { id: 'e-thu-5', exercise_id: 'ex-hip-abduction', sets: 3, reps: '15', rest_seconds: 60, track_weight: true, sort_order: 4 },
          { id: 'e-thu-6', exercise_id: 'ex-cable-kickback', sets: 2, reps: '15 (slow!)', rest_seconds: 45, track_weight: true, sort_order: 5 },
        ],
      },
      {
        id: 's-thu-core', workout_id: 'w-heavy-legs', name: 'Core Circuit', note: '3 Rounds, No Break', sort_order: 1,
        exercises: [
          { id: 'e-thu-7', exercise_id: 'ex-dead-bug', sets: 3, reps: '10 each side', rest_seconds: 0, track_weight: false, sort_order: 0 },
          { id: 'e-thu-8', exercise_id: 'ex-bicycle-crunch', sets: 3, reps: '20 (10 each)', rest_seconds: 0, track_weight: false, sort_order: 1 },
          { id: 'e-thu-9', exercise_id: 'ex-plank', sets: 3, reps: '30 sec', rest_seconds: 0, track_weight: false, work_seconds: 30, sort_order: 2 },
        ],
      },
    ],
  },
  {
    id: 'w-back-focus',
    title: 'Back Focus',
    emoji: '🔙',
    est_minutes: 50,
    sections: [
      {
        id: 's-fri-main', workout_id: 'w-back-focus', name: 'Main Lifts', sort_order: 0,
        exercises: [
          { id: 'e-fri-1', exercise_id: 'ex-lat-pulldown-wide', sets: 3, reps: '15', rest_seconds: 60, track_weight: true, sort_order: 0 },
          { id: 'e-fri-2', exercise_id: 'ex-lat-pullover', sets: 3, reps: '12', rest_seconds: 60, track_weight: true, note: 'YouTube form if unsure', sort_order: 1 },
          { id: 'e-fri-3', exercise_id: 'ex-single-arm-cable-row', sets: 3, reps: '15', rest_seconds: 60, track_weight: true, sort_order: 2 },
          { id: 'e-fri-4', exercise_id: 'ex-face-pull', sets: 3, reps: '12', rest_seconds: 45, track_weight: true, sort_order: 3 },
        ],
      },
      {
        id: 's-fri-core', workout_id: 'w-back-focus', name: 'Core', sort_order: 1,
        exercises: [
          { id: 'e-fri-5', exercise_id: 'ex-leg-raise', sets: 3, reps: '20', rest_seconds: 30, track_weight: false, sort_order: 0 },
        ],
      },
    ],
  },
  {
    id: 'w-home-circuit',
    title: 'At-Home Circuit',
    emoji: '🏠',
    est_minutes: 45,
    is_circuit: true,
    sections: [
      {
        id: 's-sat-c1', workout_id: 'w-home-circuit', name: 'Circuit 1', sort_order: 0,
        exercises: [
          { id: 'e-sat-1', exercise_id: 'ex-goblet-squat', sets: 3, reps: '15', rest_seconds: 0, track_weight: true, sort_order: 0 },
          { id: 'e-sat-2', exercise_id: 'ex-arnold-press', sets: 3, reps: '10', rest_seconds: 0, track_weight: true, sort_order: 1 },
          { id: 'e-sat-3', exercise_id: 'ex-dumbbell-curl', sets: 3, reps: '10 each arm', rest_seconds: 60, track_weight: true, note: 'rest after round', sort_order: 2 },
        ],
      },
      {
        id: 's-sat-c2', workout_id: 'w-home-circuit', name: 'Circuit 2', sort_order: 1,
        exercises: [
          { id: 'e-sat-4', exercise_id: 'ex-kb-rdl', sets: 3, reps: '10', rest_seconds: 0, track_weight: true, sort_order: 0 },
          { id: 'e-sat-5', exercise_id: 'ex-floor-press', sets: 3, reps: '15 (slow!)', rest_seconds: 0, track_weight: true, sort_order: 1 },
          { id: 'e-sat-6', exercise_id: 'ex-split-squat-kb', sets: 3, reps: '10', rest_seconds: 60, track_weight: true, note: 'rest after round', sort_order: 2 },
        ],
      },
      {
        id: 's-sat-c3', workout_id: 'w-home-circuit', name: 'Circuit 3', sort_order: 2,
        exercises: [
          { id: 'e-sat-7', exercise_id: 'ex-kb-swing', sets: 3, reps: '16', rest_seconds: 0, track_weight: true, sort_order: 0 },
          { id: 'e-sat-8', exercise_id: 'ex-db-rear-delt-fly', sets: 3, reps: '12', rest_seconds: 0, track_weight: true, sort_order: 1 },
          { id: 'e-sat-9', exercise_id: 'ex-russian-twist', sets: 3, reps: '20 (10 each)', rest_seconds: 60, track_weight: false, sort_order: 2 },
        ],
      },
    ],
  },
]
