// swapLocal — client-side swap path for the rule-based planner.
//
// When the active plan comes from `VITE_USE_LOCAL_PLANNER=true`, every
// PlannedExercise carries a `library_id` of the form `variant:<variant_id>`
// pointing into `src/lib/planner/variants.ts`. The edge function has no
// knowledge of those ids, so hitting it for a swap either errors or returns
// something nonsensical. This module resolves + ranks replacements locally
// using the same variant pool the planner itself was built from.
//
// Contract mirrors the edge `swap_exercise` op: `{ replacement, reason }`.
// Weight / sets / reps / rir / warmup / rest are carried over verbatim from
// the current exercise — we're swapping the MOVEMENT, not re-prescribing
// intensity. Rest-seconds gets replaced with the variant default because
// different movements actually need different rest windows.

import { MAIN_VARIANTS, ACCESSORY_VARIANTS, resolveVariant, type VariantSpec } from './planner/variants'
import type { PlannedExercise, PlannedSession } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'
import type { SwapReason } from './swap'

export interface SwapVariantLocalOpts {
  currentExercise: PlannedExercise
  session: PlannedSession
  profile: UserProgramProfile
  reason: SwapReason
  /** Variant ids already proposed for this slot — excluded from results. */
  attemptedIds?: string[]
}

export interface SwapVariantLocalResult {
  replacement: PlannedExercise
  reason: string
}

// ─── Equipment mapping (variant.equipment → profile.equipment) ────────────
// variants.ts uses gear-level strings ('barbell', 'dumbbell', 'cable_machine',
// 'bench', etc.). Profile.equipment is a higher-level enum (full_gym,
// home_weights, bands_only, bodyweight_only, cable_machine, barbell). A
// variant is compatible if EVERY piece of its gear is covered by at least one
// of the user's chosen profile equipment values.
const VARIANT_GEAR_PERMITS: Record<string, ReadonlyArray<UserProgramProfile['equipment'][number]>> = {
  dumbbell: ['full_gym', 'home_weights'],
  barbell: ['full_gym', 'barbell'],
  plates: ['full_gym', 'barbell'],
  rack: ['full_gym', 'barbell'],
  bench: ['full_gym', 'home_weights', 'barbell'],
  cable_machine: ['full_gym', 'cable_machine'],
  leg_press_machine: ['full_gym'],
  leg_curl_machine: ['full_gym'],
  hip_abduction_machine: ['full_gym'],
  kettlebell: ['full_gym', 'home_weights'],
  trap_bar: ['full_gym'],
  box: ['full_gym'],
  landmine: ['full_gym'],
  rope: ['full_gym'],
  band: ['full_gym', 'home_weights', 'bands_only'],
  pullup_bar: ['full_gym', 'home_weights'],
}

function gearAllowed(gear: string, chosen: UserProgramProfile['equipment']): boolean {
  // Unknown gear → conservatively require a full gym.
  const allowList = VARIANT_GEAR_PERMITS[gear] ?? (['full_gym'] as const)
  return chosen.some(c => (allowList as ReadonlyArray<string>).includes(c))
}

function variantEquipmentCompatible(v: VariantSpec, chosen: UserProgramProfile['equipment']): boolean {
  // Bodyweight variants (equipment: []) are always compatible.
  if (v.equipment.length === 0) return true
  return v.equipment.every(g => gearAllowed(g, chosen))
}

// ─── Ranking heuristics ───────────────────────────────────────────────────
const HARD_GEAR = /\b(machine|cable|plates|rack)\b/
const EASIER_NAME = /(bodyweight|assisted|supported|elevated|goblet|band)/i
const HARDER_NAME = /(barbell|front|single|deficit|paused|bulgarian|conventional)/i
const INJURY_AVOID = /(deficit|paused|bulgarian)/i
const INJURY_PREFER = /(supported|assisted|elevated|band|tempo|light)/i

function isEasierVariant(v: VariantSpec): boolean {
  const idOrName = `${v.id} ${v.name}`
  return EASIER_NAME.test(idOrName)
}

function isHarderVariant(v: VariantSpec): boolean {
  const idOrName = `${v.id} ${v.name}`
  return HARDER_NAME.test(idOrName)
}

function hasHardGear(v: VariantSpec): boolean {
  return v.equipment.some(g => HARD_GEAR.test(g))
}

// Seeded shuffle so "try another" walks through the list deterministically.
// Keyed off the current exercise id + attempt count → stable for a given
// slot but different between slots.
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let s = 0
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) | 0
    const j = Math.abs(s) % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function rankCandidates(
  candidates: VariantSpec[],
  reason: SwapReason,
  seed: string,
): VariantSpec[] {
  switch (reason) {
    case 'machine_busy':
      return candidates.slice().sort((a, b) => Number(hasHardGear(a)) - Number(hasHardGear(b)))
    case 'too_hard':
      return candidates.slice().sort((a, b) => Number(isEasierVariant(b)) - Number(isEasierVariant(a)))
    case 'too_easy':
      return candidates.slice().sort((a, b) => Number(isHarderVariant(b)) - Number(isHarderVariant(a)))
    case 'injury_flare':
      return candidates.slice().sort((a, b) => {
        const aScore = Number(INJURY_PREFER.test(`${a.id} ${a.name}`)) - Number(INJURY_AVOID.test(`${a.id} ${a.name}`))
        const bScore = Number(INJURY_PREFER.test(`${b.id} ${b.name}`)) - Number(INJURY_AVOID.test(`${b.id} ${b.name}`))
        return bScore - aScore
      })
    case 'generic':
    default:
      return seededShuffle(candidates, seed)
  }
}

// ─── Reason copy ──────────────────────────────────────────────────────────
// One-line explanation of the swap. Lean and clinical — the UI surfaces this
// verbatim, so no emoji, no filler.
function explainSwap(chosen: VariantSpec, reason: SwapReason): string {
  const name = chosen.name
  switch (reason) {
    case 'machine_busy':
      return `Swapped to ${name} — no machine or rack needed, same movement pattern.`
    case 'too_hard':
      return `Swapped to ${name} — easier progression, keeps the same pattern.`
    case 'too_easy':
      return `Swapped to ${name} — harder progression, hits the same muscles.`
    case 'injury_flare':
      return `Swapped to ${name} — gentler on the joint, same movement intent.`
    case 'generic':
    default:
      return `Swapped to ${name} — matches the same movement pattern and muscle group.`
  }
}

// ─── Main entry ───────────────────────────────────────────────────────────
export function swapVariantLocal(opts: SwapVariantLocalOpts): SwapVariantLocalResult {
  const { currentExercise, session, profile, reason } = opts
  const attempted = new Set(opts.attemptedIds ?? [])

  const rawId = currentExercise.library_id.startsWith('variant:')
    ? currentExercise.library_id.slice('variant:'.length)
    : currentExercise.library_id
  const current = resolveVariant(rawId)
  if (!current) {
    throw new Error('Cannot swap this exercise locally')
  }

  const inSessionLibraryIds = new Set(
    session.exercises.map(e => e.library_id).filter(id => id !== currentExercise.library_id),
  )

  const pool = [
    ...Object.values(MAIN_VARIANTS),
    ...Object.values(ACCESSORY_VARIANTS),
  ]

  const candidates = pool.filter(v => {
    if (v.id === current.id) return false
    if (attempted.has(v.id)) return false
    if (v.role !== current.role) return false
    const sharesPrimary = v.primary_muscles.some(m => current.primary_muscles.includes(m))
    if (!sharesPrimary) return false
    if (!variantEquipmentCompatible(v, profile.equipment)) return false
    const candidateLibraryId = v.library_id ?? `variant:${v.id}`
    if (inSessionLibraryIds.has(candidateLibraryId)) return false
    return true
  })

  const seed = `${current.id}:${attempted.size}`
  const ranked = rankCandidates(candidates, reason, seed)
  const chosen = ranked[0]
  if (!chosen) {
    throw new Error('Cannot swap this exercise locally')
  }

  const replacement: PlannedExercise = {
    ...currentExercise,
    name: chosen.name,
    library_id: chosen.library_id ?? `variant:${chosen.id}`,
    role: chosen.role,
    rest_seconds: chosen.default_rest_seconds,
    notes: '',
  }

  return { replacement, reason: explainSwap(chosen, reason) }
}
