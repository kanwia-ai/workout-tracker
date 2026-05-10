// Starting-weight heuristic for generated mesocycles.
//
// Gives every non-bodyweight lift a credible suggested starting weight so the
// WorkoutView weight pill seeds with a real number instead of "—". Pure
// function, zero network calls — matches the rest of the rule-based planner.
//
// Baselines are untrained-lifter ratios of bodyweight for the 5-10 rep range,
// trimmed to the conservative side (these are starting loads, not 1RMs). We
// scale by training age (new/novice/intermediate/advanced), scale down for
// higher rep sets, then round to realistic plate/DB increments.
//
// Variants are matched by case-insensitive substring against both `id` and
// `name`, with keywords picked to be specific enough to avoid cross-matches
// (e.g. `hip thrust` must not fire on `hip flexor stretch`). When no category
// matches, we fall back to equipment-based defaults. Pure bodyweight movements
// return `undefined` so the UI can correctly render a dash.
//
// Reference ratios come from the task brief; the table below preserves them
// inline so future tuning is local to this module.

import type { UserProgramProfile } from '../../types/profile'
import type { PlannedExercise } from '../../types/plan'
import type { VariantSpec } from './variants'

type Category =
  | 'barbell_back_squat'
  | 'front_squat'
  | 'goblet_squat'
  | 'split_squat_db'
  | 'hip_thrust_barbell'
  | 'glute_bridge_barbell'
  | 'deadlift_barbell'
  | 'rdl_barbell'
  | 'rdl_db'
  | 'single_leg_rdl_db'
  | 'trap_bar_deadlift'
  | 'bench_press_barbell'
  | 'overhead_press_barbell'
  | 'barbell_row'
  | 'db_bench'
  | 'db_row'
  | 'db_shoulder_press'
  | 'db_lateral_raise'
  | 'db_curl'
  | 'db_pullover'
  | 'cable_pullover'
  | 'shrug_barbell'
  | 'shrug_db'
  | 'tricep_extension_barbell'
  | 'tricep_extension_db'
  | 'rear_delt_fly_db'
  | 'cable_row'
  | 'lat_pulldown'
  | 'face_pull'
  | 'leg_press'
  | 'leg_curl'
  | 'leg_extension'
  | 'hip_abduction_machine'
  | 'calf_raise'
  | 'pallof_press'
  | 'farmers_carry_db'
  | 'landmine_press'
  | 'assisted_pullup'
  | 'kettlebell_hinge'
  | 'bodyweight'

interface CategoryRule {
  category: Category
  /** Either ratio-of-bodyweight (applied once) or a specific-load function. */
  ratio: number
  /** Implement as a per-hand lift (DB pair) so starting weight represents one hand. */
  perHand?: boolean
  /** Equipment family — drives rounding + minimum load. */
  implement: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'kettlebell' | 'bodyweight'
  /** Upper cap per-hand for untrained lifters; guards against DB ratios running away. */
  capPerHand?: number
}

const CATEGORIES: Record<Exclude<Category, 'bodyweight'>, CategoryRule> = {
  barbell_back_squat: { category: 'barbell_back_squat', ratio: 0.5, implement: 'barbell' },
  front_squat: { category: 'front_squat', ratio: 0.4, implement: 'barbell' },
  goblet_squat: { category: 'goblet_squat', ratio: 0.2, implement: 'dumbbell' },
  split_squat_db: { category: 'split_squat_db', ratio: 0.1, implement: 'dumbbell', perHand: true, capPerHand: 60 },
  hip_thrust_barbell: { category: 'hip_thrust_barbell', ratio: 0.75, implement: 'barbell' },
  glute_bridge_barbell: { category: 'glute_bridge_barbell', ratio: 0.6, implement: 'barbell' },
  deadlift_barbell: { category: 'deadlift_barbell', ratio: 0.75, implement: 'barbell' },
  rdl_barbell: { category: 'rdl_barbell', ratio: 0.55, implement: 'barbell' },
  rdl_db: { category: 'rdl_db', ratio: 0.18, implement: 'dumbbell', perHand: true, capPerHand: 80 },
  single_leg_rdl_db: { category: 'single_leg_rdl_db', ratio: 0.1, implement: 'dumbbell', perHand: true, capPerHand: 50 },
  trap_bar_deadlift: { category: 'trap_bar_deadlift', ratio: 0.8, implement: 'barbell' },
  bench_press_barbell: { category: 'bench_press_barbell', ratio: 0.45, implement: 'barbell' },
  overhead_press_barbell: { category: 'overhead_press_barbell', ratio: 0.3, implement: 'barbell' },
  barbell_row: { category: 'barbell_row', ratio: 0.5, implement: 'barbell' },
  db_bench: { category: 'db_bench', ratio: 0.2, implement: 'dumbbell', perHand: true, capPerHand: 100 },
  db_row: { category: 'db_row', ratio: 0.22, implement: 'dumbbell', perHand: true, capPerHand: 100 },
  db_shoulder_press: { category: 'db_shoulder_press', ratio: 0.15, implement: 'dumbbell', perHand: true, capPerHand: 80 },
  db_lateral_raise: { category: 'db_lateral_raise', ratio: 0.04, implement: 'dumbbell', perHand: true, capPerHand: 15 },
  db_curl: { category: 'db_curl', ratio: 0.08, implement: 'dumbbell', perHand: true, capPerHand: 40 },
  db_pullover: { category: 'db_pullover', ratio: 0.22, implement: 'dumbbell', capPerHand: 80 },
  cable_pullover: { category: 'cable_pullover', ratio: 0.4, implement: 'cable' },
  shrug_barbell: { category: 'shrug_barbell', ratio: 0.4, implement: 'barbell' },
  shrug_db: { category: 'shrug_db', ratio: 0.25, implement: 'dumbbell', perHand: true, capPerHand: 100 },
  tricep_extension_barbell: { category: 'tricep_extension_barbell', ratio: 0.2, implement: 'barbell' },
  tricep_extension_db: { category: 'tricep_extension_db', ratio: 0.06, implement: 'dumbbell', perHand: true, capPerHand: 30 },
  rear_delt_fly_db: { category: 'rear_delt_fly_db', ratio: 0.04, implement: 'dumbbell', perHand: true, capPerHand: 15 },
  cable_row: { category: 'cable_row', ratio: 0.45, implement: 'cable' },
  lat_pulldown: { category: 'lat_pulldown', ratio: 0.55, implement: 'cable' },
  face_pull: { category: 'face_pull', ratio: 0.12, implement: 'cable' },
  leg_press: { category: 'leg_press', ratio: 1.2, implement: 'machine' },
  leg_curl: { category: 'leg_curl', ratio: 0.3, implement: 'machine' },
  leg_extension: { category: 'leg_extension', ratio: 0.35, implement: 'machine' },
  hip_abduction_machine: { category: 'hip_abduction_machine', ratio: 0.4, implement: 'machine' },
  calf_raise: { category: 'calf_raise', ratio: 0.75, implement: 'machine' },
  pallof_press: { category: 'pallof_press', ratio: 0.08, implement: 'cable' },
  farmers_carry_db: { category: 'farmers_carry_db', ratio: 0.4, implement: 'dumbbell', perHand: true, capPerHand: 100 },
  landmine_press: { category: 'landmine_press', ratio: 0.25, implement: 'barbell' },
  assisted_pullup: { category: 'assisted_pullup', ratio: 0.5, implement: 'machine' },
  kettlebell_hinge: { category: 'kettlebell_hinge', ratio: 0.2, implement: 'kettlebell' },
}

// Keyword table — order matters. First match wins; list more-specific
// categories before broader ones so "goblet squat" is caught before any
// generic "squat" fallback, and "hip thrust" is caught before any "hip"
// fallback. Keyword groups are ANDed: every keyword in the array must appear
// (case-insensitive) in the concatenated id+name string.
interface KeywordMatch {
  all: string[]
  category: Category
  /** Optional disqualifying keywords — if any appear, this rule is skipped. */
  exclude?: string[]
}

const KEYWORD_TABLE: KeywordMatch[] = [
  // Pure bodyweight / isometric — return undefined.
  { all: ['push-up'], category: 'bodyweight' },
  { all: ['pushup'], category: 'bodyweight' },
  { all: ['plank'], category: 'bodyweight', exclude: ['weighted', 'loaded'] },
  { all: ['hanging leg raise'], category: 'bodyweight' },
  { all: ['hanging knee raise'], category: 'bodyweight' },
  { all: ['dead hang'], category: 'bodyweight' },
  { all: ['wall sit'], category: 'bodyweight' },
  { all: ['dead bug'], category: 'bodyweight' },
  { all: ['bird dog'], category: 'bodyweight' },
  { all: ['bird-dog'], category: 'bodyweight' },
  { all: ['pull-apart'], category: 'bodyweight' },
  { all: ['clamshell'], category: 'bodyweight' },
  { all: ['copenhagen'], category: 'bodyweight' },
  { all: ['cossack'], category: 'bodyweight' },
  { all: ['nordic'], category: 'bodyweight' },
  { all: ['bodyweight'], category: 'bodyweight' },
  { all: ['body weight'], category: 'bodyweight' },
  { all: ['(bw)'], category: 'bodyweight' },
  { all: ['stretch'], category: 'bodyweight' },
  { all: ['y raise'], category: 'bodyweight' },
  { all: ['y-raise'], category: 'bodyweight' },
  { all: ['terminal knee extension'], category: 'bodyweight' },

  // Hinges / deadlifts — specific first.
  { all: ['trap bar'], category: 'trap_bar_deadlift' },
  { all: ['trap-bar'], category: 'trap_bar_deadlift' },
  { all: ['single leg', 'romanian'], category: 'single_leg_rdl_db' },
  { all: ['single-leg', 'romanian'], category: 'single_leg_rdl_db' },
  { all: ['single leg rdl'], category: 'single_leg_rdl_db' },
  { all: ['single-leg rdl'], category: 'single_leg_rdl_db' },
  { all: ['romanian deadlift', 'dumbbell'], category: 'rdl_db' },
  { all: ['romanian deadlift', 'db'], category: 'rdl_db' },
  { all: ['rdl', 'dumbbell'], category: 'rdl_db' },
  { all: ['rdl', 'db'], category: 'rdl_db' },
  { all: ['db rdl'], category: 'rdl_db' },
  { all: ['romanian deadlift'], category: 'rdl_barbell' },
  { all: ['rdl'], category: 'rdl_barbell' },
  { all: ['deadlift'], category: 'deadlift_barbell' },
  { all: ['kettlebell', 'hinge'], category: 'kettlebell_hinge' },
  { all: ['kettlebell', 'swing'], category: 'kettlebell_hinge' },

  // Glutes.
  { all: ['hip thrust'], category: 'hip_thrust_barbell' },
  { all: ['glute bridge'], category: 'glute_bridge_barbell' },

  // Squats.
  { all: ['goblet'], category: 'goblet_squat' },
  { all: ['front squat'], category: 'front_squat' },
  { all: ['bulgarian split squat'], category: 'split_squat_db', exclude: ['bodyweight', '(bw)'] },
  { all: ['split squat'], category: 'split_squat_db', exclude: ['bodyweight', '(bw)'] },
  { all: ['reverse lunge'], category: 'split_squat_db' },
  { all: ['forward lunge'], category: 'split_squat_db' },
  { all: ['lateral lunge'], category: 'split_squat_db' },
  { all: ['side lunge'], category: 'split_squat_db' },
  { all: ['loaded lunge'], category: 'split_squat_db' },
  { all: ['box squat'], category: 'barbell_back_squat' },
  { all: ['back squat'], category: 'barbell_back_squat' },
  { all: ['squat'], category: 'barbell_back_squat' },

  // Pressing.
  { all: ['landmine'], category: 'landmine_press' },
  { all: ['close-grip', 'bench'], category: 'bench_press_barbell' },
  { all: ['bench press'], category: 'bench_press_barbell', exclude: ['dumbbell', 'db', 'neutral-grip db'] },
  { all: ['incline', 'db'], category: 'db_bench' },
  { all: ['incline dumbbell'], category: 'db_bench' },
  { all: ['dumbbell', 'press', 'bench'], category: 'db_bench' },
  { all: ['neutral-grip db press'], category: 'db_bench' },
  { all: ['dumbbell shoulder press'], category: 'db_shoulder_press' },
  { all: ['db shoulder press'], category: 'db_shoulder_press' },
  { all: ['overhead dumbbell press'], category: 'db_shoulder_press' },
  { all: ['overhead db press'], category: 'db_shoulder_press' },
  { all: ['neutral-grip db shoulder'], category: 'db_shoulder_press' },
  { all: ['dumbbell', 'press'], category: 'db_shoulder_press' },
  { all: ['overhead press'], category: 'overhead_press_barbell' },
  { all: ['barbell press'], category: 'overhead_press_barbell' },

  // Pulling.
  { all: ['assisted', 'pull-up'], category: 'assisted_pullup' },
  { all: ['assisted', 'pullup'], category: 'assisted_pullup' },
  { all: ['lat pulldown'], category: 'lat_pulldown' },
  { all: ['pulldown'], category: 'lat_pulldown' },
  { all: ['face pull'], category: 'face_pull' },
  { all: ['cable row'], category: 'cable_row' },
  { all: ['seated cable row'], category: 'cable_row' },
  { all: ['chest-supported row'], category: 'db_row' },
  { all: ['chest supported row'], category: 'db_row' },
  { all: ['db row'], category: 'db_row' },
  { all: ['dumbbell row'], category: 'db_row' },
  { all: ['bent', 'row'], category: 'barbell_row' },
  { all: ['barbell row'], category: 'barbell_row' },
  { all: ['cable pullover'], category: 'cable_pullover' },
  { all: ['pullover'], category: 'db_pullover' },

  // Isolation / machines.
  { all: ['rear delt fly'], category: 'rear_delt_fly_db' },
  { all: ['rear-delt fly'], category: 'rear_delt_fly_db' },
  { all: ['reverse fly'], category: 'rear_delt_fly_db' },
  { all: ['reverse flye'], category: 'rear_delt_fly_db' },
  { all: ['rear delt raise'], category: 'rear_delt_fly_db' },
  { all: ['lateral raise'], category: 'db_lateral_raise' },
  { all: ['lat raise'], category: 'db_lateral_raise' },
  { all: ['hammer curl'], category: 'db_curl' },
  { all: ['bicep curl'], category: 'db_curl' },
  { all: ['dumbbell curl'], category: 'db_curl' },
  { all: ['db curl'], category: 'db_curl' },
  { all: ['skullcrusher'], category: 'tricep_extension_barbell' },
  { all: ['skull crusher'], category: 'tricep_extension_barbell' },
  { all: ['tricep extension', 'dumbbell'], category: 'tricep_extension_db' },
  { all: ['tricep extension', 'db'], category: 'tricep_extension_db' },
  { all: ['triceps extension', 'dumbbell'], category: 'tricep_extension_db' },
  { all: ['triceps extension', 'db'], category: 'tricep_extension_db' },
  { all: ['tricep extension'], category: 'tricep_extension_barbell' },
  { all: ['triceps extension'], category: 'tricep_extension_barbell' },
  { all: ['lying triceps press'], category: 'tricep_extension_barbell' },
  { all: ['barbell shrug'], category: 'shrug_barbell' },
  { all: ['bb shrug'], category: 'shrug_barbell' },
  { all: ['dumbbell shrug'], category: 'shrug_db' },
  { all: ['db shrug'], category: 'shrug_db' },
  { all: ['shrug'], category: 'shrug_db' },
  { all: ['leg press'], category: 'leg_press' },
  { all: ['leg curl'], category: 'leg_curl' },
  { all: ['hamstring curl'], category: 'leg_curl' },
  { all: ['leg extension'], category: 'leg_extension' },
  { all: ['hip abduction'], category: 'hip_abduction_machine' },
  { all: ['calf raise'], category: 'calf_raise' },
  { all: ['pallof'], category: 'pallof_press' },
  { all: ['farmer'], category: 'farmers_carry_db' },
]

interface SuggestArgs {
  variant: VariantSpec
  profile: UserProgramProfile
  role: PlannedExercise['role']
  reps: number
  rir: number
}

const DEFAULT_BODY_WEIGHT_LBS = 165  // fallback when profile has no weight_kg
const KG_TO_LBS = 2.20462

export function suggestStartingWeight(args: SuggestArgs): number | undefined {
  const { variant, profile, role } = args
  const bodyLbs = resolveBodyWeightLbs(profile)
  const category = matchCategory(variant)

  // Core/mobility movements that aren't loaded — skip unless name signals load.
  const loadRole = role !== 'mobility' && role !== 'rehab'
  const nameSignalsLoad =
    matchesKeyword(variant, ['weighted']) ||
    matchesKeyword(variant, ['loaded']) ||
    matchesKeyword(variant, ['ab wheel'])
  if (role === 'core' && !nameSignalsLoad) return undefined

  if (category === 'bodyweight') return undefined
  if (category && !loadRole && !nameSignalsLoad) return undefined

  const rule = category ? CATEGORIES[category] : fallbackRuleForEquipment(variant)
  if (!rule) return undefined

  const trainingMult = trainingAgeMultiplier(profile.training_age_months)
  const repMult = repRangeMultiplier(args.reps)
  const raw = bodyLbs * rule.ratio * trainingMult * repMult

  const capped = rule.capPerHand !== undefined ? Math.min(raw, rule.capPerHand) : raw
  const rounded = roundToIncrement(capped, rule.implement)
  const floored = applyFloor(rounded, rule.implement)
  return floored
}

// ─── helpers ───────────────────────────────────────────────────────────────

function resolveBodyWeightLbs(profile: UserProgramProfile): number {
  if (profile.weight_kg && profile.weight_kg > 0) {
    return profile.weight_kg * KG_TO_LBS
  }
  return DEFAULT_BODY_WEIGHT_LBS
}

function trainingAgeMultiplier(months: number): number {
  if (months < 3) return 0.75
  if (months < 12) return 1.0
  if (months < 36) return 1.25
  return 1.5
}

function repRangeMultiplier(reps: number): number {
  if (reps >= 16) return 0.75
  if (reps >= 12) return 0.85
  return 1.0
}

function matchCategory(variant: VariantSpec): Category | null {
  const hay = `${variant.id} ${variant.name}`.toLowerCase()
  for (const entry of KEYWORD_TABLE) {
    if (entry.exclude && entry.exclude.some((ex) => hay.includes(ex))) continue
    if (entry.all.every((k) => hay.includes(k))) return entry.category
  }
  return null
}

function matchesKeyword(variant: VariantSpec, keywords: string[]): boolean {
  const hay = `${variant.id} ${variant.name}`.toLowerCase()
  return keywords.every((k) => hay.includes(k))
}

function fallbackRuleForEquipment(variant: VariantSpec): CategoryRule | null {
  const eq = (variant.equipment ?? []).map((e) => e.toLowerCase())
  const has = (needle: string): boolean => eq.some((e) => e.includes(needle))
  if (has('barbell')) {
    return { category: 'barbell_back_squat', ratio: 0.35, implement: 'barbell' }
  }
  if (has('trap_bar')) {
    return { category: 'trap_bar_deadlift', ratio: 0.6, implement: 'barbell' }
  }
  if (has('kettlebell')) {
    return { category: 'kettlebell_hinge', ratio: 0.2, implement: 'kettlebell' }
  }
  if (has('dumbbell')) {
    return {
      category: 'db_shoulder_press',
      ratio: 0.15,
      implement: 'dumbbell',
      perHand: true,
      capPerHand: 80,
    }
  }
  if (has('cable') || has('machine')) {
    return { category: 'leg_curl', ratio: 0.3, implement: 'machine' }
  }
  return null
}

function roundToIncrement(value: number, implement: CategoryRule['implement']): number {
  if (implement === 'bodyweight') return value
  // All supported implements round to the nearest 5 lb — the common plate /
  // DB step for untrained lifters.
  return Math.round(value / 5) * 5
}

function applyFloor(value: number, implement: CategoryRule['implement']): number {
  if (implement === 'barbell') return Math.max(45, value)
  if (implement === 'dumbbell') return Math.max(5, value)
  if (implement === 'kettlebell') return Math.max(10, value)
  // cable / machine — 5-lb minimum.
  return Math.max(5, value)
}
