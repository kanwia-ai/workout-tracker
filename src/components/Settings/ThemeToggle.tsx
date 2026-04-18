/**
 * ThemeToggle — a segmented "Dark / Light / System" control.
 *
 * Source of truth is the useTweaks hook's `themeMode` + `setThemeMode`:
 *  - Clicking a segment writes the mode to localStorage via the hook.
 *  - 'System' option follows `prefers-color-scheme` live (the hook listens
 *    to matchMedia and updates the resolved theme without clobbering the
 *    user-facing 'system' selection).
 *
 * Styling: CSS vars only so the pill looks right in both themes.
 */

import type { ThemeMode } from '../../hooks/useTweaks'

const OPTIONS: readonly { mode: ThemeMode; label: string }[] = [
  { mode: 'dark', label: 'Dark' },
  { mode: 'light', label: 'Light' },
  { mode: 'system', label: 'System' },
]

export interface ThemeToggleProps {
  mode: ThemeMode
  onChange: (mode: ThemeMode) => void
}

export function ThemeToggle({ mode, onChange }: ThemeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      data-testid="theme-toggle"
      style={{
        display: 'inline-flex',
        padding: 4,
        borderRadius: 14,
        background: 'var(--lumo-bg)',
        border: '1px solid var(--lumo-border)',
        gap: 2,
      }}
    >
      {OPTIONS.map((opt) => {
        const selected = mode === opt.mode
        return (
          <button
            key={opt.mode}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`theme-toggle-${opt.mode}`}
            onClick={() => onChange(opt.mode)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.02em',
              background: selected ? 'var(--brand)' : 'transparent',
              color: selected ? 'var(--lumo-bg)' : 'var(--lumo-text-sec)',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 180ms ease, color 180ms ease',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
