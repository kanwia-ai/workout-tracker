import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Lumo } from './Lumo'
import type { LumoState } from './Lumo'

const ALL_STATES: LumoState[] = [
  'idle',
  'cheer',
  'flex',
  'pr',
  'rest',
  'sleepy',
  'sad',
  'thinking',
  'celebrate',
]

describe('Lumo', () => {
  for (const state of ALL_STATES) {
    it(`renders state="${state}" without crashing`, () => {
      const { container, getByRole } = render(<Lumo state={state} />)
      const svg = container.querySelector('svg')
      expect(svg).not.toBeNull()
      // aria-label lives on the wrapper
      const img = getByRole('img')
      expect(img.getAttribute('aria-label')).toMatch(/Lumo/)
      expect(img.getAttribute('data-lumo-state')).toBe(state)
    })
  }

  it('respects a custom size', () => {
    const { container } = render(<Lumo state="idle" size={128} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('128')
    expect(svg?.getAttribute('height')).toBe('128')
  })

  it('accepts a custom color prop', () => {
    const { container } = render(<Lumo state="idle" color="#ABCDEF" />)
    const body = container.querySelector('path[stroke-linejoin="round"]')
    expect(body).not.toBeNull()
    expect(body?.getAttribute('fill')).toBe('#ABCDEF')
  })
})
