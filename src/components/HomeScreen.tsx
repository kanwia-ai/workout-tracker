/**
 * HomeScreen — the dashboard shown before a user enters a session.
 *
 * Ported from /tmp/workout-app-design/app.jsx HomeScreen. Layout:
 *   1. Date header + streak badge
 *   2. Big greeting ("you're back!")
 *   3. Lumo + speech bubble with today's intro
 *   4. "THIS WEEK" label + 7-card DayStrip with status icons
 *   5. "TODAY" label + TodayCard (big, with "let's go →") OR RestCard
 *   6. Stat chips: sessions / volume / PRs
 */
import { useEffect, useState } from 'react'
import { Flame, Moon, ArrowRight, Sparkles, Check, Settings as SettingsIcon } from 'lucide-react'
import { Lumo } from './Lumo'
import { usePlan } from '../hooks/usePlan'
import { getToday, getWeekView } from '../lib/planSelectors'
import { loadPRs, loadSessionHistory } from '../lib/persistence'
import { pickCopy, DEFAULT_CHEEK } from '../lib/copy'
import type { PlannedSession, MuscleGroup } from '../types/plan'

// Matches the profile shape from useAuth (display-focused user profile, not
// the full UserProgramProfile captured during onboarding).
interface DisplayProfile {
  display_name: string
  avatar_emoji: string
  streak: number
  knee_flag: boolean
}

interface HomeScreenProps {
  userId: string
  profile: DisplayProfile | null
  onOpenSettings: () => void
  onStartSession: () => void
}

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DAY_MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
]

// Map a session's focus array → one of the design's 4 accent buckets
// (plum / mint / sun / blush). Mirrors screens.jsx focus mapping.
function focusAccent(focus: MuscleGroup[]): string {
  if (focus.includes('full_body')) return 'var(--accent-mint)'
  const legs = ['quads', 'hamstrings', 'glutes', 'calves']
  const upper = ['chest', 'back', 'shoulders', 'biceps', 'triceps']
  let l = 0, u = 0
  for (const f of focus) {
    if (legs.includes(f)) l++
    else if (upper.includes(f)) u++
  }
  if (l === 0 && u === 0) return 'var(--accent-blush)'
  return l >= u ? 'var(--accent-plum)' : 'var(--accent-sun)'
}

function todayDowMon0(): number {
  // JS Date: 0=Sun..6=Sat. We use 0=Mon..6=Sun.
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
}

function mondayOf(date: Date): Date {
  const d = new Date(date)
  const dow = todayDowMon0()
  d.setDate(d.getDate() - dow)
  d.setHours(0, 0, 0, 0)
  return d
}

function dateHeaderText(d: Date): string {
  return `${DAY_LABELS[todayDowMon0()]}, ${DAY_MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`
}

function timeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

// ─── HomeScreen ─────────────────────────────────────────────────────────────
export function HomeScreen({
  userId,
  profile,
  onOpenSettings,
  onStartSession,
}: HomeScreenProps) {
  const { plan, loading } = usePlan(userId)
  const [prCount, setPrCount] = useState(0)
  const [weekVolumeLb, setWeekVolumeLb] = useState(0)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)

  const today = new Date()
  const weekStart = mondayOf(today)
  const todayDow = todayDowMon0()
  const greetTime = timeOfDay(today.getHours())

  const todaySession = plan ? getToday(plan) : null
  const weekSessions = plan ? getWeekView(plan, 1) : []
  const cheek = DEFAULT_CHEEK
  const firstName = profile?.display_name || 'you'

  // Greeting line — short + cheeky, varies by time of day
  const greetingText =
    greetTime === 'morning' ? `hi ${firstName}, ready?`
    : greetTime === 'afternoon' ? "you're back"
    : `evening, ${firstName}`

  // Load PR count + week stats
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [prs, history] = await Promise.all([
          loadPRs(userId),
          loadSessionHistory(userId, 14),
        ])
        if (cancelled) return
        setPrCount(Object.keys(prs).length)

        const weekStartTs = weekStart.getTime()
        let completed = 0
        let volLb = 0
        for (const s of history as Array<Record<string, unknown>>) {
          const endedAt = s.ended_at as string | undefined
          const setsDone = (s.completed_sets as number | undefined) ?? 0
          const endTs = endedAt ? Date.parse(endedAt) : 0
          if (endTs >= weekStartTs) {
            completed++
            volLb += setsDone * 10
          }
        }
        setSessionsCompleted(completed)
        setWeekVolumeLb(volLb)
      } catch {
        // Swallow — dashboard stats aren't load-bearing
      }
    })()
    return () => { cancelled = true }
  }, [userId, weekStart.getTime()])

  // Session-complete map for DayStrip (dow → completed boolean)
  const doneByDow = new Map<number, boolean>()
  for (const s of weekSessions) {
    if (s.status === 'completed') doneByDow.set(s.day_of_week, true)
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--lumo-bg)',
        color: 'var(--lumo-text)',
      }}
    >
      <div className="max-w-lg mx-auto px-5 pt-4 pb-24">
        {/* Top row: date + name header + streak + settings */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--lumo-text-ter)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              {dateHeaderText(today)}
            </div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                lineHeight: 1.1,
                marginTop: 3,
                letterSpacing: '-0.02em',
                color: 'var(--lumo-text)',
              }}
            >
              {greetingText}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <StreakBadge count={profile?.streak ?? 0} />
            <button
              onClick={onOpenSettings}
              aria-label="Settings"
              className="p-2 rounded-xl active:scale-95 transition"
              style={{
                background: 'var(--lumo-raised)',
                border: '1px solid var(--lumo-border)',
                color: 'var(--lumo-text-sec)',
              }}
            >
              <SettingsIcon size={16} />
            </button>
          </div>
        </div>

        {/* Lumo greeting card */}
        <LumoGreeting
          rationale={todaySession?.rationale}
          isRestDay={!todaySession}
          cheekLevel={cheek}
        />

        {/* This week label + DayStrip */}
        <SectionLabel>this week</SectionLabel>
        <HomeDayStrip
          weekSessions={weekSessions}
          todayDow={todayDow}
          doneByDow={doneByDow}
          weekStart={weekStart}
        />

        {/* Today label + Today or Rest card */}
        <SectionLabel>today</SectionLabel>
        {loading ? (
          <LoadingCard />
        ) : todaySession ? (
          <TodayCard session={todaySession} onGo={onStartSession} />
        ) : (
          <RestCard cheekLevel={cheek} />
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <StatChip
            label="sessions"
            value={`${sessionsCompleted} / ${weekSessions.length}`}
            accent="var(--accent-mint)"
          />
          <StatChip
            label="volume"
            value={weekVolumeLb > 0 ? weekVolumeLb.toLocaleString() : '0'}
            unit="lb"
            accent="var(--accent-sun)"
          />
          <StatChip
            label="PRs"
            value={String(prCount)}
            accent="var(--accent-plum)"
            trailing={prCount > 0 ? <Sparkles size={12} aria-hidden="true" /> : null}
          />
        </div>
      </div>
    </div>
  )
}

// ─── SectionLabel ───────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: 'var(--lumo-text-ter)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontWeight: 700,
        marginTop: 22,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}

// ─── StreakBadge ────────────────────────────────────────────────────────────
function StreakBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <div
      className="inline-flex items-center gap-1"
      style={{
        padding: '6px 11px 6px 9px',
        borderRadius: 999,
        background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
        border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)',
      }}
      title={`${count}-day streak`}
      aria-label={`${count}-day streak`}
    >
      <Flame size={14} style={{ color: 'var(--brand)' }} />
      <span
        className="tabular-nums"
        style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}
      >
        {count}
      </span>
    </div>
  )
}

// ─── LumoGreeting ──────────────────────────────────────────────────────────
interface LumoGreetingProps {
  rationale?: string
  isRestDay: boolean
  cheekLevel: 0 | 1 | 2
}
function LumoGreeting({ rationale, isRestDay, cheekLevel }: LumoGreetingProps) {
  // Use rationale from today's session if present, otherwise a cheeky fallback
  const [bubbleText] = useState<string>(() => {
    if (rationale && rationale.length > 0) return rationale
    if (isRestDay) {
      return pickCopy('preamble_morning', cheekLevel, { current: null }) // use a fallback pool
    }
    return pickCopy('preamble_morning', cheekLevel, { current: null })
  })

  return (
    <div className="flex items-end gap-2.5">
      <Lumo state={isRestDay ? 'sleepy' : 'idle'} size={72} />
      <div
        style={{
          position: 'relative',
          flex: 1,
          background: 'var(--lumo-raised)',
          border: '1px solid var(--lumo-border)',
          padding: '12px 14px',
          borderRadius: 18,
          borderBottomLeftRadius: 4,
          fontSize: 14,
          lineHeight: 1.4,
          color: 'var(--lumo-text)',
          fontFamily: "'Fraunces', Georgia, serif",
          fontStyle: 'italic',
          marginBottom: 2,
        }}
      >
        {bubbleText}
      </div>
    </div>
  )
}

// ─── HomeDayStrip ───────────────────────────────────────────────────────────
interface HomeDayStripProps {
  weekSessions: PlannedSession[]
  todayDow: number
  doneByDow: Map<number, boolean>
  weekStart: Date
}
function HomeDayStrip({ weekSessions, todayDow, doneByDow, weekStart }: HomeDayStripProps) {
  const sessionByDow = new Map<number, PlannedSession>()
  for (const s of weekSessions) sessionByDow.set(s.day_of_week, s)

  return (
    <div className="flex gap-1.5">
      {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
        const s = sessionByDow.get(dow)
        const isToday = dow === todayDow
        const done = doneByDow.get(dow) ?? false
        const focus = s ? focusAccent(s.focus) : null

        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + dow)

        return (
          <div
            key={dow}
            style={{
              flex: 1,
              aspectRatio: '0.62',
              borderRadius: 14,
              background: 'var(--lumo-raised)',
              border: isToday
                ? '1px solid color-mix(in srgb, var(--mascot-color) 60%, transparent)'
                : '1px solid var(--lumo-border)',
              backgroundImage: isToday
                ? 'linear-gradient(160deg, color-mix(in srgb, var(--mascot-color) 18%, transparent), transparent 60%)'
                : 'none',
              boxShadow: isToday
                ? '0 0 24px color-mix(in srgb, var(--mascot-color) 18%, transparent)'
                : 'none',
              padding: '8px 4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
            data-dow={dow}
            data-today={isToday}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--lumo-text-ter)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {DAY_LABELS[dow]}
            </div>
            <div
              className="tabular-nums"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: isToday ? 'var(--lumo-text)' : 'var(--lumo-text-sec)',
              }}
            >
              {date.getDate()}
            </div>
            {s ? (
              <DayStatusDot focus={focus!} done={done} />
            ) : (
              <RestDayIcon />
            )}
          </div>
        )
      })}
    </div>
  )
}

function DayStatusDot({ focus, done }: { focus: string; done: boolean }) {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: done
          ? `color-mix(in srgb, ${focus} 26%, transparent)`
          : `color-mix(in srgb, ${focus} 13%, transparent)`,
        border: `1.5px solid ${done ? focus : `color-mix(in srgb, ${focus} 55%, transparent)`}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {done ? (
        <Check size={10} style={{ color: focus }} strokeWidth={3} />
      ) : (
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: focus,
          }}
        />
      )}
    </div>
  )
}

function RestDayIcon() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-label="rest day"
    >
      <Moon size={18} style={{ color: 'color-mix(in srgb, var(--accent-plum) 60%, transparent)' }} />
    </div>
  )
}

// ─── TodayCard ──────────────────────────────────────────────────────────────
function TodayCard({
  session,
  onGo,
}: {
  session: PlannedSession
  onGo: () => void
}) {
  const accent = focusAccent(session.focus)
  const subtitle = session.subtitle ?? session.focus.slice(0, 2).join(' · ').toUpperCase()
  // Preview of rep schemes
  const previews = session.exercises.slice(0, 4).map((ex) => `${ex.sets}×${ex.reps}`)

  return (
    <button
      onClick={onGo}
      aria-label={`Start ${session.title}`}
      style={{
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        padding: 16,
        borderRadius: 22,
        position: 'relative',
        overflow: 'hidden',
        display: 'block',
      }}
    >
      {/* soft accent glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: `color-mix(in srgb, ${accent} 18%, transparent)`,
          filter: 'blur(30px)',
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: accent,
              boxShadow: `0 0 10px ${accent}`,
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: accent,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {subtitle}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--lumo-text-ter)' }}>
          ~ {session.estimated_minutes}min
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          color: 'var(--lumo-text)',
        }}
      >
        {session.title}
      </div>
      <div
        style={{
          position: 'relative',
          fontSize: 13,
          color: 'var(--lumo-text-sec)',
          marginTop: 6,
          marginBottom: 16,
        }}
      >
        {session.exercises.length} lifts · warm-up · cool-down
      </div>

      {/* rep-scheme chips preview */}
      <div className="relative flex gap-1.5 mb-3.5">
        {previews.map((p, i) => (
          <div
            key={i}
            className="flex-1 tabular-nums"
            style={{
              padding: '7px 8px',
              borderRadius: 10,
              background: 'var(--lumo-bg)',
              border: '1px solid var(--lumo-border)',
              fontSize: 11,
              color: 'var(--lumo-text-sec)',
              textAlign: 'center',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {p}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        className="relative flex items-center justify-center gap-1.5"
        style={{
          padding: 14,
          borderRadius: 14,
          background: 'var(--brand)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: '-0.01em',
        }}
      >
        let's go
        <ArrowRight size={14} />
      </div>
    </button>
  )
}

// ─── RestCard ───────────────────────────────────────────────────────────────
function RestCard({ cheekLevel }: { cheekLevel: 0 | 1 | 2 }) {
  const [line] = useState(() =>
    pickCopy('preamble_morning', cheekLevel, { current: null }),
  )
  return (
    <div
      style={{
        background: 'linear-gradient(160deg, color-mix(in srgb, var(--accent-plum) 18%, transparent), var(--lumo-raised))',
        border: '1px solid color-mix(in srgb, var(--accent-plum) 30%, transparent)',
        padding: 20,
        borderRadius: 22,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <Lumo state="sleepy" size={64} color="var(--accent-plum)" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-plum)' }}>
          rest day
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--lumo-text-sec)',
            marginTop: 4,
            fontFamily: "'Fraunces', Georgia, serif",
            fontStyle: 'italic',
            lineHeight: 1.4,
          }}
        >
          {line || 'sleeping in is training too.'}
        </div>
      </div>
    </div>
  )
}

// ─── StatChip ───────────────────────────────────────────────────────────────
function StatChip({
  label,
  value,
  unit,
  accent,
  trailing,
}: {
  label: string
  value: string
  unit?: string
  accent: string
  trailing?: React.ReactNode
}) {
  return (
    <div
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        borderRadius: 14,
        padding: '10px 10px',
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: 'var(--lumo-text-ter)',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        className="tabular-nums"
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: accent,
          marginTop: 2,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'baseline',
          gap: 3,
        }}
      >
        <span>{value}</span>
        {unit && <span style={{ fontSize: 10, color: 'var(--lumo-text-ter)' }}>{unit}</span>}
        {trailing && <span style={{ color: accent, marginLeft: 2 }}>{trailing}</span>}
      </div>
    </div>
  )
}

// ─── LoadingCard ────────────────────────────────────────────────────────────
function LoadingCard() {
  return (
    <div
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        padding: 20,
        borderRadius: 22,
        textAlign: 'center',
        color: 'var(--lumo-text-sec)',
        fontSize: 13,
      }}
    >
      loading today's plan…
    </div>
  )
}

export default HomeScreen
