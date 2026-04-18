/**
 * Tweaks model: the shape the design-tool host can live-edit via the
 * EDITMODE postMessage protocol.
 *
 * Fields are ported verbatim from the TWEAKS block in
 * /tmp/workout-app-design/app.jsx:
 *
 *   const TWEAKS = {
 *     "mascotColor": "#FFB4C6",
 *     "brand": "#FF7A45",
 *     "accent": "plum",
 *     "cheekiness": 2,
 *     "particlesOn": true,
 *     "bgTone": "warm",
 *     "theme": "light"
 *   };
 *
 * We keep the same key names so the host can target them without renaming.
 */

import type { Theme } from './theme'

export type AccentName = 'plum' | 'mint' | 'sun' | 'blush'
export type Cheek = 0 | 1 | 2
export type BgTone = 'warm' | 'cool' | 'neutral'

export interface Tweaks {
  theme: Theme
  /** Alias kept alongside `cheekiness` for ergonomic consumer APIs. */
  cheek: Cheek
  /** Original name from the design file; mirrors `cheek`. */
  cheekiness: Cheek
  brand: string
  mascotColor: string
  accent: AccentName
  particlesOn: boolean
  bgTone: BgTone
}

export const DEFAULT_TWEAKS: Tweaks = {
  theme: 'dark',
  cheek: 2,
  cheekiness: 2,
  brand: '#FF7A45',
  mascotColor: '#FFB4C6',
  accent: 'plum',
  particlesOn: true,
  bgTone: 'warm',
}

/**
 * Shallow-merges a patch into current tweaks. Keeps `cheek` and `cheekiness`
 * in sync: if either is set in the patch, both are updated to the new value
 * so consumers can read whichever name they prefer.
 */
export function mergeTweaks(current: Tweaks, patch: Partial<Tweaks>): Tweaks {
  const merged: Tweaks = { ...current, ...patch }
  if (patch.cheek !== undefined && patch.cheekiness === undefined) {
    merged.cheekiness = patch.cheek
  } else if (patch.cheekiness !== undefined && patch.cheek === undefined) {
    merged.cheek = patch.cheekiness
  }
  return merged
}
