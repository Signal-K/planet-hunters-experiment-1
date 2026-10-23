'use client'

import React, { useEffect, useState } from 'react'
import { WorldBackdrop } from '@/components/game/hub/WorldBackdrop'
import { PRODUCT_DESCRIPTOR, PRODUCT_WORDMARK } from '@/lib/brand'
import { STAGING_PLAYTEST_EMAIL_SUFFIX } from '@/lib/staging-account'

interface AuthGateSheetProps {
  error: string | null
  entry?: 'orionids' | null
  onSignIn: (email: string, password: string) => Promise<void>
  onCreateAccount: (email: string, password: string) => Promise<void>
  onRequestPasswordReset: (email: string) => Promise<void>
  onConfirmPasswordReset: (token: string, password: string) => Promise<void>
}

// iOS Safari's keyboard covers the lower fields and does not scroll the sheet
// for us; bring the focused input into view once the keyboard has animated in.
function revealOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  const el = e.currentTarget
  window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
}

export default function AuthGateSheet({ error, entry = null, onSignIn, onCreateAccount, onRequestPasswordReset, onConfirmPasswordReset }: AuthGateSheetProps) {
  const [requestedEntry, setRequestedEntry] = useState<'orionids' | null>(entry)
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(() => {
    if (typeof window === 'undefined') return 'signin'
    return new URLSearchParams(window.location.search).get('gate') === 'signup' ? 'signup' : 'signin'
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [resetRequested, setResetRequested] = useState(false)
  // The reset email links to /game?reset_token=...; read it once and drop it
  // from the address bar so it is not kept in history or shared by accident.
  const [resetToken, setResetToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('reset_token')
  })
  const [passwordChanged, setPasswordChanged] = useState(false)
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('reset_token')) return
    url.searchParams.delete('reset_token')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  }, [])
  // iOS leaves the layout viewport at full height when the keyboard opens, so
  // the bounded panel runs under it. Mirror the keyboard's height into a CSS
  // var so the sheet lifts above it and the panel scrolls internally.
  // Local only: decided at runtime from the hostname so a deployed build never shows the shortcut.
  const [isLocal, setIsLocal] = useState(false)
  useEffect(() => {
    setIsLocal(/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname))
    const fromUrl = new URLSearchParams(window.location.search).get('entry')
    if (entry === 'orionids' || fromUrl === 'orionids' || window.sessionStorage.getItem('landnam-entry') === 'orionids') {
      setRequestedEntry('orionids')
    }
  }, [entry])
  const [keyboardInset, setKeyboardInset] = useState<number | null>(null)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    // Only treat a large gap as the keyboard; toolbar/URL-bar changes must
    // leave the panel at its normal size.
    const sync = () => {
      const inset = window.innerHeight - vv.height - vv.offsetTop
      setKeyboardInset(inset > 120 ? Math.round(inset) : null)
    }
    sync()
    vv.addEventListener('resize', sync)
    return () => vv.removeEventListener('resize', sync)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'reset' && !resetToken) {
      await handlePasswordReset()
      return
    }
    if ((mode === 'signup' || resetToken) && password !== passwordConfirmation) {
      setValidationError('Passwords do not match.')
      return
    }
    setValidationError(null)
    setSubmitting(true)
    try {
      if (resetToken) {
        await onConfirmPasswordReset(resetToken, password)
        setResetToken(null)
        setPassword('')
        setPasswordConfirmation('')
        setPasswordChanged(true)
        setMode('signin')
      } else if (mode === 'signin') {
        await onSignIn(email, password)
      } else {
        await onCreateAccount(email, password)
      }
    } catch {
      // error shown via props
    } finally {
      setSubmitting(false)
    }
  }

  // Forgot password opens its own email-only view: the player has no password to type.
  function openPasswordReset() {
    setValidationError(null)
    setResetRequested(false)
    setPassword('')
    setMode('reset')
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      setValidationError('Enter the email address for your account first.')
      return
    }
    setValidationError(null)
    setSubmitting(true)
    try {
      await onRequestPasswordReset(email.trim())
      setResetRequested(true)
    } catch {
      // error shown via props
    } finally {
      setSubmitting(false)
    }
  }

  async function handleQuickAccount() {
    const id = Math.random().toString(36).slice(2, 10)
    const quickPassword = `Local-${Math.random().toString(36).slice(2, 12)}`
    setValidationError(null)
    setSubmitting(true)
    try {
      await onCreateAccount(`dev-${id}${STAGING_PLAYTEST_EMAIL_SUFFIX}`, quickPassword)
    } catch {
      // error shown via props
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="ln-sheet ln-sheet--bottom auth-gate theme-blueprint"
      style={keyboardInset ? ({ '--gate-kb': `${keyboardInset}px` } as React.CSSProperties) : undefined}
    >
      <WorldBackdrop />
      <div className="auth-gate__scrim" aria-hidden="true" />
      <div className="auth-gate__brand" aria-hidden="true">
        <span className="auth-gate__brand-eyebrow">{PRODUCT_DESCRIPTOR}</span>
        <span className="auth-gate__brand-title">{PRODUCT_WORDMARK}</span>
        <span className="auth-gate__brand-line">Build rockets. Settle the galaxy. Use real science.</span>
      </div>
      <section className="ln-sheet__panel auth-gate__panel">
        <div className="ln-sheet__handle-wrap auth-gate__handle" aria-hidden="true">
          <div className="ln-sheet__handle" />
        </div>

        <div className="auth-gate__content">
          <div className="auth-gate__eyebrow">{PRODUCT_WORDMARK} · {PRODUCT_DESCRIPTOR}</div>
          <div className="auth-gate__heading">{resetToken ? 'New Password' : mode === 'reset' ? 'Reset Password' : requestedEntry === 'orionids' ? 'Fly the Orionids' : mode === 'signin' ? 'Welcome Back' : 'New Space Program'}</div>
          {/* SSL-302: the subtitle used to stay on the "resume" line for both
              tabs — a brand-new player on Sign Up has nothing to resume. */}
          <p className="auth-gate__intro" data-testid="auth-gate-intro">
            {resetToken
              ? 'Choose a new password for your account.'
              : mode === 'reset'
              ? 'Enter your account email and we’ll send you a link to choose a new password.'
              : requestedEntry === 'orionids'
              ? 'Sign in or create your program. We’ll take you straight into the Orionids launch, then the rest of Landnam stays open.'
              : mode === 'signin'
              ? 'Return to your launchpad and take on your agency’s next mission.'
              : 'Choose a landing site, build your launchpad, and grow your space program one mission at a time.'}
          </p>

          {!resetToken && mode !== 'reset' && <div className="auth-gate__tabs" role="tablist" aria-label="Account access mode">
            {(['signin', 'signup'] as const).map(m => (
              <button key={m} className={`auth-gate__tab${mode === m ? ' is-active' : ''}`} onClick={() => setMode(m)} role="tab" aria-selected={mode === m}>
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>}

        <form onSubmit={handleSubmit} className="auth-gate__form">
          {!resetToken && <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="Email"
            data-testid="auth-gate-email"
            className="auth-gate__input"
            onFocus={revealOnFocus}
          />}
          {mode !== 'reset' && <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signin' && !resetToken ? 'current-password' : 'new-password'}
            placeholder={resetToken ? 'New password' : 'Password'}
            data-testid="auth-gate-password"
            className="auth-gate__input"
            onFocus={revealOnFocus}
          />}
          {(mode === 'signup' || resetToken) && (
            <input
              type="password"
              value={passwordConfirmation}
              onChange={e => setPasswordConfirmation(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Confirm password"
              data-testid="auth-gate-password-confirmation"
              className="auth-gate__input"
              onFocus={revealOnFocus}
            />
          )}
          {mode === 'signin' && !resetToken && (
            <button
              type="button"
              className="auth-gate__reset-link"
              data-testid="auth-gate-forgot-password"
              disabled={submitting}
              onClick={openPasswordReset}
            >
              Forgot password?
            </button>
          )}
          {mode === 'reset' && !resetToken && (
            <button
              type="button"
              className="auth-gate__reset-link"
              data-testid="auth-gate-back-to-signin"
              disabled={submitting}
              onClick={() => { setValidationError(null); setMode('signin') }}
            >
              Back to sign in
            </button>
          )}

          {(error ?? validationError) && (
            <div className="auth-gate__error" role="alert">
              {error ?? validationError}
            </div>
          )}

          {passwordChanged && !(error ?? validationError) && (
            <div className="auth-gate__notice" role="status" data-testid="auth-gate-password-changed">
              Password updated. Sign in with your new password.
            </div>
          )}

          {resetRequested && !(error ?? validationError) && (
            <div className="auth-gate__notice" role="status">
              If that email has an account, we’ve sent password-reset instructions.
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || (!resetToken && !email.trim()) || (mode !== 'reset' && !password)}
            data-testid="auth-gate-submit"
            className="auth-gate__primary"
          >
            {submitting
              ? (resetToken ? 'Saving…' : mode === 'reset' ? 'Sending…' : mode === 'signin' ? 'Opening program…' : 'Starting program…')
              : resetToken
                ? 'Save Password'
                : mode === 'reset'
                ? 'Send Reset Link'
                : requestedEntry === 'orionids'
                ? 'Continue to Orionids'
                : (mode === 'signin' ? 'Return to Base' : 'Start Program')}
          </button>
        </form>

        {isLocal && (
          <div className="auth-gate__quick">
            <button type="button" className="auth-gate__quick-btn" data-testid="auth-gate-quick-account" disabled={submitting} onClick={handleQuickAccount}>
              Local: create test account
            </button>
          </div>
        )}

        </div>
      </section>
    </div>
  )
}
