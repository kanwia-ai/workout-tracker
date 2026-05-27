import { useState } from 'react'
import { Mail, Loader2, Lock } from 'lucide-react'
import { Lumo } from './Lumo'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup' | 'magic' | 'reset'

/**
 * LoginScreen — the sign-in gate.
 *
 * Auth is required (2026-05-27): Supabase is the source of truth, so
 * every visitor lands here on first load. Hierarchy:
 *
 *   1. PRIMARY  — "Continue with Google" (OAuth). Big button on top.
 *   2. SECONDARY — email + password (sign-in / sign-up toggle).
 *   3. TERTIARY  — magic link (kept as a fallback, hidden behind
 *      "more options"). Rate-limited to 3/hr on free tier, so we
 *      de-emphasize it but don't remove it entirely — a forgotten
 *      password + no Google account still needs a way in.
 *
 * Visual style matches the Lumo aesthetic (brand orange + dark theme).
 */
export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [moreOptions, setMoreOptions] = useState(false)

  function clearMessages() {
    setError(null)
    setInfo(null)
  }

  async function handleGoogle() {
    clearMessages()
    setSending(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      })
      if (error) {
        setError(friendlyAuthError(error.message))
        setSending(false)
      }
      // On success the browser is about to navigate to Google's consent
      // screen, so we leave `sending` true — the LoginScreen unmounts
      // shortly. No `setSending(false)` here.
    } catch (err) {
      setError(
        friendlyAuthError(err instanceof Error ? err.message : 'Unknown error'),
      )
      setSending(false)
    }
  }

  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    clearMessages()
    setSending(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) setError(friendlyAuthError(error.message))
        // On success, onAuthStateChange will unmount this screen.
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) {
          setError(friendlyAuthError(error.message))
        } else if (data.user && !data.session) {
          // Email confirmation required (Supabase default for new signups).
          setInfo("check your email to confirm your address, then sign in.")
        }
        // If session is present, onAuthStateChange handles routing.
      }
    } finally {
      setSending(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    clearMessages()
    setSending(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) {
        setError(friendlyAuthError(error.message))
      } else {
        setInfo(`magic link sent to ${email.trim()}. check your inbox.`)
      }
    } finally {
      setSending(false)
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    clearMessages()
    setSending(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: window.location.origin },
      )
      if (error) {
        setError(friendlyAuthError(error.message))
      } else {
        setInfo(`password reset email sent to ${email.trim()}.`)
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{
        background: 'var(--lumo-bg)',
        color: 'var(--lumo-text)',
      }}
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-3">
            <Lumo state="wave" size={88} />
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

        {/* Primary: Google OAuth */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={sending}
          data-testid="login-google"
          className="w-full flex items-center justify-center gap-3 active:scale-[0.98] transition-transform disabled:opacity-60"
          style={{
            padding: 14,
            borderRadius: 14,
            background: '#fff',
            color: '#1f1f1f',
            fontWeight: 700,
            fontSize: 14,
            border: 'none',
            cursor: sending ? 'default' : 'pointer',
            boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
          }}
        >
          <GoogleGlyph />
          continue with google
        </button>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '18px 0',
            color: 'var(--lumo-text-ter)',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ flex: 1, height: 1, background: 'var(--lumo-border)' }} />
          or
          <span style={{ flex: 1, height: 1, background: 'var(--lumo-border)' }} />
        </div>

        {/* Secondary: email + password */}
        {mode === 'reset' ? (
          <form onSubmit={handlePasswordReset}>
            <Card>
              <Label>email address</Label>
              <EmailInput value={email} onChange={setEmail} />
              <PrimaryButton
                type="submit"
                disabled={sending || !email.trim()}
                testId="login-reset-submit"
              >
                {sending ? <SendingLabel>sending…</SendingLabel> : 'send reset link'}
              </PrimaryButton>
              {error && <ErrorText>{error}</ErrorText>}
              {info && <InfoText>{info}</InfoText>}
              <TextLink
                onClick={() => {
                  setMode('signin')
                  clearMessages()
                }}
                testId="login-back-to-signin"
              >
                back to sign-in
              </TextLink>
            </Card>
          </form>
        ) : mode === 'magic' ? (
          <form onSubmit={handleMagicLink}>
            <Card>
              <Label>email address</Label>
              <EmailInput value={email} onChange={setEmail} />
              <PrimaryButton
                type="submit"
                disabled={sending || !email.trim()}
                testId="login-magic-submit"
              >
                {sending ? <SendingLabel>sending…</SendingLabel> : 'send magic link'}
              </PrimaryButton>
              {error && <ErrorText>{error}</ErrorText>}
              {info && <InfoText>{info}</InfoText>}
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--lumo-text-ter)',
                  marginTop: 10,
                  lineHeight: 1.5,
                }}
              >
                heads up — magic-link emails are rate-limited (3/hr). prefer
                google or a password if you can.
              </p>
              <TextLink
                onClick={() => {
                  setMode('signin')
                  clearMessages()
                }}
                testId="login-back-to-signin"
              >
                back to sign-in
              </TextLink>
            </Card>
          </form>
        ) : (
          <form onSubmit={handleEmailPassword}>
            <Card>
              <Label>email address</Label>
              <EmailInput value={email} onChange={setEmail} />

              <div style={{ marginTop: 12 }}>
                <Label>password</Label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--lumo-text-ter)' }}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'pick a strong one' : 'your password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    minLength={mode === 'signup' ? 6 : undefined}
                    data-testid="login-password"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none transition-colors"
                    style={{
                      background: 'var(--lumo-overlay)',
                      border: '1px solid var(--lumo-border-strong)',
                      color: 'var(--lumo-text)',
                    }}
                  />
                </div>
              </div>

              <PrimaryButton
                type="submit"
                disabled={sending || !email.trim() || !password}
                testId={mode === 'signup' ? 'login-signup-submit' : 'login-signin-submit'}
              >
                {sending ? (
                  <SendingLabel>{mode === 'signup' ? 'creating…' : 'signing in…'}</SendingLabel>
                ) : mode === 'signup' ? (
                  'create account'
                ) : (
                  'sign in'
                )}
              </PrimaryButton>

              {error && <ErrorText>{error}</ErrorText>}
              {info && <InfoText>{info}</InfoText>}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 12,
                  gap: 12,
                  fontSize: 12,
                }}
              >
                <button
                  type="button"
                  data-testid="login-toggle-mode"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin')
                    clearMessages()
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--brand)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {mode === 'signin' ? 'create account' : 'have an account? sign in'}
                </button>
                {mode === 'signin' && (
                  <button
                    type="button"
                    data-testid="login-forgot-password"
                    onClick={() => {
                      setMode('reset')
                      clearMessages()
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--lumo-text-sec)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    forgot password?
                  </button>
                )}
              </div>
            </Card>
          </form>
        )}

        {/* Tertiary: magic link, hidden by default */}
        {mode === 'signin' && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            {moreOptions ? (
              <button
                type="button"
                data-testid="login-show-magic"
                onClick={() => {
                  setMode('magic')
                  clearMessages()
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--lumo-text-sec)',
                  cursor: 'pointer',
                  fontSize: 12,
                  textDecoration: 'underline',
                }}
              >
                email me a magic link instead
              </button>
            ) : (
              <button
                type="button"
                data-testid="login-more-options"
                onClick={() => setMoreOptions(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--lumo-text-ter)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                more options
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Internal building blocks ──────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        borderRadius: 22,
        padding: 20,
      }}
    >
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block mb-2"
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--lumo-text)',
      }}
    >
      {children}
    </label>
  )
}

function EmailInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <Mail
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--lumo-text-ter)' }}
      />
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        autoFocus
        data-testid="login-email"
        className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none transition-colors"
        style={{
          background: 'var(--lumo-overlay)',
          border: '1px solid var(--lumo-border-strong)',
          color: 'var(--lumo-text)',
        }}
      />
    </div>
  )
}

function PrimaryButton({
  children,
  disabled,
  type = 'button',
  testId,
}: {
  children: React.ReactNode
  disabled?: boolean
  type?: 'button' | 'submit'
  testId?: string
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      data-testid={testId}
      className="w-full active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 16,
        background: 'var(--brand)',
        color: '#fff',
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: '-0.01em',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function SendingLabel({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Loader2 size={16} className="animate-spin" />
      {children}
    </>
  )
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p
      data-testid="login-error"
      style={{ fontSize: 12, color: '#ef4444', marginTop: 10, lineHeight: 1.5 }}
    >
      {children}
    </p>
  )
}

function InfoText({ children }: { children: React.ReactNode }) {
  return (
    <p
      data-testid="login-info"
      style={{
        fontSize: 12,
        color: 'var(--accent-mint, #34d399)',
        marginTop: 10,
        lineHeight: 1.5,
      }}
    >
      {children}
    </p>
  )
}

function TextLink({
  children,
  onClick,
  testId,
}: {
  children: React.ReactNode
  onClick: () => void
  testId?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      style={{
        marginTop: 10,
        background: 'transparent',
        border: 'none',
        color: 'var(--lumo-text-sec)',
        fontSize: 12,
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {children}
    </button>
  )
}

function GoogleGlyph() {
  // Inline SVG so we don't add an asset dep. Standard Google "G" colors.
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}

/**
 * Map raw Supabase / OAuth / fetch errors to copy a non-developer can act on.
 * Covers magic-link rate limits, OAuth-specific failures (popup closed,
 * provider not enabled), invalid credentials, and the "Failed to fetch"
 * that surfaces when the Supabase project is paused or unreachable.
 *
 * Exported for tests; tested via LoginScreen's error surface.
 */
export function friendlyAuthError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return "couldn't reach the server — give it a minute and try again. if this keeps happening, the backend may be paused."
  }
  if (lower.includes('rate limit') || lower.includes('429')) {
    return 'too many requests just now — wait a minute before trying again.'
  }
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return "that email + password combo didn't work. try again or reset your password."
  }
  if (lower.includes('email not confirmed')) {
    return 'check your email for a confirmation link, then try signing in.'
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'an account with that email already exists. try signing in instead.'
  }
  if (lower.includes('password should be at least') || lower.includes('weak password')) {
    return 'password needs to be at least 6 characters.'
  }
  if (lower.includes('invalid email')) {
    return "that email doesn't look right — double-check it."
  }
  if (lower.includes('popup') && (lower.includes('closed') || lower.includes('blocked'))) {
    return 'the sign-in window was closed — try again.'
  }
  if (lower.includes('provider is not enabled') || lower.includes('oauth')) {
    return "google sign-in isn't available right now — try email + password instead."
  }
  if (lower.includes('user not found')) {
    return 'no account with that email. try signing up first.'
  }
  return raw
}
