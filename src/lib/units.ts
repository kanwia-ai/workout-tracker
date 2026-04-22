// Units helpers — single source of truth for imperial/metric conversion +
// display formatting. Internal storage is always metric (kg + cm), so these
// helpers only translate at the UI boundary.
//
// We keep the functions tiny and total — no zero-handling surprises; callers
// pass undefined to mean "no data" and get undefined back.

import type { Units } from '../types/profile'

const KG_PER_LB = 0.45359237
const CM_PER_INCH = 2.54

/**
 * Convert pounds → kilograms. Rounded to 1 decimal (0.1 kg precision matches
 * user-facing gym plates). Returns undefined if input is not finite.
 */
export function lbToKg(lb: number | undefined): number | undefined {
  if (lb === undefined || !Number.isFinite(lb)) return undefined
  return Math.round(lb * KG_PER_LB * 10) / 10
}

/**
 * Convert kilograms → pounds. Rounded to 1 decimal.
 */
export function kgToLb(kg: number | undefined): number | undefined {
  if (kg === undefined || !Number.isFinite(kg)) return undefined
  return Math.round((kg / KG_PER_LB) * 10) / 10
}

/**
 * Convert feet + inches → centimeters. Rounded to the nearest cm.
 */
export function ftInToCm(
  feet: number | undefined,
  inches: number | undefined,
): number | undefined {
  const f = feet ?? 0
  const i = inches ?? 0
  if (!Number.isFinite(f) || !Number.isFinite(i)) return undefined
  const total = f * 12 + i
  if (total <= 0) return undefined
  return Math.round(total * CM_PER_INCH)
}

/**
 * Split a cm value into whole feet + remaining inches. Rounds to the nearest
 * inch (we never display fractional inches in the UI).
 */
export function cmToFtIn(
  cm: number | undefined,
): { ft: number; in: number } | undefined {
  if (cm === undefined || !Number.isFinite(cm) || cm <= 0) return undefined
  const totalInches = Math.round(cm / CM_PER_INCH)
  return { ft: Math.floor(totalInches / 12), in: totalInches % 12 }
}

/**
 * Format a stored weight (kg) for display using the given unit preference.
 * Returns a string like "145 lb" or "65 kg". Undefined input returns "—".
 */
export function formatWeight(
  kg: number | undefined,
  units: Units | undefined,
): string {
  if (kg === undefined || !Number.isFinite(kg)) return '—'
  if ((units ?? 'metric') === 'imperial') {
    const lb = kgToLb(kg)
    if (lb === undefined) return '—'
    return `${Math.round(lb)} lb`
  }
  // metric — keep one decimal if it's not a whole number for parity with inputs
  const rounded = Math.round(kg * 10) / 10
  const display = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${display} kg`
}

/**
 * Format a stored height (cm) for imperial display (e.g. `5'9"`). Metric
 * callers can inline `${cm} cm` themselves — nothing to format.
 */
export function formatHeightImperial(cm: number | undefined): string {
  const parts = cmToFtIn(cm)
  if (!parts) return '—'
  return `${parts.ft}'${parts.in}"`
}

/**
 * Format a stored height (cm) using the given unit preference. Handy for
 * places that want a single call regardless of units.
 */
export function formatHeight(
  cm: number | undefined,
  units: Units | undefined,
): string {
  if (cm === undefined || !Number.isFinite(cm)) return '—'
  if ((units ?? 'metric') === 'imperial') return formatHeightImperial(cm)
  return `${Math.round(cm)} cm`
}
