'use client'

import React, { useState } from 'react'

interface AuthGateSheetProps {
  error: string | null
  onSignIn: (email: string, password: string) => Promise<void>
  onCreateAccount: (email: string, password: string) => Promise<void>
  onContinue: (email: string) => Promise<void>
  /** Retained for the explicit OTP recovery path. */
  otpPending: boolean
  onVerifyOtp: (code: string) => Promise<void>
}

export default function AuthGateSheet({ error, onSignIn, onCreateAccount, onContinue, otpPending, onVerifyOtp }: AuthGateSheetProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [quickEmail, setQuickEmail] = useState('')
  const [quickSubmitting, setQuickSubmitting] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpSubmitting, setOtpSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'signin') {
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

  async function handleQuickContinue(e: React.FormEvent) {
    e.preventDefault()
    setQuickSubmitting(true)
    try {
      await onContinue(quickEmail)
    } catch {
      // error shown via props
    } finally {
      setQuickSubmitting(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setOtpSubmitting(true)
    try {
      await onVerifyOtp(otpCode)
    } catch {
      // error shown via props
    } finally {
      setOtpSubmitting(false)
    }
  }

  return (
    <div className="ln-sheet ln-sheet--bottom auth-gate">
      <div className="auth-gate__scrim" aria-hidden="true" />
      <section className="ln-sheet__panel auth-gate__panel">
        <div className="ln-sheet__handle-wrap auth-gate__handle" aria-hidden="true">
          <div className="ln-sheet__handle" />
        </div>

        <div className="auth-gate__scene" aria-hidden="true">
          <div className="auth-gate__scene-copy">
            <span className="auth-gate__eyebrow">LANDNAM // BASE</span>
            <span className="auth-gate__scene-title">MISSION CONTROL</span>
            <span className="auth-gate__scene-status"><i /> FLIGHT SYSTEMS READY</span>
          </div>
          <div className="auth-gate__orbit auth-gate__orbit--outer" />
          <div className="auth-gate__orbit auth-gate__orbit--inner" />
          <div className="auth-gate__planet" />
          <img className="auth-gate__ship" src="/game/assets/ships/ship_sr1.png" alt="" />
          <div className="auth-gate__telemetry">
            <span>ORBITAL NETWORK</span><strong>ONLINE</strong>
            <span>LOCAL TIME</span><strong>03:17:42 UTC</strong>
          </div>
        </div>

        <div className="auth-gate__content">
          <div className="auth-gate__eyebrow">LANDNAM · SPACE MINING</div>
          <div className="auth-gate__heading">{mode === 'signin' ? 'Welcome Back' : 'Create Account'}</div>
          <p className="auth-gate__intro">Resume the program and return to the command deck.</p>

          <div className="auth-gate__tabs" role="tablist" aria-label="Account access mode">
            {(['signin', 'signup'] as const).map(m => (
              <button key={m} className={`auth-gate__tab${mode === m ? ' is-active' : ''}`} onClick={() => setMode(m)} role="tab" aria-selected={mode === m}>
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

        <form onSubmit={handleSubmit} className="auth-gate__form">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="Email"
            data-testid="auth-gate-email"
            className="auth-gate__input"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="Password"
            data-testid="auth-gate-password"
            className="auth-gate__input"
          />

          {error && (
            <div className="auth-gate__error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            data-testid="auth-gate-submit"
            className="auth-gate__primary"
          >
            {submitting ? (mode === 'signin' ? 'Signing in…' : 'Creating…') : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="auth-gate__quick">
          {otpPending ? (
            <>
              <div className="auth-gate__quick-copy">
                Enter the code we emailed to {quickEmail}
              </div>
              <form onSubmit={handleVerifyOtp} className="auth-gate__quick-form">
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  required
                  autoComplete="one-time-code"
                  placeholder="Code"
                  data-testid="auth-gate-otp-code"
                  className="auth-gate__input auth-gate__input--compact"
                />
                <button
                  type="submit"
                  disabled={otpSubmitting}
                  data-testid="auth-gate-otp-submit"
                  className="auth-gate__secondary"
                >
                  {otpSubmitting ? '…' : 'Verify'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="auth-gate__quick-copy">
                <span>NO PASSWORD NEEDED</span> Use your email to create an account and start playing.
              </div>
              <form onSubmit={handleQuickContinue} className="auth-gate__quick-form">
                <input
                  type="email"
                  value={quickEmail}
                  onChange={e => setQuickEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  data-testid="auth-gate-quick-email"
                  className="auth-gate__input auth-gate__input--compact"
                />
                <button
                  type="submit"
                  disabled={quickSubmitting}
                  data-testid="auth-gate-quick-submit"
                  className="auth-gate__secondary"
                >
                  {quickSubmitting ? '…' : 'Continue with Email'}
                </button>
              </form>
            </>
          )}
        </div>
        </div>
      </section>
    </div>
  )
}
