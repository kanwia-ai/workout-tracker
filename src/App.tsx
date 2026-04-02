import { useAuth } from './hooks/useAuth'
import { WorkoutView } from './components/WorkoutView'
import { LoginScreen } from './components/LoginScreen'
import { Loader2 } from 'lucide-react'

function App() {
  const { user, profile, loading, signInWithMagicLink, signOut, updateStreak } = useAuth()

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

  return (
    <WorkoutView
      userId={user.id}
      profile={profile}
      onSignOut={signOut}
      onWorkoutComplete={updateStreak}
    />
  )
}

export default App
