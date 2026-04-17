// Seeds the Dexie `exerciseLibrary` table from the bundled free-exercise-db dataset.
// Dataset: yuhonas/free-exercise-db — public domain (The Unlicense), 873 exercises.
// Source: https://github.com/yuhonas/free-exercise-db
//
// Shape of each entry in free-exercise-db.json:
//   { id, name, force, level, mechanic, equipment,
//     primaryMuscles, secondaryMuscles, instructions, category, images }
// `images` is an array of paths like "3_4_Sit-Up/0.jpg" where the prefix is the raw id.

import { db, type LibraryExercise } from '../lib/db'
import dataset from './free-exercise-db.json'

interface RawEntry {
  id: string
  name: string
  force: string | null
  level: string | null
  mechanic: string | null
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  category: string | null
  images: string[]
}

const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

export function getLibraryImageUrl(rawId: string, index = 0): string {
  return `${IMAGE_BASE}/${rawId}/${index}.jpg`
}

function toLibraryEntry(raw: RawEntry): LibraryExercise {
  return {
    id: `fedb:${raw.id}`,
    name: raw.name,
    force: raw.force ?? null,
    level: raw.level ?? null,
    mechanic: raw.mechanic ?? null,
    equipment: raw.equipment ?? null,
    primaryMuscles: raw.primaryMuscles ?? [],
    secondaryMuscles: raw.secondaryMuscles ?? [],
    instructions: raw.instructions ?? [],
    category: raw.category ?? null,
    imageCount: raw.images?.length ?? 0,
    rawId: raw.id,
  }
}

export async function seedExerciseLibraryIfEmpty(): Promise<void> {
  try {
    const count = await db.exerciseLibrary.count()
    if (count > 0) return
    const entries = (dataset as RawEntry[]).map(toLibraryEntry)
    await db.exerciseLibrary.bulkAdd(entries)
  } catch (err) {
    console.error('[exerciseLibrary] seed failed:', err)
  }
}
