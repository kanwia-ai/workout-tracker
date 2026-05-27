import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoginScreen, friendlyAuthError } from './LoginScreen'

describe('friendlyAuthError', () => {
  it('maps "Failed to fetch" to a "backend may be paused" message', () => {
    expect(friendlyAuthError('Failed to fetch')).toMatch(/backend may be paused/)
  })

  it('maps Supabase rate-limit copy', () => {
    expect(friendlyAuthError('Rate limit exceeded')).toMatch(/wait a minute/)
  })

  it('maps invalid login credentials', () => {
    expect(friendlyAuthError('Invalid login credentials')).toMatch(/didn't work/)
  })

  it('maps duplicate signup', () => {
    expect(friendlyAuthError('User already registered')).toMatch(/already exists/)
  })

  it('maps weak password', () => {
    expect(friendlyAuthError('Password should be at least 6 characters')).toMatch(
      /at least 6/,
    )
  })

  it('maps OAuth provider disabled', () => {
    expect(friendlyAuthError('Provider is not enabled')).toMatch(/google sign-in isn't available/)
  })

  it('maps email-not-confirmed', () => {
    expect(friendlyAuthError('Email not confirmed')).toMatch(/check your email/)
  })

  it('falls through to raw message when unknown', () => {
    expect(friendlyAuthError('something exotic')).toBe('something exotic')
  })
})

describe('LoginScreen', () => {
  it('renders the Google CTA, email/password form, and "more options" toggle', () => {
    render(<LoginScreen />)
    expect(screen.getByTestId('login-google')).toBeInTheDocument()
    expect(screen.getByTestId('login-email')).toBeInTheDocument()
    expect(screen.getByTestId('login-password')).toBeInTheDocument()
    expect(screen.getByTestId('login-signin-submit')).toBeInTheDocument()
    expect(screen.getByTestId('login-more-options')).toBeInTheDocument()
  })

  it('toggles between sign-in and sign-up modes', () => {
    render(<LoginScreen />)
    // Defaults to sign-in
    expect(screen.getByTestId('login-signin-submit')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('login-toggle-mode'))
    expect(screen.getByTestId('login-signup-submit')).toBeInTheDocument()
    expect(screen.queryByTestId('login-signin-submit')).not.toBeInTheDocument()
    // And back
    fireEvent.click(screen.getByTestId('login-toggle-mode'))
    expect(screen.getByTestId('login-signin-submit')).toBeInTheDocument()
  })

  it('renders the forgot-password link in sign-in mode and switches to reset mode', () => {
    render(<LoginScreen />)
    expect(screen.getByTestId('login-forgot-password')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('login-forgot-password'))
    expect(screen.getByTestId('login-reset-submit')).toBeInTheDocument()
    expect(screen.queryByTestId('login-forgot-password')).not.toBeInTheDocument()
  })

  it('"more options" reveals the magic-link button', () => {
    render(<LoginScreen />)
    expect(screen.queryByTestId('login-show-magic')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('login-more-options'))
    expect(screen.getByTestId('login-show-magic')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('login-show-magic'))
    expect(screen.getByTestId('login-magic-submit')).toBeInTheDocument()
  })
})
