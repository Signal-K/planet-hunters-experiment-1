'use client'

import React from 'react'
import { gardenCampLabel, getSuiteHops } from '@/lib/suite-hops'

interface SuiteHopRailProps {
  signedIn: boolean
}

export default function SuiteHopRail({ signedIn }: SuiteHopRailProps) {
  const hops = getSuiteHops()
  const chip = gardenCampLabel(signedIn)
  return (
    <nav
      data-testid="suite-hop-rail"
      aria-label="Star Sailors suite"
      style={{
        position: 'absolute', top: 96, right: 12, zIndex: 22,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
      }}
    >
      {chip && (
        <span
          data-testid="suite-identity-chip"
          style={{
            padding: '4px 8px', borderRadius: 999,
            background: 'var(--ln-panel)', border: '1px solid var(--ln-hairline)',
            color: 'var(--ln-cyan)', fontFamily: 'var(--ln-font-mono)',
            fontSize: 10, letterSpacing: '0.12em',
          }}
        >
          {chip}
        </span>
      )}
      {hops.map(hop => (
        <a
          key={hop.id}
          data-testid={`suite-hop-${hop.id}`}
          href={hop.href}
          title={hop.caption}
          aria-label={hop.caption}
          style={{
            minHeight: 34, display: 'flex', alignItems: 'center', padding: '0 12px',
            borderRadius: 999, textDecoration: 'none',
            background: 'var(--ln-panel)', border: '1px solid var(--ln-hairline)',
            color: 'var(--ln-cyan)', fontFamily: 'var(--ln-font-display)',
            fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
          }}
        >
          {hop.label}
        </a>
      ))}
    </nav>
  )
}
