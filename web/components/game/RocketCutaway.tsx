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
    border: `1.5px solid ${activeRoom === room ? 'var(--ln-cyan)' : 'rgba(112,217,234,0.5)'}`,
    borderRadius: 6, background: activeRoom === room ? 'rgba(112,217,234,0.24)' : 'rgba(112,217,234,0.07)',
    color: 'var(--ln-text)', cursor: 'pointer',
    boxShadow: activeRoom === room ? '0 0 0 2px rgba(112,217,234,0.35), 0 0 18px rgba(112,217,234,0.4)' : 'none',
    transition: 'background .15s, border-color .15s, box-shadow .15s', ...extra,
  })
  const labelStyle: React.CSSProperties = { font: '700 9px var(--ln-font-display)', letterSpacing: '0.03em', textTransform: 'uppercase' }
  const unitsStyle: React.CSSProperties = { font: '600 8px var(--ln-font-mono)', color: 'var(--ln-text-muted)' }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {/* The glow filter lives on the hull <svg>, not on this wrapper: as a
          wrapper filter it re-runs over the whole 600×260 box (buttons, labels
          and all) on every hover/press of a room, which showed up as input lag
          on the Select Rocket step. */}
      <div data-testid="rocket-cutaway" style={{ position: 'relative', width: '100%', maxWidth: 600, aspectRatio: '600 / 260' }}>
        <svg viewBox="0 0 600 260" fill="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 0 26px rgba(112,217,234,0.22))' }}>
          <path d="M18 130 L70 70 L520 70 Q580 130 520 190 L70 190 Z" fill="#0a2a56" stroke="#70d9ea" strokeWidth="2" />
          <path d="M70 70v120M520 70v120M70 130h450" stroke="#70d9ea" strokeOpacity=".22" strokeDasharray="5 8" />
          <ellipse cx="588" cy="130" rx="20" ry="16" fill="#70d9ea" opacity=".55" /><ellipse cx="596" cy="130" rx="32" ry="11" fill="#70d9ea" opacity=".22" />
          <circle cx="46" cy="105" r="3" fill="#70d9ea" opacity=".4" /><circle cx="46" cy="155" r="3" fill="#70d9ea" opacity=".4" />
        </svg>
        <button type="button" onClick={() => onToggle('payload')} aria-label="Inspect Payload Bay" aria-pressed={activeRoom === 'payload'} style={roomStyle('payload', { left: '13%', top: '22%', width: '27%', height: '60%' })}><Boxes size={18} color="var(--ln-cyan)" /><strong style={labelStyle}>Payload Bay</strong><small style={unitsStyle}>{rocket.stats.cargo} units</small></button>
        <button type="button" onClick={() => onToggle('fuel')} aria-label="Inspect Fuel Tank" aria-pressed={activeRoom === 'fuel'} style={roomStyle('fuel', { left: '43%', top: '30%', width: '15%', height: '44%' })}><Orbit size={18} color="var(--ln-cyan)" /><strong style={labelStyle}>Fuel</strong><small style={unitsStyle}>L{rocket.stats.maxOrbit}</small></button>
        <button type="button" onClick={() => onToggle('engine')} aria-label="Inspect Engine" aria-pressed={activeRoom === 'engine'} style={roomStyle('engine', { left: '61%', top: '18%', width: '21%', height: '68%' })}><Pickaxe size={18} color="var(--ln-cyan)" /><strong style={labelStyle}>Engine</strong><small style={unitsStyle}>T{rocket.stats.drillTier}</small></button>
        <button type="button" onClick={() => onToggle('structure')} aria-label="Inspect Structure Frame" aria-pressed={activeRoom === 'structure'} style={roomStyle('structure', { left: '13%', top: '84%', width: '69%', height: '13%', flexDirection: 'row', gap: 6 })}><Gauge size={16} color="var(--ln-cyan)" /><strong style={labelStyle}>Structure Frame</strong><small style={unitsStyle}>Single-use hull</small></button>
      </div>
      <div style={{ font: '600 10px var(--ln-font-body)', color: 'var(--ln-text-muted)', textAlign: 'center' }}>Select a room to inspect the systems it drives.</div>
    </div>
  )
}
