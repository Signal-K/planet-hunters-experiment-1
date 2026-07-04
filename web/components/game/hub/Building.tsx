'use client'

import React from 'react'

export interface BuildingProps {
  kind: string
  label: string
  sub: string
  status: 'ok' | 'warn' | 'info'
  hot?: boolean
  w: number
  style?: React.CSSProperties
  onClick: () => void
  // Small numeric badge in the top-right corner — used for the SMS
  // daily-candidate-queue count (see HubScreen's satellite-monitoring-station
  // wiring). Omit or pass 0 to hide.
  badge?: number
}

export function Building({ kind, label, sub, status, hot, w, style, onClick, badge }: BuildingProps) {
  const statusColors = { ok: '#39d36a', warn: '#ffb347', info: '#7ec8ff' }
  const color = statusColors[status]
  return (
    <button data-testid={`building-${kind}`} onClick={onClick} style={{ position: 'absolute', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, ...style }}>
      {/* Visual rendered by HubPixiCanvas — this spacer keeps label position aligned */}
      <div style={{ width: w, height: w * 0.6, position: 'relative' }}>
        {!!badge && badge > 0 && (
          <span
            data-testid={`building-${kind}-badge`}
            style={{
              position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, padding: '0 4px',
              borderRadius: 999, background: 'var(--ln-amber)', border: '1px solid rgba(6,9,15,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 9, color: '#0a0f1a',
              boxShadow: '0 0 8px rgba(245,166,35,0.6)',
            }}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <div style={{
        padding: '4px 10px', borderRadius: 999,
        background: 'rgba(8,12,22,0.8)', backdropFilter: 'blur(6px)',
        border: `1px solid ${color}66`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      }}>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 9, letterSpacing: '0.1em', color: '#e6efff', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 4, height: 4, borderRadius: 999, background: color, boxShadow: `0 0 6px ${color}` }} />
          <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, letterSpacing: '0.16em', color, textTransform: 'uppercase' }}>{sub}</span>
        </div>
      </div>
    </button>
  )
}

export function EmptyPlot({ w = 90, style, onClick, plot }: { w?: number; style?: React.CSSProperties; onClick: () => void; plot?: number }) {
  return (
    <button data-testid={plot != null ? `build-plot-${plot}` : 'build-plot'} onClick={onClick} style={{ position: 'absolute', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, ...style }}>
      <div style={{ width: w, height: w * 0.5, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '88%', height: 26, borderRadius: '50% / 60%', background: 'radial-gradient(ellipse at 50% 35%, rgba(135,207,250,0.18), rgba(135,207,250,0.04) 70%)', border: '2px dashed rgba(135,207,250,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pad-pulse 2s ease-in-out infinite' }}>
          <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 16, fontWeight: 800, color: 'rgba(135,207,250,0.8)', marginTop: -2 }}>+</span>
        </div>
      </div>
      <div style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(8,12,22,0.7)', backdropFilter: 'blur(6px)', fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9EDCFF', whiteSpace: 'nowrap' }}>
        + Build
      </div>
    </button>
  )
}
