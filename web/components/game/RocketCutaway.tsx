'use client'

import { Boxes, Gauge, Orbit, Pickaxe } from 'lucide-react'
import type { RocketModel } from '@/lib/data'

export type RocketRoomKey = 'payload' | 'fuel' | 'engine' | 'structure'

interface RocketCutawayProps {
  rocket: RocketModel
  activeRoom: RocketRoomKey | null
  onToggle: (room: RocketRoomKey) => void
}

export default function RocketCutaway({ rocket, activeRoom, onToggle }: RocketCutawayProps) {
  const roomStyle = (room: RocketRoomKey, extra: React.CSSProperties = {}): React.CSSProperties => ({
    position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
    border: `1.5px solid ${activeRoom === room ? 'var(--ln-amber)' : 'var(--ln-cyan-border)'}`,
    borderRadius: 6, background: activeRoom === room ? 'var(--ln-amber-soft)' : 'var(--ln-cyan-soft)',
    color: 'var(--ln-text)', cursor: 'pointer',
    boxShadow: activeRoom === room ? 'var(--ln-glow-amber)' : 'none',
    transition: 'background .15s, border-color .15s, box-shadow .15s', ...extra,
  })
  const labelStyle: React.CSSProperties = { font: '700 9px var(--ln-font-display)', letterSpacing: '0.03em', textTransform: 'uppercase' }
  const unitsStyle: React.CSSProperties = { font: '600 8px var(--ln-font-mono)', color: 'var(--ln-text-muted)' }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {/* The glow filter lives on the hull <svg>, not on this wrapper: as a
          wrapper filter it re-runs over the whole 600×260 box (buttons, labels
          and all) on every hover/press of a room, which showed up as input lag
          on the Select Rocket step. */}
      <div data-testid="rocket-cutaway" style={{ position: 'relative', width: '100%', maxWidth: 760, aspectRatio: '760 / 360' }}>
        <svg viewBox="0 0 760 360" fill="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 0 26px var(--ln-cyan-soft))' }}>
          <defs>
            <linearGradient id="rocket-hull" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--ln-surface-3)" />
              <stop offset="0.48" stopColor="var(--ln-surface)" />
              <stop offset="1" stopColor="var(--ln-void)" />
            </linearGradient>
            <linearGradient id="rocket-facet" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--ln-cyan-soft)" />
              <stop offset="1" stopColor="var(--ln-surface-2)" />
            </linearGradient>
          </defs>
          <path d="M22 180 L92 82 Q108 62 136 62 H640 Q690 90 726 180 Q690 270 640 298 H136 Q108 298 92 278 Z" fill="url(#rocket-hull)" stroke="var(--ln-cyan)" strokeWidth="2.5" />
          <path d="M92 82 L160 106 H610 Q660 126 688 180 Q660 234 610 254 H160 L92 278 L124 180 Z" fill="url(#rocket-facet)" opacity=".8" />
          <path d="M124 180 H688 M160 106 V254 M610 106 V254" stroke="var(--ln-cyan)" strokeOpacity=".3" strokeDasharray="6 10" />
          <path d="M136 62 L166 30 H604 L640 62 M136 298 L166 330 H604 L640 298" stroke="var(--ln-cyan)" strokeOpacity=".42" strokeWidth="2" />
          <path d="M92 106 L54 122 V238 L92 254 M640 106 L704 126 V234 L640 254" stroke="var(--ln-cyan)" strokeOpacity=".5" strokeWidth="3" />
          <ellipse cx="728" cy="180" rx="24" ry="20" fill="var(--ln-cyan)" opacity=".6" /><ellipse cx="742" cy="180" rx="42" ry="14" fill="var(--ln-cyan-soft)" />
          <circle cx="62" cy="145" r="5" fill="var(--ln-ok)" /><circle cx="62" cy="180" r="5" fill="var(--ln-cyan)" /><circle cx="62" cy="215" r="5" fill="var(--ln-amber)" />
          <path d="M188 122 h54 M188 238 h54 M500 122 h54 M500 238 h54" stroke="var(--ln-cyan-bright)" strokeWidth="3" opacity=".55" />
        </svg>
        <button type="button" onClick={() => onToggle('payload')} aria-label="Inspect Payload Bay" aria-pressed={activeRoom === 'payload'} style={roomStyle('payload', { left: '18%', top: '30%', width: '25%', height: '40%' })}><Boxes size={20} color="var(--ln-cyan)" /><strong style={labelStyle}>Payload Bay</strong><small style={unitsStyle}>{rocket.stats.cargo} units</small></button>
        <button type="button" onClick={() => onToggle('fuel')} aria-label="Inspect Fuel Tank" aria-pressed={activeRoom === 'fuel'} style={roomStyle('fuel', { left: '46%', top: '34%', width: '14%', height: '32%' })}><Orbit size={20} color="var(--ln-cyan)" /><strong style={labelStyle}>Fuel</strong><small style={unitsStyle}>L{rocket.stats.maxOrbit}</small></button>
        <button type="button" onClick={() => onToggle('engine')} aria-label="Inspect Engine" aria-pressed={activeRoom === 'engine'} style={roomStyle('engine', { left: '64%', top: '28%', width: '18%', height: '46%' })}><Pickaxe size={20} color="var(--ln-cyan)" /><strong style={labelStyle}>Engine</strong><small style={unitsStyle}>T{rocket.stats.drillTier}</small></button>
        <button type="button" onClick={() => onToggle('structure')} aria-label="Inspect Structure Frame" aria-pressed={activeRoom === 'structure'} style={roomStyle('structure', { left: '18%', top: '76%', width: '64%', height: '12%', flexDirection: 'row', gap: 6 })}><Gauge size={18} color="var(--ln-cyan)" /><strong style={labelStyle}>Structure Frame</strong><small style={unitsStyle}>Single-use hull</small></button>
      </div>
      <div style={{ font: '600 10px var(--ln-font-body)', color: 'var(--ln-text-muted)', textAlign: 'center' }}>Select a room to inspect the systems it drives.</div>
    </div>
  )
}
