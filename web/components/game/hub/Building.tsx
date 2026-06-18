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
}

export function Building({ kind, label, sub, status, hot, w, style, onClick }: BuildingProps) {
  const statusColors = { ok: '#39d36a', warn: '#ffb347', info: '#7ec8ff' }
  const color = statusColors[status]
  return (
    <button data-testid={`building-${kind}`} onClick={onClick} style={{ position: 'absolute', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, ...style }}>
      <div style={{ width: w, height: w * 0.6, position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        {kind === 'launchpad' && (
          <svg width={w} height={w * 0.6} viewBox="0 0 132 80">
            <rect x="10" y="50" width="112" height="8" fill="#2a3a4a" stroke="#3fa9ff" strokeWidth="1"/>
            <rect x="44" y="10" width="44" height="44" rx="4" fill="#0e1c2e" stroke="#3fa9ff" strokeWidth="1.2"/>
            <rect x="54" y="20" width="24" height="28" rx="3" fill="#1a3050" stroke="#6cc2ff" strokeWidth="1"/>
            <circle cx="66" cy="34" r="5" fill="#f5a623" opacity="0.9"/>
            <path d="M58 54 L74 54 L72 44 L60 44 Z" fill="#d68a0d" opacity="0.8"/>
            {hot && <circle cx="66" cy="54" r="18" fill="#f5a623" opacity="0.15"><animate attributeName="r" values="16;22;16" dur="1.6s" repeatCount="indefinite"/></circle>}
          </svg>
        )}
        {kind === 'refinery' && (
          <svg width={w} height={w * 0.6} viewBox="0 0 84 60">
            <rect x="6" y="20" width="72" height="30" rx="3" fill="#0e1c2e" stroke="#f5a623" strokeWidth="1.2"/>
            <rect x="20" y="8" width="12" height="14" rx="2" fill="#1a3050" stroke="#f5a623" strokeWidth="0.8"/>
            <rect x="52" y="8" width="12" height="14" rx="2" fill="#1a3050" stroke="#f5a623" strokeWidth="0.8"/>
            <circle cx="26" cy="14" r="3" fill="#f5a623" opacity="0.6"/>
            <circle cx="58" cy="14" r="3" fill="#f5a623" opacity="0.6"/>
            <path d="M26 22 L42 20 L58 22" stroke="#f5a623" strokeWidth="1" fill="none" opacity="0.5"/>
          </svg>
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
