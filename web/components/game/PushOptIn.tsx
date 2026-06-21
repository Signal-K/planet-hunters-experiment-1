'use client'

import { usePushNotifications } from '@/lib/hooks/usePushNotifications'

interface PushOptInProps {
  userId?: string
}

export function PushOptIn({ userId }: PushOptInProps) {
  const { state, loading, subscribe, unsubscribe } = usePushNotifications(userId)

  if (state === 'unsupported') return null

  if (state === 'denied') {
    return (
      <div
        style={{
          padding: '8px 12px',
          background: 'var(--ln-surface)',
          border: '1px solid var(--ln-hairline)',
          borderRadius: 4,
          color: 'var(--ln-text-muted)',
          fontSize: 11,
          letterSpacing: '0.06em',
        }}
      >
        NOTIFICATIONS BLOCKED — enable in browser settings
      </div>
    )
  }

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
