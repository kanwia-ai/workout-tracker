import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { WorkoutView } from './components/WorkoutView'
import { LoginScreen } from './components/LoginScreen'
import { ExerciseBrowser } from './components/ExerciseBrowser'
import { MobilityRoutines } from './components/MobilityRoutines'
import { ExerciseCapture } from './components/ExerciseCapture'
import { ProgressView } from './components/ProgressView'
import { CardioPage } from './components/CardioPage'
import { BottomNav, type AppView } from './components/BottomNav'
import { TimerOverlay } from './components/TimerOverlay'
import { DEFAULT_SCHEDULE } from './data/schedule'
import { Loader2 } from 'lucide-react'
import type { TimerState } from './types'
import type { ExtractedExercise } from './lib/gemini'

function App() {
  const { user, profile, loading, signInWithMagicLink, signOut, updateStreak } = useAuth()
  const [view, setView] = useState<AppView>('workout')
  const [globalTimer, setGlobalTimer] = useState<TimerState | null>(null)

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

  const startGlobalTimer = (seconds: number, label: string, type: 'rest' | 'work') => {
    setGlobalTimer({ seconds, label, type })
  }

  // Views without bottom nav
  const showBottomNav = !['capture'].includes(view)

  return (
    <>
      {view === 'workout' && (
        <WorkoutView
          userId={user.id}
          profile={profile}
          onSignOut={signOut}
          onWorkoutComplete={updateStreak}
          onNavigateToCapture={() => setView('capture')}
          onNavigateCardio={() => setView('cardio')}
          onNavigateProgress={() => setView('progress')}
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
          schedule={DEFAULT_SCHEDULE}
          onSaveToLibrary={(exercises: ExtractedExercise[]) => {
            console.log('Saving to library:', exercises)
          }}
          onSaveToDay={(exercises: ExtractedExercise[], dayIdx: number) => {
            console.log('Saving to day', dayIdx, ':', exercises)
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
