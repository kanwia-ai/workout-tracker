import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BodyCheckSheet, BODY_CHECK_STORAGE_KEY, loadBodyCheck, humanizeBodyPart } from './BodyCheckSheet'

describe('humanizeBodyPart', () => {
  it('humanizes meniscus parts to include "(meniscus)"', () => {
    expect(humanizeBodyPart('left_meniscus')).toBe('left knee (meniscus)')
    expect(humanizeBodyPart('right_meniscus')).toBe('right knee (meniscus)')
  })
  it('humanizes underscored parts to spaced strings', () => {
    expect(humanizeBodyPart('lower_back')).toBe('lower back')
    expect(humanizeBodyPart('hip_flexors')).toBe('hip flexors')
  })
  it('humanizes single-word parts cleanly', () => {
    expect(humanizeBodyPart('wrist')).toBe('wrist')
    expect(humanizeBodyPart('neck')).toBe('neck')
  })
})

describe('loadBodyCheck', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when no value is stored', () => {
    expect(loadBodyCheck('2026-05-26')).toBeNull()
  })

  it('returns parsed state when valid JSON is stored', () => {
    localStorage.setItem(
      BODY_CHECK_STORAGE_KEY('2026-05-26'),
      JSON.stringify({ flagged: ['left_knee', 'lower_back'] }),
    )
    expect(loadBodyCheck('2026-05-26')).toEqual({ flagged: ['left_knee', 'lower_back'] })
  })

  it('returns null when stored value is malformed', () => {
    localStorage.setItem(BODY_CHECK_STORAGE_KEY('2026-05-26'), 'not json')
    expect(loadBodyCheck('2026-05-26')).toBeNull()
  })

  it("returns null when stored value isn't shaped like BodyCheckState", () => {
    localStorage.setItem(BODY_CHECK_STORAGE_KEY('2026-05-26'), '{"not_flagged": "value"}')
    expect(loadBodyCheck('2026-05-26')).toBeNull()
  })
})

describe('BodyCheckSheet', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders one row per tracked body part with default state "fine"', () => {
    render(
      <BodyCheckSheet
        parts={['left_meniscus', 'lower_back']}
        isoDate="2026-05-26"
        onClose={() => {}}
      />,
    )
    expect(screen.getByTestId('body-check-row-left_meniscus')).toBeInTheDocument()
    expect(screen.getByTestId('body-check-row-lower_back')).toBeInTheDocument()
    expect(screen.getByTestId('body-check-tap-left_meniscus-fine')).toHaveAttribute('aria-checked', 'true')
  })

  it('saves flagged "off" parts to localStorage and calls onClose with new state', () => {
    const onClose = vi.fn()
    render(
      <BodyCheckSheet
        parts={['left_meniscus', 'lower_back']}
        isoDate="2026-05-26"
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByTestId('body-check-tap-left_meniscus-off'))
    fireEvent.click(screen.getByTestId('body-check-save'))
    expect(onClose).toHaveBeenCalledWith(
      expect.objectContaining({ flagged: ['left_meniscus'] }),
    )
    expect(loadBodyCheck('2026-05-26')).toEqual({ flagged: ['left_meniscus'] })
  })

  it('"tight" tap does NOT add part to flagged (only "off" does)', () => {
    const onClose = vi.fn()
    render(
      <BodyCheckSheet
        parts={['left_meniscus']}
        isoDate="2026-05-26"
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByTestId('body-check-tap-left_meniscus-tight'))
    fireEvent.click(screen.getByTestId('body-check-save'))
    expect(onClose).toHaveBeenCalledWith(
      expect.objectContaining({ flagged: [] }),
    )
  })

  it('cancel button passes null to onClose and does not save', () => {
    const onClose = vi.fn()
    render(
      <BodyCheckSheet
        parts={['left_meniscus']}
        isoDate="2026-05-26"
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByTestId('body-check-tap-left_meniscus-off'))
    fireEvent.click(screen.getByTestId('body-check-cancel'))
    expect(onClose).toHaveBeenCalledWith(null)
    expect(loadBodyCheck('2026-05-26')).toBeNull()
  })

  it('restores prior selections from initial state', () => {
    render(
      <BodyCheckSheet
        parts={['left_meniscus', 'lower_back']}
        isoDate="2026-05-26"
        initial={{ flagged: ['left_meniscus'] }}
        onClose={() => {}}
      />,
    )
    expect(screen.getByTestId('body-check-tap-left_meniscus-off')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('body-check-tap-lower_back-fine')).toHaveAttribute('aria-checked', 'true')
  })
})
