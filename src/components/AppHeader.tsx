/**
 * AppHeader — thin app-wide title bar rendered above the main workout view.
 *
 * Exists because Kyra was loud about wanting a visible, tappable settings
 * entry point ("why on earth would I ask you to build something I can't
 * actually see or turn on"). Keeps the shell small: just the app mark and
 * a gear. No nav, no breadcrumb scope creep.
 */

import { Settings } from 'lucide-react'

export interface AppHeaderProps {
  onOpenSettings: () => void
}

export function AppHeader({ onOpenSettings }: AppHeaderProps) {
  return (
    <header
      data-testid="app-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--lumo-border)',
        background: 'var(--lumo-bg)',
        color: 'var(--lumo-text)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <span
        style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontStyle: 'italic',
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: '-0.01em',
        }}
      >
        Lumo
      </span>
      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Open settings"
        data-testid="open-settings"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'var(--lumo-raised)',
          border: '1px solid var(--lumo-border)',
          color: 'var(--lumo-text-sec)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <Settings size={16} />
      </button>
    </header>
  )
}
