import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { LumoWorkoutScene, LUMO_SCENE_DURATION } from './LumoWorkoutScene'

afterEach(() => {
  cleanup()
})

describe('LumoWorkoutScene', () => {
  it('exports a 7-second scene duration', () => {
    expect(LUMO_SCENE_DURATION).toBe(7)
  })

  it('renders without crashing at t=0 (entry frame, Lumo off-screen)', () => {
    render(<LumoWorkoutScene time={0} />)
    expect(screen.getByTestId('lumo-scene')).toBeInTheDocument()
    // At t=0 Lumo is in the 'idle' state (pre-landing).
    expect(screen.getByTestId('lumo-scene-mascot')).toHaveAttribute(
      'data-lumo-state',
      'idle',
    )
  })

  it('renders a cheer Lumo during the squat beat (t=2.0)', () => {
    render(<LumoWorkoutScene time={2.0} />)
    expect(screen.getByTestId('lumo-scene-mascot')).toHaveAttribute(
      'data-lumo-state',
      'cheer',
    )
  })

  it('renders a flex Lumo at the flex peak (t=3.5)', () => {
    render(<LumoWorkoutScene time={3.5} />)
    expect(screen.getByTestId('lumo-scene-mascot')).toHaveAttribute(
      'data-lumo-state',
      'flex',
    )
  })

  it('renders a pr Lumo during the jump (t=5.0)', () => {
    render(<LumoWorkoutScene time={5.0} />)
    expect(screen.getByTestId('lumo-scene-mascot')).toHaveAttribute(
      'data-lumo-state',
      'pr',
    )
  })

  it('does NOT reveal the tagline before t=5.7', () => {
    render(<LumoWorkoutScene time={5.0} />)
    const tagline = screen.getByTestId('lumo-scene-tagline')
    expect(tagline.style.opacity).toBe('0')
  })

  it('reveals the tagline past t=5.7', () => {
    render(<LumoWorkoutScene time={6.6} />)
    const tagline = screen.getByTestId('lumo-scene-tagline')
    const op = Number(tagline.style.opacity)
    expect(op).toBeGreaterThan(0.5)
    expect(tagline.textContent).toMatch(/ready when.*you are/i)
  })

  it('renders at every beat without crashing (t=0 to t=LUMO_SCENE_DURATION)', () => {
    for (let t = 0; t <= LUMO_SCENE_DURATION + 0.01; t += 0.25) {
      const { unmount } = render(<LumoWorkoutScene time={t} />)
      expect(screen.getByTestId('lumo-scene-mascot')).toBeInTheDocument()
      unmount()
    }
  })

  it('honours the isDark prop (different gradient per theme)', () => {
    const { rerender } = render(<LumoWorkoutScene time={3.5} isDark />)
    const sceneDark = screen.getByTestId('lumo-scene')
    const darkBg = sceneDark.style.background
    // Dark theme stops — jsdom normalises hex to rgb, so match on the
    // rgb values (45,19,48 = #2D1330 etc.).
    expect(darkBg).toMatch(/rgb\(45,\s*19,\s*48\)|#2D1330/i)

    rerender(<LumoWorkoutScene time={3.5} isDark={false} />)
    const sceneLight = screen.getByTestId('lumo-scene')
    const lightBg = sceneLight.style.background
    // Light theme cream stop (#FFF7F4 = 255,247,244).
    expect(lightBg).toMatch(/rgb\(255,\s*247,\s*244\)|#FFF7F4/i)
  })
})
