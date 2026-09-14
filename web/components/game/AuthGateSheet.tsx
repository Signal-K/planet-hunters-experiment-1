'use client'

import React, { useState } from 'react'
import { ROCKET_ASSETS } from '@/lib/rocket-assets'

interface AuthGateSheetProps {
  error: string | null
  onSignIn: (email: string, password: string) => Promise<void>
  onCreateAccount: (email: string, password: string) => Promise<void>
}

export default function AuthGateSheet({ error, onSignIn, onCreateAccount }: AuthGateSheetProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'signup' && password !== passwordConfirmation) {
      setValidationError('Passwords do not match.')
      return
    }
    setValidationError(null)
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
          <img className="auth-gate__ship" src={ROCKET_ASSETS.explorer.exterior} alt="" />
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
          {mode === 'signup' && (
            <input
              type="password"
              value={passwordConfirmation}
              onChange={e => setPasswordConfirmation(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Confirm password"
              data-testid="auth-gate-password-confirmation"
              className="auth-gate__input"
            />
          )}

          {(error ?? validationError) && (
            <div className="auth-gate__error" role="alert">
              {error ?? validationError}
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

        </div>
      </section>
    </div>
  )
}
