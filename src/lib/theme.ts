/**
 * Lumo theme tokens, ported verbatim from /tmp/workout-app-design/app.jsx THEMES.
 * Exposes dark + light palettes plus accent/brand/mascot colors, and an
 * `applyTheme` helper that writes every token onto :root as a CSS variable so
 * Tailwind v4 + inline `var(--...)` consumers all pick it up.
 *
 * Kyra was emphatic that light mode NOT be skipped; both palettes are full.
 */

import type { Tweaks } from './tweaks'

export type Theme = 'dark' | 'light'

/**
 * Every token name that `applyTheme` will set on document.documentElement.
 * Keep in sync with :root defaults in src/index.css.
 */
export const LUMO_TOKENS = [
  '--lumo-bg',
  '--lumo-raised',
  '--lumo-overlay',
  '--lumo-border',
  '--lumo-border-strong',
  '--lumo-text',
  '--lumo-text-sec',
  '--lumo-text-ter',
  '--lumo-input-bg',
  '--accent-plum',
  '--accent-mint',
  '--accent-sun',
  '--accent-blush',
  '--brand',
  '--mascot-color',
] as const

export type LumoToken = (typeof LUMO_TOKENS)[number]

/**
 * Per-theme token map. Values are ported verbatim from the design file's
 * THEMES.dark / THEMES.light objects.
 */
export const THEMES: Record<Theme, Record<LumoToken, string>> = {
  dark: {
    '--lumo-bg': '#0B0B0F',
    '--lumo-raised': '#18181F',
    '--lumo-overlay': '#242430',
    '--lumo-border': '#242430',
    '--lumo-border-strong': '#2A2A36',
    '--lumo-text': '#F2F2F6',
    '--lumo-text-sec': '#8A8A99',
    '--lumo-text-ter': '#55556A',
    '--lumo-input-bg': '#0B0B0F',
    '--accent-plum': '#C9A0FF',
    '--accent-mint': '#6EE7C7',
    '--accent-sun': '#FFD86E',
    '--accent-blush': '#FF9AA2',
    '--brand': '#FF7A45',
    '--mascot-color': '#FFB4C6',
  },
  light: {
    '--lumo-bg': '#FFF7F4',
    '--lumo-raised': '#FFFFFF',
    '--lumo-overlay': '#FFEFEA',
    '--lumo-border': '#FFE2D6',
    '--lumo-border-strong': '#FFD4C2',
    '--lumo-text': '#2B1A1F',
    '--lumo-text-sec': '#8B6B74',
    '--lumo-text-ter': '#C5A39D',
    '--lumo-input-bg': '#FFF7F4',
    '--accent-plum': '#C9A0FF',
    '--accent-mint': '#6EE7C7',
    '--accent-sun': '#FFD86E',
    '--accent-blush': '#FF9AA2',
    '--brand': '#FF7A45',
    '--mascot-color': '#FFB4C6',
  },
}

/**
 * Applies a theme's tokens + any per-tweak overrides to the document root.
 * Safe to call repeatedly; idempotent w.r.t. CSS variable identity.
 *
 * In a jsdom / non-browser env where `document` is missing, this is a no-op.
 */
export function applyTheme(theme: Theme, tweaks?: Partial<Tweaks>): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const base = THEMES[theme] ?? THEMES.dark

  for (const token of LUMO_TOKENS) {
    root.style.setProperty(token, base[token])
  }

  // Tweak overrides: brand, mascotColor, and accent swap the "--brand" /
  // "--mascot-color" / hero accent values without disturbing the palette.
  if (tweaks?.brand) {
    root.style.setProperty('--brand', tweaks.brand)
  }
  if (tweaks?.mascotColor) {
    root.style.setProperty('--mascot-color', tweaks.mascotColor)
  }
  if (tweaks?.accent) {
    const accentVar = `--accent-${tweaks.accent}` as LumoToken
    const accentValue = base[accentVar]
    if (accentValue) {
      root.style.setProperty('--accent', accentValue)
    }
  }
}
