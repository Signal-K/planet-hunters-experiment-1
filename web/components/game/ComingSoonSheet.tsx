'use client'

import React, { useEffect, useState } from 'react'
import { formatCountdownUnit } from '@/lib/format'
import PageSurface from '@/components/ui/PageSurface'

// July 5, 2026 10:00 AEST = 00:00 UTC
export const NEXT_SPRINT_UTC = new Date('2026-07-05T00:00:00Z')
// July 12, 2026 10:00 AEST
export const SPRINT_AFTER_NEXT_UTC = new Date('2026-07-12T00:00:00Z')

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div style={{
      textAlign: 'center', minWidth: 56,
      background: 'rgba(112,217,234,0.06)',
      border: '1px solid rgba(112,217,234,0.18)',
      borderRadius: 10, padding: '10px 8px',
    }}>
      <div style={{
        fontFamily: 'var(--ln-font-display)', fontSize: 26, fontWeight: 800,
        color: '#9becff', letterSpacing: '0.02em', lineHeight: 1,
      }}>
        {formatCountdownUnit(value)}
      </div>
      <div style={{
        fontFamily: 'var(--ln-font-display)', fontSize: 7, letterSpacing: '0.22em',
        color: 'var(--ln-text-muted)', textTransform: 'uppercase', marginTop: 5,
      }}>
        {label}
      </div>
    </div>
  )
}

function Countdown({ target }: { target: Date }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = now === null ? 0 : Math.max(0, target.getTime() - now)
  const days  = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const mins  = Math.floor((diff % 3_600_000) / 60_000)
  const secs  = Math.floor((diff % 60_000) / 1_000)

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '20px 0 12px' }}>
      <CountdownUnit value={days}  label="Days" />
      <CountdownUnit value={hours} label="Hrs"  />
      <CountdownUnit value={mins}  label="Min"  />
      <CountdownUnit value={secs}  label="Sec"  />
    </div>
  )
}

interface ComingSoonSheetProps {
  feature: string
  description: string
  onClose: () => void
  target?: Date
}

function formatSprintLabel(date: Date) {
  const day = date.getUTCDate()
  const month = date.toLocaleString('en', { month: 'long', timeZone: 'UTC' })
  return `Sprint · ${day} ${month} · 10:00 AEST`
}

export function ComingSoonSheet({ feature, description, onClose, target = NEXT_SPRINT_UTC }: ComingSoonSheetProps) {
  return (
    <PageSurface
      zIndex={200}
      contentStyle={{
          background: '#06121f',
          border: '1px solid rgba(112,217,234,0.18)',
          padding: '28px 20px 44px',
      }}
    >

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800,
            letterSpacing: '0.24em', color: 'var(--ln-amber)', textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            Coming Soon
          </div>
          <div style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 22, fontWeight: 800,
            color: '#e6efff', letterSpacing: '0.02em', lineHeight: 1.2,
          }}>
            {feature}
          </div>
          <div style={{
            fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text-muted)',
            marginTop: 10, lineHeight: 1.5,
          }}>
            {description}
          </div>
        </div>

        <Countdown target={target} />

        <div style={{
          textAlign: 'center',
          fontFamily: 'var(--ln-font-display)', fontSize: 8, letterSpacing: '0.18em',
          color: 'var(--ln-text-muted)', textTransform: 'uppercase', marginBottom: 20,
        }}>
          {formatSprintLabel(target)}
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px',
            background: 'rgba(112,217,234,0.1)',
            border: '1px solid rgba(112,217,234,0.28)',
            borderRadius: 12,
            color: '#9becff',
            fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Got It
        </button>
    </PageSurface>
  )
}
