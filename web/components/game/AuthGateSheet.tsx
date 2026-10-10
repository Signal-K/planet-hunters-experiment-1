'use client'

import React, { useEffect, useState } from 'react'
import { PRODUCT_DESCRIPTOR, PRODUCT_WORDMARK } from '@/lib/brand'
import { ROCKET_ASSETS } from '@/lib/rocket-assets'

interface AuthGateSheetProps {
  error: string | null
  onSignIn: (email: string, password: string) => Promise<void>
  onCreateAccount: (email: string, password: string) => Promise<void>
}

// iOS Safari's keyboard covers the lower fields and does not scroll the sheet
// for us; bring the focused input into view once the keyboard has animated in.
function revealOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  const el = e.currentTarget
  window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
}

export default function AuthGateSheet({ error, onSignIn, onCreateAccount }: AuthGateSheetProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(() => {
    if (typeof window === 'undefined') return 'signin'
    return new URLSearchParams(window.location.search).get('gate') === 'signup' ? 'signup' : 'signin'
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  // iOS leaves the layout viewport at full height when the keyboard opens, so
  // the bounded panel runs under it. Mirror the keyboard's height into a CSS
  // var so the sheet lifts above it and the panel scrolls internally.
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
    <div
      className="ln-sheet ln-sheet--bottom auth-gate theme-blueprint"
      style={keyboardInset ? ({ '--gate-kb': `${keyboardInset}px` } as React.CSSProperties) : undefined}
    >
      <div className="auth-gate__scrim" aria-hidden="true" />
      <section className="ln-sheet__panel auth-gate__panel">
        <div className="ln-sheet__handle-wrap auth-gate__handle" aria-hidden="true">
          <div className="ln-sheet__handle" />
        </div>

        <div className="auth-gate__scene" aria-hidden="true">
          <div className="auth-gate__scene-copy">
            <span className="auth-gate__eyebrow">LANDNAM // BASE</span>
            <span className="auth-gate__scene-title">PROGRAM MAP</span>
            <span className="auth-gate__scene-status"><i /> SYSTEM LINK READY</span>
          </div>
          <div className="auth-gate__orbit auth-gate__orbit--outer" />
          <div className="auth-gate__orbit auth-gate__orbit--inner" />
          <div className="auth-gate__planet" />
          <img className="auth-gate__ship" src={ROCKET_ASSETS.explorer.exterior} alt="" />
          <div className="auth-gate__telemetry">
            <span>PROGRAM LINK</span><strong>READY</strong>
            <span>ACCESS ROUTE</span><strong>EARTH BASE</strong>
          </div>
        </div>

        <div className="auth-gate__content">
          <div className="auth-gate__eyebrow">{PRODUCT_WORDMARK} · {PRODUCT_DESCRIPTOR}</div>
          <div className="auth-gate__heading">{mode === 'signin' ? 'Welcome Back' : 'New Space Program'}</div>
          {/* SSL-302: the subtitle used to stay on the "resume" line for both
              tabs — a brand-new player on Sign Up has nothing to resume. */}
          <p className="auth-gate__intro" data-testid="auth-gate-intro">
            {mode === 'signin'
              ? 'Pick up at the next step in your space program.'
              : 'Create a program, then build toward your first launch.'}
          </p>

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
            onFocus={revealOnFocus}
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
            onFocus={revealOnFocus}
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
            onFocus={revealOnFocus}
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
