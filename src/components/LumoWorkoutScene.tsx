// LumoWorkoutScene — a looping 7-second beat sheet starring our marshmallow
// mascot. Ported from the Lumo Splash.html file in the design zip
// (/tmp/workout-app-design-v2/Lumo Splash.html).
//
// Beat sheet:
//   0.00–0.72  falls in from above with squash/stretch landing
//   0.72–1.00  rebound
//   1.40–3.20  two squats (state = 'cheer')
//   3.20–4.80  flex hold with sparkle burst (state = 'flex')
//   4.80–5.60  jump + PR star pop (state = 'pr')
//   5.60–7.00  settle + wink + tagline fade-in (state ≈ 'wink' → 'cheer')
//
// Trade-off: our base <Lumo> doesn't have a `wink` state, so the tail of the
// scene uses `cheer` (the closest smiley pose with closed-arc eyes). Adding a
// dedicated wink is a later task — the brief explicitly called this out as a
// known gap we can paper over.
//
// The scene is a PURE function of `time`. No RAF inside — the parent owns
// the clock (see `LumoLoader` which uses `useTime`). This makes the scene
// trivially testable at any time value.

import type { CSSProperties, ReactNode } from 'react'
import { Easing, clamp } from '../lib/animations'
import { Lumo, type LumoState } from './Lumo'

/** Total duration of one loop, in seconds. */
export const LUMO_SCENE_DURATION = 7

export interface LumoWorkoutSceneProps {
  /** Current playhead, in seconds. 0..LUMO_SCENE_DURATION. */
  time: number
  /** Overall mascot size in pixels. Defaults to 240. */
  size?: number
  /** Mascot body fill. Defaults to the CSS var `--mascot-color`. */
  color?: string
  /** Accent color used for sparkles / stars. Defaults to the CSS var `--brand`. */
  accent?: string
  /** Dark-mode flag. Controls background gradient + tagline contrast. */
  isDark?: boolean
}

/** Soft floating hearts that drift up and back around every few seconds. */
const HEARTS: ReadonlyArray<{
  xPct: number
  yPct: number
  color: string
  delay: number
  dur: number
}> = [
  { xPct: 0.14, yPct: 0.48, color: '#FFB4C6', delay: 0.2, dur: 3.2 },
  { xPct: 0.84, yPct: 0.52, color: '#C9A0FF', delay: 1.1, dur: 3.5 },
  { xPct: 0.18, yPct: 0.68, color: '#FFD86E', delay: 2.0, dur: 3.0 },
  { xPct: 0.80, yPct: 0.72, color: '#6EE7C7', delay: 0.6, dur: 3.4 },
  { xPct: 0.12, yPct: 0.82, color: '#FF9AA2', delay: 1.7, dur: 3.2 },
  { xPct: 0.86, yPct: 0.86, color: '#C9A0FF', delay: 2.5, dur: 3.1 },
]

interface LumoTransform {
  y: number
  sx: number
  sy: number
}

/** Phase 0: Lumo falls in, squashes on landing, rebounds. */
function enterSquashAt(t: number): LumoTransform {
  if (t <= 0) return { y: -260, sx: 1, sy: 1 }
  if (t < 0.55) {
    const p = Easing.easeInQuad(clamp(t / 0.55, 0, 1))
    return { y: -260 + p * 260, sx: 1 - p * 0.1, sy: 1 + p * 0.15 }
  }
  if (t < 0.72) {
    const p = Easing.easeOutQuad(clamp((t - 0.55) / 0.17, 0, 1))
    return { y: 8 - p * 8, sx: 0.9 + p * 0.3, sy: 1.15 - p * 0.4 }
  }
  if (t < 1.0) {
    const p = Easing.easeOutBack(clamp((t - 0.72) / 0.28, 0, 1))
    return {
      y: -p * 14 + (1 - Math.abs(p - 0.5) * 2) * -6,
      sx: 1.2 - p * 0.2,
      sy: 0.75 + p * 0.25,
    }
  }
  return { y: 0, sx: 1, sy: 1 }
}

/** Phase 2: two squats (down → up → down → up). */
function squatYAt(t: number): number {
  if (t < 1.4 || t > 3.2) return 0
  const local = (t - 1.4) / 1.8
  const dips = Math.pow(Math.sin(local * Math.PI * 2), 2)
  return Math.sin(local * Math.PI * 2) < 0 ? dips * 22 : 0
}

/** Phase 3: flex — scale up, hold with a subtle pulse, ease back. */
function flexScaleAt(t: number): number {
  if (t < 3.2) return 1
  if (t < 3.55)
    return 1 + Easing.easeOutBack(clamp((t - 3.2) / 0.35, 0, 1)) * 0.18
  if (t < 4.5) return 1.18 + Math.sin((t - 3.55) * 6) * 0.025
  if (t < 4.8) return 1.18 - Easing.easeInQuad(clamp((t - 4.5) / 0.3, 0, 1)) * 0.18
  return 1
}

/** Phase 4: jump — half-sine arc upward. */
function jumpYAt(t: number): number {
  if (t < 4.8 || t > 5.6) return 0
  const p = (t - 4.8) / 0.8
  return -Math.sin(p * Math.PI) * 60
}

/** Map `time` to the Lumo state for the corresponding beat. */
function lumoStateAt(t: number): LumoState {
  if (t < 0.72) return 'idle'
  if (t < 3.2) return 'cheer'
  if (t < 4.8) return 'flex'
  if (t < 5.6) return 'pr'
  // "wink" beat — our Lumo has no wink, so fall back to cheer (closed-arc eyes).
  return 'cheer'
}

interface SceneProps {
  time: number
  size: number
  color: string
  accent: string
  isDark: boolean
  width: number
  height: number
}

function FloatingHearts({ time, width, height }: Omit<SceneProps, 'size' | 'color' | 'accent' | 'isDark'>): ReactNode {
  return (
    <>
      {HEARTS.map((h, i) => {
        const local = ((time + h.delay) % h.dur) / h.dur
        const op = Math.sin(local * Math.PI) * 0.6
        const ty = -local * 40
        return (
          <svg
            key={i}
            width="20"
            height="18"
            viewBox="0 0 20 18"
            style={{
              position: 'absolute',
              left: h.xPct * width,
              top: h.yPct * height,
              opacity: op,
              transform: `translateY(${ty}px) rotate(${Math.sin(local * Math.PI * 2) * 8}deg)`,
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            <path
              d="M10 16 C 2 10, 0 6, 4 3 C 7 1, 9 3, 10 5 C 11 3, 13 1, 16 3 C 20 6, 18 10, 10 16 Z"
              fill={h.color}
              opacity="0.9"
            />
          </svg>
        )
      })}
    </>
  )
}

function SparkleBurst({ progress, accent }: { progress: number; accent: string }): ReactNode {
  if (progress <= 0) return null
  const PALETTE = ['#FFD86E', '#FFB4C6', '#C9A0FF', '#6EE7C7']
  return (
    <svg
      width="280"
      height="280"
      viewBox="-140 -140 280 280"
      style={{
        position: 'absolute',
        left: '50%',
        top: '55%',
        marginLeft: -140,
        marginTop: -140,
        opacity: progress,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {Array.from({ length: 12 }, (_, i) => {
        const ang = (i / 12) * Math.PI * 2
        const r = 40 + progress * 80
        const x = Math.cos(ang) * r
        const y = Math.sin(ang) * r
        const sizeN = 4 + (i % 3) * 2
        // First + fourth sparkle in each quadrant use the accent to tie back
        // to brand color; rest cycle through the palette.
        const color = i % 4 === 0 ? accent : PALETTE[i % PALETTE.length]
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${i * 30})`}>
            <path
              d={`M0 -${sizeN * 2} L${sizeN * 0.3} -${sizeN * 0.3} L${sizeN * 2} 0 L${sizeN * 0.3} ${sizeN * 0.3} L0 ${sizeN * 2} L-${sizeN * 0.3} ${sizeN * 0.3} L-${sizeN * 2} 0 L-${sizeN * 0.3} -${sizeN * 0.3} Z`}
              fill={color}
              opacity={1 - progress * 0.3}
            />
          </g>
        )
      })}
    </svg>
  )
}

function PRStarPop({ progress }: { progress: number }): ReactNode {
  if (progress <= 0) return null
  const COLORS = ['#FFD86E', '#FFB4C6', '#C9A0FF']
  return (
    <svg
      width="280"
      height="280"
      viewBox="-140 -140 280 280"
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        marginLeft: -140,
        marginTop: -140,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {Array.from({ length: 8 }, (_, i) => {
        const ang = (i / 8) * Math.PI * 2 - Math.PI / 2
        const r = 50 + progress * 90
        const x = Math.cos(ang) * r
        const y = Math.sin(ang) * r
        const op = Math.sin(progress * Math.PI)
        const color = COLORS[i % COLORS.length]
        return (
          <g key={i} transform={`translate(${x} ${y})`} opacity={op}>
            <circle r="4" fill={color} />
            <circle r="7" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
          </g>
        )
      })}
    </svg>
  )
}

export function LumoWorkoutScene({
  time,
  size = 240,
  color,
  accent,
  isDark = true,
}: LumoWorkoutSceneProps): ReactNode {
  const bodyColor = color ?? 'var(--mascot-color, #FFB4C6)'
  const accentColor = accent ?? 'var(--brand, #FF7A45)'

  // Compose Lumo's transform from every active phase.
  const enter = enterSquashAt(time)
  const squatY = squatYAt(time)
  const squatSquash = squatY > 0 ? 1 + (squatY / 22) * 0.12 : 1
  const flex = flexScaleAt(time)
  const jumpY = jumpYAt(time)
  const lumoY = enter.y + squatY + jumpY
  const lumoSx = enter.sx * squatSquash
  const lumoSy = enter.sy / (squatSquash === 1 ? 1 : 0.85 + (squatSquash - 1))
  const state = lumoStateAt(time)

  // Ground shadow shrinks during jumps & falls, grows during landings.
  const shadowScale =
    1 -
    Math.min(Math.abs(jumpY) / 60, 1) * 0.5 -
    Math.min(Math.abs(enter.y) / 260, 1) * 0.6

  // Sparkle burst: fires at flex peak.
  const burstProgress =
    time < 3.3
      ? 0
      : time < 4.2
        ? Easing.easeOutCubic(clamp((time - 3.3) / 0.9, 0, 1))
        : Math.max(0, 1 - Math.min(1, (time - 4.2) / 0.6))

  // Star pop: fires during the jump.
  const popProgress =
    time < 4.8
      ? 0
      : time < 5.6
        ? Easing.easeOutCubic(clamp((time - 4.8) / 0.8, 0, 1))
        : 0

  // Tagline fades in at ~t=5.7.
  const taglineOp =
    time < 5.7 ? 0 : Easing.easeOutCubic(clamp((time - 5.7) / 0.6, 0, 1))

  // Scene is sized based on mascot size. The reference frame was
  // 402×874 but we want to be responsive, so we use 100% width/height
  // and position via percentages.
  const width = Math.max(320, size * 1.8)
  const height = Math.max(520, size * 3.3)

  // The halo + shadow geometry is anchored to where the mascot lands
  // (center of the frame, roughly 58% down).
  const mascotTop = height * 0.58

  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: height,
    overflow: 'hidden',
    fontFamily: "'General Sans', 'Inter', system-ui, sans-serif",
  }

  // Background gradient: dark → purple/midnight, light → pink/cream.
  const background = isDark
    ? 'radial-gradient(120% 80% at 50% 0%, #2D1330 0%, #14071A 55%, #0A0410 100%)'
    : `radial-gradient(120% 80% at 50% 0%, ${bodyColor} 0%, #FFF7F4 55%, #FFEFEA 100%)`

  // Tagline readable in both light and dark.
  const taglineColor = isDark ? '#FFE8EE' : '#2B1A1F'

  return (
    <div style={{ ...containerStyle, background }} data-testid="lumo-scene">
      {/* Soft glow halo behind Lumo */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: mascotTop,
          width: 340,
          height: 340,
          marginLeft: -170,
          marginTop: -170,
          background:
            'radial-gradient(circle, rgba(255,180,198,0.18) 0%, rgba(255,180,198,0) 70%)',
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />

      <FloatingHearts time={time} width={width} height={height} />

      <SparkleBurst progress={burstProgress} accent={accentColor} />
      <PRStarPop progress={popProgress} />

      {/* Ground shadow */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: mascotTop + 170,
          width: 160,
          height: 22,
          marginLeft: -80,
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 70%)',
          transform: `scaleX(${Math.max(0.3, shadowScale)}) scaleY(${Math.max(0.3, shadowScale)})`,
          filter: 'blur(2px)',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />

      {/* The mascot itself */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: mascotTop,
          transform: `translateX(-50%) translateY(${lumoY}px) scale(${lumoSx}, ${lumoSy}) scale(${flex})`,
          transformOrigin: 'center bottom',
          willChange: 'transform',
        }}
        data-testid="lumo-scene-mascot"
        data-lumo-state={state}
      >
        <Lumo state={state} size={size} color={bodyColor} />
      </div>

      {/* Tagline fades in toward the end of the loop */}
      <div
        data-testid="lumo-scene-tagline"
        style={{
          position: 'absolute',
          bottom: '16%',
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: taglineOp,
          transform: `translateY(${(1 - taglineOp) * 10}px)`,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 26,
            color: taglineColor,
            lineHeight: 1.2,
          }}
        >
          ready when
          <br />
          you are ✨
        </div>
      </div>

      {/* Bottom glow */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 200,
          background: isDark
            ? 'linear-gradient(to top, rgba(255,180,198,0.08), rgba(0,0,0,0))'
            : 'linear-gradient(to top, rgba(255,180,198,0.18), rgba(255,247,244,0))',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />
    </div>
  )
}

export default LumoWorkoutScene
