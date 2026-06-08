'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

export default function AuthPage() {
  const router = useRouter()
  const { signIn, createAccount, error } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await createAccount(email, password)
      }
      router.push('/game')
    } catch {
      // error is set by useAuth
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      width: '100%', minHeight: '100dvh',
      background: '#06090f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'linear-gradient(180deg, #0d1c30 0%, #060d18 100%)',
        border: '1px solid rgba(63,169,255,0.25)',
        borderRadius: 20,
        padding: '28px 22px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Logo / eyebrow */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
            letterSpacing: '0.28em', color: '#3fa9ff', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            Landnam · Space Mining
          </div>
          <div style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 22, fontWeight: 800,
            color: '#e6efff', letterSpacing: '-0.01em',
          }}>
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{
              display: 'block', marginBottom: 5,
              fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.2em', color: '#7a8294', textTransform: 'uppercase',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              data-testid="auth-email"
              style={{
                width: '100%', padding: '12px 14px',
                background: 'rgba(8,16,28,0.8)',
                border: '1px solid rgba(63,169,255,0.3)',
                borderRadius: 10, outline: 'none',
                fontFamily: 'var(--ln-font-body)', fontSize: 14, color: '#e6efff',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block', marginBottom: 5,
              fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.2em', color: '#7a8294', textTransform: 'uppercase',
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              data-testid="auth-password"
              style={{
                width: '100%', padding: '12px 14px',
                background: 'rgba(8,16,28,0.8)',
                border: '1px solid rgba(63,169,255,0.3)',
                borderRadius: 10, outline: 'none',
                fontFamily: 'var(--ln-font-body)', fontSize: 14, color: '#e6efff',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 12px',
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
            data-testid="auth-submit"
            style={{
              width: '100%', padding: '16px',
              marginTop: 4,
              background: submitting
                ? 'rgba(44,96,140,0.5)'
                : 'linear-gradient(180deg, #6cc2ff 0%, #2d8de0 100%)',
              color: '#06121f',
              fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              border: 'none', borderRadius: 12, cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: submitting ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 0 rgba(0,0,0,0.3)',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Signing in…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#5d7390',
              textDecoration: 'underline',
            }}
          >
            {mode === 'signin' ? 'No account? Create one' : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
