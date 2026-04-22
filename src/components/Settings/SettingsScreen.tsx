/**
 * SettingsScreen — Kyra's home for the user-flippable knobs she actually
 * cares about: theme, voice (cheek), and a roadmap preview of the rest.
 *
 * Scope (per the three-deliverable brief, 2026-04-17):
 *  - Appearance: Dark / Light / System (wired to useTweaks).
 *  - Voice: Dry / Friendly / Cheeky (wired to cheek + cheekiness, persisted).
 *  - About: version + a quiet "built with care" line.
 *  - Coming soon: disabled rows so the shape of future settings is visible.
 *
 * Styling follows the Tweaks panel in /tmp/workout-app-design/screens.jsx —
 * rounded cards on `--lumo-raised` backgrounds, `--lumo-border` separators,
 * Fraunces italic for the header. Absolutely zero hex literals — the whole
 * panel paints through CSS vars so it flips with the theme.
 */

import { X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ThemeToggle } from './ThemeToggle'
import {
  CHEEK_PREF_KEY,
  type ThemeMode,
  type SetTweaks,
} from '../../hooks/useTweaks'
import type { Cheek, Tweaks } from '../../lib/tweaks'

const APP_VERSION = '0.1.0'

export interface SettingsScreenProps {
  tweaks: Tweaks
  setTweaks: SetTweaks
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  onClose: () => void
  onRegeneratePlan: () => void
  isGenerating?: boolean
}

const CHEEK_OPTIONS: readonly { value: Cheek; label: string }[] = [
  { value: 0, label: 'Dry' },
  { value: 1, label: 'Friendly' },
  { value: 2, label: 'Cheeky' },
]

const COMING_SOON: readonly string[] = [
  'Edit profile',
  'Edit goals',
  'Export data',
  'Reset app',
]

export function SettingsScreen({
  tweaks,
  setTweaks,
  themeMode,
  setThemeMode,
  onClose,
  onRegeneratePlan,
  isGenerating = false,
}: SettingsScreenProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleCheek = (value: Cheek) => {
    setTweaks({ cheek: value, cheekiness: value })
    try {
      window.localStorage?.setItem(CHEEK_PREF_KEY, String(value))
    } catch {
      // best-effort persistence — don't crash on denied writes.
    }
  }

  const handleConfirmRegenerate = () => {
    setConfirmOpen(false)
    onRegeneratePlan()
  }

  return (
    <div
      data-testid="settings-screen"
      style={{
        minHeight: '100vh',
        background: 'var(--lumo-bg)',
        color: 'var(--lumo-text)',
        padding: '24px 16px 96px',
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <h1
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: 32,
              lineHeight: 1,
              margin: 0,
              color: 'var(--lumo-text)',
            }}
          >
            Settings
          </h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            data-testid="settings-close"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'var(--lumo-raised)',
              border: '1px solid var(--lumo-border)',
              color: 'var(--lumo-text-sec)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </header>

        <Section title="Appearance">
          <Row label="Theme" description="System matches your device.">
            <ThemeToggle mode={themeMode} onChange={setThemeMode} />
          </Row>
        </Section>

        <Section title="Voice">
          <Row
            label="Cheek level"
            description="How chatty Lumo gets between sets."
          >
            <div
              role="radiogroup"
              aria-label="Cheek level"
              data-testid="cheek-toggle"
              style={{
                display: 'inline-flex',
                padding: 4,
                borderRadius: 14,
                background: 'var(--lumo-bg)',
                border: '1px solid var(--lumo-border)',
                gap: 2,
              }}
            >
              {CHEEK_OPTIONS.map((opt) => {
                const selected = tweaks.cheek === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`cheek-toggle-${opt.value}`}
                    onClick={() => handleCheek(opt.value)}
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
          </Row>
        </Section>

        <Section title="Plan">
          <div style={{ padding: '4px 0' }}>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={isGenerating}
              data-testid="regenerate-plan-button"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 12,
                background: 'var(--lumo-warn, #f59e0b)',
                color: 'var(--lumo-bg)',
                border: 'none',
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '0.01em',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.6 : 1,
                transition: 'opacity 180ms ease',
              }}
            >
              {isGenerating ? 'Regenerating…' : 'Regenerate my plan'}
            </button>
            <div
              style={{
                fontSize: 12,
                color: 'var(--lumo-text-sec)',
                marginTop: 10,
                lineHeight: 1.5,
              }}
            >
              Rebuild your training block with the latest version of the
              generator. Your in-progress session (if any) will be preserved.
            </div>
          </div>
        </Section>

        <Section title="About">
          <Row label="Version">
            <span
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontSize: 14,
                color: 'var(--lumo-text-sec)',
              }}
            >
              {APP_VERSION}
            </span>
          </Row>
          <Row label="Built with care">
            <span
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 14,
                color: 'var(--lumo-text-sec)',
              }}
            >
              for stronger, happier bodies.
            </span>
          </Row>
        </Section>

        <Section title="Coming soon">
          {COMING_SOON.map((label) => (
            <button
              key={label}
              type="button"
              disabled
              data-testid={`coming-soon-${label.toLowerCase().replace(/\s+/g, '-')}`}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                marginBottom: 8,
                background: 'var(--lumo-bg)',
                border: '1px solid var(--lumo-border)',
                borderRadius: 12,
                color: 'var(--lumo-text-ter)',
                fontSize: 14,
                fontWeight: 500,
                textAlign: 'left',
                cursor: 'not-allowed',
                opacity: 0.7,
              }}
            >
              <span>{label}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'var(--lumo-raised)',
                  color: 'var(--lumo-text-ter)',
                  border: '1px solid var(--lumo-border)',
                }}
              >
                soon
              </span>
            </button>
          ))}
        </Section>
      </div>

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="regenerate-dialog-title"
          data-testid="regenerate-confirm-dialog"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 1000,
          }}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 400,
              background: 'var(--lumo-raised)',
              border: '1px solid var(--lumo-border)',
              borderRadius: 20,
              padding: 24,
              color: 'var(--lumo-text)',
            }}
          >
            <h2
              id="regenerate-dialog-title"
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                fontWeight: 700,
                fontSize: 22,
                margin: '0 0 12px',
                color: 'var(--lumo-text)',
              }}
            >
              Regenerate your plan?
            </h2>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.55,
                color: 'var(--lumo-text-sec)',
                margin: '0 0 20px',
              }}
            >
              This replaces your current mesocycle with a fresh one. Past
              sessions stay logged; any upcoming sessions not yet started will
              be recreated.
            </p>
            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                data-testid="regenerate-cancel"
                style={{
                  padding: '10px 18px',
                  borderRadius: 12,
                  background: 'transparent',
                  color: 'var(--lumo-text-sec)',
                  border: '1px solid var(--lumo-border)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRegenerate}
                data-testid="regenerate-confirm"
                style={{
                  padding: '10px 18px',
                  borderRadius: 12,
                  background: 'var(--brand)',
                  color: 'var(--lumo-bg)',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <h2
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--lumo-text-ter)',
          margin: '0 0 14px',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '10px 0',
        borderBottom: '1px solid var(--lumo-border)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--lumo-text)',
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--lumo-text-sec)',
              marginTop: 2,
            }}
          >
            {description}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}
