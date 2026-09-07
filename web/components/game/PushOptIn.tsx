'use client'

import { usePushNotifications } from '@/lib/hooks/usePushNotifications'

interface PushOptInProps {
  userId?: string
}

export function PushOptIn({ userId }: PushOptInProps) {
  const { state, loading, subscribe, unsubscribe } = usePushNotifications(userId)

  if (state === 'unsupported') return null

  // A denied browser permission cannot be repaired from inside the game.
  // Rendering a persistent warning over the Hub only competes with mission
  // controls; Settings can explain how to re-enable it later.
  if (state === 'denied') return null

  if (state === 'granted') {
    return (
      <button
        onClick={unsubscribe}
        disabled={loading}
        style={{
          padding: '8px 16px',
          background: 'var(--ln-surface)',
          border: '1px solid var(--ln-hairline)',
          borderRadius: 4,
          color: 'var(--ln-text-dim)',
          fontSize: 11,
          letterSpacing: '0.08em',
          cursor: 'pointer',
        }}
      >
        {loading ? 'WORKING…' : 'NOTIFICATIONS ON — TAP TO DISABLE'}
      </button>
    )
  }

  return (
    <button
      onClick={subscribe}
      disabled={loading}
      style={{
        padding: '8px 16px',
        background: 'var(--ln-cyan-soft)',
        border: '1px solid var(--ln-cyan-border)',
        borderRadius: 4,
        color: 'var(--ln-cyan)',
        fontSize: 11,
        letterSpacing: '0.08em',
        cursor: 'pointer',
      }}
    >
      {loading ? 'WORKING…' : 'ENABLE MISSION ALERTS'}
    </button>
  )
}
