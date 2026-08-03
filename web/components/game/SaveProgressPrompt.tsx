'use client'

import React, { useState } from 'react'
import Sheet from '@/components/ui/Sheet'

interface SaveProgressPromptProps {
  onUpgrade: (email: string, password: string) => Promise<void>
  onDismiss: () => void
}

export default function SaveProgressPrompt({ onUpgrade, onDismiss }: SaveProgressPromptProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onUpgrade(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save account')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      onDismiss={onDismiss}
      panelStyle={{
        background: 'linear-gradient(180deg, #0d1c30, #060d18)',
        border: '1px solid rgba(112,217,234,0.5)',
        padding: '18px 16px 26px',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
      }}
      handleContainerStyle={{ marginBottom: 10 }}
      handleStyle={{ background: 'rgba(255,255,255,0.25)' }}
    >

        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: '#3fa9ff', textTransform: 'uppercase' }}>Save Progress</div>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 18, fontWeight: 800, color: '#e6efff', marginTop: 2 }}>Create a free account</div>
        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 4, lineHeight: 1.4 }}>
          Add an email and password to keep your progress permanently and play on another device. Your current save is kept — we&apos;ll email you a link to confirm your new address.
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="Email"
            data-testid="upgrade-email"
            style={{
              width: '100%', padding: '12px 14px',
              background: 'rgba(20,20,23,0.8)',
              border: '1px solid rgba(112,217,234,0.3)',
              borderRadius: 10, outline: 'none',
              fontFamily: 'var(--ln-font-body)', fontSize: 14, color: '#e6efff',
              boxSizing: 'border-box',
            }}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Password"
            data-testid="upgrade-password"
            style={{
              width: '100%', padding: '12px 14px',
              background: 'rgba(20,20,23,0.8)',
              border: '1px solid rgba(112,217,234,0.3)',
              borderRadius: 10, outline: 'none',
              fontFamily: 'var(--ln-font-body)', fontSize: 14, color: '#e6efff',
              boxSizing: 'border-box',
            }}
          />

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
            data-testid="upgrade-submit"
            style={{
              width: '100%', padding: '15px', borderRadius: 12, border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              background: submitting ? 'rgba(44,96,140,0.5)' : 'linear-gradient(180deg, #6cc2ff 0%, #2d8de0 100%)',
              color: '#06121f',
              fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              boxShadow: submitting ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 0 rgba(0,0,0,0.3)',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Saving…' : 'Save Account'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            data-testid="upgrade-dismiss"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#5d7390',
              textDecoration: 'underline', padding: 4,
            }}
          >
            Not now
          </button>
        </form>
    </Sheet>
  )
}
