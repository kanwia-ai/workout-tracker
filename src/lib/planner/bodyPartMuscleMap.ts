// Maps the user's tracked BodyParts (left_meniscus, lower_back, etc.) to the
// MuscleGroups whose exercises load that body part. Used by the day-of "anything
// off today?" affordance to identify exercises in today's session that should
// surface a scale/swap prompt.
//
// This is intentionally a coarse mapping — false positives ("knee off → also
// flag back work?") are fine because the user is the one deciding whether to
// scale or swap. False negatives are worse (we want to overshoot rather than
// silently skip an exercise that loads the affected part).
//
// Reasoning per body part:
//   knee/meniscus → loaded by anything bending the knee under load: squats,
//     lunges, leg extensions, hamstring curls (knee joint stress), calf raises
//     (passes through knee), and walking/jumping conditioning.
//   lower_back → loaded by any axial loading or hip hinge: deadlifts, RDLs,
//     squats, rows (especially bent-over), overhead pressing (compresses spine).
//     Also anti-extension core work.
//   upper_back → loaded by all pulling, overhead work, and shrugs.
//   hip_flexors → loaded by hip flexion under load (leg raises, sit-ups) and
//     squat depth.
//   shoulder → loaded by all pressing, pulling, raises, flies.
//   trap → loaded by shrugs, deadlifts, rows, overhead pressing.
//   wrist → loaded by all weight-bearing upper-body work where the wrist holds
//     the load (bench, push-ups, rows, curls). Bodyweight rows + push-ups too.
//   elbow → loaded by all pulling (biceps), pressing (triceps), and weight
//     holds (especially barbell rows + chin-ups).
//   ankle → loaded by anything standing under load (squats, deadlifts, lunges)
//     plus calf work and jumping/walking conditioning.
//   neck → loaded by heavy overhead work, deadlifts (axial compression), and
//     anything where the user clenches/braces (almost everything heavy).

import type { BodyPart } from '../../types/profile'
import type { MuscleGroup } from '../../types/plan'

/**
 * Coarse mapping from a tracked body part to the muscle groups whose
 * exercises typically load that part. A muscle group appearing here means
 * an exercise targeting it MIGHT stress the body part — the user decides
 * whether to scale or swap.
 */
const BODY_PART_TO_MUSCLES: Record<BodyPart, ReadonlyArray<MuscleGroup>> = {
  left_meniscus:   ['quads', 'hamstrings', 'glutes', 'calves'],
  right_meniscus:  ['quads', 'hamstrings', 'glutes', 'calves'],
  left_knee:       ['quads', 'hamstrings', 'glutes', 'calves'],
  right_knee:      ['quads', 'hamstrings', 'glutes', 'calves'],
  lower_back:      ['back', 'hamstrings', 'glutes', 'quads', 'core', 'shoulders'],
  upper_back:      ['back', 'shoulders', 'biceps', 'triceps'],
  hip_flexors:     ['quads', 'glutes', 'core'],
  left_shoulder:   ['chest', 'shoulders', 'back', 'triceps', 'biceps'],
  right_shoulder:  ['chest', 'shoulders', 'back', 'triceps', 'biceps'],
  left_trap:       ['back', 'shoulders'],
  right_trap:      ['back', 'shoulders'],
  wrist:           ['chest', 'shoulders', 'back', 'biceps', 'triceps'],
  ankle:           ['quads', 'hamstrings', 'glutes', 'calves'],
  neck:            ['shoulders', 'back'],
  // Elbow stress shows up on pulls (biceps work the elbow flexor) and
  // pressing (triceps load the elbow extensor). Heavy holds also matter.
  elbow:           ['biceps', 'triceps', 'back', 'chest', 'shoulders'],
  // 'other' is the user-typed free-text path — we can't infer; return empty
  // and let the affordance show a generic note instead of pre-flagging exercises.
  other:           [],
}

/**
 * Resolve a list of "off today" body parts to the set of MuscleGroups
 * whose exercises in today's session deserve a scale/swap prompt.
 *
 * Returns a Set for O(1) membership checks against an exercise's
 * primary/secondary muscle groups.
 */
export function affectedMuscleGroupsFor(
  flagged: ReadonlyArray<BodyPart>,
): Set<MuscleGroup> {
  const result = new Set<MuscleGroup>()
  for (const part of flagged) {
    for (const muscle of BODY_PART_TO_MUSCLES[part] ?? []) {
      result.add(muscle)
    }
  }
  return result
}

/**
 * True if an exercise's primary or secondary muscles intersect the set
 * of affected groups produced by `affectedMuscleGroupsFor`.
 *
 * Accepts `string[]` for muscle lists because two MuscleGroup unions exist
 * in this codebase — the planner one (this resolver's target) and the
 * exercise-library one (which has additional values like `hip_flexors`
 * that aren't planner muscle groups). Strings that don't match the
 * planner enum simply won't be in the affected set — safe by construction.
 */
export function exerciseIsAffected(
  primaryMuscles: ReadonlyArray<string>,
  secondaryMuscles: ReadonlyArray<string> | undefined,
  affected: ReadonlySet<MuscleGroup>,
): boolean {
  if (affected.size === 0) return false
  for (const m of primaryMuscles) if (affected.has(m as MuscleGroup)) return true
  for (const m of secondaryMuscles ?? []) if (affected.has(m as MuscleGroup)) return true
  return false
}
