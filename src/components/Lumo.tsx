// Lumo — a round, cloud-marshmallow creature with enormous sparkly eyes,
// tiny star freckles, big cheeks, and a little tuft of hair.
// Ported from /tmp/workout-app-design/lumo.jsx — do not redesign.

import type { CSSProperties, ReactNode } from 'react'

export type LumoState =
  | 'idle'
  | 'cheer'
  | 'flex'
  | 'pr'
  | 'rest'
  | 'sleepy'
  | 'sad'
  | 'thinking'
  | 'celebrate'

export interface LumoProps {
  state: LumoState
  size?: number
  color?: string
}

const STATE_LABELS: Record<LumoState, string> = {
  idle: 'Lumo is idle',
  cheer: 'Lumo is cheering',
  flex: 'Lumo is flexing',
  pr: 'Lumo is hitting a PR',
  rest: 'Lumo is resting',
  sleepy: 'Lumo is sleepy',
  sad: 'Lumo is sad',
  thinking: 'Lumo is thinking',
  celebrate: 'Lumo is celebrating',
}

// shade — mix toward white (pct > 0) or black (pct < 0)
function shade(hex: string, pct: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const mix = (c: number): number => {
    if (pct >= 0) return Math.round(c + (255 - c) * (pct / 100))
    return Math.round(c + c * (pct / 100))
  }
  const to = (n: number): string =>
    Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
  return `#${to(mix(r))}${to(mix(g))}${to(mix(b))}`
}

// Safely resolve the initial color: prefer prop, then CSS var --mascot-color, then fallback.
// NOTE: we can't read CSS vars synchronously at render without a DOM ref, so we use
// CSS `var(--mascot-color, <fallback>)` in inline styles where possible, and fall back
// to a literal hex for computed shades (outline/highlight/etc.) since shade() needs a real hex.
const DEFAULT_COLOR = '#FFB4C6'

const CSS = `
@keyframes lumo-breathe { 0%,100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-1.5px) scaleY(1.03); } }
@keyframes lumo-wiggle  { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
@keyframes lumo-bounce  { 0%,100% { transform: translateY(0) scale(1,1); } 25% { transform: translateY(-6px) scale(1.04,0.96); } 50% { transform: translateY(0) scale(0.96,1.04); } 75% { transform: translateY(-3px) scale(1.02,0.98); } }
@keyframes lumo-flex    { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
@keyframes lumo-blink   { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.08); } }
@keyframes lumo-zzz     { 0% { opacity: 0; transform: translate(0,0) scale(0.5); } 40% { opacity: 1; } 100% { opacity: 0; transform: translate(8px,-18px) scale(1.2); } }
@keyframes lumo-spark   { 0% { opacity: 0; transform: scale(0) rotate(0); } 30% { opacity: 1; transform: scale(1) rotate(45deg); } 100% { opacity: 0; transform: scale(1.8) rotate(180deg); } }
@keyframes lumo-tap     { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-14deg); } 75% { transform: rotate(14deg); } }
@keyframes lumo-rock    { 0%,100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
@keyframes lumo-stars   { 0%,100% { transform: scale(1) rotate(0); } 50% { transform: scale(1.2) rotate(15deg); } }
@keyframes lumo-twinkle { 0%,100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
@keyframes lumo-float   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
`

function bodyAnimation(state: LumoState): string {
  switch (state) {
    case 'cheer':
      return 'lumo-bounce 0.85s ease-in-out infinite'
    case 'pr':
      return 'lumo-bounce 0.5s ease-in-out infinite'
    case 'celebrate':
      return 'lumo-bounce 0.75s ease-in-out infinite'
    case 'flex':
      return 'lumo-flex 1.2s ease-in-out infinite'
    case 'sad':
      return 'lumo-rock 2.4s ease-in-out infinite'
    case 'thinking':
      return 'lumo-wiggle 1.6s ease-in-out infinite'
    default:
      return 'lumo-float 3s ease-in-out infinite'
  }
}

function renderEyes(state: LumoState): ReactNode {
  const eyeDark = '#2A1F2E'

  if (state === 'sleepy') {
    return (
      <>
        <path
          d="M32 56 Q40 52 48 56"
          stroke={eyeDark}
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M52 56 Q60 52 68 56"
          stroke={eyeDark}
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
      </>
    )
  }

  if (state === 'pr') {
    return (
      <>
        {[36, 64].map((cx) => (
          <g
            key={cx}
            transform={`translate(${cx} 55)`}
            style={{ animation: 'lumo-stars 0.6s ease-in-out infinite' }}
          >
            <circle r="8" fill="#fff" stroke={eyeDark} strokeWidth="1.8" />
            <path
              d="M0 -5 L1.5 -1.5 L5 0 L1.5 1.5 L0 5 L-1.5 1.5 L-5 0 L-1.5 -1.5 Z"
              fill="#FFD86E"
            />
            <circle cx="0" cy="0" r="1.5" fill="#fff" />
          </g>
        ))}
      </>
    )
  }

  if (state === 'cheer') {
    return (
      <>
        {[36, 64].map((cx) => (
          <g key={cx}>
            <ellipse
              cx={cx}
              cy="55"
              rx="7"
              ry="8.5"
              fill="#fff"
              stroke={eyeDark}
              strokeWidth="2"
            />
            <ellipse cx={cx} cy="57" rx="5" ry="6.5" fill={eyeDark} />
            <circle cx={cx - 1.5} cy="53.5" r="2.2" fill="#fff" />
            <circle cx={cx + 2} cy="59" r="1" fill="#fff" />
            <path
              d={`M${cx - 6.5} 49 L${cx - 9} 45.5`}
              stroke={eyeDark}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d={`M${cx} 47 L${cx} 43.5`}
              stroke={eyeDark}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d={`M${cx + 6.5} 49 L${cx + 9} 45.5`}
              stroke={eyeDark}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
        ))}
      </>
    )
  }

  if (state === 'sad') {
    return (
      <>
        <path
          d="M30 56 Q36 50 42 56"
          stroke={eyeDark}
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M58 56 Q64 50 70 56"
          stroke={eyeDark}
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="34" cy="62" rx="1.5" ry="2.5" fill="#88DDFF" />
      </>
    )
  }

  if (state === 'thinking') {
    return (
      <>
        {[36, 64].map((cx) => (
          <g key={cx}>
            <ellipse
              cx={cx}
              cy="55"
              rx="6"
              ry="7.5"
              fill="#fff"
              stroke={eyeDark}
              strokeWidth="1.8"
            />
            <ellipse cx={cx + 2} cy="52" rx="3" ry="4" fill={eyeDark} />
            <circle cx={cx + 2.5} cy="51" r="1.3" fill="#fff" />
          </g>
        ))}
      </>
    )
  }

  // default — BIG sparkly anime-style eyes with lashes (idle, rest, flex, celebrate)
  return (
    <>
      {[36, 64].map((cx) => (
        <g
          key={cx}
          style={{
            animation: 'lumo-blink 5s ease-in-out infinite',
            transformOrigin: `${cx}px 55px`,
          }}
        >
          <ellipse
            cx={cx}
            cy="55"
            rx="6.5"
            ry="8"
            fill="#fff"
            stroke={eyeDark}
            strokeWidth="2"
          />
          <ellipse cx={cx} cy="56" rx="4.5" ry="6" fill={eyeDark} />
          <circle cx={cx - 1.5} cy="53" r="2" fill="#fff" />
          <circle cx={cx + 1.8} cy="58.5" r="1.1" fill="#fff" />
          <path
            d={`M${cx + 5.5} 49.5 Q${cx + 8} 47 ${cx + 9.5} 48`}
            stroke={eyeDark}
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M${cx + 6.2} 51 L${cx + 9} 51`}
            stroke={eyeDark}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d={`M${cx - 5.5} 49.5 Q${cx - 8} 47 ${cx - 9.5} 48`}
            stroke={eyeDark}
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      ))}
    </>
  )
}

function renderMouth(state: LumoState): ReactNode {
  const c = '#5A2840'

  if (state === 'sleepy') {
    return (
      <path
        d="M47 74 Q50 76 53 74"
        stroke={c}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    )
  }
  if (state === 'sad') {
    return (
      <path
        d="M44 77 Q50 73 56 77"
        stroke={c}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
    )
  }
  if (state === 'cheer' || state === 'pr') {
    return (
      <>
        <ellipse cx="50" cy="75" rx="4" ry="4.5" fill={c} />
        <ellipse cx="50" cy="76.5" rx="2.5" ry="2" fill="#FF7A9C" />
      </>
    )
  }
  if (state === 'flex') {
    return (
      <>
        <path
          d="M44 74 Q50 79 56 74"
          stroke={c}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <rect x="48.5" y="74.5" width="3" height="2" fill="#fff" />
      </>
    )
  }
  if (state === 'thinking') {
    return (
      <path
        d="M47 75 L53 75"
        stroke={c}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
    )
  }
  if (state === 'celebrate') {
    return (
      <>
        <path
          d="M42 74 Q50 81 58 74"
          stroke={c}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="50" cy="79" rx="2.5" ry="1.5" fill="#FF7A9C" />
      </>
    )
  }
  // idle / rest — soft cat-smile
  return (
    <path
      d="M45 74 Q47.5 76.5 50 74.5 Q52.5 76.5 55 74"
      stroke={c}
      strokeWidth="2.2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

export function Lumo({
  state,
  size = 64,
  color,
}: LumoProps): ReactNode {
  // Resolve a concrete hex for shade math. If caller didn't pass color, try reading
  // the CSS var at runtime; fall back to DEFAULT_COLOR. We can't read the CSS var
  // synchronously in a pure render without a DOM ref, so use DEFAULT_COLOR for shade
  // computations and apply var(--mascot-color) directly via fill style on the body.
  const resolvedColor = color ?? DEFAULT_COLOR
  const outline = shade(resolvedColor, -40)
  const highlight = shade(resolvedColor, 25)
  const bellyTone = shade(resolvedColor, 10)
  const footTone = shade(resolvedColor, -15)
  const blush = '#FF6B9D'

  // When no explicit color was provided, prefer the CSS var for body fills
  // (so theme switches cascade). Shades still use the resolved hex — an acceptable
  // compromise since shade() needs a real number.
  const bodyFill =
    color === undefined ? `var(--mascot-color, ${DEFAULT_COLOR})` : resolvedColor

  const bowPurple = '#C9A0FF'
  const bowOutline = shade('#C9A0FF', -30)

  const cheeks: ReactNode =
    state === 'sad' ? (
      <>
        <ellipse cx="30" cy="64" rx="7" ry="4" fill={blush} opacity="0.4" />
        <ellipse cx="70" cy="64" rx="7" ry="4" fill={blush} opacity="0.4" />
      </>
    ) : (
      <>
        <ellipse cx="28" cy="63" rx="8.5" ry="5.5" fill={blush} opacity="0.6" />
        <ellipse cx="72" cy="63" rx="8.5" ry="5.5" fill={blush} opacity="0.6" />
        <circle cx="25" cy="61" r="1.5" fill="#fff" opacity="0.8" />
        <circle cx="69" cy="61" r="1.5" fill="#fff" opacity="0.8" />
      </>
    )

  const hairTuft: ReactNode = (
    <g>
      <path
        d="M42 14 Q38 6 46 6 Q50 2 54 6 Q62 6 58 14 Q55 18 50 17 Q45 18 42 14 Z"
        fill={bodyFill}
        stroke={outline}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <g transform="translate(62 10)">
        <path
          d="M-4 0 Q-8 -4 -8 0 Q-8 4 -4 0 Z"
          fill={bowPurple}
          stroke={bowOutline}
          strokeWidth="1"
        />
        <path
          d="M4 0 Q8 -4 8 0 Q8 4 4 0 Z"
          fill={bowPurple}
          stroke={bowOutline}
          strokeWidth="1"
        />
        <circle cx="0" cy="0" r="2.2" fill="#A77EE6" />
        <circle cx="-0.8" cy="-0.8" r="0.7" fill="#fff" opacity="0.8" />
      </g>
    </g>
  )

  const freckles: ReactNode = (
    <g>
      <g
        transform="translate(20 50)"
        style={{ animation: 'lumo-twinkle 2s ease-in-out infinite' }}
      >
        <path
          d="M0 -2 L0.5 -0.5 L2 0 L0.5 0.5 L0 2 L-0.5 0.5 L-2 0 L-0.5 -0.5 Z"
          fill="#FFD86E"
        />
      </g>
      <g
        transform="translate(82 52)"
        style={{ animation: 'lumo-twinkle 2.5s ease-in-out 0.5s infinite' }}
      >
        <path
          d="M0 -1.5 L0.4 -0.4 L1.5 0 L0.4 0.4 L0 1.5 L-0.4 0.4 L-1.5 0 L-0.4 -0.4 Z"
          fill="#FFD86E"
        />
      </g>
      <g
        transform="translate(50 85)"
        style={{ animation: 'lumo-twinkle 1.8s ease-in-out 1s infinite' }}
      >
        <path
          d="M0 -1.8 L0.45 -0.45 L1.8 0 L0.45 0.45 L0 1.8 L-0.45 0.45 L-1.8 0 L-0.45 -0.45 Z"
          fill="#FFD86E"
        />
      </g>
    </g>
  )

  const flexArm: ReactNode =
    state === 'flex' ? (
      <g transform="translate(14 60)">
        <ellipse
          cx="0"
          cy="0"
          rx="8"
          ry="5"
          fill={bodyFill}
          stroke={outline}
          strokeWidth="2"
        />
        <ellipse
          cx="-6"
          cy="-5"
          rx="6"
          ry="5"
          fill={highlight}
          stroke={outline}
          strokeWidth="2"
        />
        <ellipse
          cx="-11"
          cy="-12"
          rx="4.5"
          ry="7"
          fill={bodyFill}
          stroke={outline}
          strokeWidth="2"
        />
        <g
          transform="translate(-6 -5)"
          style={{ animation: 'lumo-twinkle 1s ease-in-out infinite' }}
        >
          <path
            d="M0 -2 L0.5 -0.5 L2 0 L0.5 0.5 L0 2 L-0.5 0.5 L-2 0 L-0.5 -0.5 Z"
            fill="#fff"
          />
        </g>
      </g>
    ) : null

  const zzz: ReactNode =
    state === 'sleepy' ? (
      <text
        x={80}
        y={26}
        fill="color-mix(in srgb, var(--accent-plum, #C9A0FF) 60%, transparent)"
        fontSize={14}
        fontWeight="700"
        fontFamily="Fraunces, serif"
        fontStyle="italic"
        style={{
          animation: 'lumo-zzz 2.4s ease-out infinite',
        }}
      >
        z
      </text>
    ) : null

  const sparkleData: Array<[number, number, number, string]> = [
    [8, 28, 0, '#FFD86E'],
    [92, 22, 0.3, '#C9A0FF'],
    [12, 78, 0.6, '#FF9AA2'],
    [94, 72, 0.15, '#6EE7C7'],
    [50, 6, 0.45, '#FFD86E'],
    [82, 90, 0.8, '#C9A0FF'],
  ]

  const sparkles: ReactNode =
    state === 'pr' || state === 'celebrate' ? (
      <g>
        {sparkleData.map(([x, y, d, c], i) => (
          <g
            key={i}
            transform={`translate(${x} ${y})`}
            style={{ animation: `lumo-spark 1.2s ease-out ${d}s infinite` }}
          >
            <path
              d="M0 -6 L1.4 -1.4 L6 0 L1.4 1.4 L0 6 L-1.4 1.4 L-6 0 L-1.4 -1.4 Z"
              fill={c}
            />
          </g>
        ))}
      </g>
    ) : null

  const pencil: ReactNode =
    state === 'thinking' ? (
      <g
        transform="translate(85 42)"
        style={{
          animation: 'lumo-tap 0.6s ease-in-out infinite',
          transformOrigin: '0 10px',
        }}
      >
        <rect
          x="-2"
          y="0"
          width="4"
          height="18"
          fill="#FFD86E"
          stroke={outline}
          strokeWidth="1.5"
        />
        <path d="M-2 18 L0 22 L2 18 Z" fill="#2C2016" />
      </g>
    ) : null

  const sweat: ReactNode =
    state === 'celebrate' ? (
      <g transform="translate(78 36)">
        <path
          d="M0 0 Q-4 6 0 10 Q4 6 0 0 Z"
          fill="#6EE7C7"
          stroke={outline}
          strokeWidth="1.5"
        />
        <circle cx="-1" cy="3" r="1" fill="#fff" opacity="0.8" />
      </g>
    ) : null

  const wrapperStyle: CSSProperties = {
    width: size,
    height: size,
    position: 'relative',
    display: 'inline-block',
  }

  const bodyGroupStyle: CSSProperties = {
    animation: bodyAnimation(state),
    transformOrigin: '50px 60px',
  }

  return (
    <div
      style={wrapperStyle}
      role="img"
      aria-label={STATE_LABELS[state]}
      data-lumo-state={state}
    >
      <style>{CSS}</style>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ overflow: 'visible' }}
      >
        {sparkles}
        <g style={bodyGroupStyle}>
          {/* ground shadow */}
          <ellipse cx="50" cy="93" rx="24" ry="2.5" fill="#000" opacity="0.18" />

          {/* BODY — rounded chubby blob, slightly wider at bottom */}
          <path
            d="M50 20
               C 78 20, 86 40, 86 60
               C 86 80, 72 90, 50 90
               C 28 90, 14 80, 14 60
               C 14 40, 22 20, 50 20 Z"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* soft top-left highlight (3D marshmallow feel) */}
          <ellipse cx="34" cy="34" rx="14" ry="9" fill={highlight} opacity="0.7" />
          <ellipse cx="32" cy="31" rx="5" ry="3" fill="#fff" opacity="0.55" />

          {/* soft belly tone */}
          <ellipse cx="50" cy="72" rx="26" ry="14" fill={bellyTone} opacity="0.4" />

          {hairTuft}
          {freckles}
          {cheeks}
          {renderEyes(state)}
          {renderMouth(state)}
          {flexArm}
          {sweat}

          {/* tiny feet stubs */}
          <ellipse
            cx="38"
            cy="90"
            rx="5"
            ry="2.5"
            fill={footTone}
            stroke={outline}
            strokeWidth="1.5"
          />
          <ellipse
            cx="62"
            cy="90"
            rx="5"
            ry="2.5"
            fill={footTone}
            stroke={outline}
            strokeWidth="1.5"
          />
        </g>
        {zzz}
        {pencil}
      </svg>
    </div>
  )
}

export default Lumo
