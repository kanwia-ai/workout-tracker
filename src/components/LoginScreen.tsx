import { useState } from 'react'
import { Mail, Loader2 } from 'lucide-react'
import { Lumo } from './Lumo'

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
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{
        background: 'var(--lumo-bg)',
        color: 'var(--lumo-text)',
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="mb-3">
            <Lumo state="wave" size={96} />
          </div>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--brand)',
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
              lineHeight: 1.1,
            }}
          >
            workout tracker
          </h1>
          <p
            style={{
              fontSize: 13,
              color: 'var(--lumo-text-sec)',
              marginTop: 8,
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
            }}
          >
            your lifting coach in an app.
          </p>
        </div>

        {sent ? (
          /* Success state */
          <div
            className="text-center"
            style={{
              background: 'color-mix(in srgb, var(--accent-mint) 18%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent-mint) 40%, transparent)',
              borderRadius: 22,
              padding: 24,
            }}
          >
            <div className="flex justify-center mb-3">
              <Lumo state="celebrate" size={64} />
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--accent-mint)',
                marginBottom: 8,
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
              }}
            >
              check your email
            </h2>
            <p style={{ fontSize: 13, color: 'var(--lumo-text-sec)' }}>
              we sent a magic link to{' '}
              <span style={{ color: 'var(--lumo-text)', fontWeight: 600 }}>{email}</span>
            </p>
            <p style={{ fontSize: 12, color: 'var(--lumo-text-ter)', marginTop: 12 }}>
              tap the link in the email to sign in. check spam if you don't see it.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              style={{
                marginTop: 16,
                fontSize: 12,
                color: 'var(--brand)',
                fontWeight: 600,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              try a different email
            </button>
          </div>
        ) : (
          /* Email input */
          <form onSubmit={handleSubmit}>
            <div
              style={{
                background: 'var(--lumo-raised)',
                border: '1px solid var(--lumo-border)',
                borderRadius: 22,
                padding: 20,
              }}
            >
              <label
                className="block mb-2"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--lumo-text)',
                }}
              >
                email address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--lumo-text-ter)' }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--lumo-overlay)',
                    border: '1px solid var(--lumo-border-strong)',
                    color: 'var(--lumo-text)',
                  }}
                />
              </div>

              {error && (
                <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="w-full mt-4 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                style={{
                  padding: 14,
                  borderRadius: 22,
                  background: 'var(--brand)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: '-0.01em',
                  border: 'none',
                  cursor: sending || !email.trim() ? 'default' : 'pointer',
                }}
              >
                {sending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    sending...
                  </>
                ) : (
                  'send magic link'
                )}
              </button>
            </div>

            <p
              style={{
                fontSize: 12,
                color: 'var(--lumo-text-ter)',
                textAlign: 'center',
                marginTop: 16,
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
              }}
            >
              no password needed. we'll email you a sign-in link.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
