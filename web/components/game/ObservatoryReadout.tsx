'use client'

import type { ObservatoryStats } from '@/lib/data'

// Glowing 4-stat readout (Period / Radius / Eq. Temp / Zone) — mirrors
// Landnam.html's Observatory: values derive live from the player's marks
// and light up from dim placeholders to full glow as they become available,
// instead of just echoing the candidate's precomputed fields.
export default function ObservatoryReadout({ stats }: { stats: ObservatoryStats }) {
  const zoneColor = stats.zone === 'HABITABLE' ? 'var(--ln-ok)' : stats.zone === 'FROZEN' ? 'var(--ln-cyan-bright)' : stats.zone === 'WARM' ? 'var(--ln-amber)' : 'var(--ln-text-muted)'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
      <Stat label="Period" value={stats.periodDays != null ? `${stats.periodDays.toFixed(2)} d` : null} color="var(--ln-cyan-bright)" />
      <Stat label="Planet Radius" value={stats.radiusEarth != null ? `${stats.radiusEarth.toFixed(2)} R⊕` : null} color="var(--ln-amber)" />
      <Stat label="Eq. Temp" value={stats.eqTempK != null ? `${Math.round(stats.eqTempK)} K` : null} color="#ff9a5c" />
      <Stat label="Zone" value={stats.zone} color={zoneColor} />
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string | null; color: string }) {
  const live = value != null
  return (
    <div style={{
      borderRadius: 8,
      border: `1px solid ${live ? `${color}55` : 'rgba(126,200,255,0.14)'}`,
      background: live ? `${color}14` : 'rgba(8,16,28,0.58)',
      padding: '9px 8px',
      textAlign: 'center',
      transition: 'background 300ms, border-color 300ms',
    }}>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ln-text-muted)' }}>{label}</div>
      <div style={{
        fontFamily: 'var(--ln-font-display)', fontSize: 17, fontWeight: 800, marginTop: 3,
        color: live ? color : 'var(--ln-text-muted)',
        opacity: live ? 1 : 0.4,
        textShadow: live ? `0 0 12px ${color}80` : 'none',
        transition: 'opacity 300ms, color 300ms',
      }}>
        {value ?? '— — —'}
      </div>
    </div>
  )
}
