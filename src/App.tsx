/**
 * Manual browser test steps for first-time onboarding + plan generation:
 * 1. Wipe IndexedDB + sign-out in dev mode.
 * 2. Sign in (dev bypass).
 * 3. Should see onboarding. Click through all 8 steps.
 * 4. Confirm → GeneratingPlan screen → WorkoutView with the generated plan.
 * 5. Reload → goes straight to WorkoutView with the persisted plan.
 * 6. Wipe IndexedDB only (keep Supabase). Reload → pulls profile from cloud,
 *    regenerates plan, lands on WorkoutView.
 */
import { useState, useEffect, useRef } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTweaks } from './hooks/useTweaks'
import { WorkoutView } from './components/WorkoutView'
import { HomeScreen } from './components/HomeScreen'
import { LoginScreen } from './components/LoginScreen'
import { ExerciseBrowser } from './components/ExerciseBrowser'
import { MobilityRoutines } from './components/MobilityRoutines'
import { ExerciseCapture } from './components/ExerciseCapture'
import { ProgressView } from './components/ProgressView'
import { CardioPage } from './components/CardioPage'
import { BottomNav, type AppView } from './components/BottomNav'
import { TimerOverlay } from './components/TimerOverlay'
import { OnboardingFlow, GeneratingPlan } from './components/Onboarding'
import { SettingsScreen } from './components/Settings'
import { Loader2, AlertTriangle } from 'lucide-react'
import { loadProfileLocal, saveProfileLocal, syncProfileUp } from './lib/profileRepo'
import { generatePlan } from './lib/planGen'
import type { TimerState } from './types'
import type { ExtractedExercise } from './lib/gemini'
import type { UserProgramProfile } from './types/profile'

const VIEW_STORAGE_KEY = 'workout-tracker:view'
const SESSION_STARTED_STORAGE_KEY = 'workout-tracker:session-started'
const KNOWN_VIEWS: readonly AppView[] = [
  'workout',
  'exercises',
  'mobility',
  'progress',
  'cardio',
  'capture',
]

function isAppView(x: unknown): x is AppView {
  return typeof x === 'string' && (KNOWN_VIEWS as readonly string[]).includes(x)
}

function readPersistedView(): AppView {
  if (typeof window === 'undefined') return 'workout'
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY)
    if (raw && isAppView(raw)) return raw
  } catch {
    // localStorage unavailable (private mode, SSR, etc.) — fall through.
  }
  return 'workout'
}

function readPersistedSessionStarted(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(SESSION_STARTED_STORAGE_KEY)
    if (raw === null) return false
    const parsed = JSON.parse(raw)
    return typeof parsed === 'boolean' ? parsed : false
  } catch {
    return false
  }
}

function App() {
  // Wire the Lumo theme + EDITMODE postMessage protocol at the root. This
  // applies CSS vars on mount and keeps them in sync with host edits. The
  // hook also persists the user's theme preference across reloads and
  // exposes `themeMode` / `setThemeMode` so the Settings screen can flip
  // between dark, light, and system-follows-OS.
  const tweaksApi = useTweaks()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const {
    user,
    profile,
    loading,
    hasProfile,
    setHasProfile,
    signInWithMagicLink,
    signOut,
    updateStreak,
  } = useAuth()
  // `view` + `sessionStarted` are persisted to localStorage so reloading
  // mid-workout (or while on a non-workout tab) restores the user to the same
  // screen instead of dumping them back on HomeScreen.
  const [view, setView] = useState<AppView>(readPersistedView)
  // `sessionStarted` — when false we show the HomeScreen dashboard; when true
  // we show the in-session WorkoutView. The user enters via the "let's go"
  // CTA on HomeScreen and exits via onExitSession when they end the session.
  const [sessionStarted, setSessionStarted] = useState<boolean>(readPersistedSessionStarted)

  // Sync `view` to localStorage whenever it changes. Guarded for
  // non-browser environments (tests, SSR) to keep behaviour safe.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view)
    } catch {
      // Ignore write failures (quota, private mode).
    }
  }, [view])

  // Sync `sessionStarted` to localStorage. Stored as JSON boolean so the
  // reader can parse without ambiguity.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        SESSION_STARTED_STORAGE_KEY,
        JSON.stringify(sessionStarted),
      )
    } catch {
      // Ignore write failures.
    }
  }, [sessionStarted])
  const [globalTimer, setGlobalTimer] = useState<TimerState | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [pendingProfile, setPendingProfile] = useState<UserProgramProfile | null>(null)
  // Generation token — captured at `runGeneration` call time. If the user
  // signs out or switches accounts mid-generation, the stale promise's
  // setters are dropped so they can't clobber the new session's state.
  const genTokenRef = useRef(0)
  // Profile captured at the start of a generation run so the cancel handler
  // can surface the retry screen with the same profile pre-loaded. We can't
  // actually abort the in-flight fetch (out of scope), but we can stop
  // showing the loading screen and let the user trigger a fresh retry.
  const generatingProfileRef = useRef<UserProgramProfile | null>(null)

  // Reset generation state whenever the authed user changes so a previous
  // user's error/pending doesn't bleed into a new sign-in.
  useEffect(() => {
    setIsGenerating(false)
    setGenerationError(null)
    setPendingProfile(null)
    genTokenRef.current += 1
  }, [user?.id])

  function friendlyGenerationError(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err)
    if (/network|fetch failed|timed out/i.test(raw)) {
      return 'Network hiccup. Check your connection and try again.'
    }
    if (/ANTHROPIC_API_KEY missing/i.test(raw)) {
      return 'The plan generator isn\'t configured on the server yet. Try again in a moment.'
    }
    if (/Claude is busy|rate[_ -]?limit|429|529/i.test(raw)) {
      return 'The plan generator is busy right now. Give it a moment and try again.'
    }
    if (/hallucinated|invalid shape|returned invalid/i.test(raw)) {
      return 'The plan came back malformed. A retry usually fixes this.'
    }
    return 'Something went wrong generating your plan. Try again.'
  }

  async function runGeneration(profile: UserProgramProfile, userId: string) {
    const gen = ++genTokenRef.current
    const stale = () => genTokenRef.current !== gen
    generatingProfileRef.current = profile
    setGenerationError(null)
    setIsGenerating(true)
    try {
      await generatePlan(profile, userId, 6)
      if (stale()) return
      setPendingProfile(null)
      setIsGenerating(false)
      setHasProfile(true)
    } catch (err) {
      console.error('generatePlan failed', err)
      if (stale()) return
      setPendingProfile(profile)
      setGenerationError(friendlyGenerationError(err))
      setIsGenerating(false)
    }
  }

  function handleCancelGeneration() {
    // Invalidate any in-flight generation so its setters are dropped when it
    // eventually resolves — the fetch itself keeps running but can't clobber
    // the retry screen state.
    genTokenRef.current += 1
    const captured = generatingProfileRef.current
    setIsGenerating(false)
    if (captured) {
      setPendingProfile(captured)
      setGenerationError('Cancelled — try again when you\'re ready.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 size={32} className="text-brand animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onSignIn={signInWithMagicLink} />
  }

  // Plan generation in progress — short-circuit regardless of `hasProfile`
  // so the HomeScreen "Rebuild my plan" retry also shows the loader. Without
  // this, a retry from the plan-less empty state would silently keep
  // HomeScreen mounted while the generator churned in the background.
  if (isGenerating) {
    return <GeneratingPlan onCancel={handleCancelGeneration} />
  }

  if (!hasProfile) {
    // Generation-failed screen: user finished onboarding, profile is
    // persisted locally, but generatePlan errored. Keep them out of
    // WorkoutView (which would render a stale "no plan" state) and
    // offer an explicit retry. We intentionally do NOT fall back to a
    // templated plan — the whole point of the adaptive engine is that
    // every block is AI-generated against the user's profile.
    if (generationError && pendingProfile) {
      return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle size={48} className="text-red-500 mb-6" />
          <h1 className="text-2xl font-extrabold mb-3">
            We couldn't build your plan
          </h1>
          <p className="text-zinc-500 max-w-sm mb-2">
            The plan generator hit an error. Your profile is saved — we just
            need to retry the build.
          </p>
          <p className="text-zinc-400 max-w-sm mb-8">{generationError}</p>
          <button
            onClick={() => runGeneration(pendingProfile, user.id)}
            disabled={isGenerating}
            className="px-6 py-3 rounded-2xl bg-brand text-black font-bold disabled:opacity-50"
          >
            {isGenerating ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      )
    }

    // `isGenerating` is handled by the top-level guard above — if we reach
    // here, no generation is in flight and no error is pending, so fall
    // through to onboarding.
    return (
      <OnboardingFlow
        onComplete={async (p: UserProgramProfile) => {
          try {
            await saveProfileLocal(user.id, p)
          } catch (err) {
            console.error('saveProfileLocal failed', err)
            return
          }
          // Fire-and-forget cloud sync — local save is the source of
          // truth for the next render, and syncProfileUp leaves the
          // row dirty on failure so we'll retry next session.
          void syncProfileUp(user.id).catch((err) => {
            console.error('syncProfileUp failed', err)
          })
          // Kick off plan generation. On success this flips
          // hasProfile=true; on failure it surfaces the error screen
          // above with a retry button.
          await runGeneration(p, user.id)
        }}
      />
    )
  }

  const startGlobalTimer = (seconds: number, label: string, type: 'rest' | 'work') => {
    setGlobalTimer({ seconds, label, type })
  }

  // Views without bottom nav
  const showBottomNav = !['capture'].includes(view)

  if (settingsOpen) {
    return (
      <SettingsScreen
        tweaks={tweaksApi.tweaks}
        setTweaks={tweaksApi.setTweaks}
        themeMode={tweaksApi.themeMode}
        setThemeMode={tweaksApi.setThemeMode}
        onClose={() => setSettingsOpen(false)}
        isGenerating={isGenerating}
        onRegeneratePlan={() => {
          // Reload the saved profile and re-run plan generation against the
          // current prompt + backend. runGeneration flips isGenerating=true,
          // which causes App.tsx's top-level guard to render GeneratingPlan
          // above the settings overlay — so Settings closes implicitly.
          void loadProfileLocal(user.id).then((p) => {
            if (!p) {
              console.warn(
                'Regenerate plan: no profile found for user — skipping.',
              )
              return
            }
            return runGeneration(p, user.id)
          })
        }}
      />
    )
  }

  return (
    <>
      {view === 'workout' && !sessionStarted && (
        <HomeScreen
          userId={user.id}
          profile={profile}
          onOpenSettings={() => setSettingsOpen(true)}
          onStartSession={() => setSessionStarted(true)}
          onRetryGeneration={async () => {
            // Retry from the plan-less empty state. Load the profile
            // captured during onboarding out of Dexie and re-run the
            // generator — runGeneration flips isGenerating=true so the
            // GeneratingPlan loader takes over until Dexie has a plan
            // again and HomeScreen re-renders with content.
            const stored = await loadProfileLocal(user.id)
            if (stored) await runGeneration(stored, user.id)
          }}
        />
      )}

      {view === 'workout' && sessionStarted && (
        <WorkoutView
          userId={user.id}
          profile={profile}
          onSignOut={signOut}
          onWorkoutComplete={() => {
            updateStreak()
            setSessionStarted(false)
          }}
          onNavigateToCapture={() => setView('capture')}
          onNavigateCardio={() => setView('cardio')}
          onNavigateProgress={() => setView('progress')}
          onExitSession={() => setSessionStarted(false)}
        />
      )}

      {view === 'exercises' && (
        <ExerciseBrowser onBack={() => setView('workout')} />
      )}

      {view === 'mobility' && (
        <MobilityRoutines
          onBack={() => setView('workout')}
          onStartTimer={startGlobalTimer}
        />
      )}

      {view === 'progress' && (
        <ProgressView onBack={() => setView('workout')} />
      )}

      {view === 'cardio' && (
        <CardioPage
          userId={user.id}
          onBack={() => setView('workout')}
        />
      )}

      {view === 'capture' && (
        <ExerciseCapture
          onBack={() => setView('workout')}
          onSaveToLibrary={(exercises: ExtractedExercise[]) => {
            console.log('Saving to library:', exercises)
          }}
        />
      )}

      {/* Bottom navigation */}
      {showBottomNav && <BottomNav active={view} onNavigate={setView} />}

      {/* Global timer overlay */}
      {globalTimer && (
        <TimerOverlay
          seconds={globalTimer.seconds}
          label={globalTimer.label}
          type={globalTimer.type}
          onClose={() => setGlobalTimer(null)}
        />
      )}
    </>
  )
}

export default App
