'use client'

import React, { useState } from 'react'
import Sheet from '@/components/ui/Sheet'

interface AuthGateSheetProps {
  error: string | null
  onSignIn: (email: string, password: string) => Promise<void>
  onCreateAccount: (email: string, password: string) => Promise<void>
  onContinue: (email: string) => Promise<void>
  /** True once onContinue's requestOTP() succeeded — switches the quick path to code entry. */
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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    background: 'rgba(20,20,23,0.8)',
    border: '1px solid rgba(112,217,234,0.3)',
    borderRadius: 10, outline: 'none',
    fontFamily: 'var(--ln-font-body)', fontSize: 14, color: '#e6efff',
    boxSizing: 'border-box',
  }

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
    <Sheet
      className="auth-gate"
      panelClassName="auth-gate__panel"
      dismissOnBackdrop={false}
      zIndex={92}
      handleStyle={{ background: 'rgba(255,255,255,0.2)' }}
    >

        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: '#3fa9ff', textTransform: 'uppercase' }}>
          Landnam · Space Mining
        </div>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 20, fontWeight: 800, color: '#e6efff', marginTop: 2 }}>
          {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14, marginBottom: 14 }}>
          {(['signin', 'signup'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '8px 0',
              background: mode === m ? 'rgba(112,217,234,0.15)' : 'transparent',
              border: `1px solid ${mode === m ? 'rgba(112,217,234,0.5)' : 'rgba(112,217,234,0.15)'}`,
              borderRadius: 10, cursor: 'pointer',
              fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: mode === m ? '#87CFFA' : '#5d7390',
            }}>
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="Email"
            data-testid="auth-gate-email"
            style={inputStyle}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="Password"
            data-testid="auth-gate-password"
            style={inputStyle}
          />

          {error && (
            <div style={{
              padding: '9px 12px',
              background: 'rgba(255,59,48,0.12)',
              border: '1px solid rgba(255,59,48,0.35)',
              borderRadius: 8,
              fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#ff6b5b',
              lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            data-testid="auth-gate-submit"
            style={{
              width: '100%', padding: '15px', borderRadius: 12, border: 'none',
              marginTop: 2,
              cursor: submitting ? 'not-allowed' : 'pointer',
              background: submitting
                ? 'rgba(44,96,140,0.5)'
                : 'linear-gradient(180deg, #6cc2ff 0%, #2d8de0 100%)',
              color: '#06121f',
              fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              boxShadow: submitting ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 0 rgba(0,0,0,0.3)',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? (mode === 'signin' ? 'Signing in…' : 'Creating…') : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(112,217,234,0.15)' }}>
          {otpPending ? (
            <>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: '#5d7390', marginBottom: 8, textAlign: 'center' }}>
                Enter the code we emailed to {quickEmail}
              </div>
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  required
                  autoComplete="one-time-code"
                  placeholder="Code"
                  data-testid="auth-gate-otp-code"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={otpSubmitting}
                  data-testid="auth-gate-otp-submit"
                  style={{
                    padding: '0 18px', borderRadius: 10, border: '1px solid rgba(112,217,234,0.35)',
                    cursor: otpSubmitting ? 'not-allowed' : 'pointer',
                    background: 'transparent', color: '#87CFFA',
                    fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    opacity: otpSubmitting ? 0.6 : 1,
                  }}
                >
                  {otpSubmitting ? '…' : 'Verify'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: '#5d7390', marginBottom: 8, textAlign: 'center' }}>
                Or just leave an email — no password needed
              </div>
              <form onSubmit={handleQuickContinue} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  value={quickEmail}
                  onChange={e => setQuickEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  data-testid="auth-gate-quick-email"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={quickSubmitting}
                  data-testid="auth-gate-quick-submit"
                  style={{
                    padding: '0 18px', borderRadius: 10, border: '1px solid rgba(112,217,234,0.35)',
                    cursor: quickSubmitting ? 'not-allowed' : 'pointer',
                    background: 'transparent', color: '#87CFFA',
                    fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    opacity: quickSubmitting ? 0.6 : 1,
                  }}
                >
                  {quickSubmitting ? '…' : 'Continue'}
                </button>
              </form>
            </>
          )}
        </div>
    </Sheet>
  )
}
