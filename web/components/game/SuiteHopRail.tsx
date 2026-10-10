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
    // Position lives in globals.css (.suite-hop-rail) so the Base's compact
    // header can lay it out beside the Feedback launcher instead of on top of it.
    <nav
      data-testid="suite-hop-rail"
      aria-label="Star Sailors suite"
      className="suite-hop-rail"
    >
      {chip && (
        <span
          data-testid="suite-identity-chip"
          className="suite-identity-chip"
          style={{
            padding: '4px 8px', borderRadius: 999,
            background: 'var(--ln-panel)', border: '1px solid var(--ln-hairline)',
            color: 'var(--ln-cyan)', fontFamily: 'var(--ln-font-mono)',
            fontSize: 14, letterSpacing: '0.12em',
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
            minHeight: 44, display: 'flex', alignItems: 'center', padding: '0 12px',
            borderRadius: 999, textDecoration: 'none',
            background: 'var(--ln-panel)', border: '1px solid var(--ln-hairline)',
            color: 'var(--ln-cyan)', fontFamily: 'var(--ln-font-display)',
            fontSize: 14, fontWeight: 800, letterSpacing: '0.12em',
          }}
        >
          {hop.label}
        </a>
      ))}
    </nav>
  )
}
