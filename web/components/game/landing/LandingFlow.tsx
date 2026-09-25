'use client'

import React, { useState, type CSSProperties } from 'react'
import { PRODUCT_WORDMARK } from '@/lib/brand'
import { FrameSlot } from '@/components/layout/frame/FrameSlot'
import styles from './LandingFlow.module.css'

type AuthMode = 'signin' | 'signup'
type Step = 'choice' | AuthMode

export interface LandingFlowProps {
  /** A session is active: skip the sign-in step. */
  signedIn: boolean
  /** Signed in on a new device and the save is still loading. */
  restoring?: boolean
  /** The signed-in player already has progress to continue. */
  hasSave?: boolean
  /** One-line progress summary for a returning player. */
  saveSummary?: string
  authError?: string | null
  onSignIn: (email: string, password: string) => Promise<void>
  onCreateAccount: (email: string, password: string) => Promise<void>
  /** Signed in: resume the saved game. */
  onContinue: () => void
  /** Signed in: begin (or, after confirming, restart) the program. */
  onStartNew: () => void
  initialStep?: Step
}

/** The Earth Base yard, drawn flat, growing one piece at a time in a loop. */
function Yard() {
  const piece = (i: number): CSSProperties => ({ '--i': i } as CSSProperties)
  return (
    <svg className={styles.yard} viewBox="0 0 360 180" role="img" aria-label="An Earth Base yard being built">
      <rect x="0" y="150" width="360" height="30" fill="var(--ln-panel)" />
      <rect x="0" y="150" width="360" height="2" fill="var(--ln-hairline-strong)" />
      {/* hangar */}
      <g data-piece="hangar" style={piece(0)}>
        <rect x="20" y="112" width="72" height="38" fill="var(--ln-panel-2)" stroke="var(--ln-text-muted)" strokeWidth="2" />
        <path d="M18 112 L56 92 L94 112 Z" fill="var(--ln-text-muted)" />
        <rect x="42" y="126" width="28" height="24" fill="var(--ln-void)" />
      </g>
      {/* silo */}
      <g data-piece="silo" style={piece(1)}>
        <rect x="108" y="100" width="28" height="50" rx="14" fill="var(--ln-text)" />
        <rect x="108" y="124" width="28" height="4" fill="var(--ln-panel-2)" />
      </g>
      {/* dish */}
      <g data-piece="dish" style={piece(2)}>
        <rect x="152" y="126" width="6" height="24" fill="var(--ln-text-muted)" />
        <path d="M136 112 A20 20 0 0 0 174 124 Z" fill="var(--ln-cyan)" />
      </g>
      {/* dome */}
      <g data-piece="dome" style={piece(3)}>
        <path d="M184 150 A26 26 0 0 1 236 150 Z" fill="var(--ln-panel-2)" stroke="var(--ln-cyan)" strokeWidth="2" />
        <rect x="204" y="136" width="12" height="14" fill="var(--ln-cyan)" />
      </g>
      {/* launchpad */}
      <g data-piece="pad" style={piece(4)}>
        <rect x="260" y="142" width="80" height="8" fill="var(--ln-text-muted)" />
        <rect x="324" y="70" width="8" height="72" fill="var(--ln-text-muted)" />
        <rect x="312" y="84" width="14" height="4" fill="var(--ln-text-muted)" />
        <rect x="312" y="108" width="14" height="4" fill="var(--ln-text-muted)" />
      </g>
      {/* rocket: lands on the pad, then hops off */}
      <g data-piece="rocket">
        <path d="M300 80 C308 90 310 104 310 126 L290 126 C290 104 292 90 300 80 Z" fill="var(--ln-text)" />
        <circle cx="300" cy="102" r="4" fill="var(--ln-cyan)" />
        <path d="M290 116 L282 132 L290 130 Z M310 116 L318 132 L310 130 Z" fill="var(--ln-cyan)" />
        <rect x="294" y="126" width="12" height="16" fill="var(--ln-text-muted)" />
      </g>
    </svg>
  )
}

function AuthStep({ mode, error, onModeChange, onBack, onSignIn, onCreateAccount }: {
  mode: AuthMode
  error: string | null
  onModeChange: (mode: AuthMode) => void
  onBack: () => void
  onSignIn: LandingFlowProps['onSignIn']
  onCreateAccount: LandingFlowProps['onCreateAccount']
}) {
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
      if (mode === 'signin') await onSignIn(email, password)
      else await onCreateAccount(email, password)
    } catch {
      // The error arrives through props.
    } finally {
      setSubmitting(false)
    }
  }

  const shownError = error ?? validationError
  return (
    <>
      <div className={styles.heading}>
        <h1>{mode === 'signin' ? 'Sign in' : 'New game'}</h1>
        <p data-testid="auth-gate-intro">{mode === 'signin' ? 'Pick up where you left off.' : 'Make an account to keep your base.'}</p>
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input className={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="Email" aria-label="Email" data-testid="auth-gate-email" />
        <input className={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="Password" aria-label="Password" data-testid="auth-gate-password" />
        {mode === 'signup' && (
          <input className={styles.input} type="password" value={passwordConfirmation} onChange={e => setPasswordConfirmation(e.target.value)} required autoComplete="new-password" placeholder="Confirm password" aria-label="Confirm password" data-testid="auth-gate-password-confirmation" />
        )}
        {shownError && <div className={styles.error} role="alert">{shownError}</div>}
        <button type="submit" className={styles.primary} disabled={submitting} data-testid="auth-gate-submit">
          {submitting ? (mode === 'signin' ? 'Signing in…' : 'Creating…') : (mode === 'signin' ? 'Sign in' : 'Create account')}
        </button>
      </form>
      <div className={styles.actions}>
        <button type="button" className={styles.link} onClick={() => onModeChange(mode === 'signin' ? 'signup' : 'signin')} data-testid="landing-switch-mode">
          {mode === 'signin' ? 'New here? Start a new game' : 'Have an account? Sign in'}
        </button>
        <button type="button" className={styles.link} onClick={onBack}>Back</button>
      </div>
    </>
  )
}

/**
 * SSL-35 Landing: one flow in place of the old marketing page, IntroScreen
 * and AuthGateSheet. The yard grows in a loop; the player picks Continue or
 * Start new game; signed-out players then sign in (or create an account).
 */
export default function LandingFlow({
  signedIn,
  restoring = false,
  hasSave = false,
  saveSummary,
  authError = null,
  onSignIn,
  onCreateAccount,
  onContinue,
  onStartNew,
  initialStep = 'choice',
}: LandingFlowProps) {
  const [step, setStep] = useState<Step>(signedIn ? 'choice' : initialStep)
  const [confirmRestart, setConfirmRestart] = useState(false)

  function startNew() {
    if (!signedIn) { setStep('signup'); return }
    if (hasSave && !confirmRestart) { setConfirmRestart(true); return }
    onStartNew()
  }

  let panel: React.ReactNode
  if (restoring) {
    panel = <>
      <div className={styles.heading}><h1>{PRODUCT_WORDMARK}</h1></div>
      <div className={styles.status} aria-live="polite"><i />Restoring your base</div>
    </>
  } else if (step === 'choice' || signedIn) {
    panel = <>
      <div className={styles.heading}>
        <h1>{PRODUCT_WORDMARK}</h1>
        <p>{signedIn && hasSave && saveSummary ? saveSummary : 'Build a base. Fly client missions. Mine what you find.'}</p>
      </div>
      <div className={styles.actions}>
        {(!signedIn || hasSave) && (
          <button type="button" className={styles.primary} onClick={() => (signedIn ? onContinue() : setStep('signin'))} data-testid="landing-continue">
            Continue
          </button>
        )}
        <button
          type="button"
          className={signedIn && !hasSave ? styles.primary : styles.secondary}
          data-confirm={confirmRestart}
          onClick={startNew}
          data-testid="intro-begin-btn"
        >
          {confirmRestart ? 'Erase progress and start over' : 'Start new game'}
        </button>
      </div>
    </>
  } else {
    panel = <AuthStep mode={step} error={authError} onModeChange={setStep} onBack={() => setStep('choice')} onSignIn={onSignIn} onCreateAccount={onCreateAccount} />
  }

  return (
    <div className={'game-screen theme-deep'} data-testid="landnam-landing" data-step={restoring ? 'restoring' : step}>
      <FrameSlot name="top"><div className={`theme-deep ${styles.top}`}><span className={styles.wordmark}>{PRODUCT_WORDMARK}</span></div></FrameSlot>
      <div className={styles.scene}><Yard /></div>
      <FrameSlot name="bottom"><div className={`theme-deep ${styles.dock}`}><div className={styles.panel}>{panel}</div></div></FrameSlot>
    </div>
  )
}
