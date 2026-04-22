/**
 * legacyTitleRemap — display-side fix for stored plans that use generic
 * session titles like "Lower A", "Upper B", "Day 1".
 *
 * A new prompt (v3+) generates body-part titles out of the gate, but any
 * mesocycle persisted in Dexie before that change still carries the old
 * generic strings. Rather than migrate stored data, we derive a nicer title
 * at render time from the session's exercise list. The stored plan is
 * untouched — this is purely a display remap.
 *
 * Derivation is deterministic (no LLM): count muscles seen across the
 * session's exercises, then pick the top 1–2 by frequency. Exercises lacking
 * `primary_muscles` fall back to keyword matching against the exercise name.
 */

// ─── Generic-title detection ──────────────────────────────────────────────

const GENERIC_PATTERNS: readonly RegExp[] = [
  /^(lower|upper|push|pull|legs|full body|full-body|body)\s*[a-d]?$/i,
  /^day\s*\d+$/i,
  /^session\s*\d+$/i,
  /^workout\s*\d+$/i,
  /^week\s*\d+\s*day\s*\d+$/i,
  /^(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i,
]

/** True when `title` is one of the generic legacy patterns we want to replace. */
export function isGenericTitle(title: string): boolean {
  if (!title) return false
  const normalized = title.trim()
  return GENERIC_PATTERNS.some((re) => re.test(normalized))
}

// ─── Muscle → display phrase mapping ──────────────────────────────────────

/**
 * Maps any raw muscle token we might see (schema enum, library enum, or a
 * plain-English synonym) to a canonical, lowercase, pluralized display word.
 *
 * Two enums feed in:
 *   - MuscleGroup from `types/plan.ts` (schema) — quads, hamstrings, glutes,
 *     calves, chest, back, shoulders, biceps, triceps, core, full_body,
 *     rehab, mobility.
 *   - MuscleGroup from `types/index.ts` (library) — adds hip_flexors,
 *     adductors, abductors, back_upper, back_lower, lats, forearms,
 *     core_anterior, core_obliques, core_posterior, pelvic_floor.
 */
const MUSCLE_DISPLAY: Record<string, string> = {
  quads: 'quads',
  quadriceps: 'quads',
  hamstrings: 'hamstrings',
  hamstring: 'hamstrings',
  glutes: 'glutes',
  glute: 'glutes',
  calves: 'calves',
  calf: 'calves',
  adductors: 'adductors',
  adductor: 'adductors',
  abductors: 'abductors',
  abductor: 'abductors',
  hips: 'hips',
  hip_flexors: 'hips',
  chest: 'chest',
  shoulders: 'shoulders',
  shoulder: 'shoulders',
  'front delts': 'shoulders',
  'front_delts': 'shoulders',
  triceps: 'triceps',
  tricep: 'triceps',
  back: 'back',
  back_upper: 'back',
  back_lower: 'back',
  lats: 'back',
  'rear delts': 'back',
  'rear_delts': 'back',
  biceps: 'biceps',
  bicep: 'biceps',
  traps: 'back',
  rhomboids: 'back',
  forearms: 'forearms',
  abs: 'core',
  core: 'core',
  core_anterior: 'core',
  core_obliques: 'core',
  core_posterior: 'core',
  obliques: 'core',
  'lower back': 'core',
  'lower_back': 'core',
}

// Macro-region classification used to fall back to umbrella titles when no
// single muscle dominates.
type Macro = 'lower' | 'upper-push' | 'upper-pull' | 'core' | 'other'

const MACRO_OF_DISPLAY: Record<string, Macro> = {
  quads: 'lower',
  hamstrings: 'lower',
  glutes: 'lower',
  calves: 'lower',
  adductors: 'lower',
  abductors: 'lower',
  hips: 'lower',
  chest: 'upper-push',
  shoulders: 'upper-push',
  triceps: 'upper-push',
  back: 'upper-pull',
  biceps: 'upper-pull',
  forearms: 'upper-pull',
  core: 'core',
}

// ─── Rehab/mobility detection via exercise name ──────────────────────────

const REHAB_KEYWORDS: readonly string[] = [
  'stretch',
  'mobility',
  'roll',
  'activation',
  'prehab',
]

function isRehabName(name: string): boolean {
  const lower = name.toLowerCase()
  return REHAB_KEYWORDS.some((k) => lower.includes(k))
}

// ─── Name → muscle fallback (when primary_muscles is missing) ────────────

/**
 * Stored PlannedExercise objects don't carry primary_muscles — only
 * library_id and name. When the caller passes those in, we infer a muscle
 * from keywords in the exercise name so derivation still works end-to-end.
 */
const NAME_KEYWORD_TO_MUSCLE: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bglute|\bhip thrust|\bbridge\b/i, 'glutes'],
  [/\bhamstring|\bleg curl|\brdl\b|romanian deadlift|good morning/i, 'hamstrings'],
  [/\bquad|\bleg extension|\bsquat|\blunge|\bstep[- ]?up/i, 'quads'],
  [/\bcalf\b|\bcalves\b/i, 'calves'],
  [/\badductor/i, 'adductors'],
  [/\babductor|\bclamshell|\bmonster walk/i, 'abductors'],
  [/\bhip flexor|\bstanding knee raise/i, 'hips'],
  [/\bbench press|\bchest fly|\bpush[- ]?up|\bchest press|\bpec/i, 'chest'],
  [/\bovhp|overhead press|\bshoulder press|\blateral raise|\bfront raise|\bohp\b/i, 'shoulders'],
  [/\btricep|\bskullcrusher|\bpushdown|\bdip\b/i, 'triceps'],
  [/\blat pulldown|\bpullup|\bpull[- ]?up|\bpulldown/i, 'lats'],
  [/\brow\b|\brows\b|\bt[- ]?bar/i, 'back'],
  [/\bbicep|\bcurl\b/i, 'biceps'],
  [/\bab\b|\babs\b|\bplank|\bcrunch|\bdead ?bug|\bbird dog|\bhollow hold/i, 'core'],
]

function muscleFromName(name: string): string | null {
  for (const [re, muscle] of NAME_KEYWORD_TO_MUSCLE) {
    if (re.test(name)) return muscle
  }
  return null
}

// ─── Derivation ───────────────────────────────────────────────────────────

type ExerciseLike = { primary_muscles?: string[]; name: string }

function collectMuscleBag(exercises: ExerciseLike[]): Map<string, number> {
  const bag = new Map<string, number>()
  for (const ex of exercises) {
    if (isRehabName(ex.name)) continue // rehab/mobility doesn't pick title
    const raw = ex.primary_muscles ?? []
    const displays: string[] = []
    for (const m of raw) {
      const key = m.toLowerCase().trim()
      const display = MUSCLE_DISPLAY[key]
      if (display) displays.push(display)
    }
    // Fallback: infer from exercise name when primary_muscles is missing/empty.
    if (displays.length === 0) {
      const inferred = muscleFromName(ex.name)
      if (inferred) {
        // Run the inferred token back through MUSCLE_DISPLAY so synonyms
        // (e.g. 'lats' → 'back') collapse consistently.
        displays.push(MUSCLE_DISPLAY[inferred] ?? inferred)
      }
    }
    for (const d of displays) {
      bag.set(d, (bag.get(d) ?? 0) + 1)
    }
  }
  return bag
}

function macroBag(bag: Map<string, number>): Map<Macro, number> {
  const macros = new Map<Macro, number>()
  for (const [muscle, count] of bag.entries()) {
    const macro = MACRO_OF_DISPLAY[muscle] ?? 'other'
    macros.set(macro, (macros.get(macro) ?? 0) + count)
  }
  return macros
}

function topN(bag: Map<string, number>, n: number): Array<[string, number]> {
  return [...bag.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
}

/** Derive a body-part title from a session's exercises. Falls back to the
 *  original title if no clear pattern emerges. */
export function deriveBodyPartTitle(
  originalTitle: string,
  exercises: ExerciseLike[],
): string {
  if (!exercises || exercises.length === 0) return originalTitle

  const bag = collectMuscleBag(exercises)
  if (bag.size === 0) return originalTitle

  const ranked = topN(bag, 3)
  const [first, second] = ranked
  const firstCount = first[1]
  const secondCount = second?.[1] ?? 0

  // Two muscles tied or nearly tied → "A & B".
  const twoClose = second && secondCount >= firstCount - 1 && secondCount >= 2
  if (twoClose) {
    return `${first[0]} & ${second[0]}`
  }

  // One muscle clearly dominant within a macro region → "quad-focused legs"
  // style title when the dominant muscle is lower-body and stands alone.
  const macros = macroBag(bag)
  const topMacros = [...macros.entries()].sort((a, b) => b[1] - a[1])
  const dominantMacro = topMacros[0]?.[0]

  // If the bag is spread across multiple macros with no clear dominance, we
  // fall back to umbrella titles.
  const totalCount = [...bag.values()].reduce((s, v) => s + v, 0)
  const dominantMacroCount = topMacros[0]?.[1] ?? 0
  const dominantRatio = dominantMacroCount / totalCount

  // Single muscle that owns >=70% of the bag → call it out.
  if (firstCount / totalCount >= 0.7) {
    if (dominantMacro === 'lower') {
      // "quad-focused legs", "glute-focused legs", etc.
      const root = first[0].replace(/s$/, '') // quads → quad
      return `${root}-focused legs`
    }
    return first[0]
  }

  // Mixed within a single macro → umbrella title.
  if (dominantRatio >= 0.8) {
    if (dominantMacro === 'lower') return 'lower body strength'
    if (dominantMacro === 'upper-push' || dominantMacro === 'upper-pull') {
      return 'upper body strength'
    }
    if (dominantMacro === 'core') return 'core & stability'
  }

  // Upper-push + upper-pull both represented → upper body.
  const pushCount = macros.get('upper-push') ?? 0
  const pullCount = macros.get('upper-pull') ?? 0
  const lowerCount = macros.get('lower') ?? 0
  if (pushCount > 0 && pullCount > 0 && lowerCount === 0) {
    return 'upper body strength'
  }
  if (lowerCount > 0 && pushCount === 0 && pullCount === 0) {
    return 'lower body strength'
  }

  return 'full body strength'
}

/** Combined: remap if generic, else return original. Use this at render sites. */
export function remapTitleIfGeneric(
  originalTitle: string,
  exercises: ExerciseLike[],
): string {
  if (!isGenericTitle(originalTitle)) return originalTitle
  return deriveBodyPartTitle(originalTitle, exercises)
}
