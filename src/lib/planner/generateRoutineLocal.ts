// generateRoutineLocal — zero-API rule-based routine composition.
//
// Replaces the `generate_routine` edge function call (which was hitting an
// exhausted Anthropic budget) with deterministic client-side generation for
// warmup / cardio / cooldown routines.
//
// Warmup reuses the clinical generateWarmup output (with the user's
// programming directives re-derived from their profile) and adapts it to
// the Routine schema. Cooldown is a session-focus-driven static-stretch
// list. Cardio is a minutes-bounded steady-state prescription — not
// clinically sophisticated, but it matches what the edge function was
// producing and avoids making the app blank without a review.
//
// If you want smarter cardio programming later, this is where a narrow
// LLM call could slot in while everything else stays local.

import type { Routine, RoutineKind, RoutineExercise } from '../routines'
import type { PlannedSession, MuscleGroup } from '../../types/plan'
import type { UserProgramProfile } from '../../types/profile'
import { interpretProfile } from './interpretProfile'
import { generateWarmup } from './generateWarmup'
import type { SessionType } from '../../types/directives'

// Infer session_type from focus muscle groups (we don't persist session_type
// on PlannedSession, only focus + title + subtitle).
function inferSessionType(session: PlannedSession): SessionType {
  const sub = session.subtitle.toLowerCase()
  if (sub.includes('squat')) return 'lower_squat_focus'
  if (sub.includes('hinge')) return 'lower_hinge_focus'
  if (sub.includes('push')) return 'upper_push'
  if (sub.includes('pull')) return 'upper_pull'
  if (sub.includes('conditioning')) return 'conditioning'
  if (sub.includes('mobility') || sub.includes('rehab')) return 'rehab_mobility'
  if (sub.includes('full')) return sub.includes('a') ? 'full_body_a' : 'full_body_b'
  // Fallback by focus
  const f = session.focus[0]
  if (f === 'quads') return 'lower_squat_focus'
  if (f === 'hamstrings' || f === 'glutes') return 'lower_hinge_focus'
  if (f === 'chest' || f === 'shoulders') return 'upper_push'
  if (f === 'back') return 'upper_pull'
  return 'full_body_a'
}

// ─── Warmup ────────────────────────────────────────────────────────────────
export function buildWarmupRoutine(
  session: PlannedSession,
  profile: UserProgramProfile,
): Routine {
  const directives = interpretProfile(profile)
  const w = generateWarmup({
    session_id: session.id,
    session_type: inferSessionType(session),
    week_number: session.week_number,
    directives,
  })
  const exercises: RoutineExercise[] = w.exercises.map((e) => {
    const ex: RoutineExercise = { name: e.display_name }
    if (e.duration_sec !== undefined) {
      ex.duration_seconds = e.duration_sec * (e.sets ?? 1)
    } else if (e.reps !== undefined) {
      ex.reps = e.sets ? `${e.sets}×${e.reps}` : String(e.reps)
    }
    if (e.cue) ex.notes = e.cue
    return ex
  })
  // Routine schema requires min 2 exercises; pad if the injury layer gave 1.
  if (exercises.length < 2) {
    exercises.push({ name: 'Easy Walk or Bike', duration_seconds: 120, notes: 'Get the heart rate up' })
  }
  return {
    title: `Warmup · ${session.title}`,
    exercises,
  }
}

// ─── Cooldown ──────────────────────────────────────────────────────────────
// Static-stretch list keyed to the session's primary focus muscles.
// 5 items for ~5-6 minutes. Post-workout is the ONLY time static stretching
// belongs (per SMA/ACSM consensus — don't confuse with dynamic warmup).

const COOLDOWN_MAP: Record<MuscleGroup, Array<[string, number, string]>> = {
  quads: [
    ['Standing Quad Stretch', 45, '45s per side'],
    ['Kneeling Hip Flexor Stretch', 45, '45s per side — keep hips square'],
    ['Pigeon Pose', 60, '60s per side'],
  ],
  hamstrings: [
    ['Seated Hamstring Stretch', 60, '60s per side, long spine'],
    ['Supine Figure-4', 45, '45s per side'],
    ['Lying Hamstring + Band', 45, '45s per side'],
  ],
  glutes: [
    ['Pigeon Pose', 60, '60s per side'],
    ['Supine Figure-4', 45, '45s per side'],
    ['Seated Spinal Twist', 45, '45s per side'],
  ],
  calves: [
    ['Wall Calf Stretch', 45, '45s per side, knee straight'],
    ['Soleus Stretch (Bent Knee)', 45, '45s per side'],
  ],
  chest: [
    ['Doorway Pec Stretch', 45, '45s per side'],
    ['Prone Scorpion', 45, '45s per side — gentle'],
  ],
  back: [
    ["Child's Pose", 60, 'Long exhales, relax the ribs'],
    ['Cat / Cow', 30, '8-10 reps, breath with movement'],
    ['Thread the Needle', 45, '45s per side'],
  ],
  shoulders: [
    ['Sleeper Stretch', 45, '45s per side, side-lying'],
    ['Cross-Body Shoulder Stretch', 30, '30s per side'],
    ['Doorway Pec Stretch', 45, '45s per side'],
  ],
  biceps: [
    ['Wall Biceps Stretch', 30, '30s per side'],
    ['Prayer Pose', 30, '30s, forearms + biceps'],
  ],
  triceps: [
    ['Overhead Triceps Stretch', 30, '30s per side'],
  ],
  core: [
    ['Cobra Pose', 45, 'Light back-extension decompression'],
    ["Child's Pose", 45, 'Long exhales'],
  ],
  full_body: [
    ["Child's Pose", 60, 'Long exhales'],
    ['Cat / Cow', 30, '8-10 reps'],
    ['Standing Forward Fold', 45, 'Relax neck, soft knees'],
  ],
  rehab: [
    ["Child's Pose", 60, 'Long exhales'],
    ['Cat / Cow', 30, '8-10 reps'],
  ],
  mobility: [
    ["Child's Pose", 60, 'Long exhales'],
    ['Thread the Needle', 45, '45s per side'],
  ],
}

const UNIVERSAL_COOLDOWN: Array<[string, number, string]> = [
  ["Box Breathing", 120, "4-4-4-4 for 2 min — shift to parasympathetic"],
]

export function buildCooldownRoutine(
  session: PlannedSession,
  profile: UserProgramProfile,
  minutes: number,
): Routine {
  void profile  // not used yet — reserved for injury-aware cooldown in a later pass
  const seen = new Set<string>()
  const picked: Array<[string, number, string]> = []
  for (const group of session.focus) {
    const list = COOLDOWN_MAP[group] ?? []
    for (const entry of list) {
      if (!seen.has(entry[0])) {
        picked.push(entry)
        seen.add(entry[0])
      }
      if (picked.length >= Math.max(3, Math.floor(minutes * 0.8))) break
    }
    if (picked.length >= Math.max(3, Math.floor(minutes * 0.8))) break
  }
  // Always close with box breathing
  for (const u of UNIVERSAL_COOLDOWN) {
    if (!seen.has(u[0])) picked.push(u)
  }
  // Ensure minimum 2 exercises
  if (picked.length < 2) {
    picked.push(["Child's Pose", 60, 'Long exhales'])
  }
  const exercises: RoutineExercise[] = picked.map(([name, dur, notes]) => ({
    name,
    duration_seconds: dur,
    notes,
  }))
  return {
    title: `Cooldown · ${session.title}`,
    exercises,
  }
}

// ─── Cardio ────────────────────────────────────────────────────────────────
// Simple steady-state prescription. The `focusTag` lets callers ask for
// `intervals`, `z2`, `recovery`, etc.; defaults to low-intensity steady state.

export function buildCardioRoutine(
  session: PlannedSession,
  _profile: UserProgramProfile,
  minutes: number,
  focusTag?: string,
): Routine {
  const isLegDay = /squat|hinge|lower/i.test(session.subtitle)
  const tag = focusTag ?? (isLegDay ? 'recovery_low' : 'z2_steady')

  const exercises: RoutineExercise[] = []
  if (tag === 'intervals' || tag === 'hiit') {
    exercises.push(
      { name: 'Easy Warmup (Bike or Row)', duration_seconds: 180, notes: 'RPE 3-4, heart rate ~60%' },
      { name: 'Interval Set — 30s hard / 90s easy', duration_seconds: Math.max(240, (minutes - 6) * 60), notes: 'RPE 8-9 on hard rounds; complete recoveries between' },
      { name: 'Easy Cooldown', duration_seconds: 120, notes: 'Walk or easy spin until heart rate drops below 110' },
    )
  } else if (tag === 'recovery_low' || isLegDay) {
    exercises.push(
      { name: 'Easy Walking or Bike', duration_seconds: minutes * 60, notes: 'RPE 3 — nose-breathing pace, conversational' },
      { name: 'Post-Cardio Mobility', duration_seconds: 90, notes: 'Ankle circles, gentle hip openers' },
    )
  } else {
    exercises.push(
      { name: 'Zone 2 Steady (Bike / Incline Walk / Row)', duration_seconds: minutes * 60, notes: 'RPE 4-5 — can hold conversation' },
      { name: 'Easy Cooldown Walk', duration_seconds: 120, notes: 'Let heart rate drop naturally' },
    )
  }

  return {
    title: tag === 'intervals' ? 'Interval Cardio' : 'Steady Cardio',
    exercises,
  }
}

// ─── Entry ────────────────────────────────────────────────────────────────
export function buildRoutineLocal(
  kind: RoutineKind,
  session: PlannedSession,
  profile: UserProgramProfile,
  minutes: number,
  focusTag?: string,
): Routine {
  if (kind === 'warmup') return buildWarmupRoutine(session, profile)
  if (kind === 'cooldown') return buildCooldownRoutine(session, profile, minutes)
  return buildCardioRoutine(session, profile, minutes, focusTag)
}
