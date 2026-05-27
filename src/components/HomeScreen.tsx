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
import { useEffect, useMemo, useState } from 'react'
import { Flame, Moon, ArrowRight, Sparkles, Check, Settings as SettingsIcon } from 'lucide-react'
import { Lumo } from './Lumo'
import { usePlan } from '../hooks/usePlan'
import { useDayOverrides } from '../hooks/useDayOverrides'
import {
  getWeekView,
  getSessionForDate,
  getNextUpcomingSession,
} from '../lib/planSelectors'
import { loadPRs, loadSessionHistory } from '../lib/persistence'
import { loadProfileLocal } from '../lib/profileRepo'
import {
  localDateISO,
  setOverrideForDate,
  clearOverrideForDate,
} from '../lib/dayOverrides'
import { pickCopy, DEFAULT_CHEEK } from '../lib/copy'
import { remapTitleIfGeneric } from '../lib/legacyTitleRemap'
import type { PlannedSession, MuscleGroup } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'
import { BodyCheckSheet, loadBodyCheck, type BodyCheckState } from './BodyCheckSheet'

// Persisted day selection — survives bottom-nav round-trips and browser
// reload. WorkoutView reads the same key so entering a session honors the
// day the user was looking at on Home.
const SELECTED_DOW_KEY = 'workout-tracker:selected-dow'

function loadSelectedDow(fallback: number): number {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(SELECTED_DOW_KEY)
    if (raw == null) return fallback
    const n = JSON.parse(raw)
    if (typeof n === 'number' && n >= 0 && n <= 6) return n
  } catch {
    // ignore
  }
  return fallback
}

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
  /** Triggered from the plan-less empty state ("Rebuild my plan"). Calls
   *  back into App to re-run generation with the stored UserProgramProfile. */
  onRetryGeneration?: () => void
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

function mondayOfDate(date: Date): Date {
  const d = new Date(date)
  // JS getDay: 0=Sun..6=Sat → shift to Mon=0..Sun=6 to subtract the right amount.
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
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
  profile: _profile,
  onOpenSettings,
  onStartSession,
  onRetryGeneration,
}: HomeScreenProps) {
  // _profile (DisplayProfile.streak) is no longer surfaced — the day-streak
  // counter was replaced with an adherence (sessions completed / scheduled
  // this week) badge that doesn't reward overriding scheduled rest days.
  const { plan, loading } = usePlan(userId)
  const [prCount, setPrCount] = useState(0)
  // Total hard sets completed this week. Replaces the old `setsDone × 10 lb`
  // fabricated tonnage — that magic constant trained users to optimize a
  // meaningless number. Hard sets is the actual hypertrophy lever per the
  // research (R1 P1). TODO: upgrade to per-muscle hard sets per week once we
  // can cheaply attribute completed sets to muscle groups (R1 P2 MEV/MAV/MRV).
  const [weekHardSets, setWeekHardSets] = useState(0)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const [programProfile, setProgramProfile] = useState<UserProgramProfile | null>(null)
  // Day-of body-check ("anything off today?") — opt-in affordance shown only
  // when the user has tracked body parts in their injury profile. Selections
  // persist to localStorage keyed by today's ISO date so they don't bleed
  // into tomorrow but survive a tab refresh.
  const [bodyCheckOpen, setBodyCheckOpen] = useState(false)
  const [bodyCheck, setBodyCheck] = useState<BodyCheckState | null>(null)

  const today = new Date()
  const todayDow = todayDowMon0()
  const greetTime = timeOfDay(today.getHours())
  const overrides = useDayOverrides(userId)

  // ─── Plan anchor + week navigation ────────────────────────────────────
  // Week 1's Monday is derived from plan.generated_at so the strip shows
  // the same 7-day slice the mesocycle was authored against — no matter
  // what calendar week we're in. viewedWeek starts on whichever training
  // week contains today (clamped to 1..length_weeks) and can be nudged
  // forward/backward with the chevrons.
  const planAnchorMonday = useMemo(() => {
    if (!plan) return mondayOfDate(today)
    return mondayOfDate(new Date(plan.generated_at))
  }, [plan])

  const maxWeek = plan?.length_weeks ?? 1

  const currentTrainingWeek = useMemo(() => {
    if (!plan) return 1
    const days = Math.floor(
      (today.getTime() - planAnchorMonday.getTime()) / 86_400_000,
    )
    const w = Math.floor(days / 7) + 1
    return Math.min(Math.max(1, w), maxWeek)
  }, [plan, planAnchorMonday, maxWeek])

  const [viewedWeek, setViewedWeek] = useState<number>(1)
  useEffect(() => {
    setViewedWeek(currentTrainingWeek)
  }, [currentTrainingWeek])

  const weekStart = useMemo(() => {
    const d = new Date(planAnchorMonday)
    d.setDate(planAnchorMonday.getDate() + (viewedWeek - 1) * 7)
    return d
  }, [planAnchorMonday, viewedWeek])

  // Which day is selected for the TodayCard. Persisted to localStorage so
  // bottom-nav (home → progress → home) doesn't reset it and neither does a
  // page reload. Falls back to today for first-time visitors.
  const [selectedDow, setSelectedDowState] = useState<number>(() =>
    loadSelectedDow(todayDow),
  )
  const setSelectedDow = (dow: number) => {
    setSelectedDowState(dow)
    try {
      window.localStorage.setItem(SELECTED_DOW_KEY, JSON.stringify(dow))
    } catch {
      // ignore quota/denied
    }
  }

  // Compute the date corresponding to selectedDow for override lookup.
  const selectedDate = new Date(weekStart)
  selectedDate.setDate(weekStart.getDate() + selectedDow)

  const weekSessions = plan ? getWeekView(plan, viewedWeek) : []
  // getSessionForDate merges plan + active day overrides so a session pulled
  // onto a rest day via "build me one anyway" shows up just like a scheduled
  // one.
  const selectedSession: PlannedSession | null = getSessionForDate(
    plan,
    overrides,
    selectedDate,
    viewedWeek,
  )
  // "Today" applies only when the viewed week is the current training week
  // AND the selected day-of-week matches today. Without the week check, the
  // section still reads "today" and the CTA still starts the session when
  // the user has scrolled forward to (say) Week 3 Friday — which is a week
  // from now and shouldn't offer a Go button.
  const isViewingToday = selectedDow === todayDow && viewedWeek === currentTrainingWeek
  const selectedDateISO = localDateISO(selectedDate)
  const todayISO = localDateISO(today)
  const selectedHasOverride = overrides.some((o) => o.date === selectedDateISO)

  const cheek = DEFAULT_CHEEK
  // Only trust the name the user typed into onboarding. Supabase's
  // `profile.display_name` is auto-populated from the email address (e.g.
  // "kyraatekwana") — not a human name. If first_name is empty (user
  // skipped the name step, or hasn't onboarded yet), the greeting falls
  // back to a neutral variant and downstream copy uses "friend".
  const firstName = programProfile?.first_name?.trim() ?? ''

  // Greeting line — short + cheeky, varies by time of day. If we don't have
  // a name yet, skip the "hi Kyra" form and use the neutral version so we
  // never render a literal "hi you, ready?".
  const greetingText = (() => {
    const hasName = firstName.length > 0
    if (greetTime === 'morning') return hasName ? `hi ${firstName}, ready?` : 'ready?'
    if (greetTime === 'afternoon') return "you're back"
    return hasName ? `evening, ${firstName}` : 'evening'
  })()

  // Load the UserProgramProfile so the greeting can use `first_name` captured
  // during onboarding (the Supabase `profile.display_name` may be empty).
  useEffect(() => {
    let cancelled = false
    void loadProfileLocal(userId).then((p) => {
      if (!cancelled) setProgramProfile(p)
    }).catch(() => { /* non-fatal */ })
    return () => { cancelled = true }
  }, [userId])

  // Restore today's body-check state on mount so the trigger pill reflects
  // any selections the user already saved earlier today.
  useEffect(() => {
    setBodyCheck(loadBodyCheck(todayISO))
  }, [todayISO])

  // Body parts the user tracks in their injury profile — only mount the
  // body-check affordance when this is non-empty.
  const trackedBodyParts = useMemo(() => {
    if (!programProfile?.injuries || programProfile.injuries.length === 0) return []
    const seen = new Set<string>()
    const out: typeof programProfile.injuries[number]['part'][] = []
    for (const inj of programProfile.injuries) {
      if (!seen.has(inj.part)) {
        seen.add(inj.part)
        out.push(inj.part)
      }
    }
    return out
  }, [programProfile])

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
        let hardSets = 0
        for (const s of history as Array<Record<string, unknown>>) {
          const endedAt = s.ended_at as string | undefined
          const setsDone = (s.completed_sets as number | undefined) ?? 0
          const endTs = endedAt ? Date.parse(endedAt) : 0
          if (endTs >= weekStartTs) {
            completed++
            hardSets += setsDone
          }
        }
        setSessionsCompleted(completed)
        setWeekHardSets(hardSets)
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

  // Plan-less empty state: plan is null or has zero sessions (generator
  // failed, out of quota, or user wiped data). We render a single card in
  // place of the DayStrip/TodayCard/stats row so the user can rebuild
  // without seeing 7 rest moon-icons and a ghost-town dashboard.
  const planIsEmpty = !loading && (!plan || weekSessions.length === 0)

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
            <AdherenceBadge
              completed={sessionsCompleted}
              scheduled={weekSessions.length}
            />
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
          rationale={selectedSession?.rationale}
          isRestDay={!selectedSession}
          cheekLevel={cheek}
          firstName={firstName}
        />

        {/* Block-level rationale from the LLM nuance layer — shown once
            per new mesocycle. Tracked via a per-meso localStorage flag so
            it doesn't nag on every visit. Renders nothing when the
            engine ran without the nuance layer (rationale undefined). */}
        {plan?.rationale && (
          <BlockRationaleCard
            mesocycleId={plan.id}
            rationale={plan.rationale}
            specificTarget={plan.specific_target_acknowledgment}
          />
        )}

        {planIsEmpty ? (
          <PlanMissingCard onRetry={onRetryGeneration} />
        ) : (
          <>
            {/* Week nav + DayStrip — scrolls through all mesocycle weeks */}
            <WeekNav
              viewedWeek={viewedWeek}
              maxWeek={maxWeek}
              weekStart={weekStart}
              currentTrainingWeek={currentTrainingWeek}
              onPrev={() => setViewedWeek((w) => Math.max(1, w - 1))}
              onNext={() => setViewedWeek((w) => Math.min(maxWeek, w + 1))}
              onJumpToCurrent={() => setViewedWeek(currentTrainingWeek)}
            />
            <HomeDayStrip
              weekSessions={weekSessions}
              todayDow={viewedWeek === currentTrainingWeek ? todayDow : -1}
              selectedDow={selectedDow}
              onSelect={setSelectedDow}
              doneByDow={doneByDow}
              weekStart={weekStart}
            />

            {/* Today / selected-day card */}
            <SectionLabel>{isViewingToday ? 'today' : DAY_LABELS[selectedDow].toLowerCase()}</SectionLabel>
            {/* "anything off today?" — opt-in body check. Mounts only on
                today's view, only on a lifting day, and only when the
                user has tracked body parts. */}
            {isViewingToday && selectedSession && trackedBodyParts.length > 0 && (
              <BodyCheckPill
                flaggedCount={bodyCheck?.flagged.length ?? 0}
                onOpen={() => setBodyCheckOpen(true)}
              />
            )}
            {loading ? (
              <LoadingCard />
            ) : selectedSession ? (
              <TodayCard
                session={selectedSession}
                onGo={isViewingToday ? onStartSession : undefined}
                isToday={isViewingToday}
                isOverride={selectedHasOverride}
                onRevertOverride={
                  selectedHasOverride && isViewingToday
                    ? async () => {
                        try {
                          await clearOverrideForDate(userId, todayISO)
                        } catch (err) {
                          console.error('clearOverrideForDate failed', err)
                        }
                      }
                    : undefined
                }
              />
            ) : (
              <RestCard
                cheekLevel={cheek}
                isToday={isViewingToday}
                firstName={firstName}
                onBuildWorkout={async () => {
                  // Pick the next upcoming session from the plan and stamp it as
                  // an override for today. This persists to Dexie so navigating
                  // away and back (or reloading) still shows the chosen workout.
                  // If nothing's upcoming, bail — the plan is complete.
                  const pick = getNextUpcomingSession(plan)
                  if (!pick) {
                    onStartSession()
                    return
                  }
                  try {
                    await setOverrideForDate(userId, todayISO, pick.id)
                  } catch (err) {
                    console.error('setOverrideForDate failed', err)
                    // Fall through — still try to start, but the next render
                    // will re-show the rest card.
                  }
                  setSelectedDow(todayDow)
                  onStartSession()
                }}
              />
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mt-5">
              <StatChip
                label="sessions"
                value={`${sessionsCompleted} / ${weekSessions.length}`}
                accent="var(--accent-mint)"
              />
              <StatChip
                label="hard sets"
                value={weekHardSets > 0 ? weekHardSets.toLocaleString() : '0'}
                accent="var(--accent-sun)"
              />
              <StatChip
                label="PRs"
                value={String(prCount)}
                accent="var(--accent-plum)"
                trailing={prCount > 0 ? <Sparkles size={12} aria-hidden="true" /> : null}
              />
            </div>
          </>
        )}
      </div>
      {bodyCheckOpen && (
        <BodyCheckSheet
          parts={trackedBodyParts}
          isoDate={todayISO}
          initial={bodyCheck}
          onClose={(next) => {
            setBodyCheckOpen(false)
            if (next !== null) setBodyCheck(next)
          }}
        />
      )}
    </div>
  )
}

// ─── BodyCheckPill ──────────────────────────────────────────────────────────
// Small plum-tinted entry pill that opens the BodyCheckSheet. Shows a count
// when the user has already flagged parts today so it's clear the affordance
// is "active" — otherwise reads as a quiet invitation.
function BodyCheckPill({ flaggedCount, onOpen }: { flaggedCount: number; onOpen: () => void }) {
  const active = flaggedCount > 0
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="body-check-pill"
      style={{
        alignSelf: 'flex-start',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        marginTop: 4,
        marginBottom: 8,
        background: active
          ? 'color-mix(in srgb, var(--accent-plum) 22%, transparent)'
          : 'color-mix(in srgb, var(--accent-plum) 10%, transparent)',
        border: '1px solid color-mix(in srgb, var(--accent-plum) 45%, transparent)',
        borderRadius: 999,
        color: 'var(--accent-plum)',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {active ? (
        <>flagged {flaggedCount} for today · edit</>
      ) : (
        <>anything off today?</>
      )}
    </button>
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

// ─── AdherenceBadge ─────────────────────────────────────────────────────────
// Replaces the old day-streak counter. Day-streak iconography rewards
// consecutive-day training, but the program prescribes rest days — a user
// who follows the plan correctly would "break their streak" by resting.
// Adherence (sessions completed / sessions scheduled this week) rewards
// following the prescription, not overriding it.
function AdherenceBadge({
  completed,
  scheduled,
}: {
  completed: number
  scheduled: number
}) {
  if (scheduled <= 0) return null
  return (
    <div
      className="inline-flex items-center gap-1"
      style={{
        padding: '6px 11px 6px 9px',
        borderRadius: 999,
        background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
        border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)',
      }}
      title={`${completed}/${scheduled} sessions this week`}
      aria-label={`${completed} of ${scheduled} sessions this week`}
    >
      <Flame size={14} style={{ color: 'var(--brand)' }} />
      <span
        className="tabular-nums"
        style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}
      >
        {completed}/{scheduled}
      </span>
    </div>
  )
}

// ─── LumoGreeting ──────────────────────────────────────────────────────────
interface LumoGreetingProps {
  rationale?: string
  isRestDay: boolean
  cheekLevel: 0 | 1 | 2
  firstName: string
}
function LumoGreeting({ rationale, isRestDay, cheekLevel, firstName }: LumoGreetingProps) {
  // Prefer the session's rationale (hand-crafted per-session from Gemini) over
  // a generic pool pick. Re-pick when rationale changes (e.g. user taps a
  // different day on the DayStrip) so the bubble stays in sync with the
  // selected day's session.
  const bubbleText =
    rationale && rationale.length > 0
      ? rationale
      : pickCopy('preamble_morning', cheekLevel, { current: null }, {
          name: firstName || 'friend',
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

// ─── WeekNav ────────────────────────────────────────────────────────────────
// Chevron ← Week N of M · Mon 5 – Sun 11 → with an inline "this week" pill
// that only renders when the user has scrolled away from the current training
// week. Keeps the user oriented while they look ahead or back across the
// whole mesocycle.
interface WeekNavProps {
  viewedWeek: number
  maxWeek: number
  weekStart: Date
  currentTrainingWeek: number
  onPrev: () => void
  onNext: () => void
  onJumpToCurrent: () => void
}

function WeekNav({
  viewedWeek,
  maxWeek,
  weekStart,
  currentTrainingWeek,
  onPrev,
  onNext,
  onJumpToCurrent,
}: WeekNavProps) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const dateRange = `${fmt(weekStart)} – ${fmt(weekEnd)}`
  const atCurrent = viewedWeek === currentTrainingWeek
  const disabledPrev = viewedWeek <= 1
  const disabledNext = viewedWeek >= maxWeek

  return (
    <div
      data-testid="week-nav"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 18,
        marginBottom: 10,
      }}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={disabledPrev}
        aria-label="Previous week"
        data-testid="week-nav-prev"
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: 'var(--lumo-raised)',
          border: '1px solid var(--lumo-border)',
          color: disabledPrev ? 'var(--lumo-text-ter)' : 'var(--lumo-text-sec)',
          opacity: disabledPrev ? 0.4 : 1,
          cursor: disabledPrev ? 'not-allowed' : 'pointer',
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        ‹
      </button>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--lumo-text-ter)',
          }}
        >
          Week {viewedWeek} of {maxWeek}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--lumo-text)',
            marginTop: 2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {dateRange}
        </div>
        {!atCurrent && (
          <button
            type="button"
            onClick={onJumpToCurrent}
            data-testid="week-nav-jump-current"
            style={{
              marginTop: 4,
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--brand)',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            jump to this week ↩
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={disabledNext}
        aria-label="Next week"
        data-testid="week-nav-next"
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: 'var(--lumo-raised)',
          border: '1px solid var(--lumo-border)',
          color: disabledNext ? 'var(--lumo-text-ter)' : 'var(--lumo-text-sec)',
          opacity: disabledNext ? 0.4 : 1,
          cursor: disabledNext ? 'not-allowed' : 'pointer',
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        ›
      </button>
    </div>
  )
}

// ─── HomeDayStrip ───────────────────────────────────────────────────────────
interface HomeDayStripProps {
  weekSessions: PlannedSession[]
  todayDow: number
  selectedDow: number
  onSelect: (dow: number) => void
  doneByDow: Map<number, boolean>
  weekStart: Date
}
function HomeDayStrip({
  weekSessions,
  todayDow,
  selectedDow,
  onSelect,
  doneByDow,
  weekStart,
}: HomeDayStripProps) {
  const sessionByDow = new Map<number, PlannedSession>()
  for (const s of weekSessions) sessionByDow.set(s.day_of_week, s)

  return (
    <div className="flex gap-1.5">
      {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
        const s = sessionByDow.get(dow)
        const isToday = dow === todayDow
        const isSelected = dow === selectedDow
        const done = doneByDow.get(dow) ?? false
        const focus = s ? focusAccent(s.focus) : null

        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + dow)

        // Selected and today both get emphasis, but selected wins — we show a
        // brand-tinted ring on the selected day and a subtle mascot-tinted
        // background on today if it's not selected.
        const border =
          isSelected
            ? '2px solid var(--brand)'
            : isToday
              ? '1px solid color-mix(in srgb, var(--mascot-color) 60%, transparent)'
              : '1px solid var(--lumo-border)'
        const bgImage =
          isToday && !isSelected
            ? 'linear-gradient(160deg, color-mix(in srgb, var(--mascot-color) 18%, transparent), transparent 60%)'
            : 'none'
        const boxShadow =
          isSelected
            ? '0 0 24px color-mix(in srgb, var(--brand) 22%, transparent)'
            : isToday
              ? '0 0 24px color-mix(in srgb, var(--mascot-color) 18%, transparent)'
              : 'none'

        return (
          <button
            key={dow}
            type="button"
            onClick={() => onSelect(dow)}
            aria-pressed={isSelected}
            aria-label={`${DAY_LABELS[dow]} ${date.getDate()}${s ? ', training day' : ', rest day'}${isToday ? ', today' : ''}`}
            style={{
              flex: 1,
              aspectRatio: '0.62',
              borderRadius: 14,
              background: 'var(--lumo-raised)',
              border,
              backgroundImage: bgImage,
              boxShadow,
              padding: '8px 4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              color: 'inherit',
            }}
            data-dow={dow}
            data-today={isToday}
            data-selected={isSelected}
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
          </button>
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
  isToday,
  isOverride = false,
  onRevertOverride,
}: {
  session: PlannedSession
  /** Fired when the user taps "let's go". Omit for non-today preview. */
  onGo?: () => void
  /** When false we render a preview (no CTA, gray out the button). */
  isToday: boolean
  /** True when this session is shown via a day-override (user built a
   *  workout on a rest day). Surfaces a subtle badge + revert button. */
  isOverride?: boolean
  /** Clears the override, restoring the scheduled rest/session. Only passed
   *  in when isOverride && isToday. */
  onRevertOverride?: () => void
}) {
  const accent = focusAccent(session.focus)
  const subtitle = session.subtitle ?? session.focus.slice(0, 2).join(' · ').toUpperCase()
  // Show the actual lift NAMES for the first 3 exercises (Kyra flagged
  // that "5 lifts" by itself is meaningless — she wants a preview of what's
  // in the session).
  const liftNames = session.exercises.slice(0, 3).map((ex) => ex.name)
  const moreCount = Math.max(0, session.exercises.length - liftNames.length)

  const isInteractive = isToday && !!onGo
  const Wrapper = isInteractive ? 'button' : 'div'

  // Display-side remap: legacy Dexie plans may have generic titles like
  // "Lower A"/"Upper B". Derive a body-part title from the exercise list
  // when that happens. The stored plan is never mutated.
  const displayTitle = remapTitleIfGeneric(session.title, session.exercises)

  return (
    <Wrapper
      onClick={isInteractive ? onGo : undefined}
      aria-label={isInteractive ? `Start ${displayTitle}` : undefined}
      style={{
        width: '100%',
        textAlign: 'left',
        cursor: isInteractive ? 'pointer' : 'default',
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
      {isOverride && (
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
            fontSize: 11,
            color: 'var(--lumo-text-ter)',
            fontFamily: "'Fraunces', Georgia, serif",
            fontStyle: 'italic',
          }}
        >
          <span>pulled from your plan — originally a rest day</span>
          {onRevertOverride && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRevertOverride()
              }}
              style={{
                fontSize: 11,
                color: 'var(--accent-plum)',
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                textDecoration: 'underline',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              rest instead
            </button>
          )}
        </div>
      )}
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
        {displayTitle}
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

      {/* Exercise-name preview (top 3 lifts + "+N more" when there are more) */}
      <div className="relative flex flex-col gap-1 mb-3.5">
        {liftNames.map((name, i) => (
          <div
            key={i}
            className="flex items-center gap-2"
            style={{
              padding: '7px 10px',
              borderRadius: 10,
              background: 'var(--lumo-bg)',
              border: '1px solid var(--lumo-border)',
              fontSize: 13,
              color: 'var(--lumo-text)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: accent,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {name}
            </span>
            <span className="tabular-nums" style={{ fontSize: 11, color: 'var(--lumo-text-ter)' }}>
              {session.exercises[i].sets}×{session.exercises[i].reps}
            </span>
          </div>
        ))}
        {moreCount > 0 && (
          <div
            style={{
              padding: '4px 10px',
              fontSize: 11,
              color: 'var(--lumo-text-ter)',
              fontStyle: 'italic',
              fontFamily: "'Fraunces', Georgia, serif",
            }}
          >
            + {moreCount} more
          </div>
        )}
      </div>

      {/* CTA — only rendered when this is today */}
      {isInteractive && (
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
      )}
    </Wrapper>
  )
}

// ─── PlanMissingCard ────────────────────────────────────────────────────────
// Shown when the plan failed to generate or Dexie is empty. Replaces the
// DayStrip + TodayCard + stats row so the user isn't staring at 7 rest-day
// moons trying to figure out what happened. The `Rebuild my plan` button
// fires back into App's runGeneration, which flips the full-screen
// GeneratingPlan loader until the retry resolves.
function PlanMissingCard({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      style={{
        marginTop: 22,
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        padding: 20,
        borderRadius: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div className="flex items-center gap-3.5">
        <Lumo state="sleepy" size={64} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--lumo-text)',
              letterSpacing: '-0.01em',
            }}
          >
            your plan didn't load
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--lumo-text-sec)',
              marginTop: 6,
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
              lineHeight: 1.4,
            }}
          >
            that can happen if the generator was busy or out of quota. let's try again.
          </div>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          aria-label="Rebuild my plan"
          className="active:scale-[0.98] transition"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '12px 14px',
            borderRadius: 14,
            background: 'var(--brand)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '-0.01em',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Rebuild my plan
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}

// ─── BlockRationaleCard ─────────────────────────────────────────────────────
// Shown once per new mesocycle when the LLM nuance layer attached a
// block-level rationale. Once the user has "acknowledged" the rationale
// (or dismissed it explicitly), we set a per-meso flag in localStorage so
// it doesn't reappear on subsequent home-screen visits.
//
// Why the localStorage gate (vs. always-on or always-off): the rationale
// has context value when you start a new block — it explains "here's why
// this six weeks looks the way it does." After that, it's noise. A blunt
// "show once" matches how a coach actually communicates this stuff.
const BLOCK_ACK_KEY_PREFIX = 'workout-tracker:block-rationale-ack:'

function loadBlockAck(mesocycleId: string): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(BLOCK_ACK_KEY_PREFIX + mesocycleId) === 'true'
  } catch {
    return true
  }
}

function setBlockAck(mesocycleId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(BLOCK_ACK_KEY_PREFIX + mesocycleId, 'true')
  } catch {
    // ignore quota / privacy mode
  }
}

function BlockRationaleCard({
  mesocycleId,
  rationale,
  specificTarget,
}: {
  mesocycleId: string
  rationale: string
  specificTarget?: string
}) {
  const [acked, setAcked] = useState<boolean>(() => loadBlockAck(mesocycleId))
  if (acked) return null
  return (
    <div
      data-testid="block-rationale-card"
      style={{
        marginTop: 16,
        marginBottom: 4,
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        padding: 16,
        borderRadius: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--lumo-text-ter)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        about this block
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--lumo-text)',
          fontFamily: "'Fraunces', Georgia, serif",
          fontStyle: 'italic',
          lineHeight: 1.5,
        }}
      >
        {rationale}
      </div>
      {specificTarget && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--lumo-text-sec)',
            fontFamily: "'Fraunces', Georgia, serif",
            fontStyle: 'italic',
            lineHeight: 1.5,
            paddingTop: 6,
            borderTop: '1px solid var(--lumo-border)',
          }}
        >
          {specificTarget}
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setBlockAck(mesocycleId)
          setAcked(true)
        }}
        style={{
          alignSelf: 'flex-end',
          fontSize: 11,
          color: 'var(--accent-plum)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 700,
          padding: 4,
        }}
      >
        got it
      </button>
    </div>
  )
}

// ─── RestCard ───────────────────────────────────────────────────────────────
function RestCard({
  cheekLevel,
  isToday,
  firstName,
  onBuildWorkout,
}: {
  cheekLevel: 0 | 1 | 2
  /** When false, this is a preview of a rest day, not today's rest. */
  isToday: boolean
  /** Used to interpolate `{name}` tokens in the copy pool. Pass '' to fall
   *  back to the neutral 'friend'. */
  firstName: string
  /** Fires when user taps "build one anyway". Only rendered when isToday. */
  onBuildWorkout?: () => void
}) {
  const [line] = useState(() =>
    pickCopy('restDay', cheekLevel, { current: null }, {
      name: firstName || 'friend',
    }),
  )
  return (
    <div
      style={{
        background: 'linear-gradient(160deg, color-mix(in srgb, var(--accent-plum) 18%, transparent), var(--lumo-raised))',
        border: '1px solid color-mix(in srgb, var(--accent-plum) 30%, transparent)',
        padding: 20,
        borderRadius: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div className="flex items-center gap-3.5">
        <Lumo state="sleepy" size={64} color="var(--accent-plum)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-plum)' }}>
            {isToday ? 'rest day' : 'scheduled rest'}
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
      {isToday && onBuildWorkout && (
        <button
          type="button"
          onClick={onBuildWorkout}
          aria-label="Add a light session"
          className="active:scale-[0.98] transition"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '12px 14px',
            borderRadius: 14,
            background: 'color-mix(in srgb, var(--accent-plum) 28%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-plum) 50%, transparent)',
            color: 'var(--accent-plum)',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '-0.01em',
            cursor: 'pointer',
          }}
        >
          actually want to lift? add a light session
          <ArrowRight size={14} />
        </button>
      )}
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
