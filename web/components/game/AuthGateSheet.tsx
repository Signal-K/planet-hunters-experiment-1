'use client'

import React, { useState } from 'react'
import { UI_ZONES } from '@/lib/ui-zones'

interface AuthGateSheetProps {
  error: string | null
  onSignIn: (email: string, password: string) => Promise<void>
  onCreateAccount: (email: string, password: string) => Promise<void>
  onSkip: () => void
}

export default function AuthGateSheet({ error, onSignIn, onCreateAccount, onSkip }: AuthGateSheetProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    background: 'rgba(8,16,28,0.8)',
    border: '1px solid rgba(63,169,255,0.3)',
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

  return (
    <div className="auth-gate" data-ui-zone={UI_ZONES.modalOverlay}>
      <div className="auth-gate__scrim" />
      <div className="auth-gate__panel">
        <div className="auth-gate__handle">
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
        </div>

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
              background: mode === m ? 'rgba(63,169,255,0.15)' : 'transparent',
              border: `1px solid ${mode === m ? 'rgba(63,169,255,0.5)' : 'rgba(63,169,255,0.15)'}`,
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

        <button
          type="button"
          onClick={onSkip}
          data-testid="auth-gate-skip"
          style={{
            display: 'block', width: '100%', marginTop: 14,
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#5d7390',
            textAlign: 'center',
          }}
        >
          Continue without account
        </button>
      </div>
    </div>
  )
}
