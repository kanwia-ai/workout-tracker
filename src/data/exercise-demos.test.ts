import { describe, it, expect } from 'vitest'
import { DEMOS, getDemo, type ExerciseDemo } from './exercise-demos'
import demosFile from './exercise-demos.json'

// Whitelisted creators. Matches are case-sensitive; keep in sync with the
// curation doc in exercise-demos.json#notes.
const WHITELIST = new Set<string>([
  'Jeff Nippard',
  'Dr. Mike Israetel',
  'Renaissance Periodization',
  'Bret Contreras',
  'Bret Contreras Glute Guy',
  'Squat University',
  'Dr. Aaron Horschig',
  'Dr. Milo Wolf',
  'ScienceForSport',
  'Alan Thrall',
  'Jeremy Ethier',
  'Jeremy Ethier Shorts',
  'Joe DeLaRosa',
  'Athlean-X',
])

describe('exercise-demos.json', () => {
  it('has version 1 and an ISO curated_at date', () => {
    expect(demosFile.version).toBe(1)
    expect(demosFile.curated_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('exports at least 80 curated demos', () => {
    expect(Object.keys(DEMOS).length).toBeGreaterThanOrEqual(80)
  })

  it('every demo id uses the fedb: prefix', () => {
    for (const id of Object.keys(DEMOS)) {
      expect(id.startsWith('fedb:')).toBe(true)
    }
  })

  it('every demo_url is a YouTube Shorts or youtu.be URL', () => {
    const shortsPattern = /^https:\/\/(www\.)?youtube\.com\/shorts\/[A-Za-z0-9_-]+/
    const youtuBePattern = /^https:\/\/youtu\.be\/[A-Za-z0-9_-]+/
    for (const [id, demo] of Object.entries(DEMOS) as Array<[string, ExerciseDemo]>) {
      const ok = shortsPattern.test(demo.demo_url) || youtuBePattern.test(demo.demo_url)
      expect(ok, `${id} has invalid URL: ${demo.demo_url}`).toBe(true)
    }
  })

  it('every duration_seconds is positive and <= 60 (YouTube Shorts format)', () => {
    for (const [id, demo] of Object.entries(DEMOS) as Array<[string, ExerciseDemo]>) {
      expect(demo.duration_seconds, `${id} duration`).toBeGreaterThan(0)
      expect(demo.duration_seconds, `${id} duration`).toBeLessThanOrEqual(60)
    }
  })

  it('every creator is on the whitelist', () => {
    for (const [id, demo] of Object.entries(DEMOS) as Array<[string, ExerciseDemo]>) {
      expect(
        WHITELIST.has(demo.creator),
        `${id} uses non-whitelisted creator: "${demo.creator}"`
      ).toBe(true)
    }
  })
})

describe('getDemo()', () => {
  it('returns the demo when the id is curated', () => {
    const firstId = Object.keys(DEMOS)[0]
    expect(getDemo(firstId)).toBeDefined()
    expect(getDemo(firstId)?.demo_url).toMatch(/youtube\.com\/shorts|youtu\.be/)
  })

  it('returns undefined for unknown ids', () => {
    expect(getDemo('fedb:NotARealExercise_xyz_123')).toBeUndefined()
  })
})
