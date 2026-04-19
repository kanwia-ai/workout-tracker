// Curated YouTube Shorts form demos for common strength/hypertrophy exercises.
// Demos are authored by a strict whitelist of reputable creators (see README.md
// and exercise-demos.json#creator_whitelist). Each entry maps the bundled
// free-exercise-db id (prefixed with `fedb:`) to a demo URL + creator + duration.
//
// New file — additive only. Does NOT modify free-exercise-db.json or any UI.

import demos from './exercise-demos.json'

export interface ExerciseDemo {
  demo_url: string
  creator: string
  duration_seconds: number
}

export const DEMOS: Record<string, ExerciseDemo> = demos.demos as Record<
  string,
  ExerciseDemo
>

/** Return the curated demo for an exercise id, or `undefined` if none was curated. */
export function getDemo(exerciseId: string): ExerciseDemo | undefined {
  return DEMOS[exerciseId]
}
