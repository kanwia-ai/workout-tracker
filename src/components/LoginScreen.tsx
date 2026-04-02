import { useState } from 'react'
import { Mail, Loader2, CheckCircle } from 'lucide-react'

interface LoginScreenProps {
  onSignIn: (email: string) => Promise<{ error: string | null }>
}

export function LoginScreen({ onSignIn }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setSending(true)
    setError(null)

    const result = await onSignIn(email.trim())
    setSending(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🏋️</div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-brand to-orange-300 bg-clip-text text-transparent">
            Workout Tracker
          </h1>
          <p className="text-sm text-zinc-500 mt-2">Your personal gym companion</p>
        </div>

        {sent ? (
          /* Success state */
          <div className="bg-success-soft border border-success/20 rounded-2xl p-6 text-center">
            <CheckCircle size={40} className="text-success mx-auto mb-3" />
            <h2 className="text-lg font-bold text-success mb-2">Check your email</h2>
            <p className="text-sm text-zinc-400">
              We sent a magic link to <span className="text-zinc-200 font-medium">{email}</span>
            </p>
            <p className="text-xs text-zinc-500 mt-3">
              Tap the link in the email to sign in. Check spam if you don't see it.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-4 text-xs text-brand font-semibold"
            >
              Try a different email
            </button>
          </div>
        ) : (
          /* Email input */
          <form onSubmit={handleSubmit}>
            <div className="bg-surface-raised border border-border-subtle rounded-2xl p-5">
              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-overlay border border-border-medium text-white text-sm placeholder:text-zinc-600 outline-none focus:border-brand transition-colors"
                />
              </div>

              {error && (
                <p className="text-xs text-danger mt-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="w-full mt-4 py-3 rounded-xl font-bold text-sm bg-brand text-white active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Magic Link'
                )}
              </button>
            </div>

            <p className="text-xs text-zinc-600 text-center mt-4">
              No password needed. We'll email you a sign-in link.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
